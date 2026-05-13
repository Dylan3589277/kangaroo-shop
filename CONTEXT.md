# kangaroo-shop 袋鼠君跨境电商站 · CONTEXT

本文件是项目领域词典和 AI 执行上下文，不是进度流水账。

## 项目定位

中国进货卖全球，主要目标市场是日本、欧美。Brainrot IP 周边，Stripe + PayPal，已部署 Vercel。

## 项目边界

不能使用 daishujundulizhan 数据库；该数据库属于 kangaroo-japan 日本代拍独立站。kangaroo-shop 使用 Vercel Storage 的 kangaroo-shop 库。

## AI 执行前必须遵守

1. 写代码前先读本文件、`AGENTS.md`、`STATE.md`（如存在）和相关 README。
2. 新功能先澄清需求，再写 Agent Brief，再交给编码 agent。
3. Bug 修复必须先建立反馈环：测试、脚本、日志、curl、浏览器复现或录屏。
4. 重大且未来容易误判的技术取舍，记录到 `docs/adr/`。
5. 多 agent 交接必须写 handoff 摘要。
6. 不修改生产配置、数据库、支付、客户资料或对外发布内容，除非花哥明确同意。

## 核心术语

待达摩院在后续功能推进中逐步补充。新增术语必须是稳定业务概念，不写临时猜测。

## 已知易混淆点

1. `kangaroo-shop`：中国进货卖全球，Brainrot IP 周边，Stripe + PayPal，已部署 Vercel。
2. `kangaroo-japan`：日本代拍独立站，前端在 `~/workspace/kangaroo-japan/`，后端在 `~/workspace/kangaroo-japan-backend/`，数据库 `daishujundulizhan` 只属于 `kangaroo-japan`。
3. 袋鼠君小程序：日本代拍业务的微信小程序版。
4. `daishujundulizhan` 数据库只属于 `kangaroo-japan`，不属于 `kangaroo-shop`。

## 变更规则

1. 普通 coder agent 可以提出修改建议，但不能私自把临时理解写成权威术语。
2. 核心术语和架构边界由花小妹/达摩院审阅后更新。
3. 本文件只记录稳定事实；任务进度写到 `docs/progress.md` 或团队任务记录。
