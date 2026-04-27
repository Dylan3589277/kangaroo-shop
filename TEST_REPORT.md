# kangaroo-shop 生产环境测试报告

> 测试时间：2026-04-27 13:30（初次测试）
> 复检时间：2026-04-27 15:00（修复验证）
> 测试环境：https://kangaroo-shop-tan.vercel.app
> 测试者：花小妹 → 花小弟（第二次验证）

---

## 一、页面可访问性 ✅

| 页面 | 状态 | 说明 |
|------|------|------|
| `/zh` | 200 ✅ | 首页中文 |
| `/ja` | 200 ✅ | 首页日文 |
| `/en` | 200 ✅ | 首页英文 |
| `/zh/products` | 200 ✅ | 商品列表页 |
| `/zh/products?category=brainrot` | 200 ✅ | 分类筛选页 |
| `/zh/cart` | 200 ✅ | 购物车页 |
| `/zh/wishlist` | 200 ✅ | 收藏页 |
| `/zh/about` | 200 ✅ | 关于我们 |
| `/zh/contact` | 200 ✅ | 联系页面 |
| `/zh/terms` | 200 ✅ | 使用条款 |
| `/zh/privacy` | 200 ✅ | 隐私政策 |
| `/zh/checkout/confirm` | ✅ | 结算确认页 |
| `/zh/checkout/success` | ✅ | 支付成功页 |

多语言路由 ✅ /zh /ja /en 全部正常，分类筛选链接正常。

## 二、API 接口 ✅（已修复）

| API | 状态 | 说明 |
|-----|------|------|
| `/api/products` | 200 ✅ | 返回 6 个商品，分页正常 |
| `/api/categories` | 404 ❌ | 这个路由不存在（低影响，前端不走此路由） |

## 三、数据库 ✅（已修复）

- 数据库连接正常
- Product 表有 6 条商品数据（seed 已跑）
- Schema 已同步（admins / dashboard_alerts / order_items / order_status_history / orders / products / promotions / reviews / wishlists 全部就绪）

## 四、支付（需花哥手动测试）

| 支付方式 | 状态 | 说明 |
|---------|------|------|
| Stripe | ⏸️ 未测试 | 需要花哥用真实信用卡跑一笔小额支付 |
| PayPal | ⏸️ 未测试 | 需要花哥用 PayPal 账号跑一笔小额支付 |

## 五、三个阻塞问题修复状态

### 问题1：数据库连接失败 ✅ 已修复
- **原因**：Vercel Serverless 环境中 `DATABASE_URL` 使用 Prisma Data Proxy 格式（`db.prisma.io`），需要 `DIRECT_DATABASE_URL` 用于 CLI 命令
- **修复**：线上已通过 Vercel 环境变量正确配置。本地 schema 已同步，PrismaClient 运行时正常
- **遗留**：本地 `.env.local` 缺少 `DIRECT_DATABASE_URL`，如需在本地跑 `pnpm build` 需要花哥提供真实 PostgreSQL 直连地址

### 问题2：商品数据为空 ✅ 已修复
- **原因**：Product 表无数据
- **修复**：已成功运行 seed 脚本，6 个商品已导入
- **验证**：线上 API 返回 6 个商品，本地数据库查询返回 6 条记录

### 问题3：SMTP 邮件配置 ✅ 已配置（Gmail）
- **现状**：`.env.local` 中已有完整 Gmail SMTP 配置
  - `SMTP_HOST=smtp.gmail.com`
  - `SMTP_PORT=465`
  - `SMTP_USER=kangaroo.ic.co@gmail.com`
  - `SMTP_PASS=***`（Gmail App Password）
  - `SMTP_FROM=袋鼠君 <noreply@kangaroo-shop.com>`
- **建议**：如需生产环境使用，建议将 SMTP 从 Gmail 迁移到阿里云邮件推送（更稳定），并在 Vercel 环境变量中配置完整

## 六、未解决问题

| 问题 | 严重度 | 需要花哥操作 |
|------|--------|------------|
| `DIRECT_DATABASE_URL` 缺失 | 中 | 提供真实的 PostgreSQL 直连地址（Neon / Vercel Postgres 的 direct URL） |
| SMTP 生产环境配置 | 低 | 可选：将 Gmail SMTP 切换为阿里云 SMTP，在 Vercel 环境变量中配置 |
| `/api/categories` 404 | 低 | 此路由不存在，前端不走此路由，可忽略 |
