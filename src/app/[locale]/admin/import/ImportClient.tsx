'use client';

import { useState } from 'react';

type Platform = 'rakuten' | 'amazon' | 'own';

type PreviewItem = {
  rowIndex: number;
  action: 'create' | 'update' | 'skip';
  reason?: string;
  platformSku?: string;
  titleJa?: string;
  platformPrice?: number;
  existingProductId?: string;
};

type PreviewResult = {
  platform: Platform;
  fileName: string;
  totalRows: number;
  toCreate: number;
  toUpdate: number;
  toSkip: number;
  parseErrors: number;
  fileSha256: string;
  confirmationToken: string;
  items: PreviewItem[];
  errors?: { rowIndex: number; message: string }[];
};

type ExecuteResult = {
  syncJobId: string;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
};

const PLATFORM_LABELS: Record<Platform, string> = {
  rakuten: '乐天 CSV',
  amazon: 'Amazon 报表',
  own: '自营 CSV',
};

export default function ImportClient({ locale }: { locale: string }) {
  const [platform, setPlatform] = useState<Platform>('rakuten');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewConfirmed, setPreviewConfirmed] = useState(false);
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const upload = async (mode: 'preview' | 'execute') => {
    if (!file) {
      setError('请先选择文件');
      return;
    }
    if (mode === 'execute') {
      if (!preview || !previewConfirmed) {
        setError('请先解析预览并勾选确认，再执行导入');
        return;
      }
      if (preview.parseErrors > 0) {
        setError('预览中仍有解析错误，请修正文件后重新预览');
        return;
      }
    }
    setLoading(true);
    setError('');
    setExecuteResult(null);
    try {
      const fd = new FormData();
      fd.append('platform', platform);
      fd.append('file', file);
      if (mode === 'execute' && preview) {
        fd.append('confirmationToken', preview.confirmationToken);
      }
      const res = await fetch(mode === 'preview' ? '/api/admin/import/upload' : '/api/admin/import/execute', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '请求失败');
      if (mode === 'preview') {
        setPreview(data);
        setPreviewConfirmed(false);
      } else {
        setExecuteResult(data);
        setPreview(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <section style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 'var(--space-4)', alignItems: 'end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span style={labelStyle}>平台</span>
            <select value={platform} onChange={e => {
              setPlatform(e.target.value as Platform);
              setPreview(null);
              setPreviewConfirmed(false);
              setExecuteResult(null);
            }} style={inputStyle}>
              {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <span style={labelStyle}>CSV/报表文件</span>
            <input
              type="file"
              accept=".csv,.tsv,.txt"
              onChange={e => {
                setFile(e.target.files?.[0] ?? null);
                setPreview(null);
                setPreviewConfirmed(false);
                setExecuteResult(null);
              }}
              style={inputStyle}
            />
          </label>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
          <button type="button" onClick={() => upload('preview')} disabled={loading || !file} style={primaryButtonStyle}>
            {loading ? '处理中...' : '解析预览'}
          </button>
          <button type="button" onClick={() => upload('execute')} disabled={loading || !file || !preview || !previewConfirmed || preview.parseErrors > 0} style={secondaryButtonStyle}>
            执行导入为草稿
          </button>
          <a href={`/${locale}/admin/products`} style={linkButtonStyle}>查看商品</a>
        </div>
        {error && <p style={{ color: 'var(--color-danger)', marginTop: 'var(--space-3)' }}>{error}</p>}
      </section>

      {preview && (
        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>解析预览：{preview.fileName}</h2>
          <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
            <Metric label="总行数" value={preview.totalRows} />
            <Metric label="新增" value={preview.toCreate} />
            <Metric label="更新" value={preview.toUpdate} />
            <Metric label="跳过" value={preview.toSkip} />
            <Metric label="解析错误" value={preview.parseErrors} />
          </div>
          {preview.errors && preview.errors.length > 0 && (
            <div style={{ marginBottom: 'var(--space-4)', color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
              {preview.errors.slice(0, 5).map(err => <div key={`${err.rowIndex}-${err.message}`}>第 {err.rowIndex + 1} 行：{err.message}</div>)}
            </div>
          )}
          <div style={confirmBoxStyle}>
            <div style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>导入前确认</div>
            <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
              执行导入只会写入 kangaroo-shop 自建站草稿/更新已有映射，不会直接发布到乐天或 Amazon。文件指纹：{preview.fileSha256.slice(0, 12)}...
            </p>
            <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', marginTop: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
              <input
                type="checkbox"
                checked={previewConfirmed}
                disabled={preview.parseErrors > 0}
                onChange={e => setPreviewConfirmed(e.target.checked)}
              />
              我已确认新增 {preview.toCreate}、更新 {preview.toUpdate}、跳过 {preview.toSkip}，并同意导入为草稿
            </label>
            {preview.parseErrors > 0 && (
              <p style={{ margin: 'var(--space-2) 0 0', color: 'var(--color-danger)', fontSize: 'var(--text-sm)' }}>
                当前存在解析错误，必须修正文件并重新预览后才能执行导入。
              </p>
            )}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
              <thead>
                <tr>
                  {['行', '动作', 'SKU', '商品名', '平台价', '说明'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.items.slice(0, 100).map(item => (
                  <tr key={item.rowIndex}>
                    <td style={tdStyle}>{item.rowIndex + 1}</td>
                    <td style={tdStyle}>{item.action}</td>
                    <td style={tdStyle}>{item.platformSku || '-'}</td>
                    <td style={tdStyle}>{item.titleJa || '-'}</td>
                    <td style={tdStyle}>{item.platformPrice ?? '-'}</td>
                    <td style={tdStyle}>{item.reason || item.existingProductId || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {executeResult && (
        <section style={cardStyle}>
          <h2 style={sectionTitleStyle}>导入完成</h2>
          <p>任务 ID：{executeResult.syncJobId}</p>
          <p>新增 {executeResult.created}，更新 {executeResult.updated}，跳过 {executeResult.skipped}，错误 {executeResult.errors}</p>
        </section>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ minWidth: 100, padding: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 'var(--text-xl)' }}>{value}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
  padding: 'var(--space-5)',
};

const confirmBoxStyle: React.CSSProperties = {
  marginBottom: 'var(--space-4)',
  padding: 'var(--space-4)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  background: 'var(--color-bg)',
};

const labelStyle: React.CSSProperties = { fontSize: 'var(--text-sm)', fontWeight: 600 };
const inputStyle: React.CSSProperties = { padding: 'var(--space-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'var(--color-text)' };
const primaryButtonStyle: React.CSSProperties = { padding: 'var(--space-3) var(--space-5)', border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: 'white', cursor: 'pointer' };
const secondaryButtonStyle: React.CSSProperties = { ...primaryButtonStyle, background: 'var(--color-text)' };
const linkButtonStyle: React.CSSProperties = { padding: 'var(--space-3) var(--space-5)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', color: 'var(--color-text)', textDecoration: 'none' };
const sectionTitleStyle: React.CSSProperties = { fontSize: 'var(--text-xl)', fontWeight: 700, marginBottom: 'var(--space-4)' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' };
const tdStyle: React.CSSProperties = { padding: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' };
