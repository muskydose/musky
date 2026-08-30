import { NextRequest, NextResponse } from 'next/server';
import { getBulkPricingRules, getAllBulkPricingRulesAdmin, saveBulkPricingRule, deleteBulkPricingRule, calculateBulkDiscount } from '@/lib/db/campaigns';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError, sanitizePublicError } from '@/lib/api-errors';
import { checkRateLimitAsync, getClientIp } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isAdmin = searchParams.get('admin') === 'true';

    if (isAdmin) {
      const authCheck = requireAdminAuthAndCsrf(req);
      if (!authCheck.authenticated) {
        return authCheck.errorResponse!;
      }
      const rules = await getAllBulkPricingRulesAdmin();
      return NextResponse.json({ success: true, rules });
    }

    const activeRules = await getBulkPricingRules();
    return NextResponse.json({ success: true, rules: activeRules });
  } catch (err: any) {
    return sanitizeAdminError(err, 'Failed to retrieve bulk pricing rules.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // If request is asking for discount calculation preview
    if (body.action === 'calculate' && Array.isArray(body.items)) {
      const ip = getClientIp(req.headers);
      const rl = await checkRateLimitAsync(`bulk_calc:${ip}`, 60, 60 * 1000);
      if (!rl.allowed) {
        return NextResponse.json({ success: false, error: 'Rate limit exceeded.' }, { status: 429 });
      }

      if (body.items.length > 50) {
        return NextResponse.json({ success: false, error: 'Too many items in calculation preview.' }, { status: 400 });
      }

      const result = await calculateBulkDiscount(body.items);
      return NextResponse.json({ success: true, result });
    }

    // Otherwise it is saving an admin bulk pricing rule - require admin auth & CSRF
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const savedRule = await saveBulkPricingRule(body);
    return NextResponse.json({ success: true, rule: savedRule });
  } catch (err: any) {
    return sanitizeAdminError(err, 'Failed to process bulk pricing request.', 400);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Rule ID is required.' }, { status: 400 });
    }

    await deleteBulkPricingRule(id);
    return NextResponse.json({ success: true, message: 'Bulk pricing rule deleted successfully.' });
  } catch (err: any) {
    return sanitizeAdminError(err, 'Failed to delete bulk pricing rule.', 400);
  }
}
