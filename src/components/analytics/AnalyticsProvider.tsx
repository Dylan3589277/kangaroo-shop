'use client';

import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

function AnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_ID) return;
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    // @ts-expect-error gtag
    if (typeof window !== 'undefined' && window.gtag) {
      // @ts-expect-error gtag
      window.gtag('config', GA_ID, { page_path: url });
    }
  }, [pathname, searchParams]);

  return null;
}

export function AnalyticsProvider() {
  // 没有配置任何追踪 ID 时不加载
  if (!GA_ID && !META_PIXEL_ID) return null;

  return (
    <>
      {/* Google Analytics 4 */}
      {GA_ID && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          />
          <Script
            id="gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', {
                  page_path: window.location.pathname,
                  send_page_view: false,
                });
              `,
            }}
          />
        </>
      )}

      {/* Meta Pixel */}
      {META_PIXEL_ID && (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${META_PIXEL_ID}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}

      {/* Page view tracking */}
      <Suspense fallback={null}>
        <AnalyticsInner />
      </Suspense>
    </>
  );
}
