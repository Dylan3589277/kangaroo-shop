import ImportClient from './ImportClient';

export default async function ImportPage({ params }: { params: { locale: string } }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
          商品导入
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          支持乐天 CSV、Amazon 在售商品报表、自营 CSV。导入默认进入草稿；乐天/Amazon 只生成预览/模板，不调用外部平台写接口。
        </p>
      </div>
      <ImportClient locale={params.locale} />
    </div>
  );
}
