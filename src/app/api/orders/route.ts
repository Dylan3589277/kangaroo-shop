import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { parseProductImages } from '@/lib/products';
import { authOptions } from '@/lib/auth';
import { isAdminSession, toPublicOrder } from '@/lib/order-privacy';
import { getShippingOptions } from '@/lib/shipping';

// 强制 Node.js Runtime
export const runtime = 'nodejs';

/** 生成展示用订单号：KS + YYYYMMDD + 序号 */
async function generateOrderNumber(): Promise<string> {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  // 找当天最大序号
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const count = await prisma.order.count({
    where: {
      createdAt: { gte: startOfDay, lt: endOfDay },
    },
  });

  return `KS${dateStr}${String(count + 1).padStart(3, '0')}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      paymentMethod,
      items,
      courier,
      shippingAddress,
      paypalOrderId,
      stripePaymentIntentId,
      couponCode,
    } = body;

    if (!paymentMethod || !['stripe', 'paypal'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    type ResolvedItem = {
      productId: string | null;
      productTitle: string;
      productImage: string | null;
      price: number;
      quantity: number;
      weight: number;
    };

    const productIds: string[] = [];
    for (const item of items as Record<string, unknown>[]) {
      const productId =
        (item.productId as string) ||
        ((item.product as Record<string, unknown>)?.id as string);
      if (!productId) {
        return NextResponse.json({ error: 'Product id is required' }, { status: 400 });
      }
      productIds.push(productId);
    }

    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      select: { id: true, title: true, images: true, price: true, weight: true },
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    let finalSubtotal = 0;
    let totalWeight = 0;
    let discountAmount = 0;
    let promotionId: string | null = null;
    const resolvedItems: ResolvedItem[] = [];

    for (const item of items as Record<string, unknown>[]) {
      const productId =
        (item.productId as string) ||
        ((item.product as Record<string, unknown>)?.id as string);
      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 999) {
        return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 });
      }
      const product = productMap.get(productId);

      if (!product) {
        return NextResponse.json(
          { error: `Product ${productId} not found or inactive` },
          { status: 400 }
        );
      }
      finalSubtotal += product.price * quantity;
      totalWeight += (product.weight ?? 200) * quantity;
      resolvedItems.push({
        productId: product.id,
        productTitle: product.title,
        productImage: parseProductImages(product.images)[0] ?? null,
        price: product.price,
        quantity,
        weight: product.weight ?? 200,
      });
    }

    // Shipping: use server-calculated weight + selected courier
    const shippingOptions = getShippingOptions(totalWeight);
    const courierKey = (courier as string) ?? 'yamato';
    const shippingOpt = shippingOptions.find(o => o.courier === courierKey);
    let finalShippingFee = shippingOpt?.fee ?? shippingOptions[0].fee;

    // Coupon validation (mirrors promotions/route.ts logic)
    if (couponCode) {
      const promotion = await prisma.promotion.findUnique({
        where: { code: (couponCode as string).toUpperCase() },
      });
      if (
        promotion &&
        promotion.isActive &&
        promotion.isPublic &&
        new Date() >= promotion.startDate &&
        new Date() <= promotion.endDate &&
        (promotion.usageLimit === null || promotion.usedCount < promotion.usageLimit) &&
        finalSubtotal >= promotion.minOrderAmount
      ) {
        switch (promotion.type) {
          case 'percentage_discount': {
            let d = Math.floor(finalSubtotal * promotion.value / 100);
            if (promotion.maxDiscountAmount && d > promotion.maxDiscountAmount) d = promotion.maxDiscountAmount;
            discountAmount = d;
            break;
          }
          case 'fixed_discount':
            discountAmount = Math.min(promotion.value, finalSubtotal);
            break;
          case 'free_shipping':
            finalShippingFee = 0;
            break;
        }
        discountAmount = Math.min(discountAmount, finalSubtotal);
        promotionId = promotion.id;
      }
    }

    const finalTotal = finalSubtotal + finalShippingFee - discountAmount;
    const orderNumber = await generateOrderNumber();

    const order = await prisma.order.create({
      data: {
        orderNumber,
        paymentMethod,
        paymentStatus: 'pending',
        subtotal: finalSubtotal,
        shippingFee: finalShippingFee,
        total: finalTotal,
        couponCode: couponCode ?? null,
        discountAmount,
        originalSubtotal: finalSubtotal,
        promotionId: promotionId ?? null,
        courier: (courier as string) ?? 'yamato',
        paypalOrderId: paypalOrderId ?? null,
        stripePaymentIntentId: stripePaymentIntentId ?? null,
        shippingName: shippingAddress?.name ?? null,
        shippingPostal: shippingAddress?.postalCode ?? null,
        shippingPrefecture: shippingAddress?.prefecture ?? null,
        shippingCity: shippingAddress?.city ?? null,
        shippingAddress1: shippingAddress?.address1 ?? null,
        shippingAddress2: shippingAddress?.address2 ?? null,
        shippingPhone: shippingAddress?.phone ?? null,
        shippingEmail: shippingAddress?.email ?? null,
        items: {
          create: resolvedItems,
        },
      },
      include: { items: true },
    });

    return NextResponse.json({ orderId: order.id, orderNumber: order.orderNumber }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(searchParams.get('pageSize') ?? '20', 10) || 20, 1), 100);
    const session = await getServerSession(authOptions);
    const isAdmin = isAdminSession(session);

    // 单个订单查询：公开 checkout/success 需要通过 orderId 读取必要支付信息，
    // 但只有管理员可以得到完整订单（含地址/手机号/邮箱/history/网关ID等）。
    if (id) {
      const order = await prisma.order.findUnique({
        where: { id },
        include: isAdmin ? { items: true, history: { orderBy: { createdAt: 'desc' } } } : { items: true },
      });
      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      return NextResponse.json({ order: isAdmin ? order : toPublicOrder(order) });
    }

    // 列表查询（后台用）：必须是管理员，不能对未登录/普通用户开放订单枚举。
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - admin only' }, { status: session ? 403 : 401 });
    }

    const where: Record<string, unknown> = {};
    if (status && status !== 'all') {
      where.paymentStatus = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
