import { NextRequest, NextResponse } from 'next/server';
import { isNextDynamicServerUsage } from './api-error';

export type JsonObject = Record<string, unknown>;

export type JsonObjectParseResult =
  | { success: true; data: JsonObject }
  | { success: false; error: string };

export type RequestJsonObjectResult =
  | { success: true; data: JsonObject }
  | { success: false; response: NextResponse };

const DEFAULT_ERROR_MESSAGE = 'Invalid request body';

function isPlainJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseJsonObjectText(
  text: string,
  errorMessage = DEFAULT_ERROR_MESSAGE
): JsonObjectParseResult {
  if (text.trim() === '') {
    return { success: false, error: errorMessage };
  }

  try {
    const parsed: unknown = JSON.parse(text);
    if (!isPlainJsonObject(parsed)) {
      return { success: false, error: errorMessage };
    }

    return { success: true, data: parsed };
  } catch {
    return { success: false, error: errorMessage };
  }
}

export async function parseRequestJsonObject(
  request: NextRequest,
  errorMessage = DEFAULT_ERROR_MESSAGE
): Promise<RequestJsonObjectResult> {
  let text: string;

  try {
    text = await request.text();
  } catch (error) {
    if (isNextDynamicServerUsage(error)) {
      throw error;
    }

    return {
      success: false,
      response: NextResponse.json({ error: errorMessage }, { status: 400 }),
    };
  }

  const parsed = parseJsonObjectText(text, errorMessage);
  if (!parsed.success) {
    return {
      success: false,
      response: NextResponse.json({ error: parsed.error }, { status: 400 }),
    };
  }

  return { success: true, data: parsed.data };
}
