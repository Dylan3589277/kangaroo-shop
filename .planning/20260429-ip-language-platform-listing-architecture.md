# kangaroo-shop 全球跨境站需求落地方案：IP语言切换 + 多平台导入/上架架构

日期：2026-04-29 12:17 JST
负责人：达摩院（首席架构师）
项目路径：/Users/hulonghua/projects/kangaroo-shop
关联任务：TASK-2026-0429-001

## 0. 结论

kangaroo-shop 当前已经具备 P0 多平台导入地基：
- Prisma 已有 Product / ProductVariant / ProductPlatformListing / SyncJob / SyncJobItem。
- 后台已有 /[locale]/admin/import 页面。
- 已有 /api/admin/import/upload、/execute、/jobs、/jobs/[id]。
- 已有 rakuten-csv、amazon-report 解析器。

本轮需求不建议推翻重做，应在现有地基上做 P1/P2/P3/P4 分层落地：
1. IP 语言切换：改为 Vercel/Cloudflare 国家头 + Accept-Language + cookie 的无外部依赖方案，不在 middleware 中请求第三方 GeoIP API。
2. 多平台导入：把当前“上传即执行”的流程升级为“解析预览 → 字段映射确认 → 创建导入任务 → 草稿商品 → 审核”。
3. 自建站上架：先落地“发布到 kangaroo-shop 自营站”，即 draft → active，并生成 own listing。
4. 乐天/Amazon 上架：先做模板导出和人工上传闭环；真正 API 写接口作为 P4，需要花哥单独授权和平台密钥配置。

## 1. 当前代码审查摘要

### 1.1 国际化现状

相关文件：
- src/i18n/routing.ts
- src/middleware.ts
- src/i18n/*.json

现状：
- locales 已支持 en、zh、ja、ko、de、fr、it、es、th、id、vi。
- defaultLocale 为 en，localePrefix 为 always。
- src/i18n 下对应 json 文件齐全。
- middleware 已有国家到语言映射和 preferredLocale / geoLocale cookie 逻辑。

主要风险：
- src/middleware.ts 中写了 export const runtime = 'nodejs'。Next.js middleware 运行在 Edge runtime，不能按普通 Node API 设计。
- middleware 内部调用 https://ipwhois.app/json/...，会把首屏跳转依赖第三方网络。第三方慢/失败/限流时会影响根路径访问体验。
- 通过 request.ip / x-forwarded-for 自己取 IP 再查 GeoIP，生产上既不稳定，也会增加隐私和合规负担。
- geoLocale cookie 会缓存 30 天，用户旅游/代理切换后可能语言长期不准确；需要允许手动选择覆盖，并给用户清晰语言切换入口。

### 1.2 多平台导入现状

相关文件：
- prisma/schema.prisma
- src/lib/import/sync-job.ts
- src/lib/import/rakuten-csv.ts
- src/lib/import/amazon-report.ts
- src/app/api/admin/import/upload/route.ts
- src/app/api/admin/import/execute/route.ts
- src/app/[locale]/admin/import/ImportClient.tsx

现状：
- 上传接口有 admin 鉴权和 5MB 限制。
- execute 有 5000 行限制。
- 导入后默认创建 draft 商品（isActive=false）。
- SyncJob/SyncJobItem 可以记录导入结果。

主要缺口：
- 当前页面“执行导入为草稿”可以绕过预览直接执行，缺少二次确认。
- 字段映射不可配置，遇到实际 RMS/亚马逊报表列名变体时需要改代码。
- 只覆盖导入 import，不覆盖上架 publish/export/sync 的完整生命周期。
- ProductPlatformListing status 目前为 draft/active/inactive，缺少 pending/exported/error 等更适合外部平台上架的状态。
- 缺少平台导出模板生成接口，例如乐天 RMS CSV、Amazon Listing Loader/Inventory Loader。

## 2. 目标架构

### 2.1 分层架构

建议按 6 层拆分：

1. Locale Detection Layer
   - middleware 只负责轻量 redirect。
   - 语言决策输入：路径 locale、preferredLocale cookie、geoLocale cookie、Vercel/Cloudflare 国家头、Accept-Language。
   - 不调用第三方 GeoIP API。

2. Import Adapter Layer
   - 每个平台一个 adapter：rakuten、amazon、own。
   - 负责 parse、validate、normalize、field mapping。
   - 输出统一 ParsedProductRow。

3. Product Draft Layer
   - 所有外部导入先进入 Product.isActive=false。
   - ProductPlatformListing.status=draft。
   - 管理员审核后才能发布。

4. Publish Orchestrator Layer
   - 自营站发布：draft → active。
   - 外部平台发布：生成导出任务或 API 任务。
   - 统一写 SyncJob/SyncJobItem 日志。

5. Export/API Connector Layer
   - P2：CSV/TSV 模板导出。
   - P4：乐天 RMS API / Amazon SP-API 写接口。
   - 写接口必须有 dry-run、preview、confirm、audit log。

6. Admin UI Layer
   - 导入中心：上传、映射、预览、执行、历史。
   - 商品审核：草稿列表、批量发布到自营站。
   - 上架中心：选择平台、生成模板、下载、标记已上传、查看错误。

### 2.2 数据流

IP语言切换：
用户访问 / → middleware 检查 preferredLocale → 检查 geoLocale → 读取国家头/Accept-Language → redirect /ja|/zh|/en → 设置 geoLocale cookie → 用户可手动切换并写 preferredLocale。

多平台导入：
管理员上传文件 → adapter 解析 → 字段映射与错误预览 → 管理员确认 → SyncJob(import/running) → 创建/更新 Product draft → 写 ProductPlatformListing draft → 写 SyncJobItem → SyncJob done/failed。

自建站上架：
管理员选择商品草稿 → 预览待发布商品 → confirm → Product.isActive=true → ProductPlatformListing(platform=own,status=active) → SyncJob(type=publish,platform=own) 完成。

乐天/Amazon 模板上架：
管理员选择商品 → 选择平台 → 生成平台模板 CSV/TSV → ProductPlatformListing.status=exported/pending_upload → 下载文件人工上传 → 管理员回填/上传结果报表 → 更新 listing status。

乐天/Amazon API 上架：
管理员选择商品 → 平台 API dry-run 校验 → confirm → 写入 outbox job → server action/route handler 调用平台 API → 更新 listing status=active/error → 全量日志留痕。

## 3. 技术选型

### 3.1 IP语言切换

推荐：Next.js middleware + Vercel/Cloudflare geo headers。

优先读取：
- x-vercel-ip-country
- cf-ipcountry
- cloudfront-viewer-country
- x-country-code

兜底读取：
- Accept-Language

不用：
- middleware 内 fetch 第三方 GeoIP API。

原因：
- 性能更稳，首屏跳转不依赖外部网络。
- Vercel/Cloudflare 已经在边缘层完成 IP 国家识别。
- 减少隐私风险和 API 限流风险。

### 3.2 导入/上架

保留当前 Next.js Route Handlers + Prisma + PostgreSQL。

新增逻辑建议放在：
- src/lib/import/adapters/*：平台导入 adapter。
- src/lib/listing/exporters/*：平台导出模板生成。
- src/lib/listing/publish-service.ts：统一发布编排。
- src/app/api/admin/listings/*：上架相关 API。

暂不引入队列系统。当前 5000 行内的 CSV 导入可同步执行；后续如果 API 上架或文件超过 Vercel 超时限制，再引入 Inngest/QStash/Trigger.dev。

### 3.3 文件编码

乐天 RMS CSV 常见 Shift-JIS。

短期方案：
- UI 明确提示“请先用 UTF-8 保存 CSV”。
- 解析失败时提示编码问题。

中期方案：
- 引入 iconv-lite，在服务端自动识别/转换 Shift-JIS。
- 或在浏览器端用 TextDecoder('shift-jis') 做预处理。

## 4. 目录结构方案

建议新增/调整：

src/lib/locale/
- detect-locale.ts
  - detectLocaleFromRequest(request): Locale
  - detectLocaleFromCountry(country): Locale
  - detectLocaleFromAcceptLanguage(header): Locale

src/lib/import/
- adapters/base.ts
  - ImportAdapter interface
  - ParseResult / NormalizedProductDraft
- adapters/rakuten.ts
  - 乐天 RMS CSV 字段映射、校验、normalize
- adapters/amazon.ts
  - Amazon Seller Central 报表字段映射、校验、normalize
- adapters/own.ts
  - 自营 CSV 导入
- field-mapping.ts
  - 内置列名映射 + 自定义映射扩展
- sync-job.ts
  - 保留，但只负责 job 生命周期和执行 orchestration

src/lib/listing/
- publish-service.ts
  - publishToOwnSite(productIds, adminId)
  - createExportJob(platform, productIds, options)
- exporters/base.ts
  - ListingExporter interface
- exporters/rakuten-rms-csv.ts
  - 生成乐天 RMS 上传 CSV
- exporters/amazon-listing-loader.ts
  - 生成 Amazon 模板 TSV/CSV
- platform-status.ts
  - listing 状态常量与转换规则

src/app/api/admin/listings/
- publish-own/route.ts
  - 自建站批量上架
- export/route.ts
  - 生成平台模板文件
- jobs/route.ts
  - 上架/导出任务列表
- jobs/[id]/route.ts
  - 任务详情

src/app/[locale]/admin/listings/
- page.tsx
  - 多平台上架中心
- ListingClient.tsx
  - 选择商品、选择平台、预览、发布/导出

src/app/[locale]/admin/import/
- ImportClient.tsx
  - 改为必须先 preview 后 execute；加入字段映射确认

## 5. 核心文件说明

### src/middleware.ts

职责：
- 只做轻量语言 redirect。
- 不请求第三方 GeoIP。
- 不依赖 Node runtime。

决策优先级：
1. URL 已带 locale：直接 NextResponse.next。
2. API/静态/SEO 文件：直接 next。
3. preferredLocale cookie：最高优先级。
4. geoLocale cookie：次优先级。
5. geo header：x-vercel-ip-country/cf-ipcountry/cloudfront-viewer-country。
6. Accept-Language。
7. defaultLocale=en。

### src/lib/locale/detect-locale.ts

职责：
- 把语言判断从 middleware 中抽离，便于单元测试。
- 国家映射只映射项目已支持 locales，不允许返回 routing 未支持语言。
- 输出 { locale, source }，source 可为 cookie/geo/accept-language/default，便于日志和调试。

### src/lib/import/adapters/base.ts

职责：
- 统一平台导入 adapter 接口。
- 每个平台 adapter 必须输出统一字段：platformSku、platformItemId、titleJa/titleEn/titleZh、brand、price、stock、images、description、category、rawRow。

### src/lib/listing/publish-service.ts

职责：
- 管理商品上架状态转换。
- publishToOwnSite：只改自营站可见性，不触发外部平台写操作。
- createPlatformExportJob：生成文件并记录 SyncJob。
- 后续 P4 的 publishToExternalPlatform 必须强制 dry-run + confirmToken。

### src/lib/listing/exporters/rakuten-rms-csv.ts

职责：
- 把 Product + Variant + Listing 转成 RMS 可上传 CSV。
- 字段至少包括：商品管理番号、商品番号、商品名、販売価格、在庫数、商品説明文、画像URL1、ジャンルID/カテゴリ。
- 注意 CSV 转义、日文编码、价格单位。

### src/lib/listing/exporters/amazon-listing-loader.ts

职责：
- 生成 Amazon Seller Central 可用模板。
- 初期可只覆盖 inventory/price update，不直接创建复杂新 ASIN。
- 字段至少包括：seller-sku、item-name、price、quantity、product-id/asin、main-image-url。

## 6. 实施阶段拆分

### P1：IP语言切换稳定化 + 导入确认流

目标：不改变数据库结构或只做轻量 additive migration，先把当前 P0 功能变稳定。

任务：
1. 抽离 locale detection 到 src/lib/locale/detect-locale.ts。
2. 改 middleware：删除 nodejs runtime 和 ipwhois fetch，改读 geo headers + Accept-Language。
3. 加语言切换组件逻辑：手动选择写 preferredLocale cookie，优先级高于 IP。
4. ImportClient 改为必须先“解析预览”后才能“确认导入”。
5. 导入 execute 接口增加 previewHash/confirmToken，避免用户换文件后误执行。
6. 导入历史页显示成功/失败/跳过明细。

验收：
- / 使用 x-vercel-ip-country: JP 时跳 /ja。
- / 使用 x-vercel-ip-country: CN/HK/TW/MO 时跳 /zh。
- / 使用 x-vercel-ip-country: US/GB/DE/FR 时按支持语言映射或英文兜底。
- preferredLocale=zh 时无论国家头都跳 /zh。
- 无第三方 GeoIP 请求。
- 后台导入无法绕过预览直接执行。

### P2：自建站一键上架

目标：真正落实“导入后审核，一键发布到 kangaroo-shop”。

任务：
1. 新增后台草稿商品列表筛选：isActive=false。
2. 新增 /api/admin/listings/publish-own。
3. publish-own 支持批量 productIds。
4. 事务内更新 Product.isActive=true，并 upsert ProductPlatformListing(platform=own,status=active)。
5. 写 SyncJob(type=publish,platform=own) 和 SyncJobItem。
6. 后台上架中心展示发布结果。

验收：
- 导入商品默认前台不可见。
- 管理员勾选商品后点击“发布到自营站”。
- 发布后 /[locale]/products 可见。
- sync_jobs 可查到 publish own 任务。

### P3：乐天/Amazon 模板导出

目标：在不调用平台写 API 的前提下，让运营可以“一键生成上架文件”。

任务：
1. 新增 exporter interface。
2. 实现 rakuten-rms-csv exporter。
3. 实现 amazon listing/inventory loader exporter。
4. 新增 /api/admin/listings/export。
5. 导出任务写 ProductPlatformListing.status=exported 或 pending_upload。
6. UI 支持下载导出文件和查看导出历史。

验收：
- 选择商品 + 平台=rakuten → 下载 RMS CSV。
- 选择商品 + 平台=amazon → 下载 Amazon TSV/CSV。
- 导出不改变 Product.isActive。
- 导出任务和行明细可追踪。

### P4：平台 API 自动上架（高风险，需审批）

目标：真正通过 RMS API / Amazon SP-API 自动发布。

前置条件：
- 花哥明确授权外部平台写操作。
- 配置平台 API key 到 Vercel 环境变量，不进代码仓库。
- 拿到测试店铺/sandbox 权限。
- 已完成 dry-run、审计日志、失败重试、回滚/下架策略。

任务：
1. 新增 PlatformCredential 配置读取层，不落库明文密钥。
2. RMS API client：先只读，再写草稿，再发布。
3. Amazon SP-API client：先 feeds/document upload sandbox，再生产。
4. 引入 outbox/job runner，避免 Vercel route 超时。
5. 所有写操作需要 confirmToken + audit log。

验收：
- sandbox 或测试店铺完成一次 API 草稿创建。
- 失败时 ProductPlatformListing.status=error，syncError 有明确原因。
- 生产写操作必须二次确认。

## 7. 数据模型建议

当前 schema 可继续使用，但建议 P2/P3 加以下 additive 字段或状态约定：

ProductPlatformListing.status 建议扩展语义：
- draft：导入草稿，未审核。
- ready：已审核，可导出/上架。
- active：已在该平台上架。
- inactive：该平台下架。
- exported：已生成模板，待人工上传。
- pending：API 上架任务等待中。
- error：上架/同步失败。

SyncJob 建议增加 type 字段（如果生产表当前没有）：
- import
- publish
- export
- sync
- api_publish

如果当前生产 migration 已按 P0 版本落库，新增 type 字段必须 additive：默认 import，避免破坏历史数据。

## 8. 安全边界

必须遵守：
- 不把平台密钥写入代码、数据库明文字段或任务日志。
- 不自动把导入商品发布到外部平台。
- 所有外部平台写操作必须 preview + confirm + audit log。
- 高风险操作包括：生产环境配置、生产库 migration、Vercel prod deploy、乐天/Amazon 写接口调用；执行前必须花小妹/花哥审批。
- API 自动上架前必须先支持模板导出，让运营有人工兜底。

## 9. Claude Code 执行任务书草案

### 任务 A：IP语言切换稳定化

目标：重构 middleware，移除第三方 GeoIP fetch，使用 geo headers + Accept-Language + cookie。

修改文件：
- src/middleware.ts
- 新增 src/lib/locale/detect-locale.ts
- 可选新增 src/lib/locale/detect-locale.test.ts（如项目测试框架允许）

关键要求：
- 不在 middleware 中 fetch 第三方 GeoIP。
- 不声明 nodejs runtime。
- 只返回 locales 中存在的语言。
- 保留 preferredLocale > geoLocale > geo header > Accept-Language > defaultLocale 优先级。

验证命令：
- pnpm exec tsc --noEmit
- pnpm lint
- pnpm build
- curl 使用不同 header 验证根路径跳转。

### 任务 B：导入预览确认流

目标：后台导入必须先预览后确认执行，避免误导入。

修改文件：
- src/app/[locale]/admin/import/ImportClient.tsx
- src/app/api/admin/import/upload/route.ts
- src/app/api/admin/import/execute/route.ts
- src/lib/import/sync-job.ts

关键要求：
- upload 返回 previewHash。
- execute 要求带 previewHash/confirm=true。
- UI 只有 preview 成功后才允许 execute。
- 执行时文件内容必须与 previewHash 一致。

验证命令：
- pnpm exec tsc --noEmit
- pnpm lint
- 手动上传样本 CSV：未 preview 时 execute 应失败；preview 后 execute 成功。

### 任务 C：自建站一键上架

目标：草稿商品一键发布到 kangaroo-shop 自营站。

新增文件：
- src/lib/listing/publish-service.ts
- src/app/api/admin/listings/publish-own/route.ts
- src/app/[locale]/admin/listings/page.tsx
- src/app/[locale]/admin/listings/ListingClient.tsx

修改文件：
- src/app/[locale]/admin/layout.tsx（新增“上架中心”入口）

关键要求：
- 仅 admin 可访问。
- 批量 productIds。
- 事务内更新 Product.isActive=true。
- upsert ProductPlatformListing(platform=own,status=active)。
- 写 SyncJob/SyncJobItem。

验证命令：
- pnpm exec tsc --noEmit
- pnpm lint
- pnpm build
- 创建 draft 商品 → publish-own → /products 可见。

### 任务 D：乐天/Amazon 模板导出

目标：不调用外部写 API，先生成运营可上传模板。

新增文件：
- src/lib/listing/exporters/base.ts
- src/lib/listing/exporters/rakuten-rms-csv.ts
- src/lib/listing/exporters/amazon-listing-loader.ts
- src/app/api/admin/listings/export/route.ts

关键要求：
- 只生成文件，不调用外部平台。
- 文件内容必须正确 CSV/TSV 转义。
- 导出任务写 SyncJob(type=export) 和 SyncJobItem。
- listing status 更新为 exported。

验证命令：
- pnpm exec tsc --noEmit
- pnpm lint
- pnpm build
- 用 1-2 个商品导出文件，人工检查字段。

## 10. Codex gpt-5.5 验证任务草案

命令：

codex exec -m gpt-5.5 '请在 /Users/hulonghua/projects/kangaroo-shop 中审查 IP语言切换 + 多平台导入/上架改动。重点验证：1) middleware 不调用第三方 GeoIP 且 header/cookie 优先级正确；2) 导入必须 preview 后 execute；3) 自建站 publish-own 只允许 admin 且事务写 Product/ProductPlatformListing/SyncJob；4) 乐天/Amazon export 只生成文件不调用外部写接口；5) pnpm exec tsc --noEmit、pnpm lint、pnpm build 是否通过。输出阻塞问题、非阻塞建议和最终 verdict。'

## 11. 交付顺序建议

推荐顺序：
1. P1-A IP语言切换稳定化。
2. P1-B 导入预览确认流。
3. P2-C 自建站一键上架。
4. P3-D 乐天/Amazon 模板导出。
5. 收到平台 API 权限后再做 P4。

不建议一口气把 P1-P4 全部合并，因为 P4 外部写接口风险高、依赖平台权限，容易阻塞当前全球站上线节奏。

## 12. 待花哥/花小妹确认材料

1. Logo 图片：用于视觉配色和品牌系统。
2. 乐天 RMS 实际 CSV 样本：至少 1 个商品、含 SKU/价格/库存/图片/描述。
3. Amazon Seller Central 实际报表样本：至少 open listings 或 inventory loader 样本。
4. 是否先只支持日本/欧美三大语言 en/ja/zh，还是继续保留当前 11 语言。
5. P4 API 自动上架是否有测试店铺/sandbox；没有则先不做 API 写接口。


## 13. Codex gpt-5.5 只读复审与补强决议

复审时间：2026-04-29 12:22 JST
复审方式：codex exec -m gpt-5.5，只读审查架构方案，不修改文件。
复审结论：Conditional pass。

### 13.1 复审指出的问题

1. “真正多平台一键上架”尚未在 P1-P3 完全满足：P3 仍是模板导出 + 人工上传，真实乐天/Amazon API 写入被放到 P4。该分阶段方案合理，但对外汇报时必须说明“自营站先一键上架，外部平台先一键生成模板，API 自动上架需审批后做”。
2. Locale 范围需要尽快拍板：需求强调日/中/英，当前项目保留 11 个 locale。实施 P1 时建议先按 JP→ja、CN/HK/TW/MO→zh、其他→en 固定逻辑，其他语言保留路由但不作为 IP 自动跳转目标。
3. P4 安全机制需要从原则变成模型：需要 PlatformActionLog/AuditLog、admin actor、confirm token 过期时间、sandbox/prod 隔离、kill switch、凭证轮换策略。
4. 全球电商基础能力未完全覆盖：币种、税费/VAT、配送区域、禁运/合规、翻译完整性、平台价格/库存归属规则，需要进入后续全球站能力规划。
5. 乐天 Shift-JIS 对真实 RMS CSV 是刚需，不应长期停留在“中期方案”。拿到样本后应优先补编码支持。
6. 当前工作区 src/middleware.ts 已经出现 header-based 语言切换版本（无第三方 GeoIP fetch），但仍未抽离 detect-locale.ts，也缺少 Accept-Language 兜底和测试；后续执行应以当前工作区为准，避免重复改同一逻辑。

### 13.2 架构补强决议

P1 执行时增加以下硬要求：
- IP 自动跳转只输出 ja/zh/en 三类：JP→ja，CN/HK/TW/MO→zh，其他国家默认 en。
- preferredLocale / NEXT_LOCALE cookie 仍最高优先级。
- 保留 11 个 locale 路由不删除，但非核心语言暂不参与 IP 自动分流。
- detect-locale.ts 必须覆盖 cookie、geo header、Accept-Language、default 四类测试。
- 导入 execute 必须增加 previewHash/confirmToken，不能直接拿文件执行。
- SyncJob.type 与 ProductPlatformListing status 扩展应作为 P2/P3 前置 additive migration。
- P3 模板导出必须定义幂等键优先级：platform+platformSku 优先，其次 platform+platformItemId，最后 productId。
- P4 前必须新增 PlatformActionLog 或 AuditLog，不允许只靠 SyncJob 代替审计。

### 13.3 P4 最低安全模型草案

建议新增模型（正式实施前再由 Claude Code 按 Prisma 风格落库）：
- PlatformActionLog
  - id
  - platform: rakuten | amazon | own
  - action: export | api_publish | api_update | api_delist
  - status: pending | confirmed | running | success | error | cancelled
  - actorAdminId / actorEmail
  - targetProductIds: Json
  - requestPreview: Json
  - confirmTokenHash
  - confirmExpiresAt
  - sandbox: Boolean
  - killSwitchVersion
  - result: Json
  - errorMsg
  - createdAt / confirmedAt / finishedAt

P4 API 写入必须检查：
- PLATFORM_WRITE_ENABLED=true
- platform sandbox/prod 环境显式匹配
- confirm token 未过期且 hash 匹配
- actor 仍为 active admin
- 商品仍处于 ready/exported/pending 状态，不能越权发布 draft/error 商品
