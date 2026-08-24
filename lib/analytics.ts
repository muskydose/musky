// Privacy-preserving Analytics & Conversion Tracking for Musky Dose

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
  return path.startsWith('/admin');
}

// Track page view
export function pageview(url: string) {
  if (typeof window === 'undefined') return;
  if (isAdminPath(url)) return; // Exclude admin pages from customer analytics

  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
}

// Track custom event safely
export function trackEvent(eventName: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  if (isAdminPath(window.location.pathname)) return;

  // Sanitize: ensure no personal information (phone, email, address, password) is sent
  const safeParams: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (['phone', 'email', 'address', 'password', 'token', 'notes', 'customerName'].includes(key)) {
      continue; // Omit sensitive PII fields
    }
    safeParams[key] = value;
  }

  if (GA_MEASUREMENT_ID && window.gtag) {
    window.gtag('event', eventName, safeParams);
  }
}

// Specialized E-commerce & Conversion Tracking Helpers (Privacy Safe)

export function trackProductView(product: {
  id: string;
  name: string;
  category?: string;
  price: number;
}) {
  trackEvent('view_item', {
    item_id: product.id,
    item_name: product.name,
    item_category: product.category || 'Henna & Herbal',
    price: product.price,
    currency: 'INR',
  });
}

export function trackCategoryView(category: { id: string; name: string }) {
  trackEvent('view_category', {
    category_id: category.id,
    category_name: category.name,
  });
}

export function trackAddToCart(item: {
  id: string;
  name: string;
  price: number;
  quantity: number;
}) {
  trackEvent('add_to_cart', {
    item_id: item.id,
    item_name: item.name,
    price: item.price,
    quantity: item.quantity,
    currency: 'INR',
  });
}

export function trackRemoveFromCart(item: {
  id: string;
  name: string;
  price: number;
}) {
  trackEvent('remove_from_cart', {
    item_id: item.id,
    item_name: item.name,
    price: item.price,
    currency: 'INR',
  });
}

export function trackViewCart(itemCount: number, totalAmount: number) {
  trackEvent('view_cart', {
    item_count: itemCount,
    total_amount: totalAmount,
    currency: 'INR',
  });
}

export function trackWhatsAppClick(data: {
  source: string;
  productName?: string;
  productId?: string;
  quantity?: number;
  itemCount?: number;
  totalAmount?: number;
}) {
  trackEvent('whatsapp_order_click', {
    source: data.source,
    product_name: data.productName || 'Direct Enquiry',
    product_id: data.productId,
    quantity: data.quantity || 1,
    item_count: data.itemCount,
    total_amount: data.totalAmount,
    currency: 'INR',
  });
}

export function trackOrderEnquiryCreated(data: {
  itemCount: number;
  totalAmount: number;
}) {
  trackEvent('order_enquiry_created', {
    item_count: data.itemCount,
    total_amount: data.totalAmount,
    currency: 'INR',
  });
}
