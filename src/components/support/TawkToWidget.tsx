'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    Tawk_API?: {
      showWidget?: () => void;
      hideWidget?: () => void;
      maximize?: () => void;
      setAttributes?: (
        attributes: {
          site: 'kangaroo-shop';
          locale: string;
          page_path: string;
          currency: 'jpy';
        },
        callback?: (error?: unknown) => void
      ) => void;
      onLoad?: () => void;
    };
    Tawk_LoadStart?: Date;
  }
}

const TAWK_SCRIPT_ID = 'tawkto-widget-loader';
const TAWK_SCRIPT_SRC = 'https://embed.tawk.to/69f2b3635ac9531c37ee0244/1jne0pfbd';
const SUPPORTED_LOCALES = new Set(['en', 'zh', 'ja', 'ko', 'de', 'fr', 'it', 'es', 'th', 'id', 'vi']);

function getLocaleFromPathname(pathname: string | null): string {
  const firstSegment = pathname?.split('/').filter(Boolean)[0];
  return firstSegment && SUPPORTED_LOCALES.has(firstSegment) ? firstSegment : 'zh';
}

function getCurrentPagePath(pathname: string | null): string {
  if (typeof window === 'undefined') return pathname || '/';

  return `${window.location.pathname}${window.location.search}` || pathname || '/';
}

function buildTawkAttributes(pathname: string | null) {
  const pagePath = getCurrentPagePath(pathname);

  return {
    // 只传低敏上下文：站点、语言、当前页面路径、币种；不自动传订单/邮箱/手机/地址/支付/登录信息。
    site: 'kangaroo-shop' as const,
    locale: getLocaleFromPathname(pagePath),
    page_path: pagePath,
    currency: 'jpy' as const,
  };
}

function ensureTawkScript() {
  if (document.getElementById(TAWK_SCRIPT_ID)) return;

  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = window.Tawk_LoadStart || new Date();

  const script = document.createElement('script');
  script.id = TAWK_SCRIPT_ID;
  script.async = true;
  script.src = TAWK_SCRIPT_SRC;
  script.charset = 'UTF-8';
  script.setAttribute('crossorigin', '*');
  document.body.appendChild(script);
}

function setTawkAttributes(pathname: string | null) {
  const attributes = buildTawkAttributes(pathname);

  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_API.onLoad = () => {
    window.Tawk_API?.setAttributes?.(buildTawkAttributes(window.location.pathname));
  };

  window.Tawk_API.setAttributes?.(attributes);
}

/**
 * Tawk.to 客服在线聊天 Widget
 * 排除 /admin 路径（包括 /zh/admin, /ja/admin, /en/admin）
 * 切换语言会触发客户端路由变化，这里主动确保脚本存在并 showWidget，避免按钮消失。
 */
export function TawkToWidget() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname?.includes('/admin')) {
      window.Tawk_API?.hideWidget?.();
      return;
    }

    ensureTawkScript();
    setTawkAttributes(pathname);
    window.Tawk_API?.showWidget?.();
  }, [pathname]);

  return null;
}
