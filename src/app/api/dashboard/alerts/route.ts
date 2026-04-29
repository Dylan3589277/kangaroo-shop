import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin-auth';

export async function GET(req: Request) {
  try {
    const { response } = await requireAdminSession();
    if (response) return response;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const moduleParam = searchParams.get('module');

    const where: Record<string, string> = {};
    if (status && status !== 'all') where.status = status;
    if (moduleParam && moduleParam !== 'all') where.module = moduleParam;

    const alerts = await prisma.dashboardAlert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: alerts, error: null });
  } catch (error) {
    console.error('Dashboard alerts GET error:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { response } = await requireAdminSession();
    if (response) return response;

    const body = await req.json();
    const {
      metricId,
      metricName,
      module: moduleParam,
      status,
      threshold,
      currentValue,
      assignee,
      deadline,
    } = body;

    const alert = await prisma.dashboardAlert.create({
      data: {
        metricId,
        metricName,
        module: moduleParam,
        status,
        threshold,
        currentValue,
        assignee,
        deadline: deadline ? new Date(deadline) : null,
      },
    });

    return NextResponse.json({ data: alert, error: null }, { status: 201 });
  } catch (error) {
    console.error('Dashboard alerts POST error:', error);
    return NextResponse.json(
      { data: null, error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}
