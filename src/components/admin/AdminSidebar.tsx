'use client';

import { useState, useCallback, useEffect } from 'react';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', label: '概览', icon: '📊' },
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📈' },
  { href: '/admin/dashboard/alerts', label: '告警中心', icon: '🚨' },
  { href: '/admin/dashboard/operation', label: '运营模块', icon: '⚙️' },
  { href: '/admin/dashboard/hr', label: '人事模块', icon: '👥' },
  { href: '/admin/dashboard/finance', label: '财务模块', icon: '💰' },
  { href: '/admin/dashboard/supply-chain', label: '供应链模块', icon: '📦' },
  { href: '/admin/dashboard/influencer', label: '红人模块', icon: '⭐' },
  { href: '/admin/orders', label: '订单管理', icon: '📦' },
  { href: '/admin/support', label: '客服工作台', icon: '💬' },
  { href: '/admin/products', label: '商品管理', icon: '🛍️' },
  { href: '/admin/listings', label: '多平台上架', icon: '🧾' },
  { href: '/admin/import', label: '商品导入', icon: '📥' },
];

type Props = {
  locale: string;
};

/** 侧边栏完整布局：品牌区 + 导航 + 底部链接，内嵌移动端折叠逻辑 */
export function AdminSidebar({ locale }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 检测屏幕宽度：< 768px 为移动端
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true); // 移动端默认折叠
      else setCollapsed(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // 移动端点击导航后自动折叠
  const handleNavClick = useCallback(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

  const toggle = () => setCollapsed(v => !v);

  return (
    <>
      {/* 汉堡菜单按钮 */}
      <button
        onClick={toggle}
        aria-label={collapsed ? '展开菜单' : '折叠菜单'}
        style={{
          position: 'fixed',
          top: '12px',
          left: collapsed ? '12px' : '252px',
          zIndex: 10000,
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          fontSize: '18px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          transition: 'left 0.2s',
        }}
      >
        {collapsed ? '☰' : '✕'}
      </button>

      {/* 侧边栏 */}
      <aside
        style={{
          width: collapsed ? '0px' : '240px',
          minWidth: collapsed ? '0px' : '240px',
          background: 'var(--color-surface)',
          borderRight: collapsed ? 'none' : '1px solid var(--color-border)',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'width 0.2s, min-width 0.2s',
        }}
      >
        <div style={{
          padding: 'var(--space-6) var(--space-4)',
          display: collapsed ? 'none' : 'block',
        }}>
          <div style={{ marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, whiteSpace: 'nowrap' }}>classe</h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>管理后台</p>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', flex: 1 }}>
            {NAV_ITEMS.map((item) => {
              const href = `/${locale}${item.href}`;
              const isActive = pathname === href ||
                (item.href === '/admin/dashboard' && pathname.startsWith(`/${locale}/admin/dashboard`)) ||
                (item.href === '/admin' && pathname === `/${locale}/admin`);

              return (
                <a
                  key={item.href}
                  href={href}
                  onClick={handleNavClick}
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    textDecoration: 'none',
                    fontSize: 'var(--text-sm)',
                    fontWeight: isActive ? 600 : 400,
                    background: isActive ? 'var(--color-primary-bg, rgba(59,130,246,0.08))' : 'transparent',
                    transition: 'background 0.15s, color 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.icon} {item.label}
                </a>
              );
            })}
          </nav>

          <div style={{ paddingTop: 'var(--space-6)', borderTop: '1px solid var(--color-border)' }}>
            <a
              href={`/${locale}`}
              onClick={handleNavClick}
              style={{
                display: 'block',
                padding: 'var(--space-3) var(--space-4)',
                color: 'var(--color-text-muted)',
                textDecoration: 'none',
                fontSize: 'var(--text-sm)',
                whiteSpace: 'nowrap',
              }}
            >
              ← 返回商店
            </a>
          </div>
        </div>
      </aside>

      {/* 移动端遮罩 */}
      {isMobile && !collapsed && (
        <div
          onClick={() => setCollapsed(true)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 9998,
          }}
        />
      )}
    </>
  );
}
