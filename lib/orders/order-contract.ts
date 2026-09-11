/**
 * ============================================================================
 * MUSKY DOSE — CANONICAL ORDER CONTRACT & BOUNDARY NORMALIZER (V1.0)
 *
 * CORE ARCHITECTURAL PRINCIPLE:
 * ONE CANONICAL CONTRACT PER ENTITY.
 *
 * All external / client order submissions pass through normalizeOrderInput().
 * This boundary is the ONLY place where camelCase/snake_case/legacy aliases
 * (e.g. phone vs customerPhone, house_shop vs customerHouseShop) are resolved.
 *
 * Business logic, Universal Governance, database mappers, and WhatsApp builders
 * consume strictly the CanonicalOrderInput without guessing field names.
 * ============================================================================
 */

import { OrderItem } from '@/lib/types';

export interface CanonicalOrderInput {
  // Customer Identity & Contact
  customerName: string;
  customerPhone: string;
  customerWhatsapp: string;
  customerEmail: string;

  // Address
  customerHouseShop: string;
  customerAddress: string;
  customerArea: string;
  customerLandmark: string;
  customerCity: string;
  customerState: string;
  customerPincode: string;

  // Items & Commercial Totals
  items: OrderItem[];
  shippingFee: number;
  subtotal?: number;
  discountAmount?: number;
  totalAmount?: number;

  // Metadata
  notes: string;
  couponCode?: string;
  idempotencyKey?: string;

  // Boundary Compatibility Aliases (defense-in-depth for existing consumers)
  phone: string;
  whatsapp: string;
  orderStatus: 'NEW';
  paymentStatus: 'UNPAID';
  paymentMethod: 'WhatsApp';
}

export interface OrderNormalizationResult {
  isValid: boolean;
  errors: string[];
  canonical?: CanonicalOrderInput;
}

/**
 * Normalizes raw input from client checkout or API into a strict CanonicalOrderInput.
 * Phone is strictly required (10 digits).
 */
export function normalizeOrderInput(raw: any): OrderNormalizationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== 'object') {
    return { isValid: false, errors: ['Invalid order payload: request body must be a JSON object.'] };
  }

  // 1. Customer Name
  const rawName = raw.customerName || raw.name || raw.customer_name || '';
  const customerName = String(rawName).trim();
  if (!customerName) {
    errors.push('Customer name is required.');
  } else if (customerName.length > 100) {
    errors.push('Customer name must be 100 characters or less.');
  }

  // 2. Customer Phone (Strictly Required: 10 Indian digits)
  const rawPhone = raw.customerPhone || raw.phone || raw.customer_phone || raw.mobile || raw.contactPhone || '';
  const cleanPhone = String(rawPhone).replace(/\D/g, '');
  if (!cleanPhone) {
    errors.push('Contact phone is required.');
  } else if (cleanPhone.length !== 10) {
    errors.push('Valid 10-digit mobile number is required.');
  }

  // 3. WhatsApp (Defaults to cleanPhone if omitted or empty)
  const rawWhatsapp = raw.customerWhatsapp || raw.whatsapp || raw.customer_whatsapp || '';
  const cleanWhatsapp = rawWhatsapp ? String(rawWhatsapp).replace(/\D/g, '') : cleanPhone;

  // 4. Customer Email (Optional)
  const rawEmail = raw.customerEmail || raw.email || raw.customer_email || '';
  const customerEmail = String(rawEmail).trim();
  if (customerEmail && customerEmail.length > 254) {
    errors.push('Customer email cannot exceed 254 characters.');
  }

  // 5. House / Shop
  const rawHouseShop = raw.customerHouseShop || raw.houseShop || raw.house_shop || raw.customer_house_shop || '';
  const customerHouseShop = String(rawHouseShop).trim();
  if (!customerHouseShop) {
    errors.push('House/Shop number is required.');
  } else if (customerHouseShop.length > 100) {
    errors.push('House/Shop number must be 100 characters or less.');
  }

  // 6. Complete Street Address
  const rawAddress = raw.customerAddress || raw.address || raw.customer_address || '';
  const customerAddress = String(rawAddress).trim();
  if (!customerAddress) {
    errors.push('Complete delivery address is required.');
  } else if (customerAddress.length < 5) {
    errors.push('Complete delivery address must be at least 5 characters.');
  } else if (customerAddress.length > 500) {
    errors.push('Address cannot exceed 500 characters.');
  }

  // 7. Area / Locality
  const rawArea = raw.customerArea || raw.area || raw.customer_area || '';
  const customerArea = String(rawArea).trim();

  // 8. Landmark
  const rawLandmark = raw.customerLandmark || raw.landmark || raw.customer_landmark || '';
  const customerLandmark = String(rawLandmark).trim();

  // 9. City
  const rawCity = raw.customerCity || raw.city || raw.customer_city || '';
  const customerCity = String(rawCity).trim();
  if (!customerCity) {
    errors.push('City is required.');
  }

  // 10. State (Default to Rajasthan if not specified)
  const rawState = raw.customerState || raw.state || raw.customer_state || 'Rajasthan';
  const customerState = String(rawState).trim() || 'Rajasthan';

  // 11. PIN Code
  const rawPincode = raw.customerPincode || raw.pincode || raw.customer_pincode || raw.pin || '';
  const cleanPincode = String(rawPincode).replace(/\D/g, '');
  if (!cleanPincode) {
    errors.push('Valid 6-digit PIN code is required.');
  } else if (cleanPincode.length !== 6) {
    errors.push('PIN code must be exactly 6 digits.');
  }

  // 12. Items Array
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  if (rawItems.length === 0) {
    errors.push('Order must contain at least one item.');
  } else if (rawItems.length > 50) {
    errors.push('Orders cannot contain more than 50 distinct items.');
  }

  const normalizedItems: OrderItem[] = rawItems.map((item: any, idx: number) => {
    const rawProdId = item.productId || item.product_id || item.id || `item-${idx + 1}`;
    const rawProdName = item.productName || item.product_name || item.name || 'Botanical Product';
    const rawWeight = item.packSize || item.pack_size || item.weight || 'Standard Pack';
    const rawQty = item.quantity !== undefined ? Number(item.quantity) : 1;
    const rawPrice = item.price !== undefined ? Number(item.price) : 0;

    return {
      productId: String(rawProdId).trim(),
      productName: String(rawProdName).trim(),
      quantity: Math.max(1, Math.floor(isNaN(rawQty) ? 1 : rawQty)),
      price: Math.max(0, isNaN(rawPrice) ? 0 : rawPrice),
      weight: String(rawWeight).trim(),
      packSize: String(rawWeight).trim(),
      variantId: item.variantId || item.variant_id ? String(item.variantId || item.variant_id).trim() : undefined,
      variantSku: item.variantSku || item.variant_sku || item.sku ? String(item.variantSku || item.variant_sku || item.sku).trim() : undefined,
      packQuantity: typeof item.packQuantity === 'number' ? item.packQuantity : (typeof item.pack_quantity === 'number' ? item.pack_quantity : undefined),
      packUnit: item.packUnit || item.pack_unit ? String(item.packUnit || item.pack_unit).trim() : undefined,
    };
  });

  // 13. Totals & Shipping
  const shippingFee = Number(raw.shippingFee ?? raw.shipping_fee ?? 0);
  const subtotal = raw.subtotal !== undefined ? Number(raw.subtotal) : undefined;
  const discountAmount = raw.discountAmount !== undefined ? Number(raw.discountAmount) : (raw.discount_amount !== undefined ? Number(raw.discount_amount) : undefined);
  const totalAmount = raw.totalAmount !== undefined ? Number(raw.totalAmount) : (raw.total_amount !== undefined ? Number(raw.total_amount) : undefined);

  // 14. Notes & Coupon
  const rawNotes = raw.notes ? String(raw.notes).trim() : '';
  if (rawNotes.length > 2000) {
    errors.push('Order notes cannot exceed 2000 characters.');
  }

  const rawCoupon = raw.couponCode || raw.coupon_code ? String(raw.couponCode || raw.coupon_code).trim() : undefined;
  if (rawCoupon && rawCoupon.length > 50) {
    errors.push('Coupon code cannot exceed 50 characters.');
  }

  const idempotencyKey = raw.idempotencyKey || raw.idempotency_key ? String(raw.idempotencyKey || raw.idempotency_key).trim() : undefined;

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const canonical: CanonicalOrderInput = {
    customerName,
    customerPhone: cleanPhone,
    customerWhatsapp: cleanWhatsapp,
    customerEmail,
    customerHouseShop,
    customerAddress,
    customerArea,
    customerLandmark,
    customerCity,
    customerState,
    customerPincode: cleanPincode,
    items: normalizedItems,
    shippingFee: isNaN(shippingFee) ? 0 : Math.max(0, shippingFee),
    subtotal: subtotal !== undefined && !isNaN(subtotal) ? subtotal : undefined,
    discountAmount: discountAmount !== undefined && !isNaN(discountAmount) ? discountAmount : undefined,
    totalAmount: totalAmount !== undefined && !isNaN(totalAmount) ? totalAmount : undefined,
    notes: rawNotes,
    couponCode: rawCoupon,
    idempotencyKey,
    phone: cleanPhone,
    whatsapp: cleanWhatsapp,
    orderStatus: 'NEW',
    paymentStatus: 'UNPAID',
    paymentMethod: 'WhatsApp',
  };

  return {
    isValid: true,
    errors: [],
    canonical,
  };
}
