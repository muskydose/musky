import { NextRequest, NextResponse } from 'next/server';
import { verifyMobileOTP } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const body = await req.json().catch(() => ({}));
    const mobile = body.mobile || body.phone || body.mobileNumber;
    const otp = body.otp || body.otpCode || body.code;

    if (!mobile || !otp) {
      return NextResponse.json(
        { success: false, error: 'Mobile number and OTP code are required.' },
        { status: 400 }
      );
    }

    const result = await verifyMobileOTP(String(mobile), String(otp), ip);

    return NextResponse.json(result, {
      status: result.success ? 200 : 400,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to verify OTP code.' },
      { status: 500 }
    );
  }
}

