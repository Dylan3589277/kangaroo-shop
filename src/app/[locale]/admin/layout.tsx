import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch {
    // If session check fails (e.g., DB unreachable), redirect to login
    redirect(`/${params.locale}/admin/login`);
  }

  if (!session || session.user?.role !== 'admin') {
    redirect(`/${params.locale}/admin/login`);
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <aside style={{
        width: '240px',
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        padding: 'var(--space-6) var(--space-4)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>袋鼠君</h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>管理后台</p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: 1 }}>
          <a href={`/${params.locale}/admin`} style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text)',
            textDecoration: 'none',
            fontSize: 'var(--text-sm)',
          }}>
            📊 概览
          </a>
          <a href={`/${params.locale}/admin/dashboard`} style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            fontSize: 'var(--text-sm)',
          }}>
            📈 Dashboard
          </a>
          <a href={`/${params.locale}/admin/dashboard/alerts`} style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            fontSize: 'var(--text-sm)',
          }}>
            🚨 告警中心
          </a>
          <a href={`/${params.locale}/admin/dashboard/operation`} style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            fontSize: 'var(--text-sm)',
          }}>
            ⚙️ 运营模块
          </a>
          <a href={`/${params.locale}/admin/dashboard/hr`} style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            fontSize: 'var(--text-sm)',
          }}>
            👥 人事模块
          </a>
          <a href={`/${params.locale}/admin/dashboard/finance`} style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            fontSize: 'var(--text-sm)',
          }}>
            💰 财务模块
          </a>
          <a href={`/${params.locale}/admin/dashboard/supply-chain`} style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            fontSize: 'var(--text-sm)',
          }}>
            📦 供应链模块
          </a>
          <a href={`/${params.locale}/admin/dashboard/influencer`} style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            fontSize: 'var(--text-sm)',
          }}>
            ⭐ 红人模块
          </a>
          <a href={`/${params.locale}/admin/orders`} style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            fontSize: 'var(--text-sm)',
          }}>
            📦 订单管理
          </a>
          <a href={`/${params.locale}/admin/products`} style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            fontSize: 'var(--text-sm)',
          }}>
            🛍️ 商品管理
          </a>
          <a href={`/${params.locale}/admin/import`} style={{
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
            fontSize: 'var(--text-sm)',
          }}>
            📥 商品导入
          </a>
        </nav>

        <div style={{
          paddingTop: 'var(--space-6)',
          borderTop: '1px solid var(--color-border)',
        }}>
          <a href={`/${params.locale}`} style={{
            display: 'block',
            padding: 'var(--space-3) var(--space-4)',
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
            fontSize: 'var(--text-sm)',
          }}>
            ← 返回商店
          </a>
        </div>
      </aside>

      {/* 主内容 */}
      <main style={{ flex: 1, padding: 'var(--space-6)', overflow: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
