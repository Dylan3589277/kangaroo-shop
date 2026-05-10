import { prisma } from '@/lib/prisma';
import ListingActions from './ListingActions';

type Props = {
  params: { locale: string };
  searchParams: { page?: string; active?: string };
};

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 20;

const labels = {
  ja: {
    title: '多平台出品センター',
    subtitle: '自営サイトの公開/下書き切替、Rakuten CSV / Amazon TSV テンプレート生成、同期ジョブ履歴を確認します。',
    all: 'すべて',
    active: '公開中',
    draft: '下書き',
    product: '商品',
    productStatus: '商品状態',
    stock: '在庫',
    price: '価格',
    source: 'ソース',
    listingStatus: 'Listing 状態',
    actions: '操作 / テンプレート',
    noProducts: '商品がありません',
    recentJobs: '最近の SyncJob',
    noJobs: 'SyncJob はまだありません',
    platform: '平台',
    jobStatus: '状態',
    rows: '行数',
    meta: 'Meta',
    createdAt: '作成日時',
    updatedAt: '更新日時',
    page: 'ページ',
    prev: '前へ',
    next: '次へ',
    own: '自営',
    rakuten: 'Rakuten',
    amazon: 'Amazon',
  },
  zh: {
    title: '多平台上架中心',
    subtitle: '集中管理自营站发布/下架、Rakuten CSV / Amazon TSV 模板下载，以及同步任务只读记录。',
    all: '全部',
    active: '上架中',
    draft: '草稿/下架',
    product: '商品',
    productStatus: '商品状态',
    stock: '库存',
    price: '价格',
    source: '来源',
    listingStatus: 'Listing 状态',
    actions: '操作 / 模板',
    noProducts: '暂无商品',
    recentJobs: '最近 SyncJob',
    noJobs: '暂无 SyncJob',
    platform: '平台',
    jobStatus: '状态',
    rows: '行数',
    meta: '类型/动作/模式',
    createdAt: '创建时间',
    updatedAt: '更新时间',
    page: '页',
    prev: '上一页',
    next: '下一页',
    own: '自营站',
    rakuten: 'Rakuten',
    amazon: 'Amazon',
  },
  en: {
    title: 'Multi-platform Listings Center',
    subtitle: 'Manage own-site publish/unpublish, download Rakuten CSV / Amazon TSV templates, and review sync jobs.',
    all: 'All',
    active: 'Active',
    draft: 'Draft',
    product: 'Product',
    productStatus: 'Product status',
    stock: 'Stock',
    price: 'Price',
    source: 'Source',
    listingStatus: 'Listing status',
    actions: 'Actions / templates',
    noProducts: 'No products yet',
    recentJobs: 'Recent SyncJobs',
    noJobs: 'No SyncJobs yet',
    platform: 'Platform',
    jobStatus: 'Status',
    rows: 'Rows',
    meta: 'Type / action / mode',
    createdAt: 'Created',
    updatedAt: 'Updated',
    page: 'Page',
    prev: 'Prev',
    next: 'Next',
    own: 'Own site',
    rakuten: 'Rakuten',
    amazon: 'Amazon',
  },
};

async function getListingCenterData(activeFilter: string | undefined, page: number) {
  const where =
    activeFilter === '1'
      ? { isActive: true }
      : activeFilter === '0'
      ? { isActive: false }
      : {};

  try {
    const [products, total, syncJobs] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          listings: {
            where: { variantId: null },
            orderBy: { updatedAt: 'desc' },
          },
        },
      }),
      prisma.product.count({ where }),
      prisma.syncJob.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { _count: { select: { items: true } } },
      }),
    ]);

    return { products, total, totalPages: Math.ceil(total / PAGE_SIZE), syncJobs, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load listings';
    return { products: [], total: 0, totalPages: 0, syncJobs: [], error: message };
  }
}

export default async function AdminListingsPage({ params, searchParams }: Props) {
  const locale = params.locale;
  const activeFilter = searchParams.active;
  const currentPage = Math.max(1, Number.parseInt(searchParams.page || '1', 10) || 1);
  const t = labels[locale as keyof typeof labels] || labels.ja;
  const { products, total, totalPages, syncJobs, error } = await getListingCenterData(activeFilter, currentPage);

  function buildUrl(filter: string | undefined, page: number) {
    const sp = new URLSearchParams();
    if (filter) sp.set('active', filter);
    if (page > 1) sp.set('page', String(page));
    const qs = sp.toString();
    return `/${locale}/admin/listings${qs ? `?${qs}` : ''}`;
  }

  function formatPrice(yen: number) {
    return `¥${yen.toLocaleString()}`;
  }

  function formatDate(date: Date) {
    return new Date(date).toLocaleString(locale === 'zh' ? 'zh-CN' : locale === 'en' ? 'en-US' : 'ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getListingStatus(product: (typeof products)[number], platform: 'own' | 'rakuten' | 'amazon') {
    const listing = product.listings.find((item) => item.platform === platform);
    if (platform === 'own' && !listing) return product.isActive ? 'active' : 'draft';
    return listing?.status || 'draft';
  }

  function formatJobMeta(meta: unknown) {
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return '—';
    const record = meta as Record<string, unknown>;
    const parts = ['type', 'action', 'mode']
      .map((key) => (typeof record[key] === 'string' && record[key] ? `${key}: ${record[key]}` : null))
      .filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : '—';
  }

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>{t.title}</h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>{t.subtitle}</p>
      </div>

      {error && (
        <div style={{ ...cardStyle, padding: 'var(--space-4)', marginBottom: 'var(--space-6)', color: '#b91c1c', background: '#fef2f2' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        {[
          { key: undefined, label: t.all },
          { key: '1', label: t.active },
          { key: '0', label: t.draft },
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

      <section style={{ ...cardStyle, overflow: 'hidden', marginBottom: 'var(--space-8)' }}>
        {products.length === 0 ? (
          <div style={{ padding: 'var(--space-12)', textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>{t.noProducts}</p>
            <a href={`/${locale}/admin/products/new`} style={{
              display: 'inline-block',
              padding: 'var(--space-2) var(--space-4)',
              background: 'var(--color-primary)',
              color: '#fff',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
            }}>
              {locale === 'ja' ? '＋ 商品を追加' : locale === 'zh' ? '＋ 添加商品' : '+ Add Product'}
            </a>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-alt)' }}>
                    <th style={thStyle}>{t.product}</th>
                    <th style={thStyle}>{t.productStatus}</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>{t.stock}</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>{t.price}</th>
                    <th style={thStyle}>{t.source}</th>
                    <th style={thStyle}>{t.listingStatus}</th>
                    <th style={thStyle}>{t.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product, index) => {
                    const ownStatus = getListingStatus(product, 'own');
                    const rakutenStatus = getListingStatus(product, 'rakuten');
                    const amazonStatus = getListingStatus(product, 'amazon');
                    return (
                      <tr key={product.id} style={{ borderTop: index > 0 ? '1px solid var(--color-border)' : 'none' }}>
                        <td style={{ ...tdStyle, maxWidth: '320px' }}>
                          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.titleJa || product.title}</div>
                          <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', marginTop: '2px' }}>{product.id}</div>
                        </td>
                        <td style={tdStyle}>
                          <StatusBadge status={product.isActive ? 'active' : 'draft'} label={product.isActive ? t.active : t.draft} />
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', color: product.stock <= 0 ? '#dc2626' : 'inherit', fontWeight: 600 }}>{product.stock}</td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{formatPrice(product.price)}</td>
                        <td style={tdStyle}>{product.source || 'own'}</td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <StatusBadge status={ownStatus} label={`${t.own}: ${ownStatus}`} />
                            <StatusBadge status={rakutenStatus} label={`${t.rakuten}: ${rakutenStatus}`} />
                            <StatusBadge status={amazonStatus} label={`${t.amazon}: ${amazonStatus}`} />
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <ListingActions productId={product.id} isActive={product.isActive} locale={locale} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ padding: 'var(--space-4) var(--space-6)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  {t.page} {currentPage} / {totalPages} ({total})
                </span>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  {currentPage > 1 && <a href={buildUrl(activeFilter, currentPage - 1)} style={pageButtonStyle}>{t.prev}</a>}
                  {currentPage < totalPages && <a href={buildUrl(activeFilter, currentPage + 1)} style={pageButtonStyle}>{t.next}</a>}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <section style={{ ...cardStyle, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-4) var(--space-6)', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{t.recentJobs}</h2>
        </div>
        {syncJobs.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>{t.noJobs}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-alt)' }}>
                  <th style={thStyle}>ID</th>
                  <th style={thStyle}>{t.platform}</th>
                  <th style={thStyle}>{t.jobStatus}</th>
                  <th style={thStyle}>{t.rows}</th>
                  <th style={thStyle}>{t.meta}</th>
                  <th style={thStyle}>{t.createdAt}</th>
                  <th style={thStyle}>{t.updatedAt}</th>
                </tr>
              </thead>
              <tbody>
                {syncJobs.map((job, index) => (
                  <tr key={job.id} style={{ borderTop: index > 0 ? '1px solid var(--color-border)' : 'none' }}>
                    <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{job.id}</td>
                    <td style={tdStyle}>{job.platform}</td>
                    <td style={tdStyle}><StatusBadge status={job.status} label={job.status} /></td>
                    <td style={tdStyle}>{job.doneRows}/{job.totalRows} · errors {job.errorRows} · items {job._count.items}</td>
                    <td style={{ ...tdStyle, maxWidth: '260px', color: 'var(--color-text-muted)' }}>{formatJobMeta(job.meta)}</td>
                    <td style={tdStyle}>{formatDate(job.createdAt)}</td>
                    <td style={tdStyle}>{formatDate(job.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const normalized = status.toLowerCase();
  const isGood = normalized === 'active' || normalized === 'done' || normalized === 'updated' || normalized === 'created';
  const isBad = normalized === 'inactive' || normalized === 'failed' || normalized === 'error';
  const background = isGood ? '#dcfce7' : isBad ? '#fee2e2' : '#f3f4f6';
  const color = isGood ? '#166534' : isBad ? '#b91c1c' : '#374151';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: '999px', background, color, fontSize: 'var(--text-xs)', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
};

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
  verticalAlign: 'top',
};

const pageButtonStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-sm)',
  fontWeight: 500,
  textDecoration: 'none',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
};
