// Privacy-preserving First-Party Analytics & Conversion Tracking for Musky Dose

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js',
      targetId: string | Date,
      config?: Record<string, unknown>
    ) => void;
    dataLayer?: unknown[];
  }
}

export function isAdminPath(path: string): boolean {
  if (!path) return false;
  return path.startsWith('/admin') || path.startsWith('/api/admin');
}

/**
 * Generates or retrieves a lightweight anonymous first-party session identifier.
 * Stored in sessionStorage / localStorage with zero personal identity.
 */
export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return 'server_session';
  try {
    const key = 'md_anon_session_v1';
    let sid = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (!sid || sid.length < 10) {
      sid = 'md_s_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      sessionStorage.setItem(key, sid);
      localStorage.setItem(key, sid);
    }
    return sid;
  } catch {
    return 'temp_' + Math.random().toString(36).substring(2, 10);
  }
}

/**
 * Deduplication cache for React Strict Mode & fast client rerenders
 */
const recentEventCache = new Set<string>();

function isDuplicateEvent(signature: string, ttlMs = 4000): boolean {
  if (recentEventCache.has(signature)) return true;
  recentEventCache.add(signature);
  setTimeout(() => {
    recentEventCache.delete(signature);
  }, ttlMs);
  return false;
}

/**
 * Dispatches first-party analytics event to server asynchronously without blocking UI
 */
function sendFirstPartyEvent(eventName: string, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  if (isAdminPath(window.location.pathname)) return;

  const sessionId = getOrCreateSessionId();
  const eventBody = {
    eventName,
    sessionId,
    pathname: window.location.pathname,
    ...payload,
  };

  try {
    const jsonStr = JSON.stringify(eventBody);
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([jsonStr], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics/events', blob);
    } else {
      fetch('/api/analytics/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonStr,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Fail silently
  }
}

// Track page view
export function pageview(url: string) {
  if (typeof window === 'undefined') return;
  if (isAdminPath(url)) return;

  if (isDuplicateEvent(`pv:${url}`, 2000)) return;

  sendFirstPartyEvent('page_view', { pathname: url });

  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
}

// Track generic custom event safely
export function trackEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  if (isAdminPath(window.location.pathname)) return;

  // Sanitize: omit sensitive PII fields
  const safeParams: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (['phone', 'email', 'address', 'password', 'token', 'notes', 'customerName', 'customerHouseShop'].includes(key)) {
      continue;
    }
    safeParams[key] = value;
  }

  sendFirstPartyEvent(eventName, safeParams);

  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag('event', eventName, safeParams);
  }
}

// ============================================================
// SPECIALIZED CONVERSION & FUNNEL HELPERS
// ============================================================

export function trackSearchOpen() {
  if (isDuplicateEvent('search_open', 3000)) return;
  sendFirstPartyEvent('search_open');
}

export function trackSearchSubmit(query: string, resultCount = 0) {
  if (!query || !query.trim()) return;
  const cleanQ = query.trim().substring(0, 100);
  if (isDuplicateEvent(`search:${cleanQ}`, 4000)) return;

  sendFirstPartyEvent('search_submit', {
    searchQuery: cleanQ,
    resultCount,
  });
}

export function trackProductView(product: {
  id: string;
  name: string;
  category?: string;
  price: number;
}) {
  if (!product?.id) return;
  if (isDuplicateEvent(`pview:${product.id}`, 5000)) return;

  sendFirstPartyEvent('product_view', {
    productId: product.id,
    productName: product.name,
    category: product.category || 'Henna & Herbal',
    value: Number(product.price || 0),
  });

  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag('event', 'view_item', {
      item_id: product.id,
      item_name: product.name,
      item_category: product.category || 'Henna & Herbal',
      price: product.price,
      currency: 'INR',
    });
  }
}

export function trackCategoryView(category: { id: string; name: string }) {
  if (!category?.id) return;
  if (isDuplicateEvent(`cview:${category.id}`, 5000)) return;

  sendFirstPartyEvent('category_view', {
    category: category.name || category.id,
  });

  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag('event', 'view_category', {
      category_id: category.id,
      category_name: category.name,
    });
  }
}

export function trackAddToCart(item: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}) {
  sendFirstPartyEvent('add_to_cart', {
    productId: item.id,
    productName: item.name,
    value: Number(item.price || 0) * (item.quantity || 1),
    quantity: item.quantity || 1,
  });

  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag('event', 'add_to_cart', {
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      quantity: item.quantity,
      currency: 'INR',
    });
  }
}

export function trackRemoveFromCart(item: {
  id: string;
  name: string;
  price: number;
}) {
  sendFirstPartyEvent('remove_from_cart', {
    productId: item.id,
    productName: item.name,
    value: Number(item.price || 0),
  });

  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag('event', 'remove_from_cart', {
      item_id: item.id,
      item_name: item.name,
      price: item.price,
      currency: 'INR',
    });
  }
}

export function trackViewCart(itemCount: number, totalAmount: number) {
  if (isDuplicateEvent(`vcart:${itemCount}:${totalAmount}`, 4000)) return;

  sendFirstPartyEvent('cart_view', {
    quantity: itemCount,
    value: totalAmount,
  });

  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag('event', 'view_cart', {
      item_count: itemCount,
      total_amount: totalAmount,
      currency: 'INR',
    });
  }
}

export function trackCheckoutStarted(itemCount: number, totalAmount: number) {
  if (isDuplicateEvent(`chkout_start:${itemCount}`, 5000)) return;

  sendFirstPartyEvent('checkout_started', {
    quantity: itemCount,
    value: totalAmount,
  });

  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag('event', 'begin_checkout', {
      item_count: itemCount,
      total_amount: totalAmount,
      currency: 'INR',
    });
  }
}

export function trackCheckoutValidationError(fieldCategory: string) {
  sendFirstPartyEvent('checkout_validation_error', {
    source: fieldCategory,
  });
}

export function trackOrderCreated(data: {
  orderId: string;
  itemCount: number;
  totalAmount: number;
}) {
  if (!data?.orderId) return;
  if (isDuplicateEvent(`order:${data.orderId}`, 600000)) return;

  sendFirstPartyEvent('order_created', {
    source: data.orderId,
    quantity: data.itemCount,
    value: data.totalAmount,
  });

  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag('event', 'purchase', {
      transaction_id: data.orderId,
      value: data.totalAmount,
      currency: 'INR',
    });
  }
}

export function trackWhatsAppClick(data: {
  source: string;
  productName?: string;
  productId?: string;
  quantity?: number;
  itemCount?: number;
  totalAmount?: number;
}) {
  sendFirstPartyEvent('whatsapp_click', {
    source: data.source,
    productId: data.productId,
    productName: data.productName,
    quantity: data.quantity || 1,
    value: data.totalAmount,
  });

  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag('event', 'whatsapp_order_click', {
      source: data.source,
      product_name: data.productName || 'Direct Enquiry',
      product_id: data.productId,
      quantity: data.quantity || 1,
      item_count: data.itemCount,
      total_amount: data.totalAmount,
      currency: 'INR',
    });
  }
}

export function trackWholesaleInquiryStarted(source = 'Wholesale Page') {
  if (isDuplicateEvent('wholesale_start', 5000)) return;
  sendFirstPartyEvent('wholesale_inquiry_started', { source });
}

export function trackWholesaleInquirySubmitted(data: {
  productsRequired?: string;
  approxQuantity?: string;
}) {
  sendFirstPartyEvent('wholesale_inquiry_submitted', {
    productName: data.productsRequired ? data.productsRequired.substring(0, 100) : undefined,
    source: data.approxQuantity ? data.approxQuantity.substring(0, 50) : undefined,
  });
}

export function trackWishlistAction(action: 'add' | 'remove', product: { id: string; name: string }) {
  sendFirstPartyEvent(action === 'add' ? 'wishlist_add' : 'wishlist_remove', {
    productId: product.id,
    productName: product.name,
  });
}
