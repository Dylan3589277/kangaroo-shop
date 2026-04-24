# 袋鼠君独立站 — 项目状态摘要

| 字段 | 内容 |
|---|---|
| **Project** | 袋鼠君独立站（kangaroo-shop） |
| **Team** | 花哥（胡龙华）、花小妹（Hermes Agent）、花小弟（OpenClaw） |
| **Lead** | 花哥 |
| **Status** | 🚧 第二阶段进行中 |
|| **Progress** | Day 3 ✅ 完成，Day 4 ✅ 完成，Day 5 ✅ 完成（邮件通知已部署，SMTP 待配置） ||
|| **Updated** | 2026-04-18 |
| **线上地址** | https://kangaroo-shop-tan.vercel.app |
| **Ports** | 本地开发：localhost:3000 |
| **Created** | 2026-03 |
| **Stack** | Next.js 14 + TypeScript + Tailwind CSS + Stripe + PayPal + Vercel + Prisma + NextAuth |

---

## 第二阶段进度

| 阶段 | 状态 | 说明 |
|---|---|---|
| Day 1 | ✅ 完成 | Prisma Schema + MySQL 连接 + Seed 数据 |
| Day 2a | ✅ 完成 | Orders API → Prisma（创建/查询/状态更新） |
| Day 2b | ✅ 完成 | Products API → Prisma CRUD + Bug 修复 |
| Day 3 | ✅ 完成（测试验收通过） | NextAuth 认证 + 管理后台（含 Login Bug 修复：login 页面移至 (auth) 路由组解决循环重定向） |
| Day 4 | ✅ 完成（测试验收待做） | 管理后台页面（订单列表+详情+状态更新，商品列表+新增+编辑，pnpm build 通过） |
| Day 5 | ✅ 完成（邮件通知已部署，SMTP 环境变量待配置，cron 提醒已设置） |

---

## 第一阶段完成 ✅（2026-04-17）

- ✅ 商品展示页
- ✅ 购物车
- ✅ PayPal 完整支付链路
- ✅ Stripe 完整支付链路
- ✅ 订单确认页 / 成功页 / 取消页
- ✅ 管理后台（**Day 3-4 开发中**）

---

## 技术栈

| 组件 | 当前 |
|---|---|
| 数据库 | MySQL（Vercel MySQL） + Prisma 5.22 |
| 管理后台 | NextAuth 认证中（Day 3） |
| 邮件通知 | nodemailer + SMTP（Day 5 接入，邮件模板为日文，SMTP 待配置） |
| Webhook | Stripe Webhook（已写待生产验证） |

---

## 环境变量（.env.local）

```
# Database
DATABASE_URL=mysql://xxx（Vercel MySQL）

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxx（待配置）

# PayPal
PAYPAL_CLIENT_ID=xxx
PAYPAL_CLIENT_SECRET=xxx

# NextAuth（Day 3 新增）
NEXTAUTH_SECRET=xxx（待配置）
NEXTAUTH_URL=http://localhost:3000（生产环境需改为正式域名）
```

---

## 数据库 Schema（Prisma）

- `Order` — 订单（含 paymentStatus/courier/shipping 字段）
- `OrderItem` — 订单项（关联 productId）
- `Product` — 商品（isActive/category/tags 等）

---

## 部署记录

| 日期 | 版本 | 说明 |
|---|---|---|
| 2026-04-17 | v1 | 第一阶段完成，支付全通，部署到 Vercel |
| 2026-04-17 | v2 | Day 2 完成，Prisma 接入，数据持久化 |
| 2026-04-18 | v3 | Day 3 完成，NextAuth 管理后台 |
| 2026-04-18 | v4 | Day 4 完成，管理后台订单/商品管理页面 |
| 2026-04-18 | v5 | Day 5 完成，邮件通知功能（nodemailer），Bug 修复（价格单位/CSS class） |
