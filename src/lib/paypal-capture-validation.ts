export type PaypalCaptureValidationResult =
  | { valid: true; paypalStatus: string | undefined }
  | { valid: false; error: string };

type ExpectedPaypalCapture = {
  orderId: string;
  paypalOrderId: string;
  total: number;
};

type PaypalAmount = {
  currency_code?: unknown;
  value?: unknown;
};

type PaypalCapture = {
  id?: unknown;
  status?: unknown;
  custom_id?: unknown;
  amount?: PaypalAmount;
};

type PaypalPurchaseUnit = {
  custom_id?: unknown;
  amount?: PaypalAmount;
  payments?: {
    captures?: PaypalCapture[];
  };
};

type PaypalCaptureData = {
  id?: unknown;
  status?: unknown;
  purchase_units?: PaypalPurchaseUnit[];
};

const EXPECTED_CURRENCY = 'JPY';

function normalizePaypalAmount(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null;

  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return null;

  return Math.round(normalized);
}

function getPurchaseUnits(captureData: PaypalCaptureData): PaypalPurchaseUnit[] {
  return Array.isArray(captureData.purchase_units) ? captureData.purchase_units : [];
}

function getCaptures(captureData: PaypalCaptureData): PaypalCapture[] {
  return getPurchaseUnits(captureData).flatMap((unit) => (
    Array.isArray(unit.payments?.captures) ? unit.payments.captures : []
  ));
}

export function getPaypalCaptureStatus(captureData: PaypalCaptureData): string | undefined {
  return typeof captureData.status === 'string' ? captureData.status : undefined;
}

export function validatePaypalCaptureData(
  captureData: PaypalCaptureData,
  expected: ExpectedPaypalCapture
): PaypalCaptureValidationResult {
  if (captureData.id !== expected.paypalOrderId) {
    return { valid: false, error: 'PayPal order id mismatch' };
  }

  const purchaseUnits = getPurchaseUnits(captureData);
  const purchaseUnitCustomIds = purchaseUnits
    .map((unit) => unit.custom_id)
    .filter((customId): customId is string => typeof customId === 'string');
  const captures = getCaptures(captureData);
  const captureCustomIds = captures
    .map((capture) => capture.custom_id)
    .filter((customId): customId is string => typeof customId === 'string');
  const customIds = [...purchaseUnitCustomIds, ...captureCustomIds];

  if (customIds.length > 0 && !customIds.includes(expected.orderId)) {
    return { valid: false, error: 'PayPal custom_id does not belong to this order' };
  }

  const captureAmounts = captures
    .map((capture) => capture.amount)
    .filter((amount): amount is PaypalAmount => Boolean(amount));
  const unitAmounts = purchaseUnits
    .map((unit) => unit.amount)
    .filter((amount): amount is PaypalAmount => Boolean(amount));
  const amounts = captureAmounts.length > 0 ? captureAmounts : unitAmounts;

  if (amounts.length === 0) {
    return { valid: false, error: 'PayPal capture amount is missing' };
  }

  const hasExpectedAmount = amounts.some((amount) => (
    amount.currency_code === EXPECTED_CURRENCY
    && normalizePaypalAmount(amount.value) === expected.total
  ));

  if (!hasExpectedAmount) {
    return { valid: false, error: 'PayPal capture amount or currency mismatch' };
  }

  return { valid: true, paypalStatus: getPaypalCaptureStatus(captureData) };
}
