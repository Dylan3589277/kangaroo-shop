'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

declare global {
  interface Window {
    Tawk_API?: {
      showWidget?: () => void;
      hideWidget?: () => void;
      maximize?: () => void;
    };
    Tawk_LoadStart?: Date;
  }
}

const TAWK_SCRIPT_ID = 'tawkto-widget-loader';
const TAWK_SCRIPT_SRC = 'https://embed.tawk.to/69f2b3635ac9531c37ee0244/1jne0pfbd';

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
    window.Tawk_API?.showWidget?.();
  }, [pathname]);

  return null;
}
