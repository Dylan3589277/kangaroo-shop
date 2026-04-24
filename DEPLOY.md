# 袋鼠君独立站 — 部署指南

## 环境要求
- Node.js 18+
- pnpm 8+
- Vercel 账号（免费即可部署）

## 快速部署

### 方式一：Vercel 一键部署（推荐）

1. Fork 本仓库到 GitHub
2. 访问 https://vercel.com/new 导入项目
3. 在 Vercel 项目设置中配置环境变量（见下方）
4. 点击 Deploy

### 方式二：本地构建后上传

```bash
pnpm build
# 将 .next 目录部署到 Vercel
vercel --prod
```

## 环境变量（必需）

在 Vercel 项目 Settings → Environment Variables 中配置：

| 变量名 | 值 | 说明 |
|--------|-----|------|
| STRIPE_SECRET_KEY | sk_live_xxxxxxxxxx | Stripe Secret Key（生产用） |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | pk_live_xxxxxxxxxx | Stripe Publishable Key |
| PAYPAL_CLIENT_ID | xxx | PayPal Client ID |
| PAYPAL_CLIENT_SECRET | xxx | PayPal Client Secret |

测试环境用 test key，上线前换成 live key。

## 域名绑定

1. 在 Vercel 项目 Settings → Domains 添加自定义域名
2. 在域名服务商处配置 CNAME 记录指向 `cname.vercel-dns.com`
3. 等待 DNS 生效（约5分钟~24小时）

## Stripe 生产环境配置

1. 在 Stripe Dashboard 将 Webhook 指向：`https://你的域名/api/webhooks/stripe`
2. 启用 events：payment_intent.succeeded, payment_intent.failed
3. 将 Secret Key 从 test 切换为 live

## PayPal 生产环境配置

1. 在 PayPal Developer 将 API 端点从 sandbox 切换为 production
2. 将 `https://api-m.sandbox.paypal.com` 改为 `https://api-m.paypal.com`

## 性能优化

- 静态页面已预渲染（build 时生成）
- 图片使用 next/image 自动优化
- Stripe.js 按需加载
- 中间件缓存 GeoIP 查询结果（1小时）

## 监控

- Vercel Analytics：提供免费访问分析
- Stripe Dashboard：支付监控
- 建议接入 Sentry 做错误追踪
