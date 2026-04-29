import type { Metadata } from 'next';
import { routing } from '@/i18n/routing';

export const SEO_BASE_URL = 'https://kangaroo-shop-orpin.vercel.app';

function normalizePath(path = '') {
  if (!path || path === '/') return '';
  return path.startsWith('/') ? path : `/${path}`;
}

export function buildLocalePath(locale: string, path = '') {
  return `/${locale}${normalizePath(path)}`;
}

export function buildAbsoluteUrl(path: string) {
  return new URL(path, SEO_BASE_URL).toString();
}

export function buildLocaleAlternates(path = '') {
  const normalizedPath = normalizePath(path);
  const languages = Object.fromEntries(
    routing.locales.map((locale) => [locale, buildAbsoluteUrl(`/${locale}${normalizedPath}`)])
  ) as Record<string, string>;

  languages['x-default'] = buildAbsoluteUrl(`/${routing.defaultLocale}${normalizedPath}`);

  return languages;
}

export function buildIndexableMetadata({
  locale,
  path = '',
  title,
  description,
  extra,
}: {
  locale: string;
  path?: string;
  title?: Metadata['title'];
  description?: Metadata['description'];
  extra?: Omit<Metadata, 'title' | 'description' | 'alternates'>;
}): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: buildAbsoluteUrl(buildLocalePath(locale, path)),
      languages: buildLocaleAlternates(path),
    },
    ...extra,
  };
}

export function buildNoIndexMetadata({
  title,
  description,
}: {
  title?: Metadata['title'];
  description?: Metadata['description'];
} = {}): Metadata {
  return {
    title,
    description,
    alternates: {
      canonical: null,
      languages: {},
    },
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

export function toAbsoluteImageUrls(images: string[]) {
  return images
    .filter(Boolean)
    .map((image) => {
      if (image.startsWith('http://') || image.startsWith('https://')) {
        return image;
      }

      return buildAbsoluteUrl(image.startsWith('/') ? image : `/${image}`);
    });
}
