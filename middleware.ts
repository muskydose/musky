import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { isRequestAdminAuthenticated } from '@/lib/auth';
import { resolveCategorySlugRedirect } from '@/lib/db/category-redirects';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Intercept legacy category slug URLs and redirect with HTTP 301 Moved Permanently
  if (path.startsWith('/categories/')) {
    const slug = path.replace('/categories/', '').split('/')[0]?.split('?')[0];
    if (slug) {
      try {
        const targetSlug = await resolveCategorySlugRedirect(slug);
        if (targetSlug && targetSlug !== slug) {
          const redirectUrl = new URL(`/categories/${targetSlug}`, request.url);
          // Preserve query params if any
          redirectUrl.search = request.nextUrl.search;
          return NextResponse.redirect(redirectUrl, 301);
        }
      } catch (e) {
        console.warn('[middleware] Category redirect resolution notice:', e);
      }
    }
  }

  // 2. Protect all /admin page routes except /admin/login
  if (path.startsWith('/admin') && path !== '/admin/login') {
    if (!isRequestAdminAuthenticated(request)) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // 3. Protect all /api/admin/* endpoints except public auth actions
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
  matcher: ['/admin/:path*', '/api/admin/:path*', '/categories/:path*'],
};

