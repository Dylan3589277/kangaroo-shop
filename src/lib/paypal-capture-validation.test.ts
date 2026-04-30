import { describe, expect, it } from 'vitest';
import { validatePaypalCaptureData } from './paypal-capture-validation';

const expected = {
  orderId: 'order_123',
  paypalOrderId: 'PAYPAL_123',
  total: 3980,
};

function validCapture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'PAYPAL_123',
    status: 'COMPLETED',
    purchase_units: [{
      custom_id: 'order_123',
      amount: { currency_code: 'JPY', value: '3980' },
      payments: {
        captures: [{
          id: 'CAPTURE_123',
          status: 'COMPLETED',
          custom_id: 'order_123',
          amount: { currency_code: 'JPY', value: '3980' },
        }],
      },
    }],
    ...overrides,
  };
}

describe('validatePaypalCaptureData', () => {
  it('accepts capture data that belongs to the expected order and amount', () => {
    expect(validatePaypalCaptureData(validCapture(), expected)).toEqual({
      valid: true,
      paypalStatus: 'COMPLETED',
    });
  });

  it('rejects a PayPal order id mismatch', () => {
    expect(validatePaypalCaptureData(validCapture({ id: 'PAYPAL_OTHER' }), expected)).toEqual({
      valid: false,
      error: 'PayPal order id mismatch',
    });
  });

  it('rejects a custom_id that belongs to another local order', () => {
    expect(validatePaypalCaptureData(validCapture({
      purchase_units: [{
        custom_id: 'order_other',
        amount: { currency_code: 'JPY', value: '3980' },
        payments: {
          captures: [{
            id: 'CAPTURE_123',
            status: 'COMPLETED',
            custom_id: 'order_other',
            amount: { currency_code: 'JPY', value: '3980' },
          }],
        },
      }],
    }), expected)).toEqual({
      valid: false,
      error: 'PayPal custom_id does not belong to this order',
    });
  });

  it('rejects an amount mismatch', () => {
    expect(validatePaypalCaptureData(validCapture({
      purchase_units: [{
        custom_id: 'order_123',
        amount: { currency_code: 'JPY', value: '3980' },
        payments: {
          captures: [{
            id: 'CAPTURE_123',
            status: 'COMPLETED',
            custom_id: 'order_123',
            amount: { currency_code: 'JPY', value: '3979' },
          }],
        },
      }],
    }), expected)).toEqual({
      valid: false,
      error: 'PayPal capture amount or currency mismatch',
    });
  });

  it('rejects a currency mismatch', () => {
    expect(validatePaypalCaptureData(validCapture({
      purchase_units: [{
        custom_id: 'order_123',
        payments: {
          captures: [{
            id: 'CAPTURE_123',
            status: 'COMPLETED',
            custom_id: 'order_123',
            amount: { currency_code: 'USD', value: '3980' },
          }],
        },
      }],
    }), expected)).toEqual({
      valid: false,
      error: 'PayPal capture amount or currency mismatch',
    });
  });
});
