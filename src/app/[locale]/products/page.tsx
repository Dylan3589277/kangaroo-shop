import { Link } from '@/i18n/routing';
import { ProductCard } from '@/components/features/ProductCard';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'; // 始终从数据库读取，不缓存

const CATEGORIES = [
  { key: 'all', label: 'すべて', labelZh: '全部', labelEn: 'All' },
  { key: 'brainrot', label: 'Italian Brainrot', labelZh: 'Italian Brainrot', labelEn: 'Italian Brainrot' },
  { key: 'anime', label: 'アニメ', labelZh: '动漫', labelEn: 'Anime' },
  { key: 'baby', label: 'ベビー用品', labelZh: '婴儿用品', labelEn: 'Baby' },
  { key: 'lifestyle', label: 'ライフスタイル', labelZh: '生活方式', labelEn: 'Lifestyle' },
];

const PAGE_SIZE = 20;

function getCategoryLabel(cat: typeof CATEGORIES[number], locale: string) {
  if (locale === 'zh') return cat.labelZh;
  if (locale === 'en') return cat.labelEn;
  return cat.label;
}

function buildPageUrl(basePath: string, category: string, page: number) {
  const params = new URLSearchParams();
  if (category !== 'all') params.set('category', category);
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const { locale } = await params;
  const { category, page: pageParam } = await searchParams;
  const activeCategory = category || 'all';
  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10));
  const skip = (currentPage - 1) * PAGE_SIZE;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: {
        isActive: true,
        ...(activeCategory !== 'all' ? { category: activeCategory } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.product.count({
      where: {
        isActive: true,
        ...(activeCategory !== 'all' ? { category: activeCategory } : {}),
      },
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const labels = {
    title: locale === 'ja' ? '商品一覧' : locale === 'zh' ? '商品列表' : 'Products',
    empty: locale === 'ja' ? 'このカテゴリーの商品はありません' : locale === 'zh' ? '该分类暂无商品' : 'No products in this category',
    prev: locale === 'ja' ? '前へ' : locale === 'zh' ? '上一页' : 'Prev',
    next: locale === 'ja' ? '次へ' : locale === 'zh' ? '下一页' : 'Next',
    pageOf: locale === 'ja' ? 'ページ' : locale === 'zh' ? '第' : 'Page',
    of: locale === 'ja' ? '/' : locale === 'zh' ? '页，共' : ' of ',
  };

  // 构建分类 Tab 的 href
  const basePath = `/${locale}/products`;

  return (
    <main className="container products-page">
      <h1 className="products-title">
        {labels.title}
      </h1>

      {/* 分类 Tab */}
      <div className="category-tab">
        {CATEGORIES.map(cat => (
          <Link
            key={cat.key}
            href={buildPageUrl(basePath, cat.key, 1)}
            className={`category-tab-link${activeCategory === cat.key ? ' active' : ''}`}
          >
            {getCategoryLabel(cat, locale)}
          </Link>
        ))}
      </div>

      {/* 商品网格 */}
      {products.length === 0 ? (
        <div className="products-empty">
          <p>{labels.empty}</p>
        </div>
      ) : (
        <>
          <div className="product-grid">
            {products.map(product => (
              <ProductCard key={product.id} product={product} locale={locale} />
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <nav className="pagination" aria-label="分页">
              <Link
                href={buildPageUrl(basePath, activeCategory, currentPage - 1)}
                className="pagination-btn"
                aria-disabled={currentPage <= 1}
                style={currentPage <= 1 ? { pointerEvents: 'none', opacity: 0.4 } : undefined}
              >
                {labels.prev}
              </Link>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                  if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '...' ? (
                    <span key={`ellipsis-${idx}`} className="pagination-ellipsis">…</span>
                  ) : (
                    <Link
                      key={p}
                      href={buildPageUrl(basePath, activeCategory, p as number)}
                      className={`pagination-btn${currentPage === p ? ' active' : ''}`}
                    >
                      {p}
                    </Link>
                  )
                )}

              <Link
                href={buildPageUrl(basePath, activeCategory, currentPage + 1)}
                className="pagination-btn"
                aria-disabled={currentPage >= totalPages}
                style={currentPage >= totalPages ? { pointerEvents: 'none', opacity: 0.4 } : undefined}
              >
                {labels.next}
              </Link>
            </nav>
          )}
        </>
      )}
    </main>
  );
}
