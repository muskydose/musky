import { NextRequest, NextResponse } from 'next/server';
import { isRequestAdminAuthenticated, verifyAdminCsrfAndOrigin } from '@/lib/auth';

export interface AdminAuthResult {
  authenticated: boolean;
  errorResponse?: NextResponse;
}

/**
 * Standardized admin authentication and CSRF guard for API routes.
 * Validates session token/header for admin routes, and enforces CSRF/Origin checks on mutation methods (POST, PUT, PATCH, DELETE).
 */
export function requireAdminAuthAndCsrf(req: NextRequest): AdminAuthResult {
  if (!isRequestAdminAuthenticated(req)) {
    return {
      authenticated: false,
      errorResponse: NextResponse.json(
        { success: false, error: 'Unauthorized administrative access required.' },
        { status: 401 }
      ),
    };
  }

  const method = req.method.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (!verifyAdminCsrfAndOrigin(req)) {
      return {
        authenticated: false,
        errorResponse: NextResponse.json(
          { success: false, error: 'CSRF validation failed: Invalid or untrusted request origin.' },
          { status: 403 }
        ),
      };
    }
  }

  return { authenticated: true };
}

export { isRequestAdminAuthenticated, verifyAdminCsrfAndOrigin };
