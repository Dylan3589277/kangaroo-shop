# 袋鼠君跨境电商站 — 项目状态摘要

Project：kangaroo-shop（袋鼠君跨境电商站，中国进货卖全球）
Team：花哥（胡龙华）、花小妹（Hermes Agent）、花小弟（OpenClaw）、达摩院/Claude Code
Lead：花哥
Status：✅ 现有功能优化与 API 请求体加固阶段已完成并上线；下一阶段待花哥确认
Progress：
- ✅ boss-dashboard P0、三平台导入地基、全球跨境定位、IP/地区语言切换、品牌配色、多平台上架中心已生产上线
- ✅ tawk.to 客服入口与三语言 FAQ 帮助页已在 kangaroo-shop 上线
- ✅ 管理端 API 认证、订单隐私脱敏、支付金额服务端重算、PayPal capture 归属/金额/币种校验已完成并上线
- ✅ 全站 API 路由直接 `req.json()` / `request.json()` 已清零，统一接入 `parseRequestJsonObject`，空 body/非法 JSON/null/数组/非对象请求体返回 400，避免生产 500
- ✅ 最新功能提交 `5f05fa7 Harden payment creation request parsing` 已 push 到 `origin/main`，Vercel 生产部署 Ready，主域可访问
- ✅ 项目进度文档已保存并推送到 `origin/main`
Updated：2026-05-01 09:44 JST
线上地址：https://kangaroo-shop-orpin.vercel.app
Ports：本地开发通常为 localhost:3000；端口占用时 Next.js 会自动切到 3001
Created：2026-03
Stack：Next.js 14.2.35 + TypeScript + Tailwind CSS + Stripe + PayPal + Vercel + Prisma 5.22 + NextAuth + next-intl

---

## 当前验收状态

- 测试：`pnpm test` 通过
- 代码规范：`pnpm lint` 通过；仅保留既有 `src/app/og/[id]/route.tsx` 的 `<img>` 提示，不阻断
- 类型检查：`pnpm exec tsc --noEmit --skipLibCheck` 通过
- 生产构建：`pnpm build` 通过
- API 请求体加固复核：`src/app/api` 下未发现直接 `await req.json()` 或 `await request.json()`
- 线上冒烟：`/zh`、`/ja`、`/en`、商品/购物车/后台登录/健康 API 等关键路径正常
- 支付创建路由非法 body 验证：`/api/create-payment-intent` 与 `/api/create-paypal-order` 空 body 均返回 400 `Invalid request body`

---

## 最近关键提交

- `5f05fa7 Harden payment creation request parsing`：加固 Stripe/PayPal 支付创建接口请求体解析，补测试，已 push 并生产部署
- `c1070ec Harden order creation request parsing`：加固订单创建接口请求体解析，已 push 并生产部署
- `e9faddb Harden order and promotion request parsing`：加固优惠券与后台订单状态/通知接口请求体解析，已 push 并生产部署
- `20ccb1f Tighten PayPal capture request validation`：PayPal capture 空 body/空 JSON 请求体校验修正，已 push 并生产部署
- `fd7fd2f Harden PayPal capture validation`：PayPal capture 归属/金额/币种校验，已 push

---

## 待确认的下一阶段

- 可选 1：Stripe/PayPal 真实支付端到端测试（会触及真实支付/沙盒配置，需花哥确认边界）
- 可选 2：继续做管理后台体验优化、商品导入/模板运营流程优化
- 可选 3：客服系统 Phase2 订单/物流只读查询实施（涉及受控内部接口与审计日志，上线前需单独确认）
- 可选 4：清理历史死代码 `src/lib/orders.ts` 与旧文档描述，但需先做引用检查和回归测试

---

## 安全边界

- 不直接调用乐天/Amazon 外部平台真实写接口，除非花哥单独审批并提供凭据
- 不修改生产环境配置、数据库 schema 或批量数据，除非花哥明确同意
- 支付、退款、订单状态、库存、优惠券计数等高风险链路必须先补测试，再实施，再复审
