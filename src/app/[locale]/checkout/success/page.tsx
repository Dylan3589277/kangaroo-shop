'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { formatPrice } from '@/lib/products';

// Prisma Order 的前台展示类型（与 Prisma schema 对齐）
interface Order {
  id: string;
  orderNumber: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  shippingFee: number;
  total: number;
  courier: string | null;
  shippingName: string | null;
  shippingPostal: string | null;
  shippingPrefecture: string | null;
  shippingCity: string | null;
  shippingAddress1: string | null;
  shippingAddress2: string | null;
  shippingPhone: string | null;
  shippingEmail: string | null;
  createdAt: string;
  items: {
    id: string;
    productId: string | null;
    productTitle: string;
    productImage: string | null;
    price: number;
    quantity: number;
  }[];
}

interface Props {
  params: { locale: string };
}

function SuccessContent({ locale }: { locale: string }) {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const labels: Record<string, Record<string, string>> = {
    ja: {
      title: 'ご注文ありがとうございます！',
      sub: 'ご注文確認メールをご確認ください。',
      orderNum: '注文番号', estimatedShipping: '発送予定日',
      shippingNote: '通常3〜7営業日以内に発送いたします。',
      continueShopping: '買い物を続ける', support: 'お問い合わせ',
      businessDays: '営業日', loading: '読み込み中...',
      notFound: '注文情報が見つかりません。',
    },
    zh: {
      title: '感谢您的订购！',
      sub: '请查收订单确认邮件。',
      orderNum: '订单号', estimatedShipping: '预计发货日',
      shippingNote: '通常3~7个工作日内发货。',
      continueShopping: '继续购物', support: '联系我们',
      businessDays: '工作日', loading: '加载中...',
      notFound: '未找到订单信息。',
    },
    en: {
      title: 'Thank you for your order!',
      sub: 'Please check your confirmation email.',
      orderNum: 'Order Number', estimatedShipping: 'Estimated Shipping',
      shippingNote: 'Ships within 3-7 business days.',
      continueShopping: 'Continue Shopping', support: 'Contact Us',
      businessDays: 'business days', loading: 'Loading...',
      notFound: 'Order information not found.',
    },
  };
  const t = labels[locale] || labels.ja;

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    fetch(`/api/orders?id=${orderId}`)
      .then(r => r.json())
      .then(data => {
        if (data.order) setOrder(data.order);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <main style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>{t.loading}</p>
      </main>
    );
  }

  return (
    <main style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-6)', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ fontSize: '5rem', marginBottom: 'var(--space-4)' }}>🎉</div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)', color: 'var(--color-primary)' }}>
        {t.title}
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-8)', fontSize: 'var(--text-lg)' }}>
        {t.sub}
      </p>

      <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-8)', boxShadow: 'var(--shadow-card)', marginBottom: 'var(--space-8)', textAlign: 'left' }}>
        {order ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>{t.orderNum}</span>
              <span style={{ fontWeight: 700 }}>#{order.orderNumber}</span>
            </div>
            <div style={{ marginBottom: 'var(--space-3)' }}>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
                {locale === 'ja' ? '商品' : locale === 'zh' ? '商品' : 'Items'}
              </div>
              {order.items.map((item, index) => (
                <div key={item.id ?? item.productId ?? index} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-1) 0' }}>
                  <span style={{ color: 'var(--color-text-secondary)' }}>{item.productTitle} × {item.quantity}</span>
                  <span>{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>
            {order.shippingName && (
              <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
                  {locale === 'ja' ? '配送先' : locale === 'zh' ? '收货地址' : 'Ship to'}
                </div>
                <div style={{ color: 'var(--color-text-secondary)' }}>
                  {order.shippingName} / {order.shippingPrefecture}{order.shippingCity}{order.shippingAddress1}
                </div>
              </div>
            )}
            <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-4)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700 }}>{locale === 'ja' ? '合計' : locale === 'zh' ? '合计' : 'Total'}</span>
              <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{formatPrice(order.total)}</span>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--color-text-muted)' }}>
            {t.notFound}
          </div>
        )}
      </div>

      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)' }}>
        {t.shippingNote}
      </p>

      <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center' }}>
        <Link href={`/${locale}/products`} className="btn btn-primary">{t.continueShopping}</Link>
        <Link href={`/${locale}/contact`} className="btn btn-secondary">{t.support}</Link>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage({ params }: Props) {
  return (
    <Suspense fallback={
      <main style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
      </main>
    }>
      <SuccessContent locale={params.locale} />
    </Suspense>
  );
}
