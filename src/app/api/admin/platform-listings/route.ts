import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminSession, type AdminSession } from '@/lib/admin-auth';

export const runtime = 'nodejs';

const VALID_PLATFORMS = ['own', 'rakuten', 'amazon'] as const;
const VALID_ACTIONS = ['publish', 'unpublish', 'preview'] as const;
const EXTERNAL_PLATFORMS = ['rakuten', 'amazon'] as const;

type Platform = (typeof VALID_PLATFORMS)[number];
type ExternalPlatform = (typeof EXTERNAL_PLATFORMS)[number];
type Action = (typeof VALID_ACTIONS)[number];

function isPlatform(value: unknown): value is Platform {
  return typeof value === 'string' && VALID_PLATFORMS.includes(value as Platform);
}

function isExternalPlatform(value: Platform): value is ExternalPlatform {
  return EXTERNAL_PLATFORMS.includes(value as ExternalPlatform);
}

function isAction(value: unknown): value is Action {
  return typeof value === 'string' && VALID_ACTIONS.includes(value as Action);
}

function externalWriteEnabled(): boolean {
  return process.env.PLATFORM_EXTERNAL_WRITE_ENABLED === 'true';
}

function platformActionSecret(): string {
  const secret = process.env.PLATFORM_ACTION_CONFIRMATION_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  throw new Error('PLATFORM_ACTION_CONFIRMATION_SECRET or NEXTAUTH_SECRET is required');
}

function buildExternalActionPayload(input: {
  productId: string;
  platform: ExternalPlatform;
  action: Exclude<Action, 'preview'>;
  productUpdatedAt: Date;
  price: number;
  stock: number;
}): string {
  return [
    input.productId,
    input.platform,
    input.action,
    input.productUpdatedAt.toISOString(),
    String(input.price),
    String(input.stock),
  ].join('\n');
}

function buildExternalActionConfirmationToken(input: {
  productId: string;
  platform: ExternalPlatform;
  action: Exclude<Action, 'preview'>;
  productUpdatedAt: Date;
  price: number;
  stock: number;
}): string {
  return createHmac('sha256', platformActionSecret())
    .update(buildExternalActionPayload(input), 'utf8')
    .digest('hex');
}

function verifyExternalActionConfirmationToken(
  token: unknown,
  input: {
    productId: string;
    platform: ExternalPlatform;
    action: Exclude<Action, 'preview'>;
    productUpdatedAt: Date;
    price: number;
    stock: number;
  }
): boolean {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/i.test(token)) return false;
  const expected = buildExternalActionConfirmationToken(input);
  const tokenBuffer = Buffer.from(token, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return tokenBuffer.length === expectedBuffer.length && timingSafeEqual(tokenBuffer, expectedBuffer);
}

async function recordPlatformActionAttempt(input: {
  productId?: string;
  platform?: Platform;
  action?: Action;
  mode: 'preview' | 'own_write' | 'external_denied' | 'external_not_implemented' | 'invalid_request' | 'product_not_found';
  session: AdminSession;
  status: 'blocked' | 'previewed' | 'succeeded' | 'failed';
  message?: string;
  requestId?: string | null;
}) {
  try {
    const job = await prisma.syncJob.create({
      data: {
        platform: input.platform ?? 'unknown',
        status: input.status === 'succeeded' || input.status === 'previewed' ? 'done' : 'failed',
        totalRows: input.productId ? 1 : 0,
        doneRows: input.status === 'succeeded' || input.status === 'previewed' ? 1 : 0,
        errorRows: input.status === 'succeeded' || input.status === 'previewed' ? 0 : 1,
        meta: {
          type: 'platform_listing_action_attempt',
          action: input.action ?? null,
          mode: input.mode,
          status: input.status,
          message: input.message ?? null,
          externalWriteEnabled: externalWriteEnabled(),
          actorEmail: input.session?.user?.email ?? null,
          actorRole: input.session?.user?.role ?? null,
          requestId: input.requestId ?? null,
        },
      },
    });

    if (input.productId) {
      await prisma.syncJobItem.create({
        data: {
          syncJobId: job.id,
          rowIndex: 0,
          productId: input.productId,
          platformSku: input.productId,
          status: input.status === 'succeeded' ? 'updated' : input.status === 'previewed' ? 'skipped' : 'error',
          errorMsg: input.status === 'blocked' || input.status === 'failed' ? input.message ?? input.mode : null,
          rawRow: {
            productId: input.productId,
            platform: input.platform ?? null,
            action: input.action ?? null,
            mode: input.mode,
          },
        },
      });
    }
  } catch (auditErr) {
    // 审计日志不能反向打断主流程；真正失败仍由主业务响应体现。
    console.error('[PlatformListings] failed to record audit attempt', auditErr);
  }
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get('x-vercel-id') || req.headers.get('x-request-id');
  let session: AdminSession = null;
  let productId = '';
  let platform: Platform | undefined;
  let action: Action | undefined;

  try {
    const auth = await requireAdminSession();
    session = auth.session;
    if (auth.response) return auth.response;

    const body = await req.json();
    productId = typeof body.productId === 'string' ? body.productId : '';
    platform = isPlatform(body.platform) ? body.platform : undefined;
    action = isAction(body.action) ? body.action : undefined;

    if (!productId || !platform || !action) {
      await recordPlatformActionAttempt({
        productId: productId || undefined,
        platform,
        action,
        mode: 'invalid_request',
        session,
        status: 'blocked',
        message: 'productId, platform and action are required',
        requestId,
      });
      return NextResponse.json({ error: 'productId, platform and action are required' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      await recordPlatformActionAttempt({
        productId,
        platform,
        action,
        mode: 'product_not_found',
        session,
        status: 'blocked',
        message: 'Product not found',
        requestId,
      });
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    if (isExternalPlatform(platform)) {
      const templateType = platform === 'rakuten' ? 'rakuten_rms_csv' : 'amazon_listing_template';
      const requestedAction = action === 'preview'
        ? (isAction(body.requestedAction) && body.requestedAction !== 'preview' ? body.requestedAction : 'publish')
        : action;
      const confirmationPayload = {
        productId,
        platform,
        action: requestedAction,
        productUpdatedAt: product.updatedAt,
        price: product.price,
        stock: product.stock,
      };

      if (action === 'preview') {
        await recordPlatformActionAttempt({
          productId,
          platform,
          action,
          mode: 'preview',
          session,
          status: 'previewed',
          message: 'External marketplace preview only',
          requestId,
        });

        return NextResponse.json({
          mode: 'preview',
          platform,
          action,
          requestedAction,
          externalWriteEnabled: externalWriteEnabled(),
          templateType,
          message: 'External marketplace write requires kill switch, explicit confirmation token, and platform integration. Current endpoint still does not write to external marketplaces.',
          confirmationToken: buildExternalActionConfirmationToken(confirmationPayload),
          confirmationScope: {
            productId,
            platform,
            action: requestedAction,
            productUpdatedAt: product.updatedAt.toISOString(),
            price: product.price,
            stock: product.stock,
          },
          template: {
            sku: product.id,
            title: product.titleJa || product.title,
            price: product.price,
            stock: product.stock,
            status: 'draft',
          },
        });
      }

      if (!externalWriteEnabled()) {
        await recordPlatformActionAttempt({
          productId,
          platform,
          action,
          mode: 'external_denied',
          session,
          status: 'blocked',
          message: 'External marketplace write is disabled by PLATFORM_EXTERNAL_WRITE_ENABLED',
          requestId,
        });
        return NextResponse.json(
          {
            error: 'External marketplace write is disabled. Generate preview/template first and enable PLATFORM_EXTERNAL_WRITE_ENABLED only after explicit approval.',
            externalWriteEnabled: false,
          },
          { status: 403 }
        );
      }

      if (!verifyExternalActionConfirmationToken(body.confirmationToken, confirmationPayload)) {
        await recordPlatformActionAttempt({
          productId,
          platform,
          action,
          mode: 'external_denied',
          session,
          status: 'blocked',
          message: 'Missing or invalid external action confirmation token',
          requestId,
        });
        return NextResponse.json(
          {
            error: '请先预览并确认同一商品、平台、动作、价格、库存后再执行外部平台写入',
            externalWriteEnabled: true,
          },
          { status: 409 }
        );
      }

      await recordPlatformActionAttempt({
        productId,
        platform,
        action,
        mode: 'external_not_implemented',
        session,
        status: 'blocked',
        message: 'External platform API write is intentionally not implemented yet',
        requestId,
      });
      return NextResponse.json(
        {
          error: 'External platform API write is not implemented yet. This safety gate is ready, but no Rakuten/Amazon write adapter has been connected.',
          externalWriteEnabled: true,
        },
        { status: 501 }
      );
    }

    if (action === 'preview') {
      await recordPlatformActionAttempt({
        productId,
        platform,
        action,
        mode: 'preview',
        session,
        status: 'previewed',
        message: 'Own-site listing preview',
        requestId,
      });
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

    await recordPlatformActionAttempt({
      productId,
      platform,
      action,
      mode: 'own_write',
      session,
      status: 'succeeded',
      message: 'Own-site listing updated',
      requestId,
    });

    return NextResponse.json({
      product: updated,
      platform,
      status: productStatus,
      externalWriteEnabled: externalWriteEnabled(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (session?.user?.role === 'admin') {
      await recordPlatformActionAttempt({
        productId: productId || undefined,
        platform,
        action,
        mode: 'invalid_request',
        session,
        status: 'failed',
        message,
        requestId,
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
