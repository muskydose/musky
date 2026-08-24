import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminCredentials,
  createAdminSessionToken,
  isRequestAdminAuthenticated,
  setAdminAuthCookie,
  clearAdminAuthCookie,
  verifyAdminCsrfAndOrigin,
  recordAuditLog,
} from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminCsrfAndOrigin(req)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: CSRF / Origin mismatch' },
        { status: 403 }
      );
    }

    const ip = getClientIp(req.headers);
    
    // Rate limit: max 5 login attempts per 15 mins per IP
    const rl = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      await recordAuditLog({
        action: 'ADMIN_LOGIN_RATE_LIMITED',
        userEmail: 'unknown',
        ipAddress: ip,
        details: { reason: 'Rate limit exceeded' },
      });
      return NextResponse.json(
        { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' },
        { status: 429 }
      );
    }

    const { email, password } = await req.json();

    const authResult = await verifyAdminCredentials(email, password);

    if (!authResult.success) {
      await recordAuditLog({
        action: 'ADMIN_LOGIN_FAILED',
        userEmail: email ? String(email).substring(0, 50) : 'unknown',
        ipAddress: ip,
        details: { error: authResult.error },
      });
      return NextResponse.json(
        { success: false, error: authResult.error || 'Invalid email or password credentials.' },
        { status: 401 }
      );
    }

    // Generate signed session token
    const token = createAdminSessionToken(email);

    await recordAuditLog({
      action: 'ADMIN_LOGIN_SUCCESS',
      userEmail: email.trim().toLowerCase(),
      ipAddress: ip,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        email: email.trim().toLowerCase(),
        name: 'Musky Dose Admin',
        role: 'superadmin',
      },
    });

    setAdminAuthCookie(response, token);
    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Authentication failed. Please check server logs.' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  if (isRequestAdminAuthenticated(req)) {
    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        email: process.env.ADMIN_EMAIL || 'admin@muskydose.in',
        name: 'Musky Dose Admin',
        role: 'superadmin',
      },
    });
  }

  return NextResponse.json({ success: false, authenticated: false }, { status: 401 });
}

export async function DELETE(req: NextRequest) {
  if (!verifyAdminCsrfAndOrigin(req)) {
    return NextResponse.json(
      { success: false, error: 'Forbidden: CSRF / Origin mismatch' },
      { status: 403 }
    );
  }

  const ip = getClientIp(req.headers);
  await recordAuditLog({
    action: 'ADMIN_LOGOUT',
    userEmail: process.env.ADMIN_EMAIL || 'admin@muskydose.in',
    ipAddress: ip,
  });

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  clearAdminAuthCookie(response);
  return response;
}

