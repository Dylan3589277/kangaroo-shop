'use client';

import { useRouter, usePathname } from '@/i18n/routing';
import { useSearchParams, useParams } from 'next/navigation';

export function SearchForm() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = (params as { locale: string }).locale;

  const currentSearch = searchParams.get('search') || '';
  const currentCategory = searchParams.get('category') || 'all';

  const labels = {
    placeholder: locale === 'ja' ? '商品を検索...' : locale === 'zh' ? '搜索商品...' : 'Search products...',
    button: locale === 'ja' ? '検索' : locale === 'zh' ? '搜索' : 'Search',
    clear: locale === 'ja' ? 'クリア' : locale === 'zh' ? '清除' : 'Clear',
  };

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get('search') as string;

    const params = new URLSearchParams();
    if (currentCategory !== 'all') params.set('category', currentCategory);
    if (search.trim()) params.set('search', search.trim());
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ''}`);
  }

  function handleClear() {
    const params = new URLSearchParams();
    if (currentCategory !== 'all') params.set('category', currentCategory);
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ''}`);
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <input
        type="text"
        name="search"
        className="search-input"
        placeholder={labels.placeholder}
        defaultValue={currentSearch}
      />
      <button type="submit" className="search-btn">{labels.button}</button>
      {currentSearch && (
        <button type="button" className="search-clear-btn" onClick={handleClear}>
          {labels.clear}
        </button>
      )}
    </form>
  );
}
