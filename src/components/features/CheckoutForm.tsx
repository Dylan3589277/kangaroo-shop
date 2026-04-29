'use client';

import { useState, useEffect } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
);

interface CheckoutFormProps {
  amount: number;
  currency?: string;
  orderId?: string | null;
  onSuccess?: (paymentIntent: string) => void;
  onError?: (error: string) => void;
  locale: string;
}

function PaymentForm({
  amount,
  locale,
  orderId,
  onSuccess,
  onError,
}: Omit<CheckoutFormProps, 'currency'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const labels = {
    ja: { submit: '支払う', processing: '処理中...', error: 'エラー' },
    zh: { submit: '立即支付', processing: '处理中...', error: '错误' },
    en: { submit: 'Pay Now', processing: 'Processing...', error: 'Error' },
  };
  const t = labels[locale as keyof typeof labels] || labels.en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/${locale}/checkout/success?orderId=${orderId ?? ''}`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setMessage(error.message || t.error);
      onError?.(error.message || t.error);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess?.(paymentIntent.id);
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400 }}>
      <PaymentElement options={{ layout: 'tabs' }} />
      {message && (
        <div style={{
          marginTop: 'var(--space-3)', padding: 'var(--space-3)',
          background: 'rgba(198,40,40,0.08)', borderRadius: 'var(--radius-sm)',
          fontSize: 'var(--text-sm)', color: 'var(--color-error)',
        }}>
          {message}
        </div>
      )}
      <button
        type="submit"
        disabled={isProcessing || !stripe || !elements}
        className="btn btn-primary"
        style={{ width: '100%', marginTop: 'var(--space-4)', fontSize: 'var(--text-base)', padding: '0.875rem' }}
      >
        {isProcessing ? t.processing : `${t.submit} ¥${amount.toLocaleString()}`}
      </button>
    </form>
  );
}

export function CheckoutForm({ amount, locale, orderId, onSuccess, onError }: CheckoutFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 进入 Stripe 步骤时，立即从后端拿 clientSecret（金额由后端按 orderId 查询订单 total）
  useEffect(() => {
    fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale, orderId }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setFetchError(data.error);
          onError?.(data.error);
        } else {
          setClientSecret(data.clientSecret);
        }
      })
      .catch(err => {
        const msg = err instanceof Error ? err.message : 'Failed to initialize Stripe';
        setFetchError(msg);
        onError?.(msg);
      })
      .finally(() => setIsLoading(false));
  }, [locale, orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadingLabels = {
    ja: '読み込み中...',
    zh: '加载中...',
    en: 'Loading payment form...',
  };
  const loadingText = loadingLabels[locale as keyof typeof loadingLabels] || loadingLabels.en;

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
        {loadingText}
      </div>
    );
  }

  if (fetchError || !clientSecret) {
    return (
      <div style={{
        padding: 'var(--space-4)',
        background: 'rgba(198,40,40,0.08)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--color-error)',
        fontSize: 'var(--text-sm)',
      }}>
        {fetchError || 'Failed to load payment form'}
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'flat' as const,
          variables: {
            colorPrimary: '#8B0000',
            colorBackground: '#FFFFFF',
            fontFamily: '"Noto Sans JP", sans-serif',
            borderRadius: '8px',
          },
        },
      }}
    >
      <PaymentForm amount={amount} locale={locale} orderId={orderId} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}
