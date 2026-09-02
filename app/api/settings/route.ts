import { NextRequest, NextResponse } from 'next/server';
import { getSiteSettings, getPublicSiteSettingsProjection, updateSiteSettings, getPaymentSettings, updatePaymentSettings } from '@/lib/db/settings';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { recordAuditLog } from '@/lib/auth';
import { isBase64ImageData } from '@/lib/media-upload';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';

export async function GET(req: NextRequest) {
  const requestId = getRequestId();
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    const isAdmin = authCheck.authenticated;
    const siteSettings = await getSiteSettings();
    const paymentSettings = await getPaymentSettings();

    if (!isAdmin) {
      // Public customer-safe settings view using strict projection
      const safeSiteSettings = getPublicSiteSettingsProjection(siteSettings);

      const publicPaymentSettings = {
        onlinePaymentEnabled: false,
        whatsappOrderEnabled: paymentSettings.whatsappOrderEnabled ?? true,
        upiEnabled: paymentSettings.upiEnabled ?? false,
        cardEnabled: paymentSettings.cardEnabled ?? false,
        netbankingEnabled: paymentSettings.netbankingEnabled ?? false,
      };

      return createSuccessResponse(
        {
          siteSettings: safeSiteSettings,
          paymentSettings: publicPaymentSettings,
        },
        undefined,
        requestId
      );
    }

    return createSuccessResponse(
      {
        siteSettings,
        paymentSettings,
      },
      undefined,
      requestId
    );
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to retrieve site settings.', 500, requestId);
  }
}

export async function PUT(req: NextRequest) {
  const requestId = getRequestId();
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const body = await req.json();
    const { siteSettings, paymentSettings } = body;

    if (siteSettings) {
      // Reject direct Base64 image data in settings fields
      const imageFields = ['logoUrl', 'faviconUrl', 'ogImageUrl', 'heroImageUrl', 'factoryImageUrl'];
      for (const field of imageFields) {
        if (siteSettings[field] && isBase64ImageData(siteSettings[field])) {
          return NextResponse.json(
            {
              success: false,
              error: `Invalid image payload in ${field}: Direct Base64 image strings are not allowed. Please upload image files to Media storage first.`,
              requestId,
            },
            { status: 400 }
          );
        }
      }
    }

    let updatedSite = null;
    let updatedPayment = null;

    if (siteSettings) {
      updatedSite = await updateSiteSettings(siteSettings);
    }
    if (paymentSettings) {
      updatedPayment = await updatePaymentSettings(paymentSettings);
    }

    // Invalidate Next.js static cache and revalidate all public routes
    try {
      const { revalidatePath, revalidateTag } = await import('next/cache');
      revalidatePath('/', 'layout');
      revalidatePath('/contact');
      revalidatePath('/about');
      revalidatePath('/factory');
      revalidatePath('/wholesale');
      revalidatePath('/faq');
      revalidatePath('/products');
      revalidateTag('site_settings');
      revalidateTag('business_settings');
    } catch (revErr: any) {
      console.warn('[API Settings] Revalidation notice:', revErr?.message);
    }

    await recordAuditLog({
      action: 'SETTINGS_UPDATE',
      resource: 'site_settings',
      details: {
        updatedSite: Boolean(siteSettings),
        updatedPayment: Boolean(paymentSettings),
        affectedSystems: ['Website', 'Schema', 'Footer', 'Contact', 'Invoices', 'MerchantFeed', 'Omnichannel'],
        propagationStatus: 'SUCCESS',
      },
    });

    return createSuccessResponse(
      {
        siteSettings: updatedSite || (await getSiteSettings()),
        paymentSettings: updatedPayment || (await getPaymentSettings()),
      },
      undefined,
      requestId
    );
  } catch (error: any) {
    return sanitizeAdminError(error, 'An error occurred while updating settings.', 500, requestId);
  }
}

export async function POST(req: NextRequest) {
  return PUT(req);
}
