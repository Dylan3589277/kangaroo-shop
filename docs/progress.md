# 袋鼠君独立站 — 详细进展日志

> 本文件记录项目的详细开发进展，每次重要更新后由花小妹回写。
> 状态变更 → 直接修改 STATE.md；详细过程 → 写本文件。
> 文档遵循三层体系：入口文档（README）只指路，STATE.md 存当前状态，progress.md 存详细历史。

---

## 2026-05-01 — API 请求体加固闭环完成并生产上线 ✅

### 本阶段目标

把 kangaroo-shop 现有 API 路由中直接 `await req.json()` / `await request.json()` 导致的空 body、非法 JSON、`null`、数组、非对象请求体异常问题逐批补齐，避免坏请求进入业务 catch 后变成 500，同时不改支付金额、库存、优惠券计数、订单状态机等核心业务逻辑。

### 已完成批次

- ✅ 非支付低风险接口：商品评论、wishlist、商品创建/更新、dashboard alerts、platform-listings 等接口已接入统一 JSON 对象解析。
- ✅ 优惠券与后台订单接口：`/api/promotions`、`/api/orders/[orderId]/status`、`/api/orders/[orderId]/notify` 已接入请求体解析加固，并补路由测试。
- ✅ 下单主链路：`POST /api/orders` 已接入 `parseRequestJsonObject()`；空 body、非法 JSON、`null`、数组、非对象 JSON、`items:[null]`、`items:["prod_1"]` 均按 400 处理；保留既有业务错误文案。
- ✅ 支付创建链路：`POST /api/create-payment-intent` 与 `POST /api/create-paypal-order` 已接入 `parseRequestJsonObject()`；空 body/非法 JSON/null/数组/非对象请求体统一返回 400 `Invalid request body`；不改 Stripe/PayPal 金额创建逻辑。
- ✅ PayPal capture：已完成归属、金额、币种二次校验；`ORDER_ALREADY_CAPTURED` 幂等路径也复用校验；空 body 与 `{}` 不再误判为用户取消支付。

### 最新提交与部署

- 最新提交：`5f05fa7 Harden payment creation request parsing`
- 当前分支：`main`，已与 `origin/main` 同步
- 生产主域：`https://kangaroo-shop-orpin.vercel.app`
- Vercel 生产部署状态：Ready

### 验证记录

执行过的本地质量检查：

```bash
pnpm test
pnpm lint
pnpm exec tsc --noEmit --skipLibCheck
pnpm build
```

结果：全部通过。lint/build 仅保留既有 `src/app/og/[id]/route.tsx` 的 `<img>` 提示，不阻断。

额外复核：

```bash
rg "await\s+req\.json\(\)|await\s+request\.json\(" src/app/api
```

结果：未发现残余直接调用。

线上冒烟：

- `/zh`、`/ja`、`/en`、`/zh/products`、`/zh/cart`、`/zh/admin/login` 等关键路径正常。
- `/api/create-payment-intent` 空 body 返回 400 `Invalid request body`。
- `/api/create-paypal-order` 空 body 返回 400 `Invalid request body`。

### 关键经验

- 所有业务 JSON 请求入口优先使用 `parseRequestJsonObject()`，不要直接 `req.json()`。
- 坏请求体属于 400，不应落入 500。
- 对 Next.js 动态渲染中断异常必须重新抛出，不能被请求体 helper 吞掉。
- 支付、订单、库存、优惠券等高风险链路必须先补测试再改，且只改当前目标层，避免顺手动核心逻辑。

### 下一阶段候选

- Stripe/PayPal 真实支付端到端测试：需要花哥确认沙盒/真实支付边界。
- 管理后台体验与运营流程优化：继续优化现有商品导入、模板下载、多平台上架中心。
- 客服系统 Phase2：做订单/物流只读查询，但必须保留脱敏、HMAC、审计日志和人工确认边界。
- 历史死代码清理：如 `src/lib/orders.ts`，需要先做引用检查和回归测试。

---

## 2026-04-18 — Day 5 邮件通知完成 + Bug 修复 + 部署 v5 ✅

### 新增文件

**`src/lib/email.ts`** — 邮件工具库
- nodemailer + 标准 SMTP（阿里云 / 腾讯云 / Gmail 均可）
- `isEmailConfigured()` — 环境变量检查
- `sendOrderConfirmation()` — 订单确认邮件（日文 HTML 模板，含商品明细/配送地址/金额）
- `sendStatusChangeEmail()` — 状态变更邮件（日文 HTML 模板，含状态徽章/备注）

**`src/app/api/orders/[orderId]/notify/route.ts`** — 邮件通知 API
- `POST` — 手动触发邮件发送
- `type=confirmation` — 发送订单确认邮件
- `type=status_change` — 发送状态变更邮件（可附备注）
- SMTP 未配置时返回 `{ configured: false }`，不报错，保证其他功能正常

**`src/scripts/remind_smtp.py`** — SMTP 配置提醒脚本
- 检查 SMTP 环境变量是否配置
- 未配置时通过飞书 API 发送提醒给花哥
- 由 Hermes cron 定期调用（每 3 天）

**Cron Job** — `bed7b03cdc42` — "袋鼠君 SMTP 配置提醒"
- 周期：每 3 天
- 下次运行：2026-04-21

### Bug 修复

**Bug 1（严重）— 邮件模板价格单位错误**
- 商品价格在数据库是 JPY（3200 = ¥3,200），不是"分"
- 邮件模板里 `item.price / 100` 会把 ¥3,200 显示成 ¥32，价格全部少 100 倍
- **修复**：`/ 100` 全部去掉，改用 `formatPrice()`（Intl.NumberFormat，JPY 无需除法）
- 影响范围：商品明细小计、小计、运费、合计，全部修复

**Bug 2（中等）— 状态变更邮件 CSS class 名错误**
- CSS 定义：`status-pending`（kebab-case，下划线转横线）
- 代码使用：`status-${data.oldStatus}` → `status-pending_change`（直接插入，保留了下划线）
- **修复**：加 `toKebabCase()` 函数，发送前转换 `pending_change → pending-change`

**Bug 3（中等）— TypeScript null 安全**
- Prisma schema 里 `shippingName` 等字段是 `String?`（可空）
- `sendOrderConfirmation` 参数类型要求 `string`，类型检查报错
- **修复**：所有可能为 null 的字段加 `?? 'Customer'` / `?? ''` 默认值

**Bug 4（严重）— Vercel build 失败：PrismaClient 类型丢失**
- `prisma/seed.ts` 没有被 tsconfig 排除，build 时类型检查失败
- **修复**：build 脚本改为 `prisma generate && next build`（Vercel 上先生成 Prisma Client），`tsconfig.json` 排除 `prisma/seed.ts`

### 部署

- Vercel v5 部署成功：`https://kangaroo-shop-tan.vercel.app`
- nodemailer@8.0.5 + @types/nodemailer@8.0.0 已安装
- SMTP 环境变量模板已写入 `.env` 和 `.env.local`

### 待花哥做

**配置阿里云 SMTP**（Vercel Project Settings → Environment Variables）：
- `SMTP_HOST` = smtp.aliyun.com
- `SMTP_PORT` = 465
- `SMTP_SECURE` = true
- `SMTP_USER` = 你的阿里云邮箱
- `SMTP_PASS` = 你的阿里云邮箱密码
- `SMTP_FROM` = 袋鼠君 \<your@domain.com\>

配置完点 Redeploy，邮件功能就完整了。

---

## 2026-04-18 — Day 4 管理后台页面完成 ✅

### 完成页面

**订单管理（`src/app/[locale]/admin/orders/`）**
- `page.tsx` — 订单列表页，支持状态筛选（全部/待支付/已支付/失败/取消/退款）+ 分页（每页20条）+ 统计卡片（总订单数/待处理/本月销售额）
- `[id]/page.tsx` — 订单详情页，显示订单信息、收件人信息、订单商品列表、状态历史
- `[id]/StatusUpdateForm.tsx` — 状态更新表单（`'use client'`），调用 `PATCH /api/orders/[orderId]/status`，成功后刷新页面

**商品管理（`src/app/[locale]/admin/products/`）**
- `page.tsx` — 商品列表页，支持显示/隐藏筛选 + 分页；表格显示：图片/品名/价格/库存/状态Badge/操作（编辑/删除）；"新增商品"按钮
- `ProductActiveToggle.tsx` — 软删除切换组件（`'use client'`），点击切换 `isActive`，调用 `PUT /api/products/[id]`
- `ProductForm.tsx` — 商品表单组件（`'use client'`），支持新建/编辑，提交到 `POST /api/products` 或 `PUT /api/products/[id]`
- `new/page.tsx` — 新增商品页
- `[id]/edit/page.tsx` — 编辑商品页

### Bug 修复
- `ProductForm.tsx`：API 用 PUT 而非 PATCH，修正 HTTP 方法
- `ProductActiveToggle.tsx`：PATCH → PUT
- `orders/[id]/page.tsx`：移除未使用的 `notFound` 导入
- `products/new/page.tsx`：修正 ProductForm 引用路径 `../../ProductForm` → `../ProductForm`
- `inStock` state 定义了但 UI 未绑定，加 eslint-disable 注释抑制

### 构建验证
```
pnpm build ✅ — 零错误（仅一个 `<img>` Warning，不影响构建）
```

### 代码审查 & Bug 修复（2026-04-18 下午）

**🔴 Critical — PrismaClient 重复实例化（3个文件）**
- `admin/orders/page.tsx`、`admin/orders/[id]/page.tsx`、`admin/products/page.tsx` 都在 Server Component 里 `new PrismaClient()`
- 改为 `import { prisma } from '@/lib/prisma'` 使用单例，避免生产环境连接池耗尽

**🔴 Medium — ProductActiveToggle 请求失败时静默**
- 原：fetch 失败只走 finally，UI 已变但后端未更新，用户无感知
- 修复：加 try/catch + error state + 3秒自动消失错误提示 + 状态回滚

**🔴 Medium — ProductForm 缺 inStock UI 控件**
- 原：定义了 `inStock` state 但表单里没有对应 checkbox
- 修复：在 isActive toggle 前加了 inStock checkbox（在庫あり/なし）

### 待验收
- [x] 浏览器测试：订单列表、订单详情状态更新、商品列表软删除、新增/编辑商品表单
- [ ] Day 5：邮件通知 + 收尾 + 部署

---

## 2026-04-18 — Day 3 测试 + Login Bug 修复 ✅

### 发现并修复：Admin Login 循环重定向 Bug

**问题**：访问 `/admin/login` 或 `/ja/admin/login` 出现无限重定向。

**根因**：
- middleware 把 `/admin/login` 重定向到 `/ja/admin/login`
- `admin/layout.tsx` 的 session 检查在无 session 时 redirect 到 `/${params.locale}/admin/login`
- 两者都是 `/ja/admin/login`，导致 redirect 到自己 → 无限循环

**修复方案**：
- 把 login 页面从 `src/app/[locale]/admin/login/` 移到 `src/app/[locale]/(auth)/admin/login/`
- `(auth)` 是路由组，不经过 admin layout 的 session 检查
- 文件结构变更：
  - 旧：`src/app/[locale]/admin/login/page.tsx`（有 admin layout）
  - 新：`src/app/[locale]/(auth)/admin/login/page.tsx`（无 admin layout）

### Day 3 测试结果

**测试步骤**：
1. 启动 `pnpm dev`
2. 访问 `/admin/login`（middleware 自动跳转 `/ja/admin/login`）
3. 输入 `admin@kangaroo-shop.com` / `changeme123`

**结果**：
- ✅ 登录页正常显示（日语：管理者ログイン）
- ✅ 输入账号密码，点击登录
- ✅ 成功进入管理后台 Dashboard
- ⚠️ Dashboard 显示"データベースに接続できません"（数据库未连接，NEXTAUTH_SECRET 或 DATABASE_URL 环境变量问题，不影响登录功能本身）

**结论**：NextAuth 登录认证功能验收通过 ✅

---

## 2026-04-17 下午 — Day 2 完成 + 全面 Bug 审查 ✅

### 代码全面审查结果

**审查范围**：全部 API（orders / products / payment）+ 关键页面 + Prisma Schema

**发现并修复的 Bug：**

#### Bug 1 — Order 类型和数据结构不匹配（严重）
- `lib/orders.ts` 定义了 `Order` 类型，包含嵌套 `shippingAddress` 对象
- 但 Prisma schema 里 `Order` 是扁平结构：`shippingName / shippingPostal / shippingPrefecture / shippingCity / shippingAddress1 / shippingAddress2`
- `success/page.tsx` 和 `confirm/page.tsx` 都导入错误的 `Order` 类型，导致字段访问全部报错
- **修复**：两个页面内联了匹配 Prisma 的类型定义，移除对 `lib/orders.ts` 的导入

#### Bug 2 — shippingAddress 字段访问错误（严重）
- 两页面引用 `order.shippingAddress.name` → 实际是 `order.shippingName`
- `order.shippingAddress.prefecture` → 实际是 `order.shippingPrefecture`
- `order.shippingAddress.city` → 实际是 `order.shippingCity`
- `order.shippingAddress.address1` → 实际是 `order.shippingAddress1`
- **修复**：全部替换为正确字段

#### Bug 3 — productImage 可能为 null（中等）
- Next.js `Image` 组件的 `src` 不接受 `null`
- **修复**：`item.productImage ?? '/placeholder.png'`

#### Bug 4 — active 参数变量遮蔽（轻微）
- `products/route.ts` 声明了 `const active` 后又调用 `searchParams.get('active')`
- 后续代码使用 `active` 时实际上拿到的是 `string | null`（参数值），但 Prisma 查询期望 `boolean`
- **修复**：改为 `activeParam` 明确区分

### 构建验证
```
pnpm build ✅ — 零错误
```

### Day 2 完成状态
- Day 1 ✅ — Prisma Schema + MySQL + Seed
- Day 2a ✅ — Orders API → Prisma（创建/查询/状态更新/邮件通知）
- Day 2b ✅ — Products API → Prisma CRUD + 类型修复

---

## 2026-04-17 上午 — Day 1 完成，Day 2 进行中

### 完成项

**Day 1 — 数据库接入：**
1. Prisma 5.22 安装（从 v7 降级，修复兼容性问题）
2. Prisma Schema 设计（Order / OrderItem / Product，含完善索引）
3. Vercel MySQL 连接测试通过
4. Seed 数据成功写入（12个商品）

**Prisma Schema 关键决策：**
- 订单字段扁平化：`shippingName / shippingPostal / shippingPrefecture / shippingCity / shippingAddress1 / shippingAddress2 / shippingPhone / shippingEmail`
- `courier` + `trackingNumber` — 物流追踪
- `paymentMethod` — 支付方式（stripe/paypal）
- Product 可选字段：`tags string[]` `size string[]` `brand string?`

**Day 2a — Orders API 改造：**
- `POST /api/orders` — 创建订单（Prisma）
- `GET /api/orders?id=xxx` — 查询订单
- `GET /api/orders?sessionId=xxx` — 按 session 查
- `PATCH /api/orders/[orderId]/status` — 更新状态
- `POST /api/orders/[orderId]/notify` — 发送邮件通知

**Day 2b — Products API 改造：**
- `GET /api/products` — 支持 category 筛选 + 分页 + active 过滤
- `GET /api/products/[id]` — 单个商品
- `POST /api/products` — 创建商品
- `PATCH /api/products/[id]` — 更新商品
- `DELETE /api/products/[id]` — 删除商品

**Bug 修复（Day 2）：**
- `Product` 类型：tags/size/brand/createdAt 改为可选，source/rating 加 `?? 0`
- `products.ts` sed 清理残留 brand/createdAt 字段（共6处）

---

## 2026-04-16 — 支付流程完善完成 ✅

### 新增功能

1. **订单 API** `src/lib/orders.ts` + `src/app/api/orders/route.ts`
   - `POST /api/orders` — 创建订单（内存存储，开发阶段）
   - `GET /api/orders?id=xxx` — 查询订单

2. **PayPal Capture API** `src/app/api/paypal/capture-order/route.ts`
   - `POST /api/paypal/capture-order` — 用户从 PayPal 返回后完成支付 capture

3. **订单确认页** `src/app/[locale]/checkout/confirm/page.tsx`
   - 展示：商品清单、收件地址、配送方式、金额汇总

4. **PayPal 返回处理页** `src/app/[locale]/checkout/paypal/return/page.tsx`

5. **支付成功页更新** `src/app/[locale]/checkout/success/page.tsx`

6. **Stripe Webhook** `src/app/api/stripe/webhook/route.ts`

### 关键 Bug 修复

**PayPal 认证失败根因：** `PAYPAL_CLIENT_SECRET` 环境变量里藏了 `\n`（换行符）

**修复方案：**
```typescript
const cleanClientSecret = clientSecret.replace(/[\n\r]/g, '');
export const runtime = 'nodejs'; // 切换到 Node.js Runtime
```

**教训：** Vercel 环境变量粘贴时容易带入换行符，必须在代码里做清理。

---

## 2026-04-16 — 部署流程打通

### 完成项
- Vercel CLI Token 授权接入完成
- `vercel --prod --yes` 直接触发生产部署
- PayPal 假链接修复（demo.paypal.com → 真实 /api/create-paypal-order）

---

## 2026-04-15 — 项目启动

### 技术栈确认
- 框架：Next.js 14 (App Router)
- 语言：TypeScript
- 样式：Tailwind CSS
- 支付：Stripe + PayPal
- 部署：Vercel
- 国际化：next-intl（ja / zh / en）

### 项目结构
```
kangaroo-shop/
├── src/
│   ├── app/          # 页面路由
│   ├── components/   # UI 组件
│   ├── contexts/     # CartContext
│   ├── i18n/         # 国际化
│   └── lib/          # 工具（stripe.ts, products.ts）
├── docs/             # 本文件
├── STATE.md          # 项目状态摘要
└── prisma/           # 数据库 schema
```
