# 上线前检查清单

## 功能检查
- [ ] 首页 /ja /zh /en 三语言都能访问
- [ ] 商品列表页正常显示
- [ ] 商品详情页能打开（有商品id路由）
- [ ] 购物车页面正常加载
- [ ] 收货地址表单邮编自动格式化生效
- [ ] 快递公司切换运费实时更新
- [ ] Stripe 支付表单能显示（用 test key）
- [ ] PayPal 按钮能显示（用 sandbox）
- [ ] IP 语言切换：/ 根路径自动跳转

## 安全检查 ✅ 已完成（达摩院审查）
- [x] STRIPE_SECRET_KEY 不在前端暴露 ✅
- [x] NEXT_PUBLIC_ 开头的都是公开 safe key ✅
- [x] 支付在服务端创建 PaymentIntent ✅（create-payment-intent在api路由）
- [x] 表单有基础验证 ✅（支付方式/购物车/金额/邮编）
- [x] 文档中有pk_live_xxx格式示例，已改为明显占位符 ✅

## 性能检查 ✅ 已完成（达摩院审查）
- [x] pnpm build 成功无错误 ✅（77/77页面生成）
- [x] 图片有懒加载 ✅ 商品详情页已改用next/image
- [x] 无 console.error ✅（仅开发环境日志，无风险）

## 部署检查
- [ ] Vercel 环境变量已配置（Stripe/PayPal key）
- [ ] 自定义域名已绑定
- [ ] HTTPS 已生效
- [ ] Stripe Webhook 已配置（生产环境）

---

## 达摩院审查发现的待修复问题
- [x] 商品详情页 `src/app/[locale]/products/[id]/page.tsx` 第88行和第181行使用了原生`<img>`标签，应改用`next/image`
- [x] `DEPLOY.md`和`STATE.md`中的`pk_live_xxx`/`sk_live_xxx`改为明显占位符格式
