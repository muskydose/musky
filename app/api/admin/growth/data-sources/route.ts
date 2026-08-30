import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import { getDataSources } from '@/lib/growth/growth-db';
import { FirstPartyDataSourceAdapter } from '@/lib/growth/sources/first-party-adapter';
import { GoogleAdsDataSourceAdapter, isGoogleAdsEnabled } from '@/lib/growth/sources/google-adapter';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const sources = await getDataSources();
    return NextResponse.json({ success: true, dataSources: sources });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch data sources.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const body = await req.json();
    const providerKey = body?.providerKey || 'first_party_orders';

    if (providerKey === 'first_party_orders') {
      const adapter = new FirstPartyDataSourceAdapter();
      const result = await adapter.sync();
      return NextResponse.json({ success: true, syncResult: result });
    } else if (providerKey === 'google_ads_keywords') {
      if (!isGoogleAdsEnabled()) {
        return NextResponse.json({ success: false, error: 'Google Ads integration is currently disabled or not configured.' }, { status: 400 });
      }
      const adapter = new GoogleAdsDataSourceAdapter();
      const result = await adapter.sync();
      return NextResponse.json({ success: true, syncResult: result });
    }

    return NextResponse.json({ success: false, error: `Unsupported providerKey: ${providerKey}` }, { status: 400 });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to execute data source sync.');
  }
}
