import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { serverError } from '@/lib/api-error';
import { parseRequestJsonObject } from '@/lib/request-json';

export const runtime = 'nodejs';

// POST /api/promotions - 验证优惠券并计算折扣
export async function POST(req: NextRequest) {
  try {
    const parsedBody = await parseRequestJsonObject(req);
    if (!parsedBody.success) return parsedBody.response;

    const body = parsedBody.data;
    const { code, subtotal } = body;

    if (typeof code !== 'string' || !code || typeof subtotal !== 'number') {
      return NextResponse.json(
        { error: 'code and subtotal are required' },
        { status: 400 }
      );
    }

    // 1. 查询优惠券
    const promotion = await prisma.promotion.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!promotion) {
      return NextResponse.json(
        { valid: false, error: '优惠券不存在' },
        { status: 200 }
      );
    }

    // 2. 检查是否激活
    if (!promotion.isActive) {
      return NextResponse.json(
        { valid: false, error: '优惠券已禁用' },
        { status: 200 }
      );
    }

    // 3. 检查是否公开
    if (!promotion.isPublic) {
      return NextResponse.json(
        { valid: false, error: '优惠券不可用' },
        { status: 200 }
      );
    }

    // 4. 检查有效期
    const now = new Date();
    if (now < promotion.startDate) {
      return NextResponse.json(
        { valid: false, error: '优惠券尚未开始' },
        { status: 200 }
      );
    }
    if (now > promotion.endDate) {
      return NextResponse.json(
        { valid: false, error: '优惠券已过期' },
        { status: 200 }
      );
    }

    // 5. 检查总使用次数限制
    if (promotion.usageLimit !== null && promotion.usedCount >= promotion.usageLimit) {
      return NextResponse.json(
        { valid: false, error: '优惠券已被抢光了' },
        { status: 200 }
      );
    }

    // 6. 检查最低订单金额
    if (subtotal < promotion.minOrderAmount) {
      return NextResponse.json(
        { 
          valid: false, 
          error: `订单金额需满 ¥${promotion.minOrderAmount} 才能使用此优惠券` 
        },
        { status: 200 }
      );
    }

    // 7. 检查适用范围（商品和分类过滤）
    const applicableProducts = promotion.applicableProducts as string[];
    const applicableCategories = promotion.applicableCategories as string[];

    // 如果没有指定适用范围，则全部适用
    const isAllApplicable = applicableProducts.length === 0 && applicableCategories.length === 0;

    let applicableAmount = subtotal;
    let discountAmount = 0;

    if (isAllApplicable) {
      // 全部商品适用
      applicableAmount = subtotal;
    } else {
      // 部分商品适用 - 返回适用金额供前端确认
      applicableAmount = subtotal; // 前端需传入productIds来精确计算
    }

    // 8. 计算折扣
    switch (promotion.type) {
      case 'percentage_discount': {
        // 百分比折扣
        let discount = Math.floor(applicableAmount * promotion.value / 100);
        // 应用最大折扣上限
        if (promotion.maxDiscountAmount && discount > promotion.maxDiscountAmount) {
          discount = promotion.maxDiscountAmount;
        }
        discountAmount = discount;
        break;
      }
      case 'fixed_discount': {
        // 固定金额折扣
        discountAmount = Math.min(promotion.value, applicableAmount);
        break;
      }
      case 'free_shipping': {
        // 包邮 - 运费优惠由前端处理，这里返回标识
        discountAmount = 0;
        break;
      }
      default:
        return NextResponse.json(
          { valid: false, error: '不支持的优惠券类型' },
          { status: 200 }
        );
    }

    // 确保折扣不超过订单金额
    discountAmount = Math.min(discountAmount, subtotal);

    return NextResponse.json({
      valid: true,
      promotion: {
        id: promotion.id,
        code: promotion.code,
        name: promotion.name,
        description: promotion.description,
        type: promotion.type,
        value: promotion.value,
        maxDiscountAmount: promotion.maxDiscountAmount,
        discountAmount,
        freeShipping: promotion.type === 'free_shipping',
      },
      applicableAmount,
      finalAmount: subtotal - discountAmount,
    });
  } catch (err) {
    return serverError(err);
  }
}

// GET /api/promotions - 获取当前有效的优惠券列表（公开）
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const publicOnly = searchParams.get('public') !== 'false';

    const where: Record<string, unknown> = {
      isActive: true,
    };

    if (publicOnly) {
      where.isPublic = true;
      where.startDate = { lte: new Date() };
      where.endDate = { gte: new Date() };
    }

    const promotions = await prisma.promotion.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        type: true,
        value: true,
        minOrderAmount: true,
        startDate: true,
        endDate: true,
        isPublic: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ promotions });
  } catch (err) {
    return serverError(err);
  }
}
