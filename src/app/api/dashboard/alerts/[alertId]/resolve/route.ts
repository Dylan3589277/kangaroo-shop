import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: Request,
  { params }: { params: { alertId: string } }
) {
  try {
    const { handler, handlingResult } = await req.json();

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
