import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { getRakutenRmsStatus } from '@/lib/rakuten-rms/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/system/rakuten-rms
// 管理员查看 Rakuten RMS 配置状态；只返回脱敏信息，不返回 serviceSecret / licenseKey 明文。
export async function GET() {
  const { response } = await requireAdminSession();
  if (response) return response;

  return NextResponse.json({
    data: getRakutenRmsStatus(),
    error: null,
  });
}
