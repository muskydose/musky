import { NextRequest, NextResponse } from 'next/server';
import { requestMobileOTP } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const body = await req.json().catch(() => ({}));
    const mobile = body.mobile || body.phone || body.mobileNumber;

    if (!mobile || !String(mobile).trim()) {
      return NextResponse.json(
        { success: false, error: 'Mobile number is required for password recovery.' },
        { status: 400 }
      );
    }

    const result = await requestMobileOTP(String(mobile), ip);

    return NextResponse.json(result, {
      status: result.success ? 200 : result.deliveryStatus === 'RATE_LIMITED' ? 429 : 200,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to process password recovery request.' },
      { status: 500 }
    );
  }
}


