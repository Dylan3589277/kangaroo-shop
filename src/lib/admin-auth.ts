import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export type AdminSession = {
  user?: {
    email?: string | null;
    role?: string | null;
  };
} | null;

export function isAdminSession(session: AdminSession): boolean {
  return Boolean(session?.user?.role === 'admin');
}

export function adminAuthErrorResponse(session: AdminSession) {
  return NextResponse.json(
    { error: session ? 'Forbidden - admin only' : 'Unauthorized - admin session required' },
    { status: session ? 403 : 401 }
  );
}

export async function requireAdminSession() {
  const session = (await getServerSession(authOptions)) as AdminSession;
  if (!isAdminSession(session)) {
    return { session, response: adminAuthErrorResponse(session) };
  }
  return { session, response: null };
}
