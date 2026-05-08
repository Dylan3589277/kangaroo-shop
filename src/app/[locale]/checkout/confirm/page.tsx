'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice, PRODUCT_IMAGE_PLACEHOLDER } from '@/lib/products';

// Prisma Order 类型（与 Prisma schema 对齐）
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

function ConfirmContent({ locale }: { locale: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);

  const labels: Record<string, Record<string, string>> = {
    ja: {
      title: '注文確認', subtitle: '注文内容をご確認ください',
      items: '商品', recipient: 'お届け先', shipping: '配送方法',
      subtotal: '小計', shippingFee: '配送料', total: '合計',
      payNow: '支払いに進む', back: '戻る', loading: '読み込み中...',
      notFound: '注文が見つかりません',
      stripe: 'クレジットカードで支払う', paypal: 'PayPalで支払う',
      thankYou: 'ご注文ありがとうございます！',
    },
    zh: {
      title: '订单确认', subtitle: '请确认您的订单内容',
      items: '商品', recipient: '收货地址', shipping: '配送方式',
      subtotal: '小计', shippingFee: '运费', total: '合计',
      payNow: '前往支付', back: '返回', loading: '加载中...',
      notFound: '找不到订单',
      stripe: '用信用卡支付', paypal: '使用PayPal支付',
      thankYou: '感谢您的订购！',
    },
    en: {
      title: 'Confirm Order', subtitle: 'Please review your order',
      items: 'Items', recipient: 'Shipping Address', shipping: 'Shipping',
      subtotal: 'Subtotal', shippingFee: 'Shipping Fee', total: 'Total',
      payNow: 'Proceed to Payment', back: 'Back', loading: 'Loading...',
      notFound: 'Order not found',
      stripe: 'Pay with Credit Card', paypal: 'Pay with PayPal',
      thankYou: 'Thank you for your order!',
    },
  };
  const t = labels[locale] || labels.ja;

  useEffect(() => {
    if (!orderId) {
      setError(t.notFound);
      setLoading(false);
      return;
    }
    fetch(`/api/orders?id=${orderId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setOrder(data.order);
        }
      })
      .catch(() => setError('Failed to load order'))
      .finally(() => setLoading(false));
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, t.notFound]);

  const handlePay = async () => {
    if (!order) return;
    setPaying(true);

    if (order.paymentMethod === 'stripe') {
      // Stripe: 跳转到 Stripe 支付步骤
      router.push(`/${locale}/cart?step=stripe&orderId=${order.id}`);
    } else if (order.paymentMethod === 'paypal') {
      // PayPal: 先创建 PayPal order，拿到 token 后跳转
      try {
        const res = await fetch('/api/create-paypal-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id }),
        });
        const data = await res.json();
        if (data.error) {
          setError(data.error);
          setPaying(false);
          return;
        }
        // PayPal: 根据环境选择 live 或 sandbox
        const isSandbox = process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT === 'sandbox' || !process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT;
        const paypalBase = isSandbox ? 'https://www.sandbox.paypal.com' : 'https://www.paypal.com';
        const returnUrl = `${window.location.origin}/${locale}/checkout/paypal/return?token=${data.orderID}&orderId=${order.id}`;
        window.location.href = `${paypalBase}/checkoutnow?token=${data.orderID}&return_url=${encodeURIComponent(returnUrl)}&cancel_url=${encodeURIComponent(`${window.location.origin}/${locale}/checkout/cancel?orderId=${order.id}`)}`;
      } catch {
        setError('Failed to initialize PayPal');
        setPaying(false);
      }
    }
  };

  if (loading) {
    return (
      <main style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>{t.loading}</p>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
        <p style={{ color: 'var(--color-error)' }}>{error || t.notFound}</p>
        <Link href={`/${locale}/cart`} className="btn btn-primary" style={{ marginTop: 'var(--space-4)', display: 'inline-block' }}>
          {t.back}
        </Link>
      </main>
    );
  }

  const courierNames: Record<string, string> = {
    yamato: 'ヤマト運輸（宅急便）',
    sagawa: '佐川急便',
    yuubin: '日本郵便（クリックポスト）',
  };

  return (
    <main style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 var(--space-4)' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', textAlign: 'center', marginBottom: 'var(--space-2)' }}>
          {t.title}
        </h1>
        <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-8)' }}>
          {t.subtitle}
        </p>

        {/* 订单号 */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)', padding: 'var(--space-3)', background: 'var(--color-bg-alt)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          {locale === 'ja' ? '注文番号' : locale === 'zh' ? '订单号' : 'Order'}: #{order.orderNumber}
        </div>

        {/* 商品清单 */}
        <section style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>
            {t.items}
          </h2>
          {order.items.map((item, index) => (
            <div key={item.id ?? item.productId ?? index} style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-3) 0', borderBottom: '1px solid var(--color-border)' }}>
              <Image
                src={item.productImage ?? PRODUCT_IMAGE_PLACEHOLDER}
                alt={item.productTitle}
                width={64}
                height={64}
                style={{ objectFit: 'cover', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-alt)' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{item.productTitle}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  {locale === 'ja' ? '数量' : locale === 'zh' ? '数量' : 'Qty'}: {item.quantity} × {formatPrice(item.price)}
                </div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                {formatPrice(item.price * item.quantity)}
              </div>
            </div>
          ))}
        </section>

        {/* 收件地址 */}
        {order.shippingName && (
          <section style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>
              {t.recipient}
            </h2>
            <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', lineHeight: 1.8 }}>
              <div style={{ fontWeight: 500 }}>{order.shippingName}</div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                {order.shippingPrefecture}{order.shippingCity}{order.shippingAddress1}
                {order.shippingAddress2 && ` ${order.shippingAddress2}`}
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                {order.shippingPostal}
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                {order.shippingPhone}
              </div>
              <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                {order.shippingEmail}
              </div>
            </div>
          </section>
        )}

        {/* 配送方式 */}
        {order.courier && (
          <section style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: 'var(--space-3)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>
              {t.shipping}
            </h2>
            <div style={{ background: 'var(--color-surface)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
              {courierNames[order.courier] || order.courier}
            </div>
          </section>
        )}

        {/* 金额汇总 */}
        <section style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ background: 'var(--color-surface)', padding: 'var(--space-6)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)', color: 'var(--color-text-secondary)' }}>
              <span>{t.subtotal}</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>
              <span>{t.shippingFee}</span>
              <span>{formatPrice(order.shippingFee)}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>{t.total}</span>
              <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--color-primary)' }}>
                {formatPrice(order.total)}
              </span>
            </div>
          </div>
        </section>

        {/* 错误提示 */}
        {error && (
          <div style={{ padding: 'var(--space-3)', background: 'rgba(198,40,40,0.08)', borderRadius: 'var(--radius-sm)', color: 'var(--color-error)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-4)', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* 支付按钮 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <button
            onClick={handlePay}
            disabled={paying}
            className="btn btn-primary"
            style={{ width: '100%', fontSize: 'var(--text-lg)', padding: '1rem', opacity: paying ? 0.6 : 1 }}
          >
            {paying ? (locale === 'ja' ? '処理中...' : locale === 'zh' ? '处理中...' : 'Processing...') :
              order.paymentMethod === 'stripe' ? t.stripe : t.paypal}
          </button>
          <Link
            href={`/${locale}/cart`}
            style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', padding: 'var(--space-2)' }}
          >
            ← {t.back}
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ConfirmPage({ params }: Props) {
  return (
    <Suspense fallback={
      <main style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading...</p>
      </main>
    }>
      <ConfirmContent locale={params.locale} />
    </Suspense>
  );
}
