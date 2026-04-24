# 袋鼠君独立站 — 第二阶段开发计划
## 阶段：数据库 + 管理后台搭建

---

## 一、现状与目标

### 现状（第一阶段结束时）
- 商品展示、购物车、PayPal/Stripe 支付全链路已通
- 部署地址：https://kangaroo-shop-tan.vercel.app
- **数据存储：内存（Map），服务器重启丢失，无持久化**
- **无管理后台，无法查看/管理订单**
- **无邮件通知，客户支付后不知道订单状态**

### 第二阶段目标
1. 接入真实数据库，订单/商品数据持久化
2. 搭建管理后台（订单管理 + 商品管理）
3. 邮件通知（订单确认邮件）
4. Stripe Webhook 生产环境对接（Webhook 触发时更新数据库）

---

## 二、功能需求

### 2.1 客户侧（保持现状，迁移到数据库）

| 功能 | 现状 | 第二阶段 |
|------|------|----------|
| 商品展示 | 内存读取 products.ts | 从数据库读取，支持后台新增 |
| 购物车 | localStorage | 不变 |
| 创建订单 | 内存 Map | 写入数据库 |
| 支付回调 | 内存 Map 更新 | 数据库更新 + 发邮件通知 |
| 订单查询 | 无 | 客户邮件内含查询链接（暂简化） |

### 2.2 管理后台

#### 登录认证
- 路径：`/admin`
- 方式：邮箱 + 密码（简单密码体系，花哥自用）
- Session：NextAuth.js（可选 v4，App Router 兼容）
- 布防：5次登录失败锁10分钟

#### 订单管理
- 订单列表：支持按状态（全部/待支付/已支付/已取消）、日期范围搜索
- 订单详情：查看商品清单、收货地址、支付状态、时间线
- 操作：修改订单状态（待处理 → 已发货 → 完成）、手动取消订单
- 导出：CSV 导出（日期范围 + 状态筛选）

#### 商品管理
- 商品列表：图片 + 标题 + 价格 + 库存 + 状态
- 新增商品：标题/价格/图片URL/分类/库存/描述
- 编辑商品：修改任意字段
- 上架/下架：软删除（不物理删除）
- 批量操作：批量上架/下架/调价

#### 邮件通知（可选，效果优先）
- 触发时机：订单状态变更时
- 通知类型：
  1. 订单确认（客户付款成功）
  2. 订单发货（后台手动触发）
- 工具：Resend（API发邮件）或 React Email（自定义模板）

---

## 三、技术方案

### 3.1 数据库选择

推荐：**PlanetScale（MySQL）**

| 维度 | PlanetScale | Supabase |
|------|------------|----------|
| 类型 | MySQL（serverless） | PostgreSQL（serverless） |
| 免费额度 | 1 DB / 1GB / 10B 行 reads | 500MB / 2GB 传输/月 |
| 无服务器 | ✅ Vitess（MySQL分片） | ✅ Postgres |
| 正式环境 | $29/月起 | $25/月起 |
| 数据导出 | mysqldump | pg_dump |
| 适合规模 | 中小电商 | 中小电商 |

PlanetScale 优势：MySQL 生态成熟，Vercel 官方合作案例多，命令行工具 `pscale` 简洁。

### 3.2 ORM 选择

推荐：**Prisma**

- 声明式 Schema，类型安全（TypeScript first）
- 迁移系统（`prisma migrate dev`）自动生成 SQL
- 支持 PlanetScale（MySQL adapter）
- 文档友好，社区活跃

### 3.3 数据库 Schema 设计

```sql
-- 商品表
CREATE TABLE products (
  id            VARCHAR(36) PRIMARY KEY,  -- cuid
  title         VARCHAR(255) NOT NULL,
  title_en      VARCHAR(255),
  price         INT NOT NULL,              -- JPY，单位分（int避免浮点）
  original_price INT,
  currency      ENUM('JPY') DEFAULT 'JPY',
  images        JSON,                      -- ['/img/1.jpg', ...]
  category      ENUM('brainrot','anime','baby','lifestyle') DEFAULT 'brainrot',
  source        ENUM('rakuten','zozotown','amazon','mercari','own') DEFAULT 'own',
  source_url    TEXT,
  rating        DECIMAL(2,1) DEFAULT 0,
  reviews       INT DEFAULT 0,
  in_stock      BOOLEAN DEFAULT TRUE,
  stock         INT DEFAULT 0,
  description   TEXT,
  weight        INT DEFAULT 200,           -- g（运费计算用）
  is_active     BOOLEAN DEFAULT TRUE,      -- 软删除
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 订单主表
CREATE TABLE orders (
  id            VARCHAR(36) PRIMARY KEY,
  order_number  VARCHAR(20) UNIQUE NOT NULL,  -- KS20260417001

  -- 支付信息
  payment_method ENUM('stripe','paypal') NOT NULL,
  payment_status ENUM('pending','paid','failed','cancelled','refunded') DEFAULT 'pending',
  paypal_order_id VARCHAR(50),
  stripe_payment_intent_id VARCHAR(50),

  -- 金额
  subtotal      INT NOT NULL,              -- JPY，单位分
  shipping_fee  INT DEFAULT 0,
  total         INT NOT NULL,

  -- 配送
  courier       ENUM('yamato','sagawa','japanpost','seino') DEFAULT 'yamato',

  -- 收货地址
  shipping_name     VARCHAR(100),
  shipping_postal   VARCHAR(10),
  shipping_prefecture VARCHAR(50),
  shipping_city     VARCHAR(100),
  shipping_address1 VARCHAR(255),
  shipping_address2 VARCHAR(255),
  shipping_phone     VARCHAR(20),
  shipping_email     VARCHAR(255),

  -- 备注
  admin_note    TEXT,

  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 订单明细
CREATE TABLE order_items (
  id            VARCHAR(36) PRIMARY KEY,
  order_id      VARCHAR(36) NOT NULL,
  product_id    VARCHAR(36),
  product_title VARCHAR(255) NOT NULL,
  product_image VARCHAR(500),
  price         INT NOT NULL,             -- 购买时单价（分）
  quantity      INT NOT NULL,
  weight        INT DEFAULT 200,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 订单状态变更历史
CREATE TABLE order_status_history (
  id            VARCHAR(36) PRIMARY KEY,
  order_id      VARCHAR(36) NOT NULL,
  from_status   ENUM('pending','paid','failed','cancelled','refunded'),
  to_status     ENUM('pending','paid','failed','cancelled','refunded') NOT NULL,
  note          TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 管理员账户
CREATE TABLE admins (
  id            VARCHAR(36) PRIMARY KEY,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,   -- bcrypt
  name          VARCHAR(100),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.4 API 设计

#### 客户 API（在现有 /api 基础上改造）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/products | 列表（分页/筛选） |
| POST | /api/products | 新增商品（后台） |
| PUT | /api/products/[id] | 编辑商品 |
| DELETE | /api/products/[id] | 软删除 |
| GET | /api/orders | 订单列表（后台/支持筛选） |
| GET | /api/orders/[id] | 订单详情 |
| PATCH | /api/orders/[id]/status | 更新状态（后台） |
| POST | /api/orders/[id]/notify | 发送邮件通知 |

#### 管理后台 API
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/admin/login | 登录 |
| GET | /api/admin/me | 当前管理员信息 |
| POST | /api/admin/logout | 登出 |

#### Webhook（生产环境）
- `POST /api/stripe/webhook` → 收到通知后更新数据库订单状态
- `POST /api/paypal/capture-order` → 更新数据库订单状态

### 3.5 管理后台页面

| 路径 | 功能 |
|------|------|
| /admin/login | 登录页 |
| /admin | Dashboard（今日订单/销售额统计） |
| /admin/orders | 订单列表 |
| /admin/orders/[id] | 订单详情 |
| /admin/products | 商品列表 |
| /admin/products/new | 新增商品 |
| /admin/products/[id]/edit | 编辑商品 |

### 3.6 技术栈汇总

| 组件 | 选择 | 理由 |
|------|------|------|
| 数据库 | PlanetScale（MySQL） | Serverless，Vercel 友好，1GB 免费 |
| ORM | Prisma | TypeScript 友好，迁移方便 |
| 管理后台 UI | Tailwind + shadcn/ui（React） | 快速，风格统一 |
| 认证 | NextAuth.js（credentials provider） | 自用后台，不需要 OAuth |
| 邮件 | Resend | API 发邮件，React Email 写模板，$20/月起（免费额度够用） |
| 支付同步 | Stripe Webhook + PayPal capture | 已在第一阶段实现，迁移到数据库更新 |

### 3.7 第二阶段文件变更

```
改动范围（预计）：
src/lib/orders.ts          → 删除，迁移到 Prisma
src/app/api/orders/        → 改为 Prisma 数据库操作
src/app/api/products/      → 新增，Prisma CRUD
src/app/api/admin/         → 新增，管理后台认证 API
src/app/admin/             → 新增，管理后台页面（13个路由）
src/components/admin/      → 新增，管理后台组件
prisma/schema.prisma       → 新增，数据库 Schema
.env.local                 → 新增 DATABASE_URL
```

---

## 四、开发计划（预计工时）

### 阶段 A：数据库搭建（约 1 天）
1. 注册 PlanetScale，创建数据库
2. 编写 Prisma Schema
3. 运行迁移，生成数据库表
4. 将现有 products.ts 数据 Seed 入库（写脚本一次性导入）
5. 验证数据库连接

### 阶段 B：API 层迁移（约 1 天）
6. 改造 `/api/orders` 从内存 Map → Prisma
7. 改造 `/api/products` 新增完整 CRUD
8. 改造 `/api/stripe/webhook` → 数据库更新
9. 改造 `/api/paypal/capture-order` → 数据库更新
10. 本地测试（dev server + PlanetScale remote dev branch）

### 阶段 C：管理后台（约 2 天）
11. 搭建 `/admin/login` 登录页
12. 搭建 `/admin` Dashboard 统计页
13. 搭建 `/admin/orders` 订单列表 + 筛选 + 分页
14. 搭建 `/admin/orders/[id]` 订单详情 + 状态更新
15. 搭建 `/admin/products` 商品列表
16. 搭建 `/admin/products/new` + `/admin/products/[id]/edit`
17. 管理后台 UI 样式统一（Tailwind + shadcn/ui）

### 阶段 D：邮件通知（约 0.5 天）
18. Resend 账号注册 + API Key 配置
19. 写邮件模板（订单确认/发货通知）
20. Stripe Webhook 触发时自动发邮件
21. 后台手动"发送邮件通知"按钮

### 阶段 E：收尾（约 0.5 天）
22. 数据验证（检查迁移后的订单数据完整性）
23. 性能检查（数据库查询 N+1 问题）
24. 部署到 Vercel（生产环境）
25. 绑定自定义域名（如需）
26. 文档更新（STATE.md + DEPLOY.md）

**预计总工时：5 天**（按每天 1 个阶段）

---

## 五、注意事项与风险

### 风险 1：PlanetScale 免费版限制
- 1GB 存储上限（约可存 10 万条订单）
- 月查询次数有限制（1B/月免费版，够用）
- 超过免费额度需付费（约 $29/月）

### 风险 2：Prisma PlanetScale 适配器
- PlanetScale 不支持外键约束（Vitess 特性），Prisma 有 `relationMode = "prisma"` 解决
- Schema 里需显式声明 `relationMode = "prisma"` 关闭外键检查

### 风险 3：数据库迁移
- 迁移过程中线上服务不中断（PlanetScale 分支机制，先迁移 Dev 分支）
- 迁移完成后切换生产分支

### 风险 4：邮件发件域名
- Resend 需要验证发件域名（SPA/HTML 验证最快）
- 建议用已有的 kangaroo-shop 域名配置 MX 记录

---

## 六、花哥确认的事项 ✅

| 项目 | 花哥选择 |
|------|---------|
| 数据库 | **Supabase（PostgreSQL，500MB 免费存储）** |
| 管理后台 | **/admin（同一项目内，共用代码）** |
| 邮件通知 | **第二阶段一起做** |
| Stripe Webhook | **最后阶段再调** |

---

## 七、技术方案（更新后）

### 7.1 数据库：Supabase（PostgreSQL）

| 维度 | Supabase | PlanetScale |
|------|----------|------------|
| 类型 | PostgreSQL（serverless） | MySQL（Vitess） |
| 免费存储 | **500MB** | 1GB |
| 免费传输 | 2GB/月 | 10B 行 reads/月 |
| 正式环境 | $25/月起 | $29/月起 |
| 自动备份 | ✅ 内置 | ✅ 内置 |
| 实时订阅 | ✅ Supabase 特色 | ❌ |
| 数据导出 | pg_dump | mysqldump |

**为什么选 Supabase**：免费存储更大（相对条件）、PostgreSQL 功能更强（JSON 支持、实时订阅）、Supabase CLI 本地开发体验好。

### 7.2 数据库 Schema（Supabase/PostgreSQL）

```sql
-- 启用 UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 商品表
CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         VARCHAR(255) NOT NULL,
  title_en      VARCHAR(255),
  price         INTEGER NOT NULL,              -- JPY，单位分
  original_price INTEGER,
  currency      VARCHAR(10) DEFAULT 'JPY',
  images        JSONB DEFAULT '[]',            -- ['/img/1.jpg', ...]
  category      VARCHAR(50) DEFAULT 'brainrot',
  source        VARCHAR(50) DEFAULT 'own',
  source_url    TEXT,
  rating        DECIMAL(2,1) DEFAULT 0,
  reviews       INTEGER DEFAULT 0,
  in_stock      BOOLEAN DEFAULT TRUE,
  stock         INTEGER DEFAULT 0,
  description   TEXT,
  weight        INTEGER DEFAULT 200,          -- g（运费计算）
  is_active     BOOLEAN DEFAULT TRUE,           -- 软删除
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 订单主表
CREATE TABLE orders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number  VARCHAR(20) UNIQUE NOT NULL,   -- KS20260417001

  -- 支付
  payment_method VARCHAR(20) NOT NULL,         -- stripe / paypal
  payment_status VARCHAR(20) DEFAULT 'pending', -- pending / paid / failed / cancelled / refunded
  paypal_order_id VARCHAR(50),
  stripe_payment_intent_id VARCHAR(50),

  -- 金额（JPY，分）
  subtotal      INTEGER NOT NULL,
  shipping_fee  INTEGER DEFAULT 0,
  total         INTEGER NOT NULL,

  -- 配送
  courier       VARCHAR(20) DEFAULT 'yamato',

  -- 收货地址
  shipping_name      VARCHAR(100),
  shipping_postal    VARCHAR(10),
  shipping_prefecture VARCHAR(50),
  shipping_city      VARCHAR(100),
  shipping_address1  VARCHAR(255),
  shipping_address2  VARCHAR(255),
  shipping_phone     VARCHAR(20),
  shipping_email     VARCHAR(255),

  -- 备注（后台用）
  admin_note    TEXT,

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 订单明细
CREATE TABLE order_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id    UUID,
  product_title VARCHAR(255) NOT NULL,
  product_image VARCHAR(500),
  price         INTEGER NOT NULL,
  quantity      INTEGER NOT NULL,
  weight        INTEGER DEFAULT 200,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 订单状态变更历史
CREATE TABLE order_status_history (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status   VARCHAR(20),
  to_status     VARCHAR(20) NOT NULL,
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 管理员账户
CREATE TABLE admins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,         -- bcrypt
  name          VARCHAR(100),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_products_is_active ON products(is_active);
```

### 7.3 API 设计

#### 客户 API（改造现有 + 新增）
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/products | 商品列表（支持分类/搜索/分页） |
| GET | /api/products/[id] | 商品详情 |
| POST | /api/products | 新增商品（后台） |
| PUT | /api/products/[id] | 编辑商品 |
| DELETE | /api/products/[id] | 软删除（is_active=false） |
| GET | /api/orders | 订单列表（后台，支持状态+日期筛选） |
| GET | /api/orders/[id] | 订单详情 |
| PATCH | /api/orders/[id]/status | 更新状态 + 写状态历史 |
| POST | /api/orders/[id]/notify | 发送邮件通知 |

#### 管理后台 API（新建）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/admin/login | 登录，返回 Session |
| GET | /api/admin/me | 当前管理员信息 |
| POST | /api/admin/logout | 登出 |
| GET | /api/admin/stats | Dashboard 统计数据 |

#### Webhook（改造）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/stripe/webhook | 更新数据库订单状态 |
| POST | /api/paypal/capture-order | 更新数据库订单状态 |

### 7.4 管理后台页面（新建）

| 路径 | 功能 |
|------|------|
| /admin/login | 登录页 |
| /admin | Dashboard（今日订单数/销售额/待处理） |
| /admin/orders | 订单列表（状态筛选 + 日期筛选 + 分页） |
| /admin/orders/[id] | 订单详情 + 状态变更 + 发货操作 |
| /admin/products | 商品列表 |
| /admin/products/new | 新增商品 |
| /admin/products/[id]/edit | 编辑商品 |

### 7.5 技术栈汇总

| 组件 | 选择 | 备注 |
|------|------|------|
| 数据库 | **Supabase（PostgreSQL，500MB 免费存储）** | 500MB 免费，CLI 本地开发 |
| ORM | **Prisma v5（稳定版）** | ⚠️ Prisma 7 有破坏性变更（adapter模式），已降级到 v5 |
| 管理后台 UI | Tailwind + shadcn/ui | 快速搭建，风格统一 |
| 认证 | NextAuth.js（credentials provider） | bcrypt 密码校验 |
| 邮件 | Resend | $20/月，10万封/月免费 |
| 支付同步 | Stripe Webhook + PayPal capture | 最后阶段调试 |

### 7.6 Supabase 接入步骤

1. 注册 https://supabase.com（用 GitHub 登录）
2. 创建 Project → 得到 `Project URL` + `anon/public` key + `service_role` secret
3. 本地装 Supabase CLI：`brew install supabase`
4. `supabase init` → 生成 `supabase/config.toml`
5. `supabase link --project-ref <ref>` → 连接远程
6. `supabase db push` → 迁移 Schema 到远程
7. `.env.local` 加 `DATABASE_URL`（从 Supabase Settings → Connection String）

### ⚠️ Prisma 7 降级说明

**问题**：Prisma 7（最新版）有破坏性变更：
- `schema.prisma` 的 `datasource.url` 不再支持
- PrismaClient 改用 `adapter` 模式（需要安装 `@prisma/adapter-pg` + `pg`）
- 需安装 `dotenv` 加载环境变量

**决策**：降级到 **Prisma 5.22.0**（稳定版），`url = env("DATABASE_URL")` 写法不变，兼容性好。

**验证**：`pnpm db:generate` ✅ 通过，`pnpm build` ✅ 零错误

---

## 八、开发计划（预计 5 天）

### Day 1：数据库搭建
1. 注册 Supabase，创建 Project
2. 装 Supabase CLI + Prisma
3. 写 Prisma Schema（products / orders / order_items / admins）
4. 运行迁移，推送到 Supabase
5. 写 Seed 脚本，把现有 products.ts 数据导入 Supabase
6. 验证连接（`npx prisma studio`）

### Day 2：API 层迁移
7. 改造 `/api/orders` → Prisma（替代内存 Map）
8. 改造 `/api/products` → Prisma 新增 CRUD
9. 改造 `/api/stripe/webhook` → 数据库更新
10. 改造 `/api/paypal/capture-order` → 数据库更新
11. 本地测试（dev server + Supabase remote）

### Day 3：管理后台 - 认证 + 基础框架
12. 装 NextAuth.js，配置 credentials provider
13. 写 `/api/admin/login` + `/api/admin/logout` + `/api/admin/me`
14. 搭建 `/admin/layout.tsx`（后台框架 + 导航菜单）
15. 搭建 `/admin/login` 登录页
16. 搭建 `/admin` Dashboard（订单数/销售额/待处理）

### Day 4：管理后台 - 订单 + 商品管理
17. `/admin/orders` 订单列表（筛选 + 分页）
18. `/admin/orders/[id]` 订单详情 + 状态变更操作
19. `/admin/products` 商品列表
20. `/admin/products/new` 新增商品页
21. `/admin/products/[id]/edit` 编辑商品页
22. 后台 UI 统一（shadcn/ui 组件）

### Day 5：邮件 + 收尾
23. 注册 Resend + 配置 API Key
24. 写邮件模板（订单确认 + 发货通知）
25. Stripe Webhook 触发发邮件
26. 后台手动"发送通知"按钮
27. 数据验证 + 性能检查（N+1 查询）
28. 部署到 Vercel（生产环境）
29. 更新文档（STATE.md / DEPLOY.md）

---

## 九、第二阶段文件清单

```
新增文件：
prisma/schema.prisma                    # 数据库 Schema
prisma/seed.ts                          # 导入现有商品数据
src/app/api/admin/login/route.ts        # 管理员登录
src/app/api/admin/logout/route.ts       # 登出
src/app/api/admin/me/route.ts           # 当前管理员
src/app/api/admin/stats/route.ts        # Dashboard 统计
src/app/api/products/route.ts          # 商品 CRUD
src/app/api/products/[id]/route.ts     # 商品单个操作
src/app/api/orders/route.ts             # 改造（数据库）
src/app/api/orders/[id]/route.ts       # 改造（数据库）
src/app/api/orders/[id]/status/route.ts # 状态更新
src/app/api/orders/[id]/notify/route.ts # 发邮件通知
src/app/admin/login/page.tsx            # 登录页
src/app/admin/page.tsx                   # Dashboard
src/app/admin/orders/page.tsx           # 订单列表
src/app/admin/orders/[id]/page.tsx      # 订单详情
src/app/admin/products/page.tsx          # 商品列表
src/app/admin/products/new/page.tsx     # 新增商品
src/app/admin/products/[id]/edit/page.tsx # 编辑商品
src/components/admin/                   # 后台公共组件
src/lib/email.ts                        # Resend 邮件发送
src/lib/prisma.ts                       # Prisma Client 单例
src/lib/auth.ts                         # NextAuth 配置
src/lib/validators/                     # Zod 验证 schemas
.emails/                                # React Email 模板

改动文件：
src/app/api/orders/route.ts             # 内存→Prisma
src/app/api/stripe/webhook/route.ts      # 加数据库更新
src/app/api/paypal/capture-order/route.ts # 加数据库更新
.env.local                               # 加 DATABASE_URL
.env.example                             # 加 Supabase/Resend Keys
VERCEL_ENV=production                    # Vercel 环境变量

删除文件（替代）：
src/lib/orders.ts                        # 废弃，用 Prisma
```

---

## 十、注意事项与风险

### 风险 1：Supabase 免费版存储上限
- 500MB 存储（主要存商品图片URL和订单数据，实际不存图片文件）
- 足够用：10万条订单 × 2KB ≈ 200MB

### 风险 2：Prisma + Supabase 外键
- Supabase（原生 PostgreSQL）**支持外键**，不需要 `relationMode`
- 和 PlanetScale 不同，Supabase 就是标准 PostgreSQL，不需要特殊处理

### 风险 3：NextAuth Session 存储
- Credentials 登录：Session 存 Cookie（JWT 签名）
- 管理后台所有路由加 `middleware.ts` 保护，未登录重定向到 `/admin/login`

### 风险 4：数据迁移
- 第一阶段已产生的测试订单数据在 Vercel 内存里，无法迁移（数据不重要）
- Supabase 建好后，从 products.ts Seed 脚本导入商品
- 线上已有订单不受影响（内存 Map 在第一阶段只是临时的）

---

## 花哥确认后开始开发 ✅

请花哥确认以上方案无误，我将立即开始第二阶段开发。
