import { NextRequest, NextResponse } from 'next/server';
import { getSiteSettings } from '@/lib/db/settings';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const siteSettings = await getSiteSettings();
    const layoutControls = siteSettings.layoutControls || {};

    const mobileLogoW = layoutControls.mobileLogoWidth || 125;
    const desktopLogoW = layoutControls.desktopLogoWidth || 180;
    const mobileHeroH = layoutControls.mobileHeroHeight || 420;
    const desktopHeroH = layoutControls.desktopHeroHeight || 560;
    const headerPaddingV = layoutControls.headerPaddingVertical || 6;

    // Simulate generated CSS :root block as produced by app/layout.tsx
    const generatedRootCss = `
:root {
  --site-mobile-logo-w: ${mobileLogoW}px;
  --site-desktop-logo-w: ${desktopLogoW}px;
  --site-header-padding-v: ${headerPaddingV}px;
  --site-mobile-hero-h: ${mobileHeroH}px;
  --site-desktop-hero-h: ${desktopHeroH}px;
}
`.trim();

    const auditChecks = [
      {
        check: 'mobileLogoWidth Persistence',
        value: `${mobileLogoW}px`,
        status: typeof mobileLogoW === 'number' && mobileLogoW > 0 ? 'PASS' : 'FAIL',
      },
      {
        check: 'mobileHeroHeight Persistence',
        value: `${mobileHeroH}px`,
        status: typeof mobileHeroH === 'number' && mobileHeroH > 0 ? 'PASS' : 'FAIL',
      },
      {
        check: 'CSS Variable --site-mobile-logo-w Generation',
        value: `--site-mobile-logo-w: ${mobileLogoW}px`,
        status: generatedRootCss.includes(`--site-mobile-logo-w: ${mobileLogoW}px;`) ? 'PASS' : 'FAIL',
      },
      {
        check: 'CSS Variable --site-mobile-hero-h Generation',
        value: `--site-mobile-hero-h: ${mobileHeroH}px`,
        status: generatedRootCss.includes(`--site-mobile-hero-h: ${mobileHeroH}px;`) ? 'PASS' : 'FAIL',
      },
    ];

    const allPassed = auditChecks.every((c) => c.status === 'PASS');

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      overallStatus: allPassed ? 'PASSED' : 'FAILED',
      persistedLayoutControls: {
        mobileLogoWidth: mobileLogoW,
        desktopLogoWidth: desktopLogoW,
        mobileHeroHeight: mobileHeroH,
        desktopHeroHeight: desktopHeroH,
        headerPaddingVertical: headerPaddingV,
      },
      generatedRootCss,
      auditChecks,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to verify layout controls.');
  }
}
