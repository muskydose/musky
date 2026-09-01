import { SupabaseClient } from '@supabase/supabase-js';
import { Order, OrderItem, Customer } from '../types';
import { getSupabaseAdmin } from '../supabase';
import { getAllProductsAdmin } from './products';
import { getSiteSettings } from './settings';
import { calculateCampaignDiscount, recordCampaignUsage, rollbackCampaignUsage } from './campaigns';

function requireSupabaseAdmin(): SupabaseClient {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error(
      'Supabase Database connection is unavailable. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are properly configured.'
    );
  }
  return client;
}

// In-memory idempotency cache for rapid repeat submission protection without database column dependency
const inMemoryOrderCache = new Map<string, { order: Order; timestamp: number }>();

function getCachedOrderByIdempotency(key: string): Order | null {
  const cached = inMemoryOrderCache.get(key);
  if (cached) {
    if (Date.now() - cached.timestamp < 10 * 60 * 1000) {
      return cached.order;
    }
    inMemoryOrderCache.delete(key);
  }
  return null;
}

function setCachedOrderByIdempotency(key: string, order: Order): void {
  if (inMemoryOrderCache.size > 200) {
    const now = Date.now();
    for (const [k, v] of inMemoryOrderCache.entries()) {
      if (now - v.timestamp > 10 * 60 * 1000) inMemoryOrderCache.delete(k);
    }
  }
  inMemoryOrderCache.set(key, { order, timestamp: Date.now() });
}

// ============================================================
// ROW MAPPERS FOR ORDERS & CUSTOMERS
// ============================================================

export function mapRowToOrder(row: any): Order {
  let itemsArr: OrderItem[] = [];
  if (Array.isArray(row.items)) {
    itemsArr = row.items;
  } else if (typeof row.items === 'string' && row.items) {
    try {
      itemsArr = JSON.parse(row.items);
    } catch {
      itemsArr = [];
    }
  }

  const subtotalVal = Number(row.subtotal ?? row.subtotalAmount ?? 0);
  const discountVal = Number(row.discount_amount ?? row.discountAmount ?? 0);
  const discountDet = row.discount_details || row.discountDetails || '';
  const shippingVal = Number(row.shipping_fee ?? row.shippingFee ?? 0);
  const totalVal = Number(row.total_amount ?? row.totalAmount ?? 0);

  // Extract coupon/campaign if encoded in notes
  const notesStr = row.notes || '';
  let parsedCoupon = row.coupon_code || row.couponCode;
  if (!parsedCoupon && notesStr.includes('[Coupon: ')) {
    const match = notesStr.match(/\[Coupon:\s*([^\]]+)\]/);
    if (match) parsedCoupon = match[1].trim();
  }

  let parsedCampaign = row.campaign_name || row.campaignName;
  if (!parsedCampaign && notesStr.includes('[Offer: ')) {
    const match = notesStr.match(/\[Offer:\s*([^\]]+)\]/);
    if (match) parsedCampaign = match[1].trim();
  }

  return {
    id: row.id,
    orderNumber: row.order_number || row.orderNumber || row.id,
    customerName: row.customer_name || row.customerName || 'Customer',
    customerPhone: row.customer_phone || row.customerPhone || '',
    customerWhatsapp: row.customer_whatsapp || row.customerWhatsapp || row.customer_phone || row.customerPhone || '',
    customerEmail: row.customer_email || row.customerEmail || '',
    customerHouseShop: row.house_shop || row.customer_house_shop || row.customerHouseShop || '',
    customerAddress: row.customer_address || row.customerAddress || '',
    customerArea: row.area || row.customer_area || row.customerArea || '',
    customerLandmark: row.landmark || row.customer_landmark || row.customerLandmark || '',
    customerCity: row.city || row.customer_city || row.customerCity || '',
    customerState: row.state || row.customer_state || row.customerState || '',
    customerPincode: row.pincode || row.customer_pincode || row.customerPincode || '',
    items: itemsArr,
    subtotal: subtotalVal > 0 ? subtotalVal : totalVal,
    discountAmount: discountVal,
    discountDetails: discountDet,
    shippingFee: shippingVal,
    totalAmount: totalVal,
    orderStatus: row.order_status || row.orderStatus || 'NEW',
    paymentStatus: row.payment_status || row.paymentStatus || 'UNPAID',
    paymentMethod: row.payment_method || row.paymentMethod || 'WhatsApp',
    notes: notesStr,
    campaignId: row.campaign_id || row.campaignId || undefined,
    campaignName: parsedCampaign || undefined,
    couponCode: parsedCoupon || undefined,
    campaignDiscountAmount: Number(row.campaign_discount_amount ?? row.campaignDiscountAmount ?? discountVal ?? 0),
    idempotencyKey: row.idempotency_key || row.idempotencyKey || undefined,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export function mapOrderToRow(o: Order) {
  // Preserve campaign / coupon metadata in notes if present
  const metaNotesParts: string[] = [];
  if (o.couponCode) metaNotesParts.push(`[Coupon: ${o.couponCode}]`);
  if (o.campaignName) metaNotesParts.push(`[Offer: ${o.campaignName}]`);
  if (o.discountDetails) metaNotesParts.push(`[Discount: ${o.discountDetails}]`);

  const metaNotes = metaNotesParts.length > 0 ? metaNotesParts.join(' ') : '';
  const combinedNotes = [o.notes, metaNotes].filter(Boolean).join('\n').trim();

  return {
    id: o.id,
    order_number: o.orderNumber,
    customer_name: o.customerName,
    customer_phone: o.customerPhone,
    customer_whatsapp: o.customerWhatsapp || o.customerPhone,
    customer_email: o.customerEmail || null,
    customer_address: o.customerAddress,
    house_shop: o.customerHouseShop || '',
    area: o.customerArea || '',
    landmark: o.customerLandmark || '',
    city: o.customerCity || '',
    state: o.customerState || '',
    pincode: o.customerPincode || '',
    items: o.items || [],
    subtotal: o.subtotal,
    discount_amount: o.discountAmount || 0,
    discount_type: o.couponCode ? 'COUPON' : (o.campaignId ? 'CAMPAIGN' : (o.discountAmount ? 'BULK' : 'NONE')),
    discount_value: o.discountAmount || 0,
    shipping_fee: o.shippingFee,
    total_amount: o.totalAmount,
    order_status: o.orderStatus,
    payment_status: o.paymentStatus,
    payment_method: o.paymentMethod,
    notes: combinedNotes,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
  };
}

export function mapRowToCustomer(row: any): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    whatsapp: row.whatsapp || row.phone,
    email: row.email || '',
    houseShop: row.house_shop || row.houseShop || '',
    address: row.address || '',
    area: row.area || '',
    landmark: row.landmark || '',
    city: row.city || '',
    state: row.state || '',
    pincode: row.pincode || '',
    totalOrders: Number(row.total_orders ?? row.totalOrders ?? 0),
    totalSpent: Number(row.total_spent ?? row.totalSpent ?? 0),
    lastOrderAt: row.last_order_at || row.lastOrderAt,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
  };
}

export function mapCustomerToRow(c: Customer) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    whatsapp: c.whatsapp || c.phone,
    email: c.email || null,
    house_shop: c.houseShop || null,
    address: c.address || null,
    area: c.area || null,
    landmark: c.landmark || null,
    city: c.city || null,
    state: c.state || null,
    pincode: c.pincode || null,
    total_orders: c.totalOrders || 0,
    total_spent: c.totalSpent || 0,
    last_order_at: c.lastOrderAt || new Date().toISOString(),
    created_at: c.createdAt || new Date().toISOString(),
  };
}

// ============================================================
// ORDERS CRUD OPERATIONS
// ============================================================

export interface GetOrdersPaginatedParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

export interface PaginatedOrdersResult {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getOrdersPaginated(params: GetOrdersPaginatedParams = {}): Promise<PaginatedOrdersResult> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
  const offset = (page - 1) * limit;
  const status = params.status && params.status !== 'ALL' ? params.status.trim() : undefined;
  const search = params.search ? params.search.trim() : undefined;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    let all = await getOrders();
    if (status) {
      all = all.filter((o) => o.orderStatus === status);
    }
    if (search) {
      const q = search.toLowerCase();
      all = all.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.includes(q)
      );
    }
    const total = all.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = all.slice(offset, offset + limit);
    return { orders: paginated, total, page, limit, totalPages };
  }

  try {
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('order_status', status);
    }

    if (search) {
      query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.warn(`Supabase query warning [getOrdersPaginated]: ${error.message}`);
      return { orders: [], total: 0, page, limit, totalPages: 1 };
    }

    const total = count ?? (data ? data.length : 0);
    const totalPages = Math.ceil(total / limit) || 1;
    const orders = (data || []).map(mapRowToOrder);

    return { orders, total, page, limit, totalPages };
  } catch (err: any) {
    console.error('getOrdersPaginated error:', err?.message);
    return { orders: [], total: 0, page, limit, totalPages: 1 };
  }
}

export async function getOrders(): Promise<Order[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });

  if (error) {
    console.warn(`Supabase query warning [orders]: ${error.message}`);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map(mapRowToOrder);
}

export async function getOrderById(id: string): Promise<Order | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    const all = await getOrders();
    return all.find((o) => o.id === id || o.orderNumber === id) || null;
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .or(`id.eq.${id},order_number.eq.${id}`)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      const all = await getOrders();
      return all.find((o) => o.id === id || o.orderNumber === id) || null;
    }

    return mapRowToOrder(data);
  } catch (err: any) {
    console.error('getOrderById error:', err?.message);
    return null;
  }
}

export async function getOrdersForAnalytics(days?: number): Promise<Order[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return getOrders();

  try {
    let query = supabase
      .from('orders')
      .select('id, order_number, customer_name, customer_phone, state, city, pincode, items, total_amount, discount_amount, discount_type, discount_value, order_status, created_at')
      .neq('order_status', 'CANCELLED');

    if (days && days > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      query = query.gte('created_at', cutoff.toISOString());
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.warn(`Supabase query warning [getOrdersForAnalytics]: ${error.message}`);
      return [];
    }

    return (data || []).map(mapRowToOrder);
  } catch (err: any) {
    console.error('getOrdersForAnalytics error:', err?.message);
    return [];
  }
}

export async function getCampaignOrders(days?: number): Promise<Order[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return getOrders();

  try {
    let query = supabase
      .from('orders')
      .select('*')
      .neq('order_status', 'CANCELLED');

    if (days && days > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      query = query.gte('created_at', cutoff.toISOString());
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) {
      console.warn(`Supabase query warning [getCampaignOrders]: ${error.message}`);
      return [];
    }

    const allOrders = (data || []).map(mapRowToOrder);
    return allOrders.filter((o) => (o.discountAmount ?? 0) > 0 || o.campaignId || o.couponCode || (o.notes && o.notes.includes('[Coupon:')));
  } catch (err: any) {
    console.error('getCampaignOrders error:', err?.message);
    return [];
  }
}

export function generateServerOrderNumber(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ORD-${dateStr}-${rand}`;
}

export async function saveOrder(orderData: Partial<Order>): Promise<Order> {
  const supabase = requireSupabaseAdmin();
  const now = new Date().toISOString();

  // Check in-memory idempotency cache FIRST before performing calculations or campaign allocations
  const idempotencyKey = (orderData.idempotencyKey || (orderData as any).idempotency_key || '').toString().trim();
  if (idempotencyKey) {
    const cachedOrder = getCachedOrderByIdempotency(idempotencyKey);
    if (cachedOrder) {
      return cachedOrder;
    }
  }

  let itemsToSave = orderData.items || [];
  let calculatedSubtotal = 0;

  if (itemsToSave.length === 0) {
    throw new Error('Cannot create an order with zero items.');
  }

  const allProducts = await getAllProductsAdmin();
  itemsToSave = itemsToSave.map((item) => {
    const prod = allProducts.find((p) => p.id === item.productId || p.name === item.productName);
    if (!prod) {
      throw new Error(`Product "${item.productName || item.productId}" not found.`);
    }
    if (prod.isActive === false) {
      throw new Error(`Product "${prod.name}" is inactive and cannot be ordered.`);
    }
    if (prod.stockStatus === 'out_of_stock') {
      throw new Error(`Product "${prod.name}" is currently out of stock.`);
    }
    const unitPrice = Number(prod.price);
    const qty = item.quantity && Number(item.quantity) > 0 ? Math.floor(Number(item.quantity)) : 1;
    calculatedSubtotal += unitPrice * qty;
    return {
      productId: prod.id,
      productName: prod.name,
      quantity: qty,
      price: unitPrice,
      weight: item.weight || prod.quantityOrWeight || 'Standard Pack',
    };
  });

  // Calculate server-side verified discounts (Bulk + Campaign / Coupon)
  const userCoupon = orderData.couponCode ? orderData.couponCode.trim() : undefined;
  const userPhone = orderData.customerPhone ? orderData.customerPhone.trim() : undefined;

  const campaignDiscountResult = await calculateCampaignDiscount(itemsToSave, userCoupon, userPhone);

  calculatedSubtotal = campaignDiscountResult.regularSubtotal;
  const bulkDiscountAmount = campaignDiscountResult.bulkDiscount;
  const campaignDiscountAmount = campaignDiscountResult.campaignDiscount;
  const totalDiscountAmount = campaignDiscountResult.totalDiscount;

  // Server-authoritative shipping fee calculation
  const siteSettings = await getSiteSettings();
  const configuredFlatShippingFee = Number(siteSettings.shippingFee ?? 0);
  const configuredFreeShippingThreshold = Number(siteSettings.freeShippingThreshold ?? 0);

  let finalShippingFee = configuredFlatShippingFee;
  if (
    campaignDiscountResult.isFreeShipping ||
    (configuredFreeShippingThreshold > 0 && campaignDiscountResult.netSubtotal >= configuredFreeShippingThreshold)
  ) {
    finalShippingFee = 0;
  }

  const netSubtotal = campaignDiscountResult.netSubtotal;
  const calculatedTotal = Math.max(0, netSubtotal + finalShippingFee);

  const discountDetailsParts: string[] = [];
  if (bulkDiscountAmount > 0) {
    discountDetailsParts.push(`Bulk Discount (-₹${bulkDiscountAmount})`);
  }
  if (campaignDiscountAmount > 0) {
    const campName = campaignDiscountResult.appliedCampaign?.publicHeading || 'Special Offer';
    discountDetailsParts.push(`${campName}${userCoupon ? ` [${userCoupon.toUpperCase()}]` : ''} (-₹${campaignDiscountAmount})`);
  }
  if (campaignDiscountResult.isFreeShipping) {
    discountDetailsParts.push('Free Shipping Promo');
  }

  const discountDetailsText = discountDetailsParts.join(' + ');

  // Assemble full address string if structured fields are provided
  let fullAddress = orderData.customerAddress || '';
  if (orderData.customerHouseShop || orderData.customerCity || orderData.customerState || orderData.customerPincode) {
    const parts = [
      orderData.customerHouseShop,
      orderData.customerAddress,
      orderData.customerArea,
      orderData.customerLandmark ? `Landmark: ${orderData.customerLandmark}` : '',
      [orderData.customerCity, orderData.customerState].filter(Boolean).join(', '),
      orderData.customerPincode ? `PIN: ${orderData.customerPincode}` : '',
    ].filter(Boolean);
    fullAddress = parts.join(', ');
  }

  // Always generate robust server-side order number (ORD-YYYYMMDD-XXXX)
  const orderNum = generateServerOrderNumber();

  const newOrder: Order = {
    id: `ord-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    orderNumber: orderNum,
    customerName: orderData.customerName ? orderData.customerName.trim() : 'Valued Customer',
    customerPhone: orderData.customerPhone ? orderData.customerPhone.trim() : '',
    customerWhatsapp: orderData.customerWhatsapp ? orderData.customerWhatsapp.trim() : orderData.customerPhone ? orderData.customerPhone.trim() : '',
    customerEmail: orderData.customerEmail ? orderData.customerEmail.trim() : '',
    customerHouseShop: orderData.customerHouseShop ? orderData.customerHouseShop.trim() : '',
    customerAddress: fullAddress,
    customerArea: orderData.customerArea ? orderData.customerArea.trim() : '',
    customerLandmark: orderData.customerLandmark ? orderData.customerLandmark.trim() : '',
    customerCity: orderData.customerCity ? orderData.customerCity.trim() : '',
    customerState: orderData.customerState ? orderData.customerState.trim() : '',
    customerPincode: orderData.customerPincode ? orderData.customerPincode.trim() : '',
    items: itemsToSave,
    subtotal: calculatedSubtotal,
    discountAmount: totalDiscountAmount,
    discountDetails: discountDetailsText,
    shippingFee: finalShippingFee,
    totalAmount: calculatedTotal,
    campaignId: campaignDiscountResult.appliedCampaign?.id,
    campaignName: campaignDiscountResult.appliedCampaign?.publicHeading,
    couponCode: userCoupon ? userCoupon.toUpperCase() : undefined,
    campaignDiscountAmount: campaignDiscountAmount,
    idempotencyKey: idempotencyKey || undefined,
    orderStatus: orderData.orderStatus || 'NEW',
    paymentStatus: 'UNPAID', // Always UNPAID for WhatsApp orders
    paymentMethod: 'WhatsApp',
    notes: orderData.notes ? orderData.notes.trim() : '',
    createdAt: now,
    updatedAt: now,
  };

  // Atomically record campaign usage FIRST to prevent race conditions & over-subscriptions
  let usageRecordResult: { success: boolean; error?: string; usageId?: string } | null = null;
  if (campaignDiscountResult.appliedCampaign && (campaignDiscountAmount > 0 || campaignDiscountResult.isFreeShipping)) {
    usageRecordResult = await recordCampaignUsage(
      campaignDiscountResult.appliedCampaign.id,
      userCoupon,
      newOrder.id,
      newOrder.customerPhone,
      campaignDiscountAmount
    );

    if (!usageRecordResult.success) {
      throw new Error(usageRecordResult.error || 'This offer or coupon has reached its maximum usage limit.');
    }
  }

  // Attempt database insertion with retry loop for collision safety
  let attempts = 0;
  let insertSuccess = false;
  let finalSavedOrder = newOrder;

  while (attempts < 3 && !insertSuccess) {
    attempts++;
    if (attempts > 1) {
      finalSavedOrder = {
        ...finalSavedOrder,
        id: `ord-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        orderNumber: generateServerOrderNumber(),
      };
    }

    const row = mapOrderToRow(finalSavedOrder);
    const { error } = await supabase.from('orders').upsert([row]);

    if (!error) {
      insertSuccess = true;
    } else {
      if (
        error.code === '23505' ||
        error.message?.toLowerCase().includes('unique') ||
        error.message?.toLowerCase().includes('duplicate')
      ) {
        continue;
      }
      if (campaignDiscountResult.appliedCampaign && usageRecordResult?.usageId) {
        await rollbackCampaignUsage(campaignDiscountResult.appliedCampaign.id, usageRecordResult.usageId);
      }
      throw new Error(`Database error saving order to Supabase: ${error.message}`);
    }
  }

  if (!insertSuccess) {
    if (campaignDiscountResult.appliedCampaign && usageRecordResult?.usageId) {
      await rollbackCampaignUsage(campaignDiscountResult.appliedCampaign.id, usageRecordResult.usageId);
    }
    throw new Error('Failed to generate unique order number after multiple attempts.');
  }

  // Also sync customer record to Customers table
  if (finalSavedOrder.customerPhone) {
    try {
      const phone = finalSavedOrder.customerPhone.trim();
      const { data: existingCust } = await supabase.from('customers').select('*').eq('phone', phone).maybeSingle();
      if (existingCust) {
        const totalOrders = Number(existingCust.total_orders ?? existingCust.totalOrders ?? 0) + 1;
        const totalSpent = Number(existingCust.total_spent ?? existingCust.totalSpent ?? 0) + finalSavedOrder.totalAmount;
        await supabase
          .from('customers')
          .update({
            name: finalSavedOrder.customerName || existingCust.name,
            whatsapp: finalSavedOrder.customerWhatsapp || existingCust.whatsapp || phone,
            email: finalSavedOrder.customerEmail || existingCust.email,
            house_shop: finalSavedOrder.customerHouseShop || existingCust.house_shop,
            address: finalSavedOrder.customerAddress || existingCust.address,
            area: finalSavedOrder.customerArea || existingCust.area,
            landmark: finalSavedOrder.customerLandmark || existingCust.landmark,
            city: finalSavedOrder.customerCity || existingCust.city,
            state: finalSavedOrder.customerState || existingCust.state,
            pincode: finalSavedOrder.customerPincode || existingCust.pincode,
            total_orders: totalOrders,
            total_spent: totalSpent,
            last_order_at: finalSavedOrder.createdAt,
          })
          .eq('id', existingCust.id);
      } else {
        const newCustomer: Customer = {
          id: `cust-${Date.now()}`,
          name: finalSavedOrder.customerName,
          phone: phone,
          whatsapp: finalSavedOrder.customerWhatsapp || phone,
          email: finalSavedOrder.customerEmail,
          houseShop: finalSavedOrder.customerHouseShop,
          address: finalSavedOrder.customerAddress,
          area: finalSavedOrder.customerArea,
          landmark: finalSavedOrder.customerLandmark,
          city: finalSavedOrder.customerCity,
          state: finalSavedOrder.customerState,
          pincode: finalSavedOrder.customerPincode,
          totalOrders: 1,
          totalSpent: finalSavedOrder.totalAmount,
          lastOrderAt: finalSavedOrder.createdAt,
          createdAt: finalSavedOrder.createdAt,
        };
        await supabase.from('customers').insert([mapCustomerToRow(newCustomer)]);
      }
    } catch (e) {
      console.warn('Non-fatal error syncing customer record:', e);
    }
  }

  if (idempotencyKey) {
    setCachedOrderByIdempotency(idempotencyKey, finalSavedOrder);
  }

  return finalSavedOrder;
}

export async function updateOrderStatus(
  id: string,
  orderStatus: Order['orderStatus'],
  paymentStatus?: Order['paymentStatus']
): Promise<Order | null> {
  const supabase = requireSupabaseAdmin();
  const { data: existingRow, error: fetchErr } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();

  if (fetchErr || !existingRow) {
    throw new Error(`Order "${id}" not found in database.`);
  }

  const existingOrder = mapRowToOrder(existingRow);
  const updatedOrder: Order = {
    ...existingOrder,
    orderStatus,
    paymentStatus: paymentStatus || existingOrder.paymentStatus,
    updatedAt: new Date().toISOString(),
  };

  const row = mapOrderToRow(updatedOrder);
  const { error } = await supabase.from('orders').update(row).eq('id', id);

  if (error) {
    throw new Error(`Database error updating order status: ${error.message}`);
  }

  return updatedOrder;
}

export async function deleteOrderAdmin(id: string): Promise<boolean> {
  const supabase = requireSupabaseAdmin();
  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) {
    throw new Error(`Database error deleting order: ${error.message}`);
  }
  return true;
}

export async function deleteOrdersBulkAdmin(ids: string[]): Promise<number> {
  if (!ids || ids.length === 0) return 0;
  const supabase = requireSupabaseAdmin();
  const { error } = await supabase.from('orders').delete().in('id', ids);
  if (error) {
    throw new Error(`Database error bulk deleting orders: ${error.message}`);
  }
  return ids.length;
}

export interface GetCustomersPaginatedParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginatedCustomersResult {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getCustomersPaginated(params: GetCustomersPaginatedParams = {}): Promise<PaginatedCustomersResult> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
  const offset = (page - 1) * limit;
  const search = params.search ? params.search.trim() : undefined;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    let all = await getCustomers();
    if (search) {
      const q = search.toLowerCase();
      all = all.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q)) ||
          (c.city && c.city.toLowerCase().includes(q)) ||
          (c.address && c.address.toLowerCase().includes(q))
      );
    }
    const total = all.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const paginated = all.slice(offset, offset + limit);
    return { customers: paginated, total, page, limit, totalPages };
  }

  try {
    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%,city.ilike.%${search}%`);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.warn(`Supabase query warning [getCustomersPaginated]: ${error.message}`);
      return { customers: [], total: 0, page, limit, totalPages: 1 };
    }

    const total = count ?? (data ? data.length : 0);
    const totalPages = Math.ceil(total / limit) || 1;
    const customers = (data || []).map(mapRowToCustomer);

    return { customers, total, page, limit, totalPages };
  } catch (err: any) {
    console.error('getCustomersPaginated error:', err?.message);
    return { customers: [], total: 0, page, limit, totalPages: 1 };
  }
}

export async function getCustomers(): Promise<Customer[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });

  if (error) {
    console.warn(`Supabase query warning [customers]: ${error.message}`);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map(mapRowToCustomer);
}

export const getCustomersAdmin = getCustomers;

export async function deleteCustomerByPhone(phone: string): Promise<boolean> {
  const supabase = requireSupabaseAdmin();
  const { error } = await supabase.from('customers').delete().eq('phone', phone);
  if (error) {
    throw new Error(`Database error deleting customer: ${error.message}`);
  }
  return true;
}
