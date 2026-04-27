import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { locales } from '@/i18n/routing';
import { routing } from '@/i18n/routing';

// 强制 Node.js Runtime（middleware 默认是 Edge，但 IP 检测 fetch 在某些环境受限）
export const runtime = 'nodejs';

const DEFAULT_LOCALE = routing.defaultLocale;

// 语言映射：国家代码 → locale
const COUNTRY_TO_LOCALE: Record<string, string> = {
  JP: 'ja',
  CN: 'zh',
  TW: 'zh',
  HK: 'zh',
  MO: 'zh',
  KR: 'ko',
  US: 'en',
  GB: 'en',
  AU: 'en',
  CA: 'en',
  DE: 'de',
  FR: 'fr',
  IT: 'it',
  ES: 'es',
  TH: 'th',
  ID: 'id',
  VN: 'vi',
  SG: 'en',
  MY: 'en',
  PH: 'en',
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 跳过已带 locale 的路径（如 /ja/、/zh/）
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith('/' + locale + '/') || pathname === '/' + locale
  );
  if (pathnameHasLocale) return NextResponse.next();

  // 跳过 API、静态资源
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|webp)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 优先级1: 用户手动选择（Cookie）
  const cookieLocale = request.cookies.get('preferredLocale')?.value;
  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    const url = request.nextUrl.clone();
    url.pathname = '/' + cookieLocale + pathname;
    return NextResponse.redirect(url);
  }

  // 优先级2: IP 地理位置推断（首次检测后缓存到 Cookie）
  // 检查是否已有检测结果的 Cookie
  const cachedGeoLocale = request.cookies.get('geoLocale')?.value;
  if (cachedGeoLocale && (locales as readonly string[]).includes(cachedGeoLocale)) {
    const url = request.nextUrl.clone();
    url.pathname = '/' + cachedGeoLocale + pathname;
    return NextResponse.redirect(url);
  }

  try {
    const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const ip = forwarded || request.ip || '127.0.0.1';

    // 本地/内网开发环境直接跳过 IP 检测
    if (
      ip === '127.0.0.1' ||
      ip === '::1' ||
      ip.startsWith('192.168.') ||
      ip.startsWith('10.') ||
      ip.startsWith('172.')
    ) {
      const url = request.nextUrl.clone();
      url.pathname = '/' + DEFAULT_LOCALE + pathname;
      return NextResponse.redirect(url);
    }

    // 免费 GeoIP API（无需 key）
    const res = await fetch(
      'https://ipwhois.app/json/' + ip + '?objects=country_code',
      { next: { revalidate: 3600 } }
    );

    if (res.ok) {
      const data = (await res.json()) as { country_code?: string };
      const countryCode = data.country_code;
      const detectedLocale = (countryCode && COUNTRY_TO_LOCALE[countryCode]) || DEFAULT_LOCALE;

      const url = request.nextUrl.clone();
      url.pathname = '/' + detectedLocale + pathname;

      // 首次检测后设置 Cookie（30 天缓存）
      const response = NextResponse.redirect(url);
      response.cookies.set('geoLocale', detectedLocale, {
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
        sameSite: 'lax',
      });
      return response;
    }
  } catch {
    // IP 检测失败，静默降级到默认语言
  }

  // 优先级3: 默认语言（en）
  const url = request.nextUrl.clone();
  url.pathname = '/' + DEFAULT_LOCALE + pathname;
  return NextResponse.redirect(url);
}

export const config = {
  // 匹配所有路径，排除静态资源和 API
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
