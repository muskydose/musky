import { NextRequest, NextResponse } from 'next/server';
import { executePasswordReset, clearAdminAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { resetToken, newPassword, confirmPassword } = body;

    if (!resetToken || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'Reset token, new password, and confirmation password are required.' },
        { status: 400 }
      );
    }

    const result = await executePasswordReset(resetToken, newPassword, confirmPassword);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to reset password.' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Password reset successful. Please log in with your new admin password.',
    });

    // Revoke any existing active session cookies
    clearAdminAuthCookie(response);

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Password reset failed. Please try again.' },
      { status: 500 }
    );
  }
}
