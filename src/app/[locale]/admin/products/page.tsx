import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import Image from 'next/image';
import ProductActiveToggle from './ProductActiveToggle';
import { parseProductImages } from '@/lib/products';

type Props = {
  params: { locale: string };
  searchParams: { active?: string; page?: string };
};

const PAGE_SIZE = 20;

async function getProducts(activeFilter: string | undefined, page: number) {
  try {
    const where = activeFilter === '1'
      ? { isActive: true }
      : activeFilter === '0'
      ? { isActive: false }
      : {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.product.count({ where }),
    ]);
    return { products, total, totalPages: Math.ceil(total / PAGE_SIZE) };
  } catch {
    return { products: [], total: 0, totalPages: 0 };
  }
}

export default async function AdminProductsPage({ params, searchParams }: Props) {
  const locale = params.locale;
  const activeFilter = searchParams.active;
  const currentPage = Math.max(1, parseInt(searchParams.page || '1', 10));

  const { products, total, totalPages } = await getProducts(activeFilter, currentPage);

  const t = {
    ja: {
      title: '商品管理',
      all: 'すべて',
      active: '公開中',
      inactive: '非公開',
      name: '商品名',
      category: 'カテゴリ',
      price: '価格',
      stock: '在庫',
      actions: '操作',
      edit: '編集',
      noProducts: '商品がありません',
      page: 'ページ',
      prev: '前へ',
      next: '次へ',
      new: '新規追加',
      image: '画像',
    },
    zh: {
      title: '商品管理',
      all: '全部',
      active: '上架中',
      inactive: '已下架',
      name: '商品名称',
      category: '分类',
      price: '价格',
      stock: '库存',
      actions: '操作',
      edit: '编辑',
      noProducts: '暂无商品',
      page: '页',
      prev: '上一页',
      next: '下一页',
      new: '新增',
      image: '图片',
    },
    en: {
      title: 'Products',
      all: 'All',
      active: 'Active',
      inactive: 'Inactive',
      name: 'Name',
      category: 'Category',
      price: 'Price',
      stock: 'Stock',
      actions: 'Actions',
      edit: 'Edit',
      noProducts: 'No products yet',
      page: 'Page',
      prev: 'Prev',
      next: 'Next',
      new: 'Add New',
      image: 'Image',
    },
  };

  const labels = t[locale as keyof typeof t] || t.ja;

  const categoryLabels: Record<string, Record<string, string>> = {
    ja: { brainrot: 'Brainrot', anime: 'アニメ', baby: 'ベビー', lifestyle: 'ライフスタイル' },
    zh: { brainrot: 'Brainrot', anime: '动漫', baby: '婴儿', lifestyle: '生活方式' },
    en: { brainrot: 'Brainrot', anime: 'Anime', baby: 'Baby', lifestyle: 'Lifestyle' },
  };

  const getCategoryLabel = (c: string) => categoryLabels[locale]?.[c] || c;

  const formatPrice = (yen: number) => `¥${yen.toLocaleString()}`;

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString(
      locale === 'ja' ? 'ja-JP' : locale === 'zh' ? 'zh-CN' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric' }
    );

  function buildUrl(filter: string | undefined, page: number) {
    const sp = new URLSearchParams();
    if (filter) sp.set('active', filter);
    if (page > 1) sp.set('page', String(page));
    const qs = sp.toString();
    return `/${locale}/admin/products${qs ? '?' + qs : ''}`;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>{labels.title}</h1>
        <a
          href={`/${locale}/admin/products/new`}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--color-primary)',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          + {labels.new}
        </a>
      </div>

      {/* 状态筛选 */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        {[
          { key: undefined, label: labels.all },
          { key: '1', label: labels.active },
          { key: '0', label: labels.inactive },
        ].map(({ key, label }) => (
          <a
            key={String(key)}
            href={buildUrl(key, 1)}
            style={{
              padding: '6px 14px',
              borderRadius: '999px',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              textDecoration: 'none',
              background: activeFilter === (key ?? undefined) ? 'var(--color-primary)' : 'var(--color-surface)',
              color: activeFilter === (key ?? undefined) ? '#fff' : 'var(--color-text)',
              border: '1px solid var(--color-border)',
            }}
          >
            {label}
          </a>
        ))}
      </div>

      {/* 商品列表 */}
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        {products.length === 0 ? (
          <div style={{ padding: 'var(--space-12)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            {labels.noProducts}
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-alt)' }}>
                  <th style={thStyle}>{labels.image}</th>
                  <th style={thStyle}>{labels.name}</th>
                  <th style={thStyle}>{labels.category}</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>{labels.price}</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>{labels.stock}</th>
                  <th style={thStyle}>ステータス</th>
                  <th style={thStyle}>{labels.actions}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, i) => {
                  const productImages = parseProductImages(product.images);
                  return (
                  <tr key={product.id} style={{ borderTop: i > 0 ? '1px solid var(--color-border)' : 'none' }}>
                    {/* Image */}
                    <td style={{ ...tdStyle, width: '64px' }}>
                      {productImages.length > 0 ? (
                        <Image
                          src={productImages[0]}
                          alt={product.title}
                          width={48}
                          height={48}
                          style={{ objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                        />
                      ) : (
                        <div style={{
                          width: '48px',
                          height: '48px',
                          background: 'var(--color-bg-alt)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 'var(--text-xs)',
                          color: 'var(--color-text-muted)',
                        }}>
                          なし
                        </div>
                      )}
                    </td>
                    {/* Name */}
                    <td style={{ ...tdStyle, maxWidth: '240px' }}>
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {product.title}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {formatDate(product.createdAt)}
                      </div>
                    </td>
                    {/* Category */}
                    <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>
                      {getCategoryLabel(product.category)}
                    </td>
                    {/* Price */}
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500 }}>
                      {formatPrice(product.price)}
                    </td>
                    {/* Stock */}
                    <td style={{ ...tdStyle, textAlign: 'right', color: product.stock === 0 ? '#dc2626' : 'inherit' }}>
                      {product.stock}
                    </td>
                    {/* Status toggle */}
                    <td style={tdStyle}>
                      <ProductActiveToggle
                        productId={product.id}
                        isActive={product.isActive}
                        locale={locale}
                      />
                    </td>
                    {/* Actions */}
                    <td style={tdStyle}>
                      <Link
                        href={`/${locale}/admin/products/${product.id}/edit`}
                        style={{
                          fontSize: 'var(--text-sm)',
                          color: 'var(--color-primary)',
                          textDecoration: 'none',
                          fontWeight: 500,
                        }}
                      >
                        {labels.edit} →
                      </Link>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>

            {/* 分页 */}
            {totalPages > 1 && (
              <div style={{
                padding: 'var(--space-4) var(--space-6)',
                borderTop: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  {labels.page} {currentPage} / {totalPages} ({total} 件)
                </span>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {currentPage > 1 && (
                    <a href={buildUrl(activeFilter, currentPage - 1)} style={pageBtnStyle}>
                      {labels.prev}
                    </a>
                  )}
                  {currentPage < totalPages && (
                    <a href={buildUrl(activeFilter, currentPage + 1)} style={pageBtnStyle}>
                      {labels.next}
                    </a>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  textAlign: 'left',
  fontSize: 'var(--text-xs)',
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  textTransform: 'uppercase',
};

const tdStyle: React.CSSProperties = {
  padding: 'var(--space-3) var(--space-4)',
  fontSize: 'var(--text-sm)',
};

const pageBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-sm)',
  fontWeight: 500,
  textDecoration: 'none',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
};
