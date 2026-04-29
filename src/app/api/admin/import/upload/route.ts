import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { buildImportPreview } from '@/lib/import/sync-job';

export const runtime = 'nodejs';
const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024;

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return Boolean(session && session.user?.role === 'admin');
}

export async function POST(req: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: 'Unauthorized - admin only' }, { status: 401 });
    }

    const formData = await req.formData();
    const platform = String(formData.get('platform') || 'rakuten');
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }
    if (file.size > MAX_IMPORT_FILE_SIZE) {
      return NextResponse.json({ error: 'file size must be 5MB or less' }, { status: 413 });
    }

    const text = await file.text();
    const result = await buildImportPreview(platform, file.name, text);
    return NextResponse.json({ ...result.preview, errors: result.parse.errors });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
