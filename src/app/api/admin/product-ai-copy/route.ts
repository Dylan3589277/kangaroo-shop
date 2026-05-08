import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { serverError } from '@/lib/api-error';
import { generateProductAiCopy } from '@/lib/product-ai-copy';
import type { ProductUrlPreview, ProductUrlSource } from '@/lib/product-url-preview';
import { parseRequestJsonObject } from '@/lib/request-json';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { response } = await requireAdminSession();
    if (response) return response;

    const parsed = await parseRequestJsonObject(req);
    if (!parsed.success) return parsed.response;

    const preview = normalizePreviewPayload(parsed.data.preview);
    if (!preview) {
      return NextResponse.json({ error: 'preview is required' }, { status: 400 });
    }

    const ai = await generateProductAiCopy(preview);
    return NextResponse.json({ ai }, { status: ai.status === 'skipped' ? 503 : 200 });
  } catch (err) {
    return serverError(err);
  }
}

function normalizePreviewPayload(value: unknown): ProductUrlPreview | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const source = record.source;
  const sourceUrl = record.sourceUrl;
  if (!isProductSource(source) || typeof sourceUrl !== 'string' || !sourceUrl.trim()) {
    return null;
  }

  return {
    source,
    sourceUrl: sourceUrl.trim(),
    images: Array.isArray(record.images)
      ? record.images.filter((item): item is string => typeof item === 'string')
      : [],
    ...stringProp(record, 'title'),
    ...stringProp(record, 'titleJa'),
    ...stringProp(record, 'brand'),
    ...numberProp(record, 'price'),
    ...numberProp(record, 'originalPrice'),
    ...stringProp(record, 'description'),
  };
}

function isProductSource(value: unknown): value is ProductUrlSource {
  return value === 'amazon' || value === 'rakuten';
}

function stringProp(record: Record<string, unknown>, key: string): Record<string, string> {
  const value = record[key];
  return typeof value === 'string' && value.trim() ? { [key]: value.trim() } : {};
}

function numberProp(record: Record<string, unknown>, key: string): Record<string, number> {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? { [key]: Math.round(value) } : {};
}
