import { NextRequest, NextResponse } from 'next/server';
import { validateCouponCode } from '@/lib/db/campaigns';
import { checkRateLimitAsync, getClientIp } from '@/lib/rate-limit';
import { sanitizePublicError } from '@/lib/api-errors';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = await checkRateLimitAsync(`coupon_val:${ip}`, 30, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, valid: false, message: 'Too many coupon attempts. Please try again shortly.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { couponCode, items, customerPhone } = body;

    if (!couponCode || typeof couponCode !== 'string') {
      return NextResponse.json(
        { success: false, valid: false, message: 'Please provide a valid coupon code.' },
        { status: 400 }
      );
    }

    const cleanCode = couponCode.trim().substring(0, 50);
    if (!cleanCode) {
      return NextResponse.json(
        { success: false, valid: false, message: 'Please provide a valid coupon code.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { success: false, valid: false, message: 'Items array is required to validate coupon.' },
        { status: 400 }
      );
    }

    if (items.length > 50) {
      return NextResponse.json(
        { success: false, valid: false, message: 'Maximum 50 items allowed in cart validation.' },
        { status: 400 }
      );
    }

    const cleanPhone = customerPhone && typeof customerPhone === 'string' ? customerPhone.trim().substring(0, 20) : undefined;

    const validation = await validateCouponCode(cleanCode, items, cleanPhone);
    return NextResponse.json({ success: true, ...validation });
  } catch (err: any) {
    return sanitizePublicError(err, 'Failed to validate coupon.');
  }
}
