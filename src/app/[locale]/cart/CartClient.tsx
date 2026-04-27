'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatPrice, parseProductImages } from '@/lib/products';
import { PaymentMethods } from '@/components/features/PaymentMethods';
import { CheckoutForm } from '@/components/features/CheckoutForm';
import { ShippingSelector } from '@/components/features/ShippingSelector';
import { AddressForm } from '@/components/features/AddressForm';
import { getShippingOptions, validatePostalCode, Courier } from '@/lib/shipping';
import { useCart } from '@/contexts/CartContext';

interface AddressData {
  name: string;
  postalCode: string;
  prefecture: string;
  city: string;
  address1: string;
  address2: string;
  phone: string;
  email: string;
}

export default function CartClient({
  params,
}: {
  params: { locale: string };
}) {
  const locale = params.locale;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items: cartItems, totalPrice, updateQuantity, removeItem, clearCart } = useCart();

  // 从确认页返回时：cart?step=stripe&orderId=xxx
  const initialStep = searchParams.get('step') as 'address' | 'method' | 'stripe' | 'paypal' | null;
  const returnOrderId = searchParams.get('orderId');

  const totalWeight = cartItems.reduce((sum, i) => sum + (i.product.weight ?? 200) * i.quantity, 0);
  const shippingOptions = getShippingOptions(totalWeight);
  const [paymentStep, setPaymentStep] = useState<'address' | 'method' | 'stripe' | 'paypal'>(
    initialStep && ['stripe', 'paypal'].includes(initialStep) ? initialStep : 'address'
  );
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);
  const [shippingCost, setShippingCost] = useState(0);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [currentAddress, setCurrentAddress] = useState<AddressData>({
    name: '', postalCode: '', prefecture: '', city: '',
    address1: '', address2: '', phone: '', email: '',
  });
  // 当前待确认的 orderId
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(returnOrderId);

  const [discountCode, setDiscountCode] = useState('');
  const [discountResult, setDiscountResult] = useState<{code: string; discount: number; name: string} | null>(null);
  const [discountError, setDiscountError] = useState('');
  const [discountLoading, setDiscountLoading] = useState(false);

  const discountAmount = discountResult?.discount ?? 0;
  const subtotal = totalPrice;
  const total = useMemo(() => subtotal + shippingCost - discountAmount, [subtotal, shippingCost, discountAmount]);

  const handleApplyDiscount = async () => {
    if (!discountCode.trim()) return;
    setDiscountError('');
    setDiscountLoading(true);
    try {
      const res = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: discountCode.trim(), subtotal }),
      });
      const data = await res.json();
      if (data.valid) {
        setDiscountResult({ code: data.promotion.code, discount: data.promotion.discount, name: data.promotion.name });
        setDiscountCode('');
      } else {
        setDiscountError(data.error || '折扣码无效');
        setDiscountResult(null);
      }
    } catch {
      setDiscountError(locale === 'ja' ? '検証に失敗しました' : locale === 'zh' ? '验证失败' : 'Validation failed');
    } finally {
      setDiscountLoading(false);
    }
  };

  // 选中快递时更新运费
  useEffect(() => {
    if (selectedCourier) {
      const opt = shippingOptions.find(o => o.courier === selectedCourier);
      if (opt) setShippingCost(opt.fee);
    }
  }, [selectedCourier]); // eslint-disable-line react-hooks/exhaustive-deps

  // 进入 Stripe 步骤时：先创建订单，拿到 orderId
  useEffect(() => {
    if (paymentStep !== 'stripe' || currentOrderId || cartItems.length === 0 || !selectedCourier) return;
    const shippingOpt = shippingOptions.find(o => o.courier === selectedCourier);
    const shippingFee = shippingOpt?.fee ?? 0;
    fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentMethod: 'stripe',
        items: cartItems,
        subtotal,
        shippingFee,
        courier: selectedCourier,
        shippingAddress: currentAddress,
      }),
    })
      .then(r => r.json())
      .then(data => {
        if (!data.error) setCurrentOrderId(data.orderId);
      })
      .catch(() => {});
  }, [paymentStep]); // eslint-disable-line react-hooks/exhaustive-deps
  const labels = {
    ja: {
      title: 'カート', recipient: 'お届け先情報', proceed: '次に進む',
      shipping: '配送方法', subtotal: '小計', shippingFee: '配送料',
      total: '合計', back: '← 戻る', success: 'ご注文ありがとうございます！',
      empty: 'カートは空です', continue: 'ショッピングを続ける',
    },
    zh: {
      title: '购物车', recipient: '收货信息', proceed: '继续',
      shipping: '配送方式', subtotal: '小计', shippingFee: '运费',
      total: '合计', back: '← 返回', success: '感谢您的订购！',
      empty: '购物车是空的', continue: '继续购物',
    },
    en: {
      title: 'Cart', recipient: 'Shipping Address', proceed: 'Proceed',
      shipping: 'Shipping', subtotal: 'Subtotal', shippingFee: 'Shipping Fee',
      total: 'Total', back: '← Back', success: 'Thank you for your order!',
      empty: 'Your cart is empty', continue: 'Continue Shopping',
    },
  };
  const t = labels[locale as keyof typeof labels] || labels.ja;

  const handleAddressSubmit = () => {
    const a = currentAddress;
    if (!a.name || !a.postalCode || !a.prefecture || !a.city || !a.address1 || !a.phone || !a.email) {
      setAddressError(
        locale === 'ja' ? '必須項目を入力してください' :
        locale === 'zh' ? '请填写必填项' : 'Please fill in all required fields'
      );
      return;
    }
    if (!validatePostalCode(a.postalCode)) {
      setAddressError(
        locale === 'ja' ? '郵便番号は XXX-XXXX 形式で入力してください' :
        locale === 'zh' ? '邮编格式为 XXX-XXXX' : 'Postal code must be in XXX-XXXX format'
      );
      return;
    }
    setAddressError('');
    setPaymentStep('method');
  };

  if (orderSuccess) {
    clearCart();
    return (
      <main className="container" style={{ paddingTop: 'var(--space-12)', textAlign: 'center' }}>
        <div style={{ fontSize: '5rem', marginBottom: 'var(--space-4)' }}>🎉</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', color: 'var(--color-primary)', marginBottom: 'var(--space-4)' }}>
          {t.success}
        </h1>
      </main>
    );
  }

  // 空购物车
  if (cartItems.length === 0) {
    return (
      <main className="container" style={{ paddingTop: 'var(--space-12)', textAlign: 'center' }}>
        <div style={{ fontSize: '5rem', marginBottom: 'var(--space-4)' }}>🛒</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', marginBottom: 'var(--space-4)' }}>
          {t.title}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>{t.empty}</p>
        <a href={`/${locale}/products`} className="btn btn-primary">
          {t.continue}
        </a>
      </main>
    );
  }

  return (
    <main className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-16)' }}>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-8)', textAlign: 'center' }}>
        {t.title}
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 'var(--space-8)', maxWidth: 960, margin: '0 auto' }}>
        {/* 左列 */}
        <div>
          {/* 购物车商品列表 */}
          {cartItems.map(item => (
            <div key={item.product.id} style={{
              display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-4)',
              background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
              marginBottom: 'var(--space-3)', boxShadow: 'var(--shadow-card)',
            }}>
              <Image
                src={parseProductImages(item.product.images)[0]}
                alt={item.product.title}
                width={80}
                height={80}
                style={{ objectFit: 'cover', borderRadius: 'var(--radius-sm)', background: 'var(--color-bg-alt)' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500, marginBottom: 4 }}>{item.product.title}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                  {locale === 'ja' ? '数量' : locale === 'zh' ? '数量' : 'Qty'}: {item.quantity}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
                  {item.product.weight}g
                </div>
              </div>
              <div style={{ fontWeight: 700, color: 'var(--color-primary)', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div>{formatPrice(item.product.price * item.quantity)}</div>
                <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
                  <button
                    onClick={() => updateQuantity(item.product.id, Math.max(1, item.quantity - 1))}
                    style={{ width: 24, height: 24, borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    −
                  </button>
                  <span style={{ minWidth: 24, textAlign: 'center' }}>{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    style={{ width: 24, height: 24, borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    style={{ marginLeft: 'var(--space-2)', color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)' }}
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* 运费区间提示 */}
          <div style={{
            padding: 'var(--space-3)', background: 'var(--color-bg-alt)',
            borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)',
          }}>
            📦{' '}
            {locale === 'ja' ? '合計重量' : locale === 'zh' ? '总重量' : 'Total Weight'}：{totalWeight}g →{' '}
            {locale === 'ja' ? '配送料' : locale === 'zh' ? '运费区间' : 'Shipping'}{' '}
            ¥{shippingOptions[2]?.fee.toLocaleString()}〜¥{shippingOptions[0]?.fee.toLocaleString()}
          </div>

          {/* 步骤：收货地址 */}
          {paymentStep === 'address' && (
            <div style={{ marginTop: 'var(--space-6)' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)' }}>
                {t.recipient}
              </h3>
              <AddressForm locale={locale} onChange={setCurrentAddress} />
              {addressError && (
                <div style={{
                  marginTop: 'var(--space-3)', padding: 'var(--space-3)',
                  background: 'rgba(198,40,40,0.08)', borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-sm)', color: 'var(--color-error)',
                }}>
                  {addressError}
                </div>
              )}
              <button
                onClick={handleAddressSubmit}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: 'var(--space-4)' }}
              >
                {t.proceed}
              </button>
            </div>
          )}

          {/* 步骤：配送方式 + 支付方式 */}
          {paymentStep === 'method' && (
            <div style={{ marginTop: 'var(--space-6)' }}>
              <button
                onClick={() => setPaymentStep('address')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}
              >
                {t.back}
              </button>
              <ShippingSelector
                options={shippingOptions}
                selected={selectedCourier}
                onChange={setSelectedCourier}
                locale={locale}
              />
              {selectedCourier && (
                <div style={{ marginTop: 'var(--space-6)' }}>
                  <PaymentMethods
                    amount={total}
                    locale={locale}
                    onStripeSelected={() => setPaymentStep('stripe')}
                    onPayPalSelected={() => setPaymentStep('paypal')}
                  />
                </div>
              )}
            </div>
          )}

          {/* 步骤：Stripe（从确认页返回） */}
          {paymentStep === 'stripe' && (
            <div style={{ marginTop: 'var(--space-6)' }}>
              <button
                onClick={() => setPaymentStep('method')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}
              >
                {t.back}
              </button>
              <CheckoutForm
                amount={total}
                locale={locale}
                orderId={currentOrderId}
                onSuccess={() => { clearCart(); setOrderSuccess(true); }}
                onError={(msg) => setAddressError(msg)}
              />
            </div>
          )}

          {/* 步骤：PayPal → 跳转确认页 */}
          {paymentStep === 'paypal' && (
            <div style={{ marginTop: 'var(--space-6)' }}>
              <button
                onClick={() => setPaymentStep('method')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}
              >
                {t.back}
              </button>
              <p style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>
                {locale === 'ja' ? 'PayPalでお支払い' : locale === 'zh' ? '使用PayPal支付' : 'Pay with PayPal'}
              </p>
              <button
                onClick={async () => {
                  if (!selectedCourier) return;
                  const shippingOpt = shippingOptions.find(o => o.courier === selectedCourier);
                  const shippingFee = shippingOpt?.fee ?? 0;
                  try {
                    const res = await fetch('/api/orders', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        paymentMethod: 'paypal',
                        items: cartItems,
                        subtotal,
                        shippingFee,
                        courier: selectedCourier,
                        shippingAddress: currentAddress,
                      }),
                    });
                    const data = await res.json();
                    if (data.error) { setAddressError(data.error); return; }
                    // 跳转到确认页
                    router.push(`/${locale}/checkout/confirm?orderId=${data.orderId}`);
                  } catch {
                    setAddressError(locale === 'ja' ? '注文作成に失敗しました' : locale === 'zh' ? '创建订单失败' : 'Failed to create order');
                  }
                }}
                className="btn btn-primary"
                style={{ display: 'block', width: '100%', textAlign: 'center' }}
              >
                {locale === 'ja' ? '注文を確認してPayPalへ進む' : locale === 'zh' ? '确认订单并使用PayPal支付' : 'Confirm Order & Pay with PayPal'}
              </button>
            </div>
          )}
        </div>

        {/* 右列：订单摘要 */}
        <div>
          <div style={{
            background: 'var(--color-surface)', borderRadius: 'var(--radius-md)',
            padding: 'var(--space-6)', boxShadow: 'var(--shadow-card)', position: 'sticky', top: 80,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              <span>{t.subtotal}</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            {/* 折扣码输入 */}
            {discountResult ? (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-success)' }}>
                <span>
                  🎟 {discountResult.name} (−{formatPrice(discountResult.discount)})
                </span>
                <button
                  onClick={() => { setDiscountResult(null); setDiscountError(''); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <input
                  type="text"
                  value={discountCode}
                  onChange={e => setDiscountCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleApplyDiscount()}
                  placeholder={locale === 'ja' ? '折扣碼' : locale === 'zh' ? '折扣码' : 'Coupon code'}
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border)', fontSize: 'var(--text-sm)',
                    background: 'var(--color-bg)',
                  }}
                />
                <button
                  onClick={handleApplyDiscount}
                  disabled={discountLoading || !discountCode.trim()}
                  style={{
                    padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                    border: 'none', fontSize: 'var(--text-sm)', cursor: 'pointer',
                    background: discountLoading ? 'var(--color-border)' : 'var(--color-primary)',
                    color: '#fff',
                  }}
                >
                  {discountLoading ? '...' : (locale === 'ja' ? '適用' : locale === 'zh' ? '应用' : 'Apply')}
                </button>
              </div>
            )}
            {discountError && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', marginBottom: 'var(--space-3)' }}>
                ⚠ {discountError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
              <span>{t.shippingFee}</span>
              <span style={{ color: selectedCourier ? 'var(--color-text)' : 'var(--color-text-muted)' }}>
                {selectedCourier ? `¥${shippingCost.toLocaleString()}` : '—'}
              </span>
            </div>
            {selectedCourier && (
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-3)', textAlign: 'right' }}>
                {shippingOptions.find(o => o.courier === selectedCourier)?.name}
              </div>
            )}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>{t.total}</span>
              <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', color: 'var(--color-primary)' }}>
                {formatPrice(total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
