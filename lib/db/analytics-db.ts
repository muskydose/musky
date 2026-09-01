import { getSupabaseAdmin } from '@/lib/supabase';
import { getOrdersForAnalytics } from './orders';
import { getAllProductsAdmin } from './products';
import { getWholesaleEnquiries } from './wholesale';

export interface AnalyticsEventPayload {
  eventName: string;
  sessionId: string;
  pathname?: string;
  productId?: string;
  productName?: string;
  category?: string;
  searchQuery?: string;
  resultCount?: number;
  quantity?: number;
  value?: number;
  source?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

// In-memory fallback ring buffer (maximum 2,000 events)
const memoryEventsStore: AnalyticsEventPayload[] = [];

export async function saveAnalyticsEvent(event: AnalyticsEventPayload): Promise<boolean> {
  const now = new Date().toISOString();
  const fullEvent = {
    ...event,
    createdAt: event.createdAt || now,
  };

  // Always keep in memory ring buffer for instant local aggregation
  memoryEventsStore.unshift(fullEvent);
  if (memoryEventsStore.length > 2000) {
    memoryEventsStore.pop();
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return true;

  try {
    const row = {
      event_name: event.eventName,
      session_id: event.sessionId,
      pathname: event.pathname || null,
      product_id: event.productId || null,
      product_name: event.productName || null,
      category: event.category || null,
      search_query: event.searchQuery ? event.searchQuery.trim().substring(0, 150) : null,
      result_count: event.resultCount !== undefined ? Number(event.resultCount) : 0,
      quantity: event.quantity !== undefined ? Number(event.quantity) : 1,
      value: event.value !== undefined ? Number(event.value) : 0,
      source: event.source || null,
      metadata: event.metadata || {},
      created_at: fullEvent.createdAt,
    };

    const { error } = await supabase.from('analytics_events').insert([row]);
    if (error) {
      // Table may not be migrated yet in Supabase -> silent fallback to memory store
      console.warn(`[analytics_events insert warning]: ${error.message}`);
    }
  } catch (err: any) {
    console.warn(`[analytics_events exception]: ${err.message}`);
  }

  return true;
}

function getFilterDate(days: number): Date {
  const d = new Date();
  if (days <= 1) {
    d.setHours(0, 0, 0, 0); // Start of today
  } else {
    d.setDate(d.getDate() - days);
  }
  return d;
}

export async function getRawAnalyticsEvents(days = 30): Promise<AnalyticsEventPayload[]> {
  const since = getFilterDate(days).toISOString();
  const supabase = getSupabaseAdmin();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(10000);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((r: any) => ({
          eventName: r.event_name,
          sessionId: r.session_id,
          pathname: r.pathname,
          productId: r.product_id,
          productName: r.product_name,
          category: r.category,
          searchQuery: r.search_query,
          resultCount: r.result_count,
          quantity: r.quantity,
          value: Number(r.value || 0),
          source: r.source,
          metadata: r.metadata || {},
          createdAt: r.created_at,
        }));
      }
    } catch (err: any) {
      console.warn(`[getRawAnalyticsEvents warning]: ${err.message}`);
    }
  }

  // Memory fallback filter
  const sinceTime = getFilterDate(days).getTime();
  return memoryEventsStore.filter(
    (e) => new Date(e.createdAt || 0).getTime() >= sinceTime
  );
}

export async function getFunnelOverview(days = 30) {
  const events = await getRawAnalyticsEvents(days);
  const orders = await getOrdersForAnalytics();
  const wholesale = await getWholesaleEnquiries();

  const sinceTime = getFilterDate(days).getTime();
  const filteredOrders = orders.filter(
    (o) => new Date(o.createdAt).getTime() >= sinceTime
  );
  const filteredWholesale = wholesale.filter(
    (w) => new Date(w.createdAt).getTime() >= sinceTime
  );

  const uniqueSessions = new Set<string>();
  let pageViews = 0;
  let productViews = 0;
  let addToCarts = 0;
  let cartViews = 0;
  let checkoutStarts = 0;
  let whatsappClicks = 0;
  let wholesaleInquiries = filteredWholesale.length;

  for (const e of events) {
    if (e.sessionId) uniqueSessions.add(e.sessionId);

    switch (e.eventName) {
      case 'page_view':
        pageViews++;
        break;
      case 'product_view':
      case 'view_item':
        productViews++;
        break;
      case 'add_to_cart':
        addToCarts++;
        break;
      case 'cart_view':
      case 'view_cart':
        cartViews++;
        break;
      case 'checkout_started':
      case 'begin_checkout':
        checkoutStarts++;
        break;
      case 'whatsapp_click':
      case 'whatsapp_order_click':
        whatsappClicks++;
        break;
      case 'wholesale_inquiry_submitted':
        wholesaleInquiries++;
        break;
    }
  }

  const visitors = Math.max(uniqueSessions.size, filteredOrders.length > 0 ? 1 : 0);
  const orderCount = filteredOrders.length;
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  // Conversion rates (safe against divide-by-zero)
  const productViewRate = visitors > 0 ? Math.round((productViews / visitors) * 100) : 0;
  const cartRate = productViews > 0 ? Math.round((addToCarts / productViews) * 100) : 0;
  const checkoutRate = addToCarts > 0 ? Math.round((checkoutStarts / addToCarts) * 100) : 0;
  const orderConversionRate = checkoutStarts > 0 ? Math.round((orderCount / checkoutStarts) * 100) : 0;
  const overallConversionRate = visitors > 0 ? Math.round((orderCount / visitors) * 1000) / 10 : 0;

  return {
    periodDays: days,
    visitors,
    pageViews,
    productViews,
    addToCarts,
    cartViews,
    checkoutStarts,
    orders: orderCount,
    totalRevenue,
    whatsappClicks,
    wholesaleInquiries,
    rates: {
      productViewRate,
      cartRate,
      checkoutRate,
      orderConversionRate,
      overallConversionRate,
    },
  };
}

export async function getProductConversionFunnel(days = 30) {
  const events = await getRawAnalyticsEvents(days);
  const products = await getAllProductsAdmin();
  const orders = await getOrdersForAnalytics();

  const sinceTime = getFilterDate(days).getTime();
  const filteredOrders = orders.filter(
    (o) => new Date(o.createdAt).getTime() >= sinceTime
  );

  const productStats = new Map<
    string,
    {
      id: string;
      name: string;
      views: number;
      addToCart: number;
      orders: number;
      revenue: number;
    }
  >();

  // Initialize from product catalog
  for (const p of products) {
    productStats.set(p.id, {
      id: p.id,
      name: p.name,
      views: 0,
      addToCart: 0,
      orders: 0,
      revenue: 0,
    });
  }

  for (const e of events) {
    if (!e.productId) continue;
    const stat = productStats.get(e.productId);
    if (!stat) continue;

    if (e.eventName === 'product_view' || e.eventName === 'view_item') {
      stat.views++;
    } else if (e.eventName === 'add_to_cart') {
      stat.addToCart += Number(e.quantity || 1);
    }
  }

  for (const o of filteredOrders) {
    if (Array.isArray(o.items)) {
      for (const item of o.items) {
        const stat = productStats.get(item.productId);
        if (stat) {
          stat.orders += Number(item.quantity || 1);
          stat.revenue += Number(item.price || 0) * Number(item.quantity || 1);
        }
      }
    }
  }

  return Array.from(productStats.values())
    .map((p) => ({
      ...p,
      conversionRate: p.views > 0 ? Math.min(100, Math.round((p.orders / p.views) * 100)) : 0,
      cartRate: p.views > 0 ? Math.min(100, Math.round((p.addToCart / p.views) * 100)) : 0,
    }))
    .sort((a, b) => b.views - a.views || b.orders - a.orders);
}

export async function getSearchInsights(days = 30) {
  const events = await getRawAnalyticsEvents(days);

  const queryMap = new Map<
    string,
    {
      query: string;
      count: number;
      lastResultCount: number;
    }
  >();

  for (const e of events) {
    if (e.eventName === 'search_submit' && e.searchQuery) {
      const q = e.searchQuery.trim().toLowerCase();
      if (!q) continue;

      const existing = queryMap.get(q);
      if (existing) {
        existing.count++;
        existing.lastResultCount = e.resultCount ?? existing.lastResultCount;
      } else {
        queryMap.set(q, {
          query: e.searchQuery.trim(),
          count: 1,
          lastResultCount: e.resultCount ?? 0,
        });
      }
    }
  }

  const allSearches = Array.from(queryMap.values()).sort((a, b) => b.count - a.count);
  const topSearches = allSearches.slice(0, 15);
  const zeroResultSearches = allSearches.filter((s) => s.lastResultCount === 0).slice(0, 10);

  return {
    topSearches,
    zeroResultSearches,
    totalSearches: allSearches.reduce((sum, s) => sum + s.count, 0),
  };
}

export async function getWhatsAppFunnelStats(days = 30) {
  const events = await getRawAnalyticsEvents(days);

  const sourceMap = new Map<string, number>();

  for (const e of events) {
    if (e.eventName === 'whatsapp_click' || e.eventName === 'whatsapp_order_click') {
      const src = e.source || 'General / Unknown';
      sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
    }
  }

  return Array.from(sourceMap.entries()).map(([source, clicks]) => ({
    source,
    clicks,
  })).sort((a, b) => b.clicks - a.clicks);
}
