import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales, routing } from '@/i18n/routing';

const DEFAULT_LOCALE = routing.defaultLocale;
const LOCALE_COOKIE_NAMES = ['NEXT_LOCALE', 'preferredLocale'];

// IP/地区自动语言只在用户没有手动选择时生效：
// 日本默认 ja，中国大陆/港澳台默认 zh，其他国家地区统一回落 en。
const COUNTRY_TO_LOCALE: Record<string, string> = {
  JP: 'ja',
  CN: 'zh',
  TW: 'zh',
  HK: 'zh',
  MO: 'zh',
};

function isSupportedLocale(locale: string | undefined): locale is (typeof locales)[number] {
  return Boolean(locale && (locales as readonly string[]).includes(locale));
}

function getManualLocale(request: NextRequest) {
  for (const name of LOCALE_COOKIE_NAMES) {
    const locale = request.cookies.get(name)?.value;
    if (isSupportedLocale(locale)) return locale;
  }
  return undefined;
}

function getCountryCode(request: NextRequest) {
  return (
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-country-code') ||
    request.headers.get('x-geo-country')
  )?.toUpperCase();
}

function redirectWithLocale(request: NextRequest, locale: string, cacheGeo = false) {
  const url = request.nextUrl.clone();
  url.pathname = '/' + locale + request.nextUrl.pathname;
  const response = NextResponse.redirect(url);

  if (cacheGeo) {
    response.cookies.set('geoLocale', locale, {
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
      sameSite: 'lax',
    });
  }

  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过已带 locale 的路径（如 /ja/、/zh/）
  const pathnameLocale = locales.find(
    (locale) => pathname.startsWith('/' + locale + '/') || pathname === '/' + locale
  );
  if (pathnameLocale) {
    const response = NextResponse.next();
    // 用户访问显式 locale 路径视为手动选择，后续根路径访问优先使用该语言。
    response.cookies.set('NEXT_LOCALE', pathnameLocale, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
    response.cookies.set('preferredLocale', pathnameLocale, { path: '/', sameSite: 'lax', maxAge: 60 * 60 * 24 * 365 });
    return response;
  }

  // 跳过 API、SEO文件、静态资源
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt' ||
    /\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|webp)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 优先级1: 用户手动选择（Cookie）
  const cookieLocale = getManualLocale(request);
  if (cookieLocale) {
    return redirectWithLocale(request, cookieLocale);
  }

  // 优先级2: 已缓存的 IP 地理位置推断。
  const cachedGeoLocale = request.cookies.get('geoLocale')?.value;
  if (isSupportedLocale(cachedGeoLocale)) {
    return redirectWithLocale(request, cachedGeoLocale);
  }

  // 优先级3: 部署/CDN 提供的国家地区头，不在 middleware 中调用外部 GeoIP 服务。
  // 未命中指定地区时默认语言为 en。
  const countryCode = getCountryCode(request);
  const detectedLocale = (countryCode && COUNTRY_TO_LOCALE[countryCode]) || DEFAULT_LOCALE;
  return redirectWithLocale(request, detectedLocale, Boolean(countryCode));
}

export const config = {
  // 匹配所有路径，排除静态资源和 API
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
