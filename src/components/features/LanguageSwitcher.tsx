"use client";

import type { FocusEvent } from 'react';
import { useMemo, useRef, useState } from 'react';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { locales, type Locale } from '@/i18n/routing';

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  de: 'Deutsch',
  fr: 'Français',
  it: 'Italiano',
  es: 'Español',
  th: 'ไทย',
  id: 'Bahasa Indonesia',
  vi: 'Tiếng Việt',
};

function persistLocale(locale: Locale) {
  const cookie = `max-age=${ONE_YEAR_SECONDS}; path=/; samesite=lax`;
  document.cookie = `NEXT_LOCALE=${locale}; ${cookie}`;
  document.cookie = `preferredLocale=${locale}; ${cookie}`;
}

function replaceLocaleInPath(pathname: string, nextLocale: Locale) {
  const parts = pathname.split('/');
  if ((locales as readonly string[]).includes(parts[1])) {
    parts[1] = nextLocale;
    return parts.join('/') || `/${nextLocale}`;
  }
  return `/${nextLocale}${pathname === '/' ? '' : pathname}`;
}

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentLocale = useMemo(() => {
    const locale = typeof params?.locale === 'string' ? params.locale : 'en';
    return (locales as readonly string[]).includes(locale) ? (locale as Locale) : 'en';
  }, [params?.locale]);

  const switchLanguage = (nextLocale: Locale) => {
    persistLocale(nextLocale);
    setOpen(false);
    const nextPath = replaceLocaleInPath(pathname || '/', nextLocale);
    const search = window.location.search || '';
    router.push(`${nextPath}${search}`);
    router.refresh();
  };

  const closeOnBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!menuRef.current?.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
    }
  };

  return (
    <div className="language-switcher" ref={menuRef} onBlur={closeOnBlur}>
      <button
        type="button"
        className="language-switcher-button"
        aria-label="Choose language"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">🌐</span>
        <span className="language-switcher-current">{LANGUAGE_NAMES[currentLocale]}</span>
      </button>

      {open && (
        <div className="language-switcher-menu" role="menu" aria-label="Language options">
          {locales.map((locale) => (
            <button
              key={locale}
              type="button"
              role="menuitemradio"
              aria-checked={locale === currentLocale}
              className={`language-switcher-option${locale === currentLocale ? ' active' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => switchLanguage(locale)}
            >
              {LANGUAGE_NAMES[locale]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
