import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const VALID_PLATFORMS = ['own', 'rakuten', 'amazon'] as const;
const VALID_ACTIONS = ['publish', 'unpublish', 'preview'] as const;

type Platform = (typeof VALID_PLATFORMS)[number];
type Action = (typeof VALID_ACTIONS)[number];

function isPlatform(value: unknown): value is Platform {
  return typeof value === 'string' && VALID_PLATFORMS.includes(value as Platform);
}

function isAction(value: unknown): value is Action {
  return typeof value === 'string' && VALID_ACTIONS.includes(value as Action);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - admin only' }, { status: 401 });
    }

    const body = await req.json();
    const productId = typeof body.productId === 'string' ? body.productId : '';
    const platform = isPlatform(body.platform) ? body.platform : undefined;
    const action = isAction(body.action) ? body.action : undefined;

    if (!productId || !platform || !action) {
      return NextResponse.json({ error: 'productId, platform and action are required' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    if (platform !== 'own') {
      if (action !== 'preview') {
        return NextResponse.json(
          {
            error: 'External marketplace write is disabled. Use preview/template generation before any approved platform write.',
            externalWriteEnabled: false,
          },
          { status: 403 }
        );
      }

      const templateType = platform === 'rakuten' ? 'rakuten_rms_csv' : 'amazon_listing_template';
      return NextResponse.json({
        mode: 'preview',
        platform,
        action,
        externalWriteEnabled: false,
        templateType,
        message: 'External marketplace write is disabled. Generate/upload templates only after credentials and explicit approval.',
        template: {
          sku: product.id,
          title: product.titleJa || product.title,
          price: product.price,
          stock: product.stock,
          status: 'draft',
        },
      });
    }

    if (action === 'preview') {
      return NextResponse.json({
        mode: 'preview',
        platform,
        action,
        productId,
        nextStatus: product.isActive ? 'active' : 'draft',
      });
    }

    const isActive = action === 'publish';
    const productStatus = isActive ? 'active' : 'draft';

    const updated = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { isActive },
      });

      const listing = await tx.productPlatformListing.findFirst({
        where: { productId, platform: 'own', variantId: null },
      });

      if (listing) {
        await tx.productPlatformListing.update({
          where: { id: listing.id },
          data: {
            status: isActive ? 'active' : 'inactive',
            platformPrice: updatedProduct.price,
          },
        });
      } else {
        await tx.productPlatformListing.create({
          data: {
            productId,
            platform: 'own',
            status: isActive ? 'active' : 'inactive',
            platformPrice: updatedProduct.price,
          },
        });
      }

      return updatedProduct;
    });

    return NextResponse.json({
      product: updated,
      platform,
      status: productStatus,
      externalWriteEnabled: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
