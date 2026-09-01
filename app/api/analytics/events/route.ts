import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimitAsync, getClientIp } from '@/lib/rate-limit';
import { saveAnalyticsEvent } from '@/lib/db/analytics-db';

const ALLOWED_EVENTS = new Set([
  'page_view',
  'search_open',
  'search_submit',
  'category_view',
  'view_category',
  'product_view',
  'view_item',
  'add_to_cart',
  'remove_from_cart',
  'cart_view',
  'view_cart',
  'checkout_started',
  'begin_checkout',
  'checkout_validation_error',
  'order_created',
  'order_failed',
  'whatsapp_click',
  'whatsapp_order_click',
  'wholesale_inquiry_started',
  'wholesale_inquiry_submitted',
  'wishlist_add',
  'wishlist_remove',
]);

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = await checkRateLimitAsync(`analytics_ingest:${ip}`, 240, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid event payload.' }, { status: 400 });
    }

    const { eventName, sessionId, pathname, productId, productName, category, searchQuery, resultCount, quantity, value, source, metadata } = body;

    if (!eventName || !ALLOWED_EVENTS.has(eventName)) {
      return NextResponse.json({ success: false, error: 'Unrecognized event type.' }, { status: 400 });
    }

    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
      return NextResponse.json({ success: false, error: 'Valid session identifier required.' }, { status: 400 });
    }

    // Fire and save event
    await saveAnalyticsEvent({
      eventName: String(eventName),
      sessionId: String(sessionId).trim(),
      pathname: pathname ? String(pathname).substring(0, 200) : undefined,
      productId: productId ? String(productId).substring(0, 100) : undefined,
      productName: productName ? String(productName).substring(0, 150) : undefined,
      category: category ? String(category).substring(0, 100) : undefined,
      searchQuery: searchQuery ? String(searchQuery).substring(0, 150) : undefined,
      resultCount: typeof resultCount === 'number' ? Math.max(0, resultCount) : 0,
      quantity: typeof quantity === 'number' ? Math.max(1, quantity) : 1,
      value: typeof value === 'number' ? Math.max(0, value) : 0,
      source: source ? String(source).substring(0, 100) : undefined,
      metadata: typeof metadata === 'object' && metadata !== null ? metadata : {},
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    // Fail silently with 200 to never break client analytics or checkout
    return NextResponse.json({ success: false, error: 'Ingestion error' }, { status: 200 });
  }
}
