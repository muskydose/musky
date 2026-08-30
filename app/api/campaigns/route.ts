import { NextRequest, NextResponse } from 'next/server';
import { getCampaigns, getCampaignsAdmin, saveCampaign, deleteCampaign, duplicateCampaign, calculateCampaignDiscount } from '@/lib/db/campaigns';
import { requireAdminAuthAndCsrf, isRequestAdminAuthenticated } from '@/lib/admin-middleware';
import { recordAuditLog } from '@/lib/auth';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';
import { checkRateLimitAsync, getClientIp } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  const requestId = getRequestId();
  try {
    const { searchParams } = new URL(req.url);
    const isAdmin = searchParams.get('admin') === 'true';

    if (isAdmin) {
      const authCheck = requireAdminAuthAndCsrf(req);
      if (!authCheck.authenticated) {
        return authCheck.errorResponse!;
      }
      const campaigns = await getCampaignsAdmin();
      return createSuccessResponse({ campaigns }, undefined, requestId);
    }

    const activeCampaigns = await getCampaigns();
    const publicCampaigns = activeCampaigns.map((c) => ({
      id: c.id,
      name: c.name,
      festivalName: c.festivalName,
      publicHeading: c.publicHeading,
      publicSubtitle: c.publicSubtitle,
      publicDescription: c.publicDescription,
      status: c.status,
      startDate: c.startDate,
      endDate: c.endDate,
      timezone: c.timezone,
      discountType: c.discountType,
      discountValue: c.discountValue,
      minOrderValue: c.minOrderValue,
      maxDiscountAmount: c.maxDiscountAmount,
      couponRequired: c.couponRequired,
      couponCode: c.couponCode,
      showBanner: c.showBanner,
      bannerHeading: c.bannerHeading,
      bannerSubtitle: c.bannerSubtitle,
      bannerDescription: c.bannerDescription,
      bannerImageUrl: c.bannerImageUrl,
      bannerCtaText: c.bannerCtaText,
      bannerCtaLink: c.bannerCtaLink,
      bannerPosition: c.bannerPosition,
      showCountdown: c.showCountdown,
      badgeText: c.badgeText,
      badgeEnabled: c.badgeEnabled,
    }));
    return createSuccessResponse({ campaigns: publicCampaigns }, undefined, requestId);
  } catch (err: any) {
    return sanitizeAdminError(err, 'Failed to fetch active campaigns', 500, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId();
  try {
    const body = await req.json().catch(() => ({}));

    // If request is asking for discount calculation preview
    if (body.action === 'calculate' && Array.isArray(body.items)) {
      const ip = getClientIp(req.headers);
      const rl = await checkRateLimitAsync(`campaign_calc:${ip}`, 60, 60 * 1000);
      if (!rl.allowed) {
        return NextResponse.json({ success: false, error: 'Rate limit exceeded.', requestId }, { status: 429 });
      }

      if (body.items.length > 50) {
        return NextResponse.json({ success: false, error: 'Too many items in calculation.', requestId }, { status: 400 });
      }

      const result = await calculateCampaignDiscount(body.items, body.couponCode, body.customerPhone);
      return createSuccessResponse({ result }, undefined, requestId);
    }

    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    // Duplicate action
    if (body.action === 'duplicate' && body.id) {
      const duplicated = await duplicateCampaign(body.id);
      await recordAuditLog({ action: 'CAMPAIGN_DUPLICATE', resource: body.id });
      return createSuccessResponse({ campaign: duplicated }, undefined, requestId);
    }

    const savedCampaign = await saveCampaign(body);
    await recordAuditLog({ action: 'CAMPAIGN_SAVE', resource: savedCampaign.name || savedCampaign.id });
    return createSuccessResponse({ campaign: savedCampaign }, undefined, requestId);
  } catch (err: any) {
    return sanitizeAdminError(err, 'Failed to save campaign.', 400, requestId);
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = getRequestId();
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Campaign ID is required.', requestId }, { status: 400 });
    }

    await deleteCampaign(id);
    await recordAuditLog({ action: 'CAMPAIGN_DELETE', resource: id });
    return createSuccessResponse({ message: 'Campaign deleted successfully.' }, undefined, requestId);
  } catch (err: any) {
    return sanitizeAdminError(err, 'Failed to delete campaign.', 400, requestId);
  }
}
