import { NextRequest, NextResponse } from 'next/server';
import { getBulkPricingRules, getAllBulkPricingRulesAdmin, saveBulkPricingRule, deleteBulkPricingRule, calculateBulkDiscount } from '@/lib/db/campaigns';
import { isRequestAdminAuthenticated } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isAdmin = searchParams.get('admin') === 'true';

    if (isAdmin) {
      if (!isRequestAdminAuthenticated(req)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      const rules = await getAllBulkPricingRulesAdmin();
      return NextResponse.json({ success: true, rules });
    }

    const activeRules = await getBulkPricingRules();
    return NextResponse.json({ success: true, rules: activeRules });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // If request is asking for discount calculation preview
    if (body.action === 'calculate' && Array.isArray(body.items)) {
      const result = await calculateBulkDiscount(body.items);
      return NextResponse.json({ success: true, result });
    }

    // Otherwise it's saving an admin bulk pricing rule - require admin auth
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      );
    }

    const savedRule = await saveBulkPricingRule(body);
    return NextResponse.json({ success: true, rule: savedRule });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Rule ID is required.' }, { status: 400 });
    }

    await deleteBulkPricingRule(id);
    return NextResponse.json({ success: true, message: 'Bulk pricing rule deleted successfully.' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
