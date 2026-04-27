# 第二阶段 SEO 方案

## 1. OG 分享图制作

### 方案选择：使用 @vercel/og (Satori) 程序生成

**推荐方案**：利用 Vercel Edge Functions + `@vercel/og`（基于 Satori）在服务器端动态生成 OG 图片。
无需外部工具、无需手动维护图片文件、完全品牌可控。

### 具体实现

```tsx
// src/app/og/route.tsx
import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        color: 'white', fontFamily: 'sans-serif',
      }}>
        {/* Logo 区域 */}
        <div style={{ fontSize: 80, fontWeight: 'bold', marginBottom: 20 }}>
          🦘 袋鼠君
        </div>
        {/* 标语 */}
        <div style={{ fontSize: 36, opacity: 0.9, textAlign: 'center', padding: '0 60px' }}>
          From Japan to the World
        </div>
        <div style={{ fontSize: 24, opacity: 0.7, marginTop: 16 }}>
          厳選された日本商品を、海外の方へ
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
```

**安装依赖**：
```bash
pnpm add @vercel/og
```

**集成步骤**：
1. 创建 `src/app/og/route.tsx` 生成品牌默认 OG 图
2. 创建 `src/app/[locale]/og/[id]/route.tsx` 为每个商品生成动态 OG 图（含商品名、价格、图片）
3. 在 `layout.tsx` 中引用 `/og` 作为 fallback OG 图
4. 在各页面（product detail）动态设置 `og:image` 为 `/og/${productId}`

### 备选方案：Canva + 手动上传

如果暂时不想改代码，可以：
1. 用 Canva 制作 1200×630 品牌图（袋鼠 Logo + 品牌色 + "From Japan to the World"）
2. 导出为 `public/og-image.png`
3. 需要在 `next.config.mjs` 中配置 `output: 'standalone'` 确保静态文件被包含

---

## 2. 核心市场翻译精修

### en.json SEO 检查

| 字段 | 当前值 | 问题 | 优化建议 |
|------|--------|------|---------|
| `appName` | `Kangaroo Kun` | "Kun" 是日语敬称，英语用户可能不理解 | `Kangaroo Shop`（品牌一致性更好） |
| `hero.title` | `From Japan to the World` | 良好，简洁有力 | 保留 |
| `hero.subtitle` | `Carefully selected Japanese products, shipped worldwide` | 良好 | 保留 |
| `home.categories` | `Categories` | 过于通用 | `Shop by Category`（含行动号召） |
| `home.featured` | `Featured Products` | 尚可 | `Trending Now` 或 `Best Sellers`（更有紧迫感） |
| `product.addToCart` | `Add to Cart` | 标准 | 保留 |
| `product.buyNow` | `Buy Now` | 良好 | 保留 |
| `footer.copyright` | `© 2024 Kangaroo Kun All Rights Reserved.` | 年份过时 | `© 2026 Kangaroo Shop. All rights reserved.` |

### ja.json SEO 检查

| 字段 | 当前值 | 问题 | 优化建议 |
|------|--------|------|---------|
| `appName` | `袋鼠君` | 中文名称用在日语环境 | 保留（品牌名），但可考虑加注音 |
| `hero.title` | `日本から世界へ` | 良好，简洁有力 | 保留 |
| `hero.subtitle` | `厳選された日本商品を海外の方へ` | 语法有瑕疵 | `厳選された日本製品を海外へお届けします`（更自然） |
| `home.categories` | `カテゴリー` | 过于通用 | `カテゴリから探す`（含行动号召） |
| `home.featured` | `おすすめ商品` | 良好 | 保留 |
| `product.price` | `価格` | 标准 | 保留 |
| `product.addToCart` | `カートに追加` | 标准 | 保留或 `カートに入れる`（更口语化） |
| `cart.empty` | `カートは空です` | 标准 | 保留 |
| `wishlist.title` | `お気に入り` | 良好 | 保留 |

### 通用建议

1. **标题模板统一化**：当前 `layout.tsx` 中 title 模板是 `%s | Kangaroo Shop`，建议对英文页用 `%s | Kangaroo Shop`、日文页用 `%s | 袋鼠君`、中文页用 `%s | 袋鼠君`
2. **meta_description 本地化**：当前各语言的 description 在 layout.tsx 中统一是英文，需要在 each locale page 里覆盖
3. **添加 meta_keywords**：每个产品页根据分类生成不同的关键词
4. **H1 标签**：确认每个页面的 `<h1>` 包含目标关键词

---

## 3. Google Search Console 接入

### 接入步骤

1. **添加站点**：打开 https://search.google.com/search-console → 添加属性 → 输入域名 `https://kangaroo-shop-tan.vercel.app`
2. **验证所有权**：推荐 DNS 验证（TXT 记录在 vercel 域名面板添加）或 HTML 文件验证
3. **提交 Sitemap**：在 GSC 中提交 `https://kangaroo-shop-tan.vercel.app/sitemap.xml`
4. **添加 robots.txt**：当前已生成，确认包含 sitemap URL
5. **设置目标国家**：在 GSC → 设置 → 国际定位 → 选择目标市场（日本、美国等）

### 时间预期

| 阶段 | 时间 | 说明 |
|------|------|------|
| 提交 Sitemap | 即时 | 提交后 Google 开始抓取 |
| 首次索引 | 1-7 天 | 首页通常 1-3 天，产品页 3-7 天 |
| 索引全部页面 | 2-4 周 | 11 个语言 × 10+ 页面 ≈ 110+ URL |
| 开始有搜索流量 | 4-12 周 | 新站通常需要 1-3 个月 |
| 搜索排名稳定 | 3-6 个月 | 持续更新内容后排名会提升 |

### 注意事项

- GSC 会在首次抓取后 2-3 天显示覆盖率数据
- 如果 404 页面多，说明 sitemap 中有错误链接
- 需要定期检查 "Core Web Vitals" 报告
- 建议为每个语言版本创建单独的 GSC 属性（可选）

---

## 4. 网站性能优化

### 当前构建产物分析

从 Vercel 构建输出可见：

**First Load JS 统计**：
| 页面 | First Load JS | 分析 |
|------|---------------|------|
| 首页 (/) | 111 kB | 合理 |
| 产品列表 | 121 kB | 合理 |
| 产品详情 | 105 kB | 合理 |
| 购物车 | 106 kB | 合理 |
| 管理面板 | 719 kB | **较大**，需优化 |
| Shared (所有页面) | 87.5 kB | 合理 |

### 优化项

#### 🔴 高优先级

1. **缺失 /public/og-image.png**
   - 问题：OG meta tags 引用 `/og-image.png` 但文件不存在
   - 解决：创建生成或放置静态 OG 图片
   - 影响：社交媒体分享时无预览图，严重影响 CTR

2. **数据库连接失败**
   - 问题：`db.prisma.io:5432` 不可达
   - 解决：检查 Prisma Data Proxy 是否激活或更换数据库连接串
   - 影响：API 路由（商品搜索、下单）完全不可用

#### 🟡 中优先级

3. **图片优化**
   - 当前所有商品图片用 `placehold.co`，非真实产品图
   - 建议：上线真实图片后，使用 Next.js `<Image>` 组件（已配置 `remotePatterns`）
   - Next.js Image 自动：WebP 转换、懒加载、响应式尺寸

4. **字体加载**
   - 当前未配置字体 preload
   - 建议：在 `layout.tsx` 中 preload 主要字体

5. **CSS 优化**
   - 当前只有一个 CSS chunk（3de73ec17c6a4872.css）
   - 建议：确认 CSS 未被拆分；检查未使用的 CSS

#### 🟢 低优先级

6. **管理面板（719 kB）**
   - 含 ECharts + antd，符合预期
   - 对普通用户无影响（仅管理员访问）

7. **Middleware 性能**
   - 每个请求都调用 GeoIP 检测（ipwhois.app）
   - 建议：添加 30 天 Cookie 缓存（已有），但需确认在生产环境工作正常

8. **构建缓存**
   - 已启用 Vercel Build Cache（恢复缓存在 1.2s 完成）
   - 建议：在 GitHub Actions 中配置 CI 缓存

### 性能检查清单

```bash
# 1. Lighthouse 评分（本地运行）
npx lighthouse https://kangaroo-shop-tan.vercel.app --view

# 2. 检查 Core Web Vitals
# 使用 Chrome DevTools → Performance → Core Web Vitals

# 3. 检查未使用的 JavaScript
# 使用 Chrome DevTools → Coverage (Ctrl+Shift+P → Coverage)

# 4. 检查图片优化
curl -I https://kangaroo-shop-tan.vercel.app/_next/image?url=...
```

---

## 执行排期建议

| 优先级 | 任务 | 预估时间 | 依赖 |
|--------|------|---------|------|
| P0 | ① 修复数据库连接 | 1-2h | 数据库凭证 |
| P0 | ② 创建 OG 图片（或 @vercel/og） | 2-4h | 设计素材 |
| P1 | ③ 翻译文件精修 | 1h | 无 |
| P1 | ④ 提交 GSC 并验证 | 30min | 域名验证权限 |
| P2 | ⑤ 图片优化（真实商品图 + <Image>） | 持续 | 产品图片 |
| P2 | ⑥ 字体 preload | 30min | 无 |
| P3 | ⑦ 性能基准测试 + Lighthouse 报告 | 1h | 无 |

---

**文档版本**: v1.0
**生成日期**: 2026-04-27
**作者**: SEO Phase 2 Planning
