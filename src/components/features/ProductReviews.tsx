'use client';

import { useState, useEffect } from 'react';

interface Review {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  content: string;
  createdAt: string;
}

interface Props {
  productId: string;
  locale: string;
  initialReviewCount?: number;
}

export function ProductReviews({ productId, locale, initialReviewCount = 0 }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(initialReviewCount);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ authorName: '', rating: 5, title: '', content: '' });
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const labels = {
    ja: { title: 'レビュー', write: 'レビューを投稿', name: 'お名前', ratingLabel: '評価', reviewTitle: 'タイトル（任意）', content: 'レビュー内容', submit: '送信', success: 'レビューを投稿しました！', error: '送信に失敗しました', loadMore: 'もっと見る', noReviews: 'まだレビューがありません', allLoaded: 'すべてのレビューを読みました' },
    zh: { title: '商品评价', write: '发表评论', name: '昵称', ratingLabel: '评分', reviewTitle: '标题（选填）', content: '评价内容', submit: '提交', success: '评论已提交！', error: '提交失败', loadMore: '加载更多', noReviews: '暂无评论', allLoaded: '已加载全部评论' },
    en: { title: 'Reviews', write: 'Write a Review', name: 'Your Name', ratingLabel: 'Rating', reviewTitle: 'Title (optional)', content: 'Your review', submit: 'Submit', success: 'Review submitted!', error: 'Failed to submit', loadMore: 'Load More', noReviews: 'No reviews yet', allLoaded: 'All reviews loaded' },
  };
  const t = labels[locale as keyof typeof labels] ?? labels.en;

  useEffect(() => {
    setLoading(true);
    fetch(`/api/products/${productId}/reviews?page=${page}&limit=5`)
      .then(r => r.json())
      .then(d => {
        if (d.reviews) {
          if (page === 1) setReviews(d.reviews);
          else setReviews(prev => [...prev, ...d.reviews]);
          setTotal(d.total);
          setPages(d.pages);
        }
      })
      .finally(() => setLoading(false));
  }, [productId, page]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.authorName.trim() || !form.content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok || !data.error) {
        setMsg({ type: 'success', text: t.success });
        setForm({ authorName: '', rating: 5, title: '', content: '' });
      } else {
        setMsg({ type: 'error', text: data.error || t.error });
      }
    } catch {
      setMsg({ type: 'error', text: t.error });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section style={{ marginTop: 'var(--space-12)', maxWidth: 700 }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-6)', borderBottom: '2px solid var(--color-primary)', paddingBottom: 'var(--space-2)' }}>
        {t.title} {total > 0 && <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', fontWeight: 400 }}>({total})</span>}
      </h2>

      {/* 已有评论列表 */}
      {reviews.length === 0 && !loading && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>{t.noReviews}</p>
      )}

      {reviews.map(r => (
        <div key={r.id} style={{ marginBottom: 'var(--space-6)', paddingBottom: 'var(--space-6)', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
            <div>
              <span style={{ fontWeight: 600 }}>{r.authorName}</span>
              <span style={{ color: '#f59e0b', marginLeft: 8 }}>
                {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
              </span>
            </div>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              {new Date(r.createdAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : locale === 'ja' ? 'ja-JP' : 'en-US')}
            </span>
          </div>
          {r.title && <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>{r.title}</p>}
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{r.content}</p>
        </div>
      ))}

      {loading && <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>...</p>}

      {page < pages && !loading && (
        <button
          onClick={() => setPage(p => p + 1)}
          style={{ display: 'block', width: '100%', padding: 'var(--space-3)', marginBottom: 'var(--space-8)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg)', cursor: 'pointer', fontSize: 'var(--text-sm)' }}
        >
          {t.loadMore}
        </button>
      )}

      {page >= pages && reviews.length > 0 && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)', textAlign: 'center', marginBottom: 'var(--space-8)' }}>{t.allLoaded}</p>
      )}

      {/* 提交评论表单 */}
      <div style={{ marginTop: 'var(--space-8)', padding: 'var(--space-6)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-card)' }}>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)' }}>{t.write}</h3>

        {msg && (
          <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-4)', background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(198,40,40,0.08)', color: msg.type === 'success' ? 'var(--color-success)' : 'var(--color-error)', fontSize: 'var(--text-sm)' }}>
            {msg.type === 'success' ? '✓ ' : '⚠ '}{msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>{t.name}</label>
            <input
              type="text"
              value={form.authorName}
              onChange={e => setForm(f => ({ ...f, authorName: e.target.value }))}
              required
              style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 'var(--text-sm)' }}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>{t.ratingLabel}</label>
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, rating: s }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: s <= form.rating ? '#f59e0b' : 'var(--color-border)' }}
                >
                  {s <= form.rating ? '★' : '☆'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>{t.reviewTitle}</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 'var(--text-sm)' }}
            />
          </div>

          <div style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>{t.content}</label>
            <textarea
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
              required
              rows={4}
              style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 'var(--text-sm)', resize: 'vertical' }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !form.authorName.trim() || !form.content.trim()}
            style={{ padding: 'var(--space-3) var(--space-6)', borderRadius: 'var(--radius-sm)', border: 'none', background: (submitting || !form.authorName.trim() || !form.content.trim()) ? 'var(--color-border)' : 'var(--color-primary)', color: '#fff', cursor: (submitting || !form.authorName.trim() || !form.content.trim()) ? 'not-allowed' : 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600 }}
          >
            {submitting ? '...' : t.submit}
          </button>
        </form>
      </div>
    </section>
  );
}
