# boss-dashboard 合并到 kangaroo-shop 方案

> 整理日期：2026-04-24  
> 项目路径：boss-dashboard → /Users/hulonghua/.openclaw/workspace/boss-dashboard  
> 目标项目：kangaroo-shop → /Users/hulonghua/projects/kangaroo-shop

---

## 一、项目现状分析

### 1.1 boss-dashboard（前端独立项目）

| 技术栈 | 说明 |
|--------|------|
| React 18 + Vite | 构建工具 |
| Ant Design Pro v5 | UI 组件库 |
| ECharts (echarts-for-react) | 图表 |
| Zustand | 状态管理（`useDashboardStore`） |
| React Router v6 | 路由 |
| dayjs | 日期处理 |
| axios | HTTP 客户端 |
| 全部 Mock 数据 | `src/mock/data.ts` |

**核心页面/组件：**
- `OverviewPage` — 全局经营总览（含核心指标卡片、趋势图、告警栏）
- `ModuleDetailPage` — 5 大模块详情（hr/finance/supply_chain/operation/influencer）
- `AlertCenterPage` — 告警中心（筛选、处理）
- `MetricCard` — 指标卡片（带状态色、趋势箭头）
- `TrendChart` — ECharts 趋势折线图
- `AlertList` — 告警列表（含处理 Modal）
- `DashboardLayout` — 侧边栏 + Header 布局

**Dashboard 独立 API 层（待实现）：**
```
GET  /api/dashboard/overview        → OverviewData
GET  /api/dashboard/:module        → ModuleData
GET  /api/dashboard/alerts          → Alert[]
POST /api/dashboard/alerts/resolve  → { success }
```

### 1.2 kangaroo-shop（目标项目）

| 技术栈 | 说明 |
|--------|------|
| Next.js 14 (App Router) | 框架 |
| Prisma + PostgreSQL | ORM + 数据库 |
| next-auth v4 | 认证 |
| Stripe / PayPal | 支付 |
| next-intl | 国际化 |
| 已有 `/[locale]/admin` 管理后台 | 订单管理 + 商品管理 |

**现有数据模型（Prisma）：**
- `Product` — 商品（id/title/price/rating/reviews/stock/isActive/createdAt...）
- `Order` — 订单主表（id/orderNumber/paymentStatus/total/shippingEmail/createdAt...）
- `OrderItem` — 订单明细
- `OrderStatusHistory` — 订单状态变更历史
- `Admin` — 管理员账户

**现有 API 路由：**
```
/api/orders                        GET(列表/单条) + POST(创建)
/api/orders/[orderId]              GET(单条)
/api/orders/[orderId]/status       PATCH
/api/orders/[orderId]/notify       POST
/api/products                      GET(列表) + POST(创建)
/api/products/[id]                GET/PUT/DELETE
/api/auth/[...nextauth]            认证
/api/stripe/webhook                支付回调
/api/create-payment-intent         Stripe intent
/api/create-paypal-order           PayPal 订单
/api/paypal/capture-order          PayPal 确认
```

**现有 Admin 后台页面：**
- `/[locale]/admin` — 概览（订单数/商品数/总收入）
- `/[locale]/admin/orders` — 订单列表
- `/[locale]/admin/orders/[id]` — 订单详情
- `/[locale]/admin/products` — 商品列表
- `/[locale]/admin/products/new` — 新增商品
- `/[locale]/admin/products/[id]/edit` — 编辑商品

---

## 二、合并策略总览

### 2.1 技术决策

| 问题 | 决策 | 理由 |
|------|------|------|
| 前端集成方式 | 将 boss-dashboard 作为 Next.js App Router 的 Client Component 页面 | Next.js App Router 支持 RSC + Client Components 混用，boss-dashboard 的 React 组件（Ant Design + ECharts）需要 Client 模式 |
| 路由路径 | `/[locale]/admin/dashboard` | 与现有 `/[locale]/admin/*` 保持一致 |
| UI 框架迁移 | 保留 Ant Design + ECharts | boss-dashboard 的组件（MetricCard/TrendChart/AlertList/DashboardLayout）重度依赖 Ant Design，迁移成本高，直接复用 |
| 状态管理 | **移除 Zustand，改用 Next.js Server Components + React Server Actions** | kangaroo-shop 是 App Router 架构，Server Components 是一等公民；Dashboard 数据本质上来自后端 API，Server Component 直接查询 Prisma 更自然 |
| 图表组件 | 保留 `echarts-for-react` | 仅作为 Client Component 在页面中嵌入 |
| 告警模块 | **新增 Prisma Model + API** | 告警数据（Alert）需要持久化，不能沿用 mock |
| 趋势数据 | **API 聚合计算** | 趋势数据由服务端聚合订单/商品等原始数据生成 |

### 2.2 数据来源映射

boss-dashboard 的 Dashboard 指标分为 5 大模块，对应 kangaroo-shop 的数据来源如下：

| Dashboard 模块 | 指标 | 数据来源 | 说明 |
|----------------|------|----------|------|
| **全局总览** | 人均毛利 | 需新增计算逻辑 | 现有 Prisma 模型无法直接支持，需新增 SQL 视图或计算 API |
| **全局总览** | 库存周转率 | 需新增 | 需引入库存相关数据模型 |
| **全局总览** | 整体毛利率 | 需新增计算逻辑 | 需商品成本数据 |
| **全局总览** | 广告 TACoS | 需新增 | 需引入广告投放数据模型 |
| **全局总览** | 现金流健康度 | 需新增 | 需引入财务数据模型 |
| **运营模块** | 转化率/客单价/评分/退货率 | 可从 `Order` + `Product` 聚合 | **可直接实现** |
| **运营模块** | 广告 TACoS | 需新增广告数据模型 | 需单独建模 |
| **供应链模块** | 库存周转/积压/准时交货 | 需新增供应链数据模型 | 需单独建模 |
| **人事模块** | 员工数/离职率/薪资等 | 需新增 HR 数据模型 | 需单独建模 |
| **财务模块** | 营收/毛利率/净利率等 | 需新增财务数据模型 | 需单独建模 |
| **红人模块** | 红人数/ROI/互动率等 | 需新增红人数据模型 | 需单独建模 |
| **告警** | 全部 | 需新增 `DashboardAlert` Model | **必须新增** |

**结论：** 仅有运营相关的少部分指标（转化率、客单价、评分等）可从现有 Prisma 模型**直接计算**。其余模块（hr/finance/supply_chain/influencer）以及核心指标（人均毛利、库存周转率、毛利率、TACoS、现金流健康度）均需要**新增数据模型或外部数据接入**。

---

## 三、实施计划

### Phase 1：基础设施（优先级：P0）

#### 1.1 安装必要依赖

```bash
cd /Users/hulonghua/projects/kangaroo-shop

# 老板经营仪表盘需要的依赖
pnpm add antd @ant-design/icons echarts echarts-for-react dayjs axios
pnpm add -D @types/echarts
```

#### 1.2 创建 Dashboard API 路由

**新增文件：**
```
src/app/api/dashboard/overview/route.ts          GET
src/app/api/dashboard/[module]/route.ts          GET
src/app/api/dashboard/alerts/route.ts            GET + POST
src/app/api/dashboard/alerts/[alertId]/resolve/route.ts  PATCH
```

**API 响应格式（符合 kangaroo-shop 风格）：**
```typescript
// 成功
NextResponse.json({ data: {...}, error: null })

// 失败
NextResponse.json({ data: null, error: 'message' }, { status: 400/401/500 })
```

### Phase 2：数据模型扩展（优先级：P0）

#### 2.1 新增 DashboardAlert Model（必须）

```prisma
// prisma/schema.prisma 新增

model DashboardAlert {
  id            String   @id @default(cuid())
  metricId      String   @map("metric_id")
  metricName    String   @map("metric_name")
  module        String   // hr | finance | supply_chain | operation | influencer
  status        String   // green | yellow | red
  threshold     Float
  currentValue  Float    @map("current_value")
  assignee      String?
  deadline      DateTime?
  handlingResult String? @map("handling_result")
  handler       String?
  resolvedAt    DateTime? @map("resolved_at")
  createdAt     DateTime @default(now()) @map("created_at")

  @@map("dashboard_alerts")
}
```

#### 2.2 新增 DashboardMetricConfig Model（可选，用于可配置阈值）

```prisma
model DashboardMetricConfig {
  id        String   @id @default(cuid())
  metricId  String   @unique @map("metric_id")
  name      String
  unit      String
  thresholdYellow Float @map("threshold_yellow")
  thresholdRed    Float @map("threshold_red")
  module    String   // hr | finance | supply_chain | operation | influencer
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("dashboard_metric_configs")
}
```

#### 2.3 扩展 Order 模型（支持运营指标计算）

> 现有的 `Order` 模型基本够用，但需要注意 `Product.rating/reviews` 字段可以用于计算评分指标。

#### 2.4 新增数据模型（后续 Phase）

以下模块建议后续迭代中逐步新增，本次方案不展开：

| 模块 | 建议新增 Model |
|------|---------------|
| HR | `Employee`（员工）、`Payroll`（薪资） |
| Finance | `RevenueDaily`（日营收）、`Expense`（费用） |
| Supply Chain | `Inventory`（库存）、`Supplier`（供应商） |
| Influencer | `Influencer`（红人）、`InfluencerCampaign`（合作） |
| Advertising | `AdCampaign`（广告投放）、`AdSpend`（广告花费） |

### Phase 3：Dashboard 前端集成（优先级：P0）

#### 3.1 目录结构

```
src/app/[locale]/admin/dashboard/
├── page.tsx                              # Server Component 入口
├── layout.tsx                             # 复用 admin layout（如需要）
├── components/                            # 迁移的 boss-dashboard 组件
│   ├── MetricCard.tsx
│   ├── TrendChart.tsx
│   ├── AlertList.tsx
│   └── DashboardClientWrapper.tsx         # Client Component 封装
├── lib/
│   ├── dashboardApi.ts                   # API 调用层（axios → fetch）
│   └── types.ts                          # 共享类型定义
└── hooks/
    └── useDashboard.ts                   # 可选的 Client 状态 hook
```

#### 3.2 Client Component 封装

boss-dashboard 的组件（Ant Design + ECharts）必须是 Client Component。创建一个顶层 Wrapper：

```typescript
// src/app/[locale]/admin/dashboard/components/DashboardClientWrapper.tsx
'use client';

import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

export default function DashboardClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider locale={zhCN}>
      {children}
    </ConfigProvider>
  );
}
```

#### 3.3 路由映射

| boss-dashboard 路由 | kangaroo-shop 路由 |
|---------------------|-------------------|
| `/` (OverviewPage) | `/[locale]/admin/dashboard` |
| `/module/:module` | `/[locale]/admin/dashboard/[module]` |
| `/alerts` | `/[locale]/admin/dashboard/alerts` |

#### 3.4 API 层改造

将 boss-dashboard 的 `src/api/dashboard.ts`（axios）改造为 Next.js App Router 风格（fetch + Server Actions）：

```typescript
// src/app/[locale]/admin/dashboard/lib/dashboardApi.ts

// 替代原来的 axios 调用
export async function getOverview(): Promise<OverviewData> {
  const res = await fetch('/api/dashboard/overview', { cache: 'no-store' });
  const json = await res.json();
  return json.data;
}
```

#### 3.5 移除 Zustand，改为 React Server Components

boss-dashboard 的 `useDashboardStore`（Zustand）管理：
- `overview` / `moduleData` → 改为 Server Component 直接 fetch
- `alerts` / `alertFilters` → 改为 Client Component 的 `useState` + Server Action

由于 Next.js App Router 中 Server Component 不能有 `useState`，需要将**交互逻辑**（筛选、处理告警）下放到 Client Component，**数据获取**由 Server Component 负责。

### Phase 4：渐进式实现 API（优先级：P1）

#### 4.1 可立即实现的 API（基于现有数据）

| API | 数据来源 | 实现难度 |
|-----|----------|----------|
| `/api/dashboard/overview` 运营指标部分 | `Order` + `Product` | 低 |
| `/api/dashboard/operation` | `Order` + `Product` | 低 |
| 告警列表 GET/POST | `DashboardAlert` | 低 |
| 告警处理 PATCH | `DashboardAlert` | 低 |

#### 4.2 需要新增数据源的 API（后续迭代）

| API | 数据来源 | 说明 |
|-----|----------|------|
| `/api/dashboard/hr` | `Employee` 等（待建） | 需 HR 模块 |
| `/api/dashboard/finance` | `RevenueDaily` 等（待建） | 需财务模块 |
| `/api/dashboard/supply_chain` | `Inventory` 等（待建） | 需供应链模块 |
| `/api/dashboard/influencer` | `Influencer` 等（待建） | 需红人模块 |
| 全局核心指标（人均毛利/TACoS等） | 需多模型聚合 | 需外部数据接入 |

---

## 四、详细实施步骤

### Step 1：安装依赖（1 分钟）

```bash
cd /Users/hulonghua/projects/kangaroo-shop
pnpm add antd @ant-design/icons echarts echarts-for-react dayjs axios
pnpm add -D @types/echarts
```

### Step 2：迁移类型定义（1 分钟）

创建 `src/app/[locale]/admin/dashboard/lib/types.ts`，将 boss-dashboard 的 `src/types/index.ts` 中的类型定义复制过来，清理与 kangaroo-shop 不兼容的导入（如 `import.meta.env`）。

### Step 3：扩展 Prisma Schema（5 分钟）

在 `prisma/schema.prisma` 末尾追加：

```prisma
model DashboardAlert {
  id            String    @id @default(cuid())
  metricId      String    @map("metric_id")
  metricName    String    @map("metric_name")
  module        String
  status        String
  threshold     Float
  currentValue  Float     @map("current_value")
  assignee      String?
  deadline      DateTime?
  handlingResult String?  @map("handling_result")
  handler       String?
  resolvedAt    DateTime? @map("resolved_at")
  createdAt     DateTime  @default(now()) @map("created_at")

  @@map("dashboard_alerts")
}
```

执行：
```bash
pnpm db:push
```

### Step 4：创建 Dashboard API 路由（15 分钟）

**4.1 告警 API：**

```typescript
// src/app/api/dashboard/alerts/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const module = searchParams.get('module');

  const where: any = {};
  if (status && status !== 'all') where.status = status;
  if (module && module !== 'all') where.module = module;

  const alerts = await prisma.dashboardAlert.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ data: alerts });
}

export async function POST(req: Request) {
  const body = await req.json();
  const alert = await prisma.dashboardAlert.create({ data: body });
  return NextResponse.json({ data: alert }, { status: 201 });
}
```

**4.2 告警处理 API：**

```typescript
// src/app/api/dashboard/alerts/[alertId]/resolve/route.ts
export async function PATCH(req: Request, { params }: { params: { alertId: string } }) {
  const { handler, handlingResult } = await req.json();
  const alert = await prisma.dashboardAlert.update({
    where: { id: params.alertId },
    data: {
      handler,
      handlingResult,
      resolvedAt: new Date(),
      status: 'green',
    },
  });
  return NextResponse.json({ data: alert });
}
```

**4.3 概览 API（运营指标）：**

```typescript
// src/app/api/dashboard/overview/route.ts
export async function GET() {
  // 从 Order + Product 聚合运营指标
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [recentOrders, allPaidOrders, products] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      include: { items: true },
    }),
    prisma.order.findMany({ where: { paymentStatus: 'paid' } }),
    prisma.product.findMany(),
  ]);

  // 计算运营指标
  const totalRevenue = allPaidOrders.reduce((s, o) => s + o.total, 0);
  const totalOrders = recentOrders.length;
  const avgOrderValue = totalOrders > 0
    ? recentOrders.reduce((s, o) => s + o.total, 0) / totalOrders
    : 0;
  const conversionRate = 4.8; // 需埋点数据
  const avgRating = products.length > 0
    ? products.reduce((s, p) => s + p.rating, 0) / products.length
    : 0;

  const metrics = [
    { id: 'revenue', name: '月营收', value: totalRevenue, unit: 'JPY', status: 'green', trend: 0, trendDirection: 'up', threshold: { yellow: 0, red: 0 } },
    { id: 'order-count', name: '月订单数', value: totalOrders, unit: '笔', status: 'green', trend: 0, trendDirection: 'up', threshold: { yellow: 0, red: 0 } },
    { id: 'avg-order-value', name: '客单价', value: avgOrderValue, unit: 'JPY', status: 'green', trend: 0, trendDirection: 'up', threshold: { yellow: 0, red: 0 } },
    { id: 'rating', name: '平均评分', value: avgRating, unit: '分', status: avgRating >= 4.2 ? 'green' : 'yellow', trend: 0, trendDirection: 'up', threshold: { yellow: 4.2, red: 3.8 } },
  ];

  return NextResponse.json({ data: { metrics, alerts: [], trendData: {} } });
}
```

### Step 5：迁移 Dashboard 前端组件（30 分钟）

**5.1 创建目录结构：**

```bash
mkdir -p src/app/\[locale\]/admin/dashboard/components
mkdir -p src/app/\[locale\]/admin/dashboard/lib
mkdir -p src/app/\[locale\]/admin/dashboard/\[module\]
mkdir -p src/app/\[locale\]/admin/dashboard/alerts
```

**5.2 迁移步骤：**

1. 将 `src/components/MetricCard`、`TrendChart`、`AlertList`、`StatusTag` 复制到 `components/` 目录
2. 将 `src/utils/format.ts` 和 `src/utils/chart.ts` 复制到 `lib/` 目录
3. 将 `src/pages/Overview/index.tsx` 改造为 `page.tsx`
4. 将 `src/pages/ModuleDetail/index.tsx` 改造为 `[module]/page.tsx`
5. 将 `src/pages/AlertCenter/index.tsx` 改造为 `alerts/page.tsx`

**5.3 关键改造点：**

- `import { useNavigate } from 'react-router-dom'` → `import { useRouter } from 'next/navigation'`
- `import { dashboardApi } from '../api/dashboard'` → `import { dashboardApi } from '../lib/dashboardApi'`
- `react-router-dom` 路由 → Next.js App Router 文件路径路由
- 移除 `import.meta.env` 引用
- Zustand store 调用 → React Server Component fetch + Client Component `useState`

### Step 6：创建 Dashboard 入口页面（10 分钟）

```typescript
// src/app/[locale]/admin/dashboard/page.tsx
import DashboardClientWrapper from './components/DashboardClientWrapper';
import OverviewPage from './components/OverviewPage'; // 已改造的 Client Component

export default async function DashboardPage({ params }: { params: { locale: string } }) {
  // Server Component 中获取数据
  const overviewData = await fetchOverview(); // 调用 Prisma 或 API

  return (
    <DashboardClientWrapper>
      <OverviewPage initialData={overviewData} />
    </DashboardClientWrapper>
  );
}
```

### Step 7：添加导航入口（2 分钟）

在 `src/app/[locale]/admin/layout.tsx` 侧边栏添加 Dashboard 链接：

```tsx
<a href={`/${params.locale}/admin/dashboard`} style={{ ... }}>
  📊 经营仪表盘
</a>
```

### Step 8：验证部署（5 分钟）

```bash
cd /Users/hulonghua/projects/kangaroo-shop
pnpm build
```

确保：
- 现有订单/商品管理功能正常
- `/[locale]/admin/dashboard` 可访问（即使数据是 mock）
- API `/api/dashboard/*` 返回正确格式

---

## 五、里程碑与优先级

| 阶段 | 内容 | 优先级 | 工作量 |
|------|------|--------|--------|
| **Phase 1** | 安装依赖 + 类型迁移 + Prisma 扩展 | P0 | ~30 分钟 |
| **Phase 2** | 告警 CRUD API（GET/POST/PATCH） | P0 | ~20 分钟 |
| **Phase 3** | 概览 API（运营指标部分，基于现有 Order 数据） | P0 | ~20 分钟 |
| **Phase 4** | Dashboard 前端组件迁移（Overview + Layout） | P0 | ~60 分钟 |
| **Phase 5** | 告警页面迁移（AlertCenter） | P1 | ~30 分钟 |
| **Phase 6** | 模块详情页面（各 module page） | P1 | ~30 分钟 |
| **Phase 7** | 趋势图 API（历史数据聚合） | P1 | ~30 分钟 |
| **Phase 8** | 权限控制（admin 认证检查） | P1 | ~20 分钟 |
| **Phase 9+** | HR/Finance/SupplyChain/Influencer 模块数据模型 | P2 | 后续迭代 |

---

## 六、技术选型说明

### 6.1 为什么移除 Zustand？

boss-dashboard 使用 Zustand 是因为 React + Vite 的 SPA 架构需要客户端状态管理。但 kangaroo-shop 是 Next.js App Router：

- **Server Components** 可以直接查询 Prisma，无需通过 API 中转
- **React Server Actions** 可以处理表单提交和状态变更
- **Server Components 之间的数据共享**通过 `fetch` 或直接 Prisma 查询，不需要额外的状态管理库

如果后续发现确实需要客户端状态（如 Dashboard 页面的实时刷新），可以使用 React `useState` + `useEffect`，或 Next.js 的 `use router refresh`。

### 6.2 Ant Design 在 Next.js 中的注意事项

- Ant Design 组件需要 Client Component（`'use client'`）
- ECharts (`echarts-for-react`) 也需要 `'use client'`
- 解决方案：创建 `DashboardClientWrapper` 作为顶层 Client Component 容器
- 主题配置通过 `ConfigProvider` 在 Client Component 中注入

### 6.3 Mock 数据策略

在完整 API 实现之前，可以在 API route 中添加 fallback 逻辑：

```typescript
// 示例：overview API 中的 mock fallback
if (stats === null) {
  // 返回静态 mock 数据，保持前端开发进度
  return NextResponse.json({ data: mockOverviewData });
}
```

---

## 七、风险与注意事项

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Ant Design 与 Next.js App Router 的兼容性问题 | 中 | 使用 `DashboardClientWrapper` 隔离，所有 Ant Design 组件在 Client Component 内 |
| boss-dashboard 的组件依赖 Zustand 和 axios | 中 | 迁移时重构为 React Server Component + fetch |
| 破坏现有 kangaroo-shop 部署 | 高 | 所有改动仅新增文件，不修改现有 `admin/page.tsx`、`orders`、`products` 等页面 |
| 数据库 Schema 变更需要 `db:push` | 中 | 使用 `prisma db push`（非 migrate）避免生产数据丢失 |
| boss-dashboard 的 HR/Finance/SupplyChain/Influencer 模块数据无来源 | 高 | Phase 9+ 迭代处理，Phase 1-8 先用 mock 数据保持 UI 可用 |

---

## 八、附录：文件变更清单

### 新增文件

```
src/app/[locale]/admin/dashboard/
├── page.tsx                              # 仪表盘入口
├── components/
│   ├── DashboardClientWrapper.tsx        # Client 容器
│   ├── MetricCard.tsx                    # 迁移自 boss-dashboard
│   ├── TrendChart.tsx                    # 迁移自 boss-dashboard
│   ├── AlertList.tsx                     # 迁移自 boss-dashboard
│   ├── StatusTag.tsx                     # 迁移自 boss-dashboard
│   ├── OverviewPage.tsx                   # 迁移+改造
│   ├── ModuleDetailPage.tsx              # 迁移+改造
│   └── AlertCenterPage.tsx               # 迁移+改造
├── [module]/
│   └── page.tsx                          # 模块详情
├── alerts/
│   └── page.tsx                          # 告警中心
└── lib/
    ├── types.ts                          # 共享类型
    ├── dashboardApi.ts                   # API 调用层
    ├── format.ts                         # 迁移自 boss-dashboard
    └── chart.ts                          # 迁移自 boss-dashboard

src/app/api/dashboard/
├── overview/route.ts                     # GET
├── [module]/route.ts                     # GET
├── alerts/route.ts                       # GET + POST
└── alerts/[alertId]/resolve/route.ts     # PATCH
```

### 修改文件

```
prisma/schema.prisma                      # 新增 DashboardAlert model
package.json                              # 新增 antd/echarts/dayjs/axios 依赖
src/app/[locale]/admin/layout.tsx         # 添加仪表盘导航入口
```

### 不变文件（确保不破坏）

```
src/app/[locale]/admin/page.tsx           # 现有管理后台概览
src/app/[locale]/admin/orders/            # 订单管理（全部）
src/app/[locale]/admin/products/          # 商品管理（全部）
src/app/api/orders/                       # 订单 API（全部）
src/app/api/products/                     # 商品 API（全部）
src/app/api/auth/                         # 认证 API
```
