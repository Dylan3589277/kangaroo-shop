import Stripe from 'stripe';

// Lazy initialization — stripe 实例在运行时才创建
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY?.replace(/[\n\r]/g, '');
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set. Please configure it in Vercel environment variables.');
    }
    _stripe = new Stripe(key, {
      apiVersion: '2026-03-25.dahlia',
      timeout: 30_000, // 30s timeout — resolves Edge Runtime / Vercel network restriction
      typescript: true,
    });
  }
  return _stripe;
}

// 兼容直接导出（供 Stripe Elements 初始化时用）
export const stripe = {
  get instance() {
    return getStripe();
  },
};
