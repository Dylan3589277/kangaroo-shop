import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { getEmailConfigStatus } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/admin/system/email
// 管理员查看邮件服务配置状态；只返回是否配置，不返回密码/用户名明文。
export async function GET() {
  const { response } = await requireAdminSession();
  if (response) return response;

  return NextResponse.json({
    data: getEmailConfigStatus(),
    error: null,
  });
}
