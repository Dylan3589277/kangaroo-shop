import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { createRakutenRmsClient } from '@/lib/rakuten-rms/client';
import { getConfigSummary, getRakutenRmsStatus } from '@/lib/rakuten-rms/config';
import {
  RakutenRmsConfigError,
  RakutenRmsPathError,
  RakutenRmsReadOnlyError,
} from '@/lib/rakuten-rms/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function safeError(error: unknown) {
  if (error instanceof RakutenRmsConfigError) {
    return { type: error.name, message: error.message };
  }

  if (error instanceof RakutenRmsPathError || error instanceof RakutenRmsReadOnlyError) {
    return { type: error.name, message: error.message };
  }

  if (error instanceof Error && error.name === 'AbortError') {
    return { type: 'AbortError', message: 'Rakuten RMS probe timed out.' };
  }

  return {
    type: error instanceof Error ? error.name || 'Error' : 'UnknownError',
    message: 'Rakuten RMS probe failed.',
  };
}

function statusForError(error: unknown): number {
  if (error instanceof RakutenRmsConfigError) return 503;
  if (error instanceof RakutenRmsPathError || error instanceof RakutenRmsReadOnlyError) return 400;
  return 502;
}

// GET /api/admin/system/rakuten-rms/probe
// 管理员触发 Rakuten RMS 只读探测。探测路径必须由后端环境变量配置，避免前端传入任意路径。
export async function GET() {
  const { response } = await requireAdminSession();
  if (response) return response;

  const probePath = process.env.RAKUTEN_RMS_PROBE_PATH?.trim();
  if (!probePath) {
    return NextResponse.json(
      {
        data: {
          probed: false,
          reason: 'RAKUTEN_RMS_PROBE_PATH is not configured.',
          config: getRakutenRmsStatus(),
        },
        error: null,
      },
      { status: 400 }
    );
  }

  try {
    const config = getConfigSummary();
    const result = await createRakutenRmsClient().get(probePath);

    return NextResponse.json({
      data: {
        probed: true,
        ok: result.ok,
        status: result.status,
        config,
      },
      error: null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        data: {
          probed: false,
          config: getRakutenRmsStatus(),
        },
        error: safeError(error),
      },
      { status: statusForError(error) }
    );
  }
}
