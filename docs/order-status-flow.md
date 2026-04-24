# 订单状态流转文档

> 袋鼠君跨境电商站 · 订单支付状态管理
> 更新日期：2026-04-23
> 负责人：开发团队

---

## 1. 概述

本文档描述袋鼠君电商系统订单 **支付状态（paymentStatus）** 的所有合法取值及其流转规则。

- **存储字段**：`Order.paymentStatus`（Prisma schema 中定义）
- **状态历史**：所有状态变更均写入 `OrderStatusHistory` 表，包含 `fromStatus`、`toStatus`、`note`、时间戳
- **涉及支付渠道**：Stripe（信用卡）、PayPal

---

## 2. 状态定义

| 状态值 | 含义 | 说明 |
|--------|------|------|
| `pending` | 待支付 | 订单创建后初始状态，用户尚未完成付款 |
| `paid` | 已支付 | 支付渠道确认收款成功，订单生效 |
| `failed` | 支付失败 | 支付渠道返回失败（如信用卡拒付） |
| `cancelled` | 已取消 | 用户主动取消或管理员操作取消 |
| `refunded` | 已退款 | 管理员手动退款，订单完结 |

---

## 3. 状态流转图

```
                         ┌─────────────────────────────┐
                         │                             │
                         │        [订单创建]            │
                         │    POST /api/orders         │
                         │    paymentStatus = pending  │
                         │                             │
                         └──────────┬──────────────────┘
                                    │
          ┌─────────────────────────┼──────────────────────────┐
          │                         │                          │
          ▼                         ▼                          ▼
  ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
  │ Stripe 支付   │        │ PayPal 支付   │        │  用户取消      │
  │ 成功回调      │        │ 成功 capture  │        │  pending→     │
  │ pending→paid  │        │ pending→paid  │        │ cancelled      │
  └───────┬───────┘        └───────┬───────┘        └───────┬───────┘
          │                         │                          │
          │                         │                          │
          ▼                         ▼                          │
  ┌───────────────┐        ┌───────────────┐                  │
  │ paid          │        │ paid          │                  │
  │ (支付确认)    │        │ (PayPal       │                  │
  │               │        │  COMPLETED)   │                  │
  └───────┬───────┘        └───────────────┘                  │
          │                                                    │
          │                         ┌────────────────────────────┘
          │                         │
          ▼                         ▼
  ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
  │ Stripe 失败   │        │ PayPal 用户   │        │ 管理员操作    │
  │ pending→      │        │ 取消支付      │        │ paid→         │
  │ failed        │        │ pending→      │        │ refunded      │
  └───────────────┘        │ cancelled     │        └───────────────┘
                           └───────────────┘
```

---

## 4. 状态流转详情

### 4.1 `pending` → `paid`

**触发方式 A：Stripe 支付成功**
- 路径：`POST /api/stripe/webhook`
- 事件类型：`payment_intent.succeeded`
- 操作：更新 `Order.paymentStatus = 'paid'`，记录历史

```
pending --[Stripe payment_intent.succeeded]--> paid
备注：同时记录 stripePaymentIntentId
```

**触发方式 B：PayPal 支付成功**
- 路径：`POST /api/paypal/capture-order`
- 条件：PayPal 返回 `status === 'COMPLETED'`
- 操作：更新 `Order.paymentStatus = 'paid'`，记录历史

```
pending --[PayPal capture COMPLETED]--> paid
备注：同时记录 paypalOrderId
```

---

### 4.2 `pending` → `failed`

**触发方式：Stripe 支付失败**
- 路径：`POST /api/stripe/webhook`
- 事件类型：`payment_intent.payment_failed`
- 操作：更新 `Order.paymentStatus = 'failed'`

```
pending --[Stripe payment_intent.payment_failed]--> failed
```

> ⚠️ 注意：`failed` 状态下不会记录 `OrderStatusHistory`（webhook 中未调用 `prisma.orderStatusHistory.create`，这是当前实现的一个缺失，未来可补充）。

---

### 4.3 `pending` → `cancelled`

**触发方式 A：PayPal 用户取消**
- 路径：`POST /api/paypal/capture-order`
- 条件：请求中无 `paypalOrderId`（用户在 PayPal 侧取消支付）
- 操作：更新 `Order.paymentStatus = 'cancelled'`，记录历史，note 为 `'Cancelled via PayPal'`

```
pending --[PayPal 用户取消]--> cancelled
```

**触发方式 B：管理员手动取消**
- 路径：`PATCH /api/orders/{orderId}/status`
- 权限：仅管理员（`role === 'admin'`）
- 操作：更新 `paymentStatus = 'cancelled'`，记录历史

---

### 4.4 `paid` → `refunded`

**触发方式：管理员手动退款**
- 路径：`PATCH /api/orders/{orderId}/status`
- 权限：仅管理员
- 操作：更新 `paymentStatus = 'refunded'`，记录历史

```
paid --[管理员操作]--> refunded
```

---

## 5. 触发入口汇总

| 入口 | API 路由 | 触发条件 | 状态变化 |
|------|----------|----------|----------|
| 创建订单 | `POST /api/orders` | 订单创建 | → `pending` |
| Stripe 支付成功 | `POST /api/stripe/webhook` | `payment_intent.succeeded` | `pending` → `paid` |
| Stripe 支付失败 | `POST /api/stripe/webhook` | `payment_intent.payment_failed` | `pending` → `failed` |
| PayPal 捕获成功 | `POST /api/paypal/capture-order` | PayPal `COMPLETED` | `pending` → `paid` |
| PayPal 用户取消 | `POST /api/paypal/capture-order` | 无 `paypalOrderId` | `pending` → `cancelled` |
| 管理员手动更新 | `PATCH /api/orders/{orderId}/status` | admin 权限 | 任意 → 任意合法状态 |
| 管理员退款 | `PATCH /api/orders/{orderId}/status` | admin 权限，指定 `refunded` | `paid` → `refunded` |

---

## 6. API 详情

### 6.1 管理员状态更新

```
PATCH /api/orders/{orderId}/status
Authorization: session (admin role required)

Body:
{
  "status": "pending" | "paid" | "failed" | "cancelled" | "refunded",
  "note": "管理员备注（可选）"
}

合法状态转换（宽松校验，理论上可任意切换）：
  pending / paid / failed / cancelled / refunded

响应：
  200: { order, history }
  401: Unauthorized
  400: Invalid status
  404: Order not found
```

> ⚠️ 注意：当前实现对状态转换顺序**不做强制校验**（如可直接从 `failed` → `paid`）。建议未来增加转换规则限制。

---

### 6.2 订单创建

```
POST /api/orders
Body: { paymentMethod, items, subtotal, shippingFee, courier, shippingAddress, ... }
响应: { orderId, orderNumber }
初始状态: paymentStatus = 'pending'
```

---

## 7. 数据库表结构

### Order 表（核心字段）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | String | 订单 ID（cuid） |
| `orderNumber` | String | 展示订单号，如 `KS20260417001` |
| `paymentMethod` | String | `stripe` 或 `paypal` |
| `paymentStatus` | String | `pending`/`paid`/`failed`/`cancelled`/`refunded` |
| `paypalOrderId` | String? | PayPal 订单 ID |
| `stripePaymentIntentId` | String? | Stripe PaymentIntent ID |
| `total` | Int | 订单总额（JPY，分） |
| `createdAt` | DateTime | 创建时间 |
| `updatedAt` | DateTime | 更新时间 |

### OrderStatusHistory 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | String | 主键 |
| `orderId` | String | 关联订单 |
| `fromStatus` | String? | 变更前状态 |
| `toStatus` | String | 变更后状态 |
| `note` | String? | 变更备注 |
| `createdAt` | DateTime | 变更时间 |

---

## 8. 注意事项与遗留问题

1. **`failed` 状态未记录历史**：`stripe webhook` 在处理 `payment_intent.payment_failed` 时仅更新 `paymentStatus`，未写入 `OrderStatusHistory`。建议补充。

2. **状态转换无强校验**：管理员可通过 `PATCH /api/orders/{orderId}/status` 将状态任意切换（如 `cancelled` → `paid`），无业务规则限制。

3. **PayPal 幂等性**：`ORDER_ALREADY_CAPTURED` 错误会触发幂等处理，将状态强制更新为 `paid`。

4. **邮件通知**：支付成功后（Stripe/PayPal）会触发订单确认邮件发送，详见 `sendOrderConfirmation`。

---

## 9. 相关文件索引

| 文件 | 说明 |
|------|------|
| `prisma/schema.prisma` | 数据库模型定义 |
| `src/lib/orders.ts` | 内存订单操作工具（开发阶段） |
| `src/app/api/orders/route.ts` | 订单创建 API |
| `src/app/api/orders/[orderId]/status/route.ts` | 管理员状态更新 API |
| `src/app/api/stripe/webhook/route.ts` | Stripe Webhook 回调 |
| `src/app/api/paypal/capture-order/route.ts` | PayPal 支付捕获回调 |
| `src/app/[locale]/admin/orders/[id]/StatusUpdateForm.tsx` | 管理员状态更新表单组件 |
