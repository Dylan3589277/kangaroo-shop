import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession } from '@/lib/admin-auth';
import { parseProductImages } from '@/lib/products';
import { serverError } from '@/lib/api-error';

export const runtime = 'nodejs';

type Platform = 'rakuten' | 'amazon';

function isPlatform(value: string | null): value is Platform {
  return value === 'rakuten' || value === 'amazon';
}

function safeFileNamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80) || 'product';
}

function contentDisposition(fileName: string): string {
  const asciiName = safeFileNamePart(fileName);
  return `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

function spreadsheetSafeText(value: unknown): string {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
}

function csvCell(value: unknown): string {
  const text = spreadsheetSafeText(value).replace(/\r?\n/g, '\n');
  if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function tsvCell(value: unknown): string {
  return spreadsheetSafeText(value).replace(/[\t\r\n]+/g, ' ').trim();
}

function buildRakutenCsv(product: Awaited<ReturnType<typeof prisma.product.findUnique>>): string {
  if (!product) return '';
  const images = parseProductImages(product.images);
  const headers = ['商品管理番号', '商品名', '販売価格', '在庫数', '商品説明文', '画像URL1'];
  const row = [
    product.id,
    product.titleJa || product.title,
    product.price,
    product.stock,
    product.description || '',
    images[0] || '',
  ];
  return `\uFEFF${headers.map(csvCell).join(',')}\n${row.map(csvCell).join(',')}\n`;
}

function buildAmazonTsv(product: Awaited<ReturnType<typeof prisma.product.findUnique>>): string {
  if (!product) return '';
  const images = parseProductImages(product.images);
  const headers = [
    'sku',
    'product-id',
    'product-id-type',
    'price',
    'quantity',
    'item-name',
    'item-description',
    'main-image-url',
  ];
  const row = [
    product.id,
    '',
    '',
    product.price,
    product.stock,
    product.titleEn || product.titleJa || product.title,
    product.description || '',
    images[0] || '',
  ];
  return `${headers.map(tsvCell).join('\t')}\n${row.map(tsvCell).join('\t')}\n`;
}

export async function GET(req: NextRequest) {
  try {
    const { response } = await requireAdminSession();
    if (response) return response;

    const productId = req.nextUrl.searchParams.get('productId');
    const platform = req.nextUrl.searchParams.get('platform');
    if (!productId || !isPlatform(platform)) {
      return NextResponse.json({ error: 'productId and platform=rakuten|amazon are required' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    if (platform === 'rakuten') {
      const body = buildRakutenCsv(product);
      const fileName = `rakuten-template-${safeFileNamePart(product.id)}.csv`;
      return new NextResponse(body, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': contentDisposition(fileName),
          'X-External-Write-Enabled': 'false',
        },
      });
    }

    const body = buildAmazonTsv(product);
    const fileName = `amazon-template-${safeFileNamePart(product.id)}.tsv`;
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/tab-separated-values; charset=utf-8',
        'Content-Disposition': contentDisposition(fileName),
        'X-External-Write-Enabled': 'false',
      },
    });
  } catch (err) {
    return serverError(err);
  }
}
