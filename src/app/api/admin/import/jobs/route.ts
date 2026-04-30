import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin-auth';
import { serverError } from '@/lib/api-error';

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
    return serverError(err);
  }
}
