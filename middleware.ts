import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isRequestAdminAuthenticated } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Protect all /admin page routes except /admin/login
  if (path.startsWith('/admin') && path !== '/admin/login') {
    if (!isRequestAdminAuthenticated(request)) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // 2. Protect all /api/admin/* endpoints except public auth actions
  if (path.startsWith('/api/admin')) {
    const isPublicAuthRoute =
      path === '/api/admin/auth' ||
      path === '/api/admin/forgot-password' ||
      path === '/api/admin/verify-otp' ||
      path === '/api/admin/reset-password';

    if (!isPublicAuthRoute && !isRequestAdminAuthenticated(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized administrative access required.' },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};

