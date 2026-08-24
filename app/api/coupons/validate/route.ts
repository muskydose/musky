import { NextRequest, NextResponse } from 'next/server';
import { validateCouponCode } from '@/lib/db/campaigns';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { couponCode, items, customerPhone } = body;

    if (!couponCode || typeof couponCode !== 'string') {
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

    const validation = await validateCouponCode(couponCode, items, customerPhone);
    return NextResponse.json({ success: true, ...validation });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, valid: false, message: err.message || 'Server error validating coupon.' },
      { status: 500 }
    );
  }
}
