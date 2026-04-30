'use client';

import Script from 'next/script';
import { usePathname } from 'next/navigation';

/**
 * Tawk.to 客服在线聊天 Widget
 * 排除 /admin 路径（包括 /zh/admin, /ja/admin, /en/admin）
 */
export function TawkToWidget() {
  const pathname = usePathname();

  // 排除 admin 路径
  if (pathname?.includes('/admin')) {
    return null;
  }

  return (
    <Script
      id="tawkto-widget"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{
        __html: `
var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
(function(){
var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
s1.async=true;
s1.src='https://embed.tawk.to/69f2b3635ac9531c37ee0244/1jne0pfbd';
s1.charset='UTF-8';
s1.setAttribute('crossorigin','*');
s0.parentNode.insertBefore(s1,s0);
})();
        `.trim(),
      }}
    />
  );
}
