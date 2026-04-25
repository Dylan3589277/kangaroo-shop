'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';

interface FilterSidebarProps {
  locale: string;
}

const CATEGORIES = [
  { key: 'brainrot', label: 'Italian Brainrot', labelZh: 'Italian Brainrot', labelEn: 'Italian Brainrot' },
  { key: 'anime', label: 'アニメ', labelZh: '动漫', labelEn: 'Anime' },
  { key: 'other', label: 'その他', labelZh: '其他', labelEn: 'Other' },
];

const PRICE_RANGES = [
  { key: '0-1000', min: '0', max: '1000', label: '~1,000円', labelZh: '~1,000日元', labelEn: '~¥1,000' },
  { key: '1000-5000', min: '1000', max: '5000', label: '1,000~5,000円', labelZh: '1,000~5,000日元', labelEn: '¥1,000~5,000' },
  { key: '5000+', min: '5000', max: '', label: '5,000円~', labelZh: '5,000日元~', labelEn: '¥5,000~' },
];

const SOURCES = [
  { key: 'rakuten', label: '楽天', labelZh: '乐天', labelEn: 'Rakuten' },
  { key: 'amazon', label: 'Amazon', labelZh: 'Amazon', labelEn: 'Amazon' },
  { key: 'own', label: '自社', labelZh: '自有', labelEn: 'Own' },
];

function getLabel(item: { key: string; label: string; labelZh: string; labelEn: string }, locale: string) {
  if (locale === 'zh') return item.labelZh;
  if (locale === 'en') return item.labelEn;
  return item.label;
}

export function FilterSidebar({ locale }: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const getParam = (key: string) => searchParams.get(key) || '';
  
  const currentCategories = getParam('category');
  const currentMinPrice = getParam('minPrice');
  const currentMaxPrice = getParam('maxPrice');
  const currentSources = getParam('source');

  const selectedCategories = currentCategories ? currentCategories.split(',').filter(Boolean) : [];
  const selectedSources = currentSources ? currentSources.split(',').filter(Boolean) : [];

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  const toggleArrayParam = (key: string, value: string, currentValues: string[]) => {
    let newValues: string[];
    if (currentValues.includes(value)) {
      newValues = currentValues.filter(v => v !== value);
    } else {
      newValues = [...currentValues, value];
    }
    updateParams({ [key]: newValues.length > 0 ? newValues.join(',') : null });
  };

  const handleCategoryChange = (key: string) => {
    toggleArrayParam('category', key, selectedCategories);
  };

  const handleSourceChange = (key: string) => {
    toggleArrayParam('source', key, selectedSources);
  };

  const handlePriceChange = (min: string, max: string) => {
    const isCurrentlySelected = currentMinPrice === min && currentMaxPrice === max;
    if (isCurrentlySelected) {
      updateParams({ minPrice: null, maxPrice: null });
    } else {
      updateParams({ minPrice: min || null, maxPrice: max || null });
    }
  };

  const clearAllFilters = () => {
    router.push(pathname, { scroll: false });
  };

  const hasActiveFilters = selectedCategories.length > 0 || currentMinPrice || currentMaxPrice || selectedSources.length > 0;

  const labels = {
    filterTitle: locale === 'ja' ? 'フィルター' : locale === 'zh' ? '筛选' : 'Filters',
    category: locale === 'ja' ? 'カテゴリー' : locale === 'zh' ? '分类' : 'Category',
    price: locale === 'ja' ? '価格' : locale === 'zh' ? '价格' : 'Price',
    source: locale === 'ja' ? '出荷元' : locale === 'zh' ? '来源' : 'Source',
    clearAll: locale === 'ja' ? '全てクリア' : locale === 'zh' ? '清除全部' : 'Clear All',
  };

  return (
    <aside className="filter-sidebar">
      <div className="filter-header">
        <h3 className="filter-title">{labels.filterTitle}</h3>
        {hasActiveFilters && (
          <button onClick={clearAllFilters} className="filter-clear-btn">
            {labels.clearAll}
          </button>
        )}
      </div>

      {/* 分类筛选 */}
      <div className="filter-section">
        <h4 className="filter-section-title">{labels.category}</h4>
        <div className="filter-checkbox-group">
          {CATEGORIES.map(cat => (
            <label key={cat.key} className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat.key)}
                onChange={() => handleCategoryChange(cat.key)}
                className="filter-checkbox"
              />
              <span className="filter-checkbox-text">{getLabel(cat, locale)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 价格区间筛选 */}
      <div className="filter-section">
        <h4 className="filter-section-title">{labels.price}</h4>
        <div className="filter-checkbox-group">
          {PRICE_RANGES.map(range => (
            <label key={range.key} className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={currentMinPrice === range.min && currentMaxPrice === range.max}
                onChange={() => handlePriceChange(range.min, range.max)}
                className="filter-checkbox"
              />
              <span className="filter-checkbox-text">{getLabel(range, locale)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 来源筛选 */}
      <div className="filter-section">
        <h4 className="filter-section-title">{labels.source}</h4>
        <div className="filter-checkbox-group">
          {SOURCES.map(src => (
            <label key={src.key} className="filter-checkbox-label">
              <input
                type="checkbox"
                checked={selectedSources.includes(src.key)}
                onChange={() => handleSourceChange(src.key)}
                className="filter-checkbox"
              />
              <span className="filter-checkbox-text">{getLabel(src, locale)}</span>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
