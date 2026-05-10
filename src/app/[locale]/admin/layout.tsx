import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { authOptions } from '@/lib/auth';
import { buildNoIndexMetadata } from '@/lib/seo';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

export const metadata: Metadata = buildNoIndexMetadata();

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
    redirect(`/${params.locale}/admin/login`);
  }

  if (!session || session.user?.role !== 'admin') {
    redirect(`/${params.locale}/admin/login`);
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <AdminSidebar locale={params.locale} />

      {/* 主内容 */}
      <main style={{
        flex: 1,
        padding: 'var(--space-6)',
        overflow: 'auto',
        // 移动端预留汉堡按钮空间
        paddingTop: '56px',
      }}>
        {/* 桌面端恢复顶部间距 */}
        <style>{`@media (min-width: 768px) { main { padding-top: var(--space-6) !important; } }`}</style>
        {children}
      </main>
    </div>
  );
}
