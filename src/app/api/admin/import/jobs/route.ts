import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const { response } = await requireAdminSession();
    if (response) return response;

    const jobs = await prisma.syncJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { _count: { select: { items: true } } },
    });
    return NextResponse.json({ jobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
