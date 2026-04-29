import ImportClient from './ImportClient';

export default async function ImportPage({ params }: { params: { locale: string } }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          商品导入
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          支持乐天 CSV、Amazon 在售商品报表、自营 CSV。P0 阶段只做导入草稿和库存/价格同步记录，不调用外部平台写接口。
        </p>
      </div>
      <ImportClient locale={params.locale} />
    </div>
  );
}
