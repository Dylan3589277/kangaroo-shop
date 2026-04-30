import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin-auth';
import { parseRequestJsonObject } from '@/lib/request-json';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    const { response } = await requireAdminSession();
    if (response) return response;

    const parsed = await parseRequestJsonObject(req);
    if (!parsed.success) return parsed.response;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { handler, handlingResult } = parsed.data as Record<string, any>;

    const alert = await prisma.dashboardAlert.update({
      where: { id: params.alertId },
      data: {
        handler,
        handlingResult,
        resolvedAt: new Date(),
        status: 'green',
      },
    });

    return NextResponse.json({ data: alert, error: null });
  } catch (error) {
    console.error('Dashboard alert resolve error:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to resolve alert' },
      { status: 500 }
    );
  }
}
