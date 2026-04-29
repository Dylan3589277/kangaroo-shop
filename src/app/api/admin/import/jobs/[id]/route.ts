import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const { response } = await requireAdminSession();
    if (response) return response;

    const job = await prisma.syncJob.findUnique({
      where: { id: params.id },
      include: { items: { orderBy: { rowIndex: 'asc' }, take: 500 } },
    });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    return NextResponse.json({ job });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
