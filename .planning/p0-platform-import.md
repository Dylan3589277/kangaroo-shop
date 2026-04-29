# kangaroo-shop — 三平台商品导入与一键上架 P0 实施计划

<!-- /autoplan restore point: /Users/hulonghua/.gstack/projects/Dylan3589277-kangaroo-shop/main-autoplan-restore-20260429-091905.md -->

**版本**: 1.0.0
**分支**: main
**基准 commit**: 162e111
**作者**: 花哥 / 袋鼠君
**日期**: 2026-04-29

---

## 背景

kangaroo-shop 是袋鼠君跨境电商站（中国进货卖全球）。后台基础框架和 boss-dashboard P0 已生产上线。当前有三处已知技术债：

1. `POST /api/products` 返回 501（NestJS 占位符遗留）
2. `GET /api/products` 搜索字段引用了 schema 中不存在的 `titleJa`、`brand` 字段 → 运行时 Prisma 类型错误
3. `src/app/[locale]/products/page.tsx` 硬编码 `NESTJS_BASE='http://localhost:3001/api/v1/products'` → 前台商品页在生产上返回空列表

目标：P0 补强商品后台，并搭建三平台（乐天/Amazon/自营独立站）导入基础架构，以 CSV/报表文件导入为主，不做真正 API 自动上架。

---

## 阶段划分

### P0 — 商品后台补强 + 平台导入基础架构（本次规划范围）

目标：修复技术债 + 数据模型扩展 + CSV 导入草稿 + 后台导入页面

### P1 — 导入工作流完善

目标：预览确认 + 批量执行 + 导入历史 + 冲突检测

### P2 — 平台 API 自动化（未来）

目标：乐天 API 只读 → 写接口；Amazon SP-API 只读 → 写接口；一键上架自动化

---

## P0 必做范围

1. **修复 Prisma schema**：Product 模型新增 `titleJa`、`brand` 字段
2. **新增平台同步数据模型**：`ProductVariant`、`ProductPlatformListing`、`SyncJob`、`SyncJobItem`
3. **执行 Prisma migration**（本地 dev 环境）
4. **实现 POST /api/products**：创建商品（管理员鉴权）
5. **实现 PUT /api/products/[id]**：更新商品
6. **实现 GET + DELETE /api/products/[id]**：单品获取和软删除
7. **修复 products/page.tsx**：移除 NESTJS_BASE，改为直接调用 Prisma
8. **实现文件上传 API**：`POST /api/admin/import/upload`（multipart/form-data，返回解析预览）
9. **乐天 CSV 解析器**：`src/lib/import/rakuten-csv.ts`
10. **Amazon 报表解析器**：`src/lib/import/amazon-report.ts`
11. **SyncJob 工具函数**：`src/lib/import/sync-job.ts`
12. **后台导入页面**：`src/app/[locale]/admin/import/page.tsx` + `ImportClient.tsx`
13. **Admin ProductForm 补充字段**：titleJa、brand
14. **Admin 侧边栏新增导入入口**

---

## 数据模型变更

### Product 模型新增字段

```prisma
titleJa       String?  @map("title_ja")   // 日文标题（乐天/Amazon 商品名）
brand         String?                      // 品牌名
```

### 新增模型

```prisma
// SKU 变体（商品规格：尺码/颜色/款式）
model ProductVariant {
  id         String   @id @default(cuid())
  productId  String   @map("product_id")
  sku        String?
  title      String?
  price      Int?
  stock      Int      @default(0)
  attributes Json     @default("{}")     // {"size":"M","color":"red"}
  isActive   Boolean  @default(true)     @map("is_active")
  createdAt  DateTime @default(now())    @map("created_at")
  updatedAt  DateTime @updatedAt         @map("updated_at")

  product  Product                  @relation(fields: [productId], references: [id], onDelete: Cascade)
  listings ProductPlatformListing[]

  @@index([productId])
  @@map("product_variants")
}

// 平台上架记录（一个商品在乐天/Amazon/自营独立站的 listing 状态）
model ProductPlatformListing {
  id             String    @id @default(cuid())
  productId      String    @map("product_id")
  variantId      String?   @map("variant_id")
  platform       String                        // rakuten | amazon | own
  platformItemId String?   @map("platform_item_id")  // 乐天商品管理番号 / Amazon ASIN
  platformSku    String?   @map("platform_sku")       // 乐天 SKU / Amazon FNSKU
  status         String    @default("draft")   // draft | listed | delisted | error
  listingUrl     String?   @map("listing_url")
  platformPrice  Int?      @map("platform_price")
  platformStock  Int?      @map("platform_stock")
  lastSyncAt     DateTime? @map("last_sync_at")
  syncError      String?   @map("sync_error")
  metadata       Json      @default("{}")
  createdAt      DateTime  @default(now())     @map("created_at")
  updatedAt      DateTime  @updatedAt          @map("updated_at")

  product Product        @relation(fields: [productId], references: [id], onDelete: Cascade)
  variant ProductVariant? @relation(fields: [variantId], references: [id])

  @@unique([platform, platformItemId])
  @@index([productId])
  @@index([platform, status])
  @@map("product_platform_listings")
}

// 同步任务主表
model SyncJob {
  id         String    @id @default(cuid())
  platform   String                        // rakuten | amazon | own
  type       String                        // import | export | sync
  status     String    @default("pending") // pending | running | done | failed
  totalItems Int       @default(0)         @map("total_items")
  doneItems  Int       @default(0)         @map("done_items")
  failItems  Int       @default(0)         @map("fail_items")
  startedAt  DateTime? @map("started_at")
  finishedAt DateTime? @map("finished_at")
  errorMsg   String?   @map("error_msg")
  meta       Json      @default("{}")       // 文件名、行数等元信息
  createdAt  DateTime  @default(now())      @map("created_at")

  items SyncJobItem[]

  @@index([status])
  @@index([platform])
  @@map("sync_jobs")
}

// 同步任务行明细
model SyncJobItem {
  id        String @id @default(cuid())
  jobId     String @map("job_id")
  rowIndex  Int    @map("row_index")
  status    String                      // ok | error | skipped
  productId String? @map("product_id")
  inputData Json   @map("input_data")  // 原始行数据
  errorMsg  String? @map("error_msg")

  job SyncJob @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([jobId])
  @@map("sync_job_items")
}
```

### Migration 策略

1. 本地执行 `npx prisma migrate dev --name p0_platform_import`
2. 生产部署前先在 Vercel 环境变量中确认 `DATABASE_URL` 指向 staging/production DB
3. 在 Vercel 部署前手动执行 `npx prisma migrate deploy`（或在 build 命令中加入）
4. 新增字段均为 nullable，现有记录不受影响

---

## API 变更

| 方法 | 路径 | 状态 | 说明 |
|------|------|------|------|
| GET | /api/products | 修复 | 移除 titleJa/brand 不存在的报错（schema 修复后自动修复） |
| POST | /api/products | 实现 | 创建商品，需 admin session 鉴权 |
| GET | /api/products/[id] | 新增 | 获取单个商品 |
| PUT | /api/products/[id] | 新增 | 更新商品，需 admin session 鉴权 |
| DELETE | /api/products/[id] | 新增 | 软删除（isActive=false），需 admin session 鉴权 |
| POST | /api/admin/import/upload | 新增 | 上传 CSV/报表文件，返回解析预览（dry-run） |
| POST | /api/admin/import/execute | 新增 | 执行导入，创建 SyncJob + products |
| GET | /api/admin/import/jobs | 新增 | 列出 SyncJob 历史 |
| GET | /api/admin/import/jobs/[id] | 新增 | SyncJob 详情 + 行明细 |

鉴权方式：`getServerSession(authOptions)` 检查 admin role，非 admin 返回 401。

---

## UI 变更

| 页面/组件 | 类型 | 说明 |
|-----------|------|------|
| src/app/[locale]/products/page.tsx | 修改 | 删除 NESTJS_BASE，改为直接 prisma.product.findMany |
| src/app/[locale]/admin/products/ProductForm.tsx | 修改 | 新增 titleJa、brand 输入字段 |
| src/app/[locale]/admin/import/page.tsx | 新增 | 导入主页面（服务端组件） |
| src/app/[locale]/admin/import/ImportClient.tsx | 新增 | 文件上传 + 预览表格 + 执行按钮（客户端组件） |
| src/app/[locale]/admin/layout.tsx 或侧边栏组件 | 修改 | 新增"商品导入"导航入口 |

---

## 乐天 CSV 格式假设

RMS（乐天商户服务器）商品数据 CSV 导出格式关键字段：
- `商品管理番号` → `platformItemId`
- `商品名` → `titleJa`
- `販売価格` → `platformPrice`
- `在庫数` → `platformStock`
- `ブランド` → `brand`
- `商品説明文` → `description`
- `画像URL1` → `images[0]`
- `カテゴリ` → `category`

解析器：`src/lib/import/rakuten-csv.ts`，使用 Node.js 内置 CSV 解析（papaparse 或自实现）。

---

## Amazon 报表格式假设

使用 "Manage Your Inventory" (MYI) 报表（GET_FLAT_FILE_OPEN_LISTINGS_DATA）：
- `asin1` → `platformItemId`
- `seller-sku` → `platformSku`
- `item-name` → `titleEn`
- `price` → `platformPrice`
- `quantity` → `platformStock`

解析器：`src/lib/import/amazon-report.ts`，TSV 格式（制表符分隔）。

---

## 风险列表

1. **Schema migration 与生产部署时序**：必须先跑 migrate deploy 再部署代码，否则新字段引用会报 500。
2. **products/page.tsx 改为直接 Prisma 调用**：Server Component 调用 Prisma 是正确模式，但需确保 `DATABASE_URL` 在 Vercel 环境中正确设置。
3. **文件上传大小限制**：Vercel API Routes 默认 body limit 为 4MB，乐天 CSV 可能更大。需要设置 `export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }` 或使用 streaming 上传。
4. **鉴权缺口**：当前 ProductForm 调用 POST /api/products，但 API 没有鉴权。实现 POST 时必须同步加入 session 检查。
5. **CSV 格式不确定性**：乐天 RMS 的 CSV 列名可能随账号设置变化（简体/繁体/日文列名混用）。解析器需支持列名映射配置。
6. **titleJa/brand 搜索性能**：新增字段后 `OR` 搜索涉及更多列，若数据量大需在 `title_ja` 上加索引。P0 可暂缓，P1 补加。

---

## 验证命令与验收标准

```bash
# 1. TypeScript 编译检查
npx tsc --noEmit

# 2. Prisma schema 验证
npx prisma validate

# 3. 本地 migration（不影响生产）
npx prisma migrate dev --name p0_platform_import

# 4. 开发服务器启动
npm run dev

# 5. 手动验收测试
curl -X POST http://localhost:3000/api/products \
  -H 'Content-Type: application/json' \
  -b 'next-auth.session-token=...' \
  -d '{"title":"テスト商品","price":1000,"category":"anime"}'
# 期望：201 Created，返回 product 对象

curl 'http://localhost:3000/api/products?search=テスト'
# 期望：200 OK，无 Prisma 类型报错

# 6. 前台商品页验证
# 访问 http://localhost:3000/ja/products
# 期望：显示商品列表（不依赖 localhost:3001）

# 7. 乐天 CSV 解析单测
# 期望：src/lib/import/rakuten-csv.ts 导出 parseRakutenCsv(csvText) → RakutenProduct[]

# 8. Amazon 报表解析单测
# 期望：src/lib/import/amazon-report.ts 导出 parseAmazonReport(tsvText) → AmazonListing[]
```

### 验收标准

- [ ] POST /api/products 返回 201（不再是 501）
- [ ] GET /api/products?search=xxx 不抛出 Prisma 字段不存在错误
- [ ] 前台商品列表页在不启动 localhost:3001 的情况下正常显示商品
- [ ] 后台商品表单新增 titleJa、brand 字段并可保存
- [ ] 后台侧边栏出现"商品导入"入口
- [ ] 上传乐天 CSV 后显示解析预览（行数/字段映射）
- [ ] 上传 Amazon 报表后显示解析预览
- [ ] 执行导入后 SyncJob 记录写入数据库
- [ ] `npx tsc --noEmit` 零错误

---

## 预计修改/新增文件清单

### 修改

- `prisma/schema.prisma` — Product 新增字段，新增 4 个模型
- `src/app/api/products/route.ts` — 实现 POST
- `src/app/[locale]/products/page.tsx` — 移除 NESTJS_BASE
- `src/app/[locale]/admin/products/ProductForm.tsx` — 新增 titleJa/brand 字段
- `src/app/[locale]/admin/layout.tsx` 或侧边栏组件 — 新增导入入口

### 新增

- `prisma/migrations/[timestamp]_p0_platform_import/migration.sql`
- `src/app/api/products/[id]/route.ts` — GET / PUT / DELETE
- `src/app/api/admin/import/upload/route.ts` — 文件上传解析
- `src/app/api/admin/import/execute/route.ts` — 执行导入
- `src/app/api/admin/import/jobs/route.ts` — 列出 SyncJob
- `src/app/api/admin/import/jobs/[id]/route.ts` — 单个 SyncJob 详情
- `src/app/[locale]/admin/import/page.tsx`
- `src/app/[locale]/admin/import/ImportClient.tsx`
- `src/lib/import/rakuten-csv.ts`
- `src/lib/import/amazon-report.ts`
- `src/lib/import/sync-job.ts`
- `src/types/import.ts`

---

## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---|-------|----------|----------------|-----------|-----------|---------|
| 1 | CEO | products/page.tsx 改为直接 Prisma 而非 /api/products fetch | Mechanical | P5(Explicit) | Server Component 直调 Prisma 更简单，无网络开销，已有 adminProductsPage 先例 | fetch('/api/products') |
| 2 | CEO | P0 不做 API 自动上架 | Mechanical | P3(Pragmatic) | 乐天/Amazon 写接口需要正式 API key 审批流程，P0 用 CSV 先快速验证 | SP-API 直接对接 |
| 3 | CEO | 文件上传路径选 /api/admin/import/upload | Mechanical | P5(Explicit) | 与现有 /api/admin/* 模式一致 | 用 /api/import |
| 4 | Eng | ProductVariant 与 Product 1:N | Mechanical | P5(Explicit) | 跨境商品必然有 size/color 变体，1:N 是标准电商数据模型 | Json 字段内嵌 |
| 5 | Eng | SyncJob + SyncJobItem 分表 | Mechanical | P1(Completeness) | 行级错误追踪需要 per-row 记录，否则调试导入失败无从下手 | 仅 SyncJob 无 Item |
| 6 | Eng | 鉴权用 getServerSession 检查 role | Mechanical | P5(Explicit) | NextAuth 已集成，不引入新依赖 | 自实现 JWT |
| 7 | Design | 导入页面用 tab 切换乐天/Amazon | Taste | P5(Explicit) | 两个平台格式不同，分 tab 更清晰 | 单页面两个 upload |

---

## GSTACK REVIEW REPORT

| Run | Date | Status | Findings | Verdict |
|-----|------|--------|----------|---------|
| — | — | NO REVIEWS YET | — | NO REVIEWS YET — run `/autoplan` |
