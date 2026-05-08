import type { ProductUrlPreview } from './product-url-preview';

export type ProductAiCopyStatus = 'generated' | 'skipped' | 'failed';

export type ProductAiCopyResult = {
  status: ProductAiCopyStatus;
  titleEn?: string;
  title?: string;
  description?: string;
  message?: string;
};

type GenerateOptions = {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

type ProductAiCopyJson = {
  titleEn?: unknown;
  title?: unknown;
  description?: unknown;
};

const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';
const DEFAULT_TIMEOUT_MS = 12_000;

export async function generateProductAiCopy(
  preview: ProductUrlPreview,
  {
    apiKey = process.env.OPENAI_API_KEY,
    baseUrl = process.env.OPENAI_BASE_URL,
    model = process.env.OPENAI_MODEL,
    fetchImpl = fetch,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: GenerateOptions = {}
): Promise<ProductAiCopyResult> {
  if (!apiKey) {
    return { status: 'skipped', message: 'OPENAI_API_KEY is not configured' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(`${normalizeBaseUrl(baseUrl)}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: model || DEFAULT_OPENAI_MODEL,
        temperature: 0.4,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You write concise ecommerce product copy. Return only JSON with keys titleEn, title, description. title must be Simplified Chinese. description must be Chinese selling points, 2-4 short lines. Do not invent specs not present in the input.',
          },
          {
            role: 'user',
            content: JSON.stringify({
              source: preview.source,
              sourceUrl: preview.sourceUrl,
              title: preview.title,
              titleJa: preview.titleJa,
              brand: preview.brand,
              price: preview.price,
              description: preview.description,
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      return { status: 'failed', message: `AI generation failed (${response.status})` };
    }

    const data = await response.json().catch(() => null) as unknown;
    const content = extractChatCompletionContent(data);
    const parsed = parseProductAiCopyJson(content);
    if (!parsed) {
      return { status: 'failed', message: 'AI response JSON could not be parsed' };
    }

    return { status: 'generated', ...parsed };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { status: 'failed', message: 'AI generation timed out' };
    }
    return { status: 'failed', message: 'AI generation failed' };
  } finally {
    clearTimeout(timeout);
  }
}

export function parseProductAiCopyJson(content: string | undefined): Omit<ProductAiCopyResult, 'status'> | null {
  if (!content) return null;

  const candidates = [content, extractJsonObjectText(content)].filter(Boolean) as string[];
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as ProductAiCopyJson;
      const titleEn = cleanAiText(parsed.titleEn, 120);
      const title = cleanAiText(parsed.title, 120);
      const description = cleanAiText(parsed.description, 1000);
      if (!titleEn && !title && !description) return null;
      return {
        ...(titleEn ? { titleEn } : {}),
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
      };
    } catch {
      continue;
    }
  }

  return null;
}

function normalizeBaseUrl(baseUrl: string | undefined): string {
  return (baseUrl || DEFAULT_OPENAI_BASE_URL).replace(/\/+$/, '');
}

function extractChatCompletionContent(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) return undefined;
  const first = choices[0];
  if (!first || typeof first !== 'object') return undefined;
  const message = (first as { message?: unknown }).message;
  if (!message || typeof message !== 'object') return undefined;
  const content = (message as { content?: unknown }).content;
  return typeof content === 'string' ? content : undefined;
}

function extractJsonObjectText(content: string): string | undefined {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  return start >= 0 && end > start ? content.slice(start, end + 1) : undefined;
}

function cleanAiText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
  return cleaned ? cleaned.slice(0, maxLength).trim() : undefined;
}
