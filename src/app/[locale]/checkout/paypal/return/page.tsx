'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

interface Props {
  params: { locale: string };
}

export default function PayPalReturnPage({ params }: Props) {
  const locale = params.locale;
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'cancelled'>('loading');
  const [orderNumber, setOrderNumber] = useState('');

  const labels: Record<string, { title: string; sub: string; btn: string }> = {
    ja: {
      title: '支払い完了',
      sub: 'ご注文ありがとうございます！',
      btn: '注文詳細を見る',
    },
    zh: {
      title: '支付完成',
      sub: '感谢您的订购！',
      btn: '查看订单',
    },
    en: {
      title: 'Payment Complete',
      sub: 'Thank you for your order!',
      btn: 'View Order',
    },
  };
  const t = labels[locale] || labels.en;

  useEffect(() => {
    const token = searchParams.get('token'); // PayPal order ID
    const orderId = searchParams.get('orderId'); // 本地 order ID（通过 return_url 传回来）

    if (!token) {
      setStatus('cancelled');
      return;
    }

    // 调用 capture 接口确认支付
    fetch('/api/paypal/capture-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, paypalOrderId: token }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setOrderNumber(data.order?.orderNumber ?? '');
          setStatus('success');
        } else {
          setStatus('failed');
        }
      })
      .catch(() => {
        setStatus('failed');
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'loading') {
    return (
      <main style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-6)' }}>
        <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>⏳</div>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          {locale === 'ja' ? '支払いを確認中...' : locale === 'zh' ? '正在确认支付...' : 'Confirming payment...'}
        </p>
      </main>
    );
  }

  if (status === 'cancelled') {
    return (
      <main style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-6)', maxWidth: 500, margin: '0 auto' }}>
        <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>😔</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>
          {locale === 'ja' ? '支払いがキャンセルされました' : locale === 'zh' ? '支付已取消' : 'Payment Cancelled'}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)' }}>
          {locale === 'ja' ? '心配ありません。もう一度ご注文いただけます。' : locale === 'zh' ? '没关系，您可以重新下单。' : 'No worries, you can place your order again.'}
        </p>
        <a href={`/${locale}/cart`} className="btn btn-primary">{t.btn}</a>
      </main>
    );
  }

  if (status === 'failed') {
    return (
      <main style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-6)', maxWidth: 500, margin: '0 auto' }}>
        <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>❌</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)', color: 'var(--color-error)' }}>
          {locale === 'ja' ? '支払いに失敗しました' : locale === 'zh' ? '支付失败' : 'Payment Failed'}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)' }}>
          {locale === 'ja' ? 'もう一度お試しください。' : locale === 'zh' ? '请重试。' : 'Please try again.'}
        </p>
        <a href={`/${locale}/cart`} className="btn btn-primary">{t.btn}</a>
      </main>
    );
  }

  // status === 'success'
  return (
    <main style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-6)', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ fontSize: '5rem', marginBottom: 'var(--space-4)' }}>🎉</div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)', color: 'var(--color-primary)' }}>
        {t.title}
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-8)', fontSize: 'var(--text-lg)' }}>
        {t.sub}
      </p>

      {orderNumber && (
        <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-6)', boxShadow: 'var(--shadow-card)', marginBottom: 'var(--space-8)', textAlign: 'left' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)', marginBottom: 'var(--space-4)' }}>
            <span style={{ color: 'var(--color-text-muted)' }}>
              {locale === 'ja' ? '注文番号' : locale === 'zh' ? '订单号' : 'Order Number'}
            </span>
            <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>#{orderNumber}</span>
          </div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            {locale === 'ja' ? '注文確認メールをご確認ください。' : locale === 'zh' ? '请查收订单确认邮件。' : 'Please check your confirmation email.'}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
        <a href={`/${locale}/products`} className="btn btn-primary">
          {locale === 'ja' ? '買い物を続ける' : locale === 'zh' ? '继续购物' : 'Continue Shopping'}
        </a>
      </div>
    </main>
  );
}
