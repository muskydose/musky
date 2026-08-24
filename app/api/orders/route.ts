import { NextRequest, NextResponse } from 'next/server';
import { getOrders, getOrdersPaginated, saveOrder, deleteOrderAdmin, deleteOrdersBulkAdmin } from '@/lib/db/orders';
import { isRequestAdminAuthenticated, verifyAdminCsrfAndOrigin, recordAuditLog } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizePublicError, sanitizeAdminError } from '@/lib/api-errors';

export async function GET(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const result = await getOrdersPaginated({ page, limit, status, search });
    return NextResponse.json({
      success: true,
      orders: result.orders,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to retrieve orders.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`order:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many order requests. Please try again shortly.' },
        { status: 429 }
      );
    }

    const body = await req.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    if (!body.customerName || !String(body.customerName).trim()) {
      return NextResponse.json({ success: false, error: 'Customer name is required' }, { status: 400 });
    }

    const customerName = String(body.customerName).trim();
    if (customerName.length > 100) {
      return NextResponse.json({ success: false, error: 'Customer name must be 100 characters or less' }, { status: 400 });
    }

    const cleanPhone = String(body.customerPhone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      return NextResponse.json({ success: false, error: 'Valid 10-digit mobile number is required' }, { status: 400 });
    }

    if (body.customerEmail && String(body.customerEmail).trim().length > 254) {
      return NextResponse.json({ success: false, error: 'Email address must be 254 characters or less' }, { status: 400 });
    }

    if (!body.customerHouseShop || !String(body.customerHouseShop).trim()) {
      return NextResponse.json({ success: false, error: 'House/Shop number is required' }, { status: 400 });
    }

    const houseShop = String(body.customerHouseShop).trim();
    if (houseShop.length > 100) {
      return NextResponse.json({ success: false, error: 'House/Shop number must be 100 characters or less' }, { status: 400 });
    }

    if (!body.customerAddress || !String(body.customerAddress).trim()) {
      return NextResponse.json({ success: false, error: 'Complete street address is required' }, { status: 400 });
    }

    const customerAddress = String(body.customerAddress).trim();
    if (customerAddress.length > 500) {
      return NextResponse.json({ success: false, error: 'Address must be 500 characters or less' }, { status: 400 });
    }

    if (!body.customerCity || !String(body.customerCity).trim()) {
      return NextResponse.json({ success: false, error: 'City is required' }, { status: 400 });
    }

    if (!body.customerState || !String(body.customerState).trim()) {
      return NextResponse.json({ success: false, error: 'State is required' }, { status: 400 });
    }

    const cleanPincode = String(body.customerPincode || '').replace(/\D/g, '');
    if (!cleanPincode || cleanPincode.length !== 6) {
      return NextResponse.json({ success: false, error: 'Valid 6-digit Indian PIN code is required' }, { status: 400 });
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ success: false, error: 'Order must contain at least one item' }, { status: 400 });
    }

    if (body.items.length > 50) {
      return NextResponse.json({ success: false, error: 'Orders cannot contain more than 50 distinct items' }, { status: 400 });
    }

    const notes = body.notes ? String(body.notes).trim() : '';
    if (notes.length > 2000) {
      return NextResponse.json({ success: false, error: 'Order notes cannot exceed 2000 characters' }, { status: 400 });
    }

    const couponCode = body.couponCode ? String(body.couponCode).trim() : undefined;
    if (couponCode && couponCode.length > 50) {
      return NextResponse.json({ success: false, error: 'Coupon code cannot exceed 50 characters' }, { status: 400 });
    }

    // Sanitize input to enforce server authority and public order security
    const safeOrderData = {
      ...body,
      customerName,
      customerPhone: cleanPhone,
      customerWhatsapp: body.customerWhatsapp ? String(body.customerWhatsapp).trim() : cleanPhone,
      customerEmail: body.customerEmail ? String(body.customerEmail).trim() : '',
      customerHouseShop: houseShop,
      customerAddress,
      customerArea: body.customerArea ? String(body.customerArea).trim() : '',
      customerLandmark: body.customerLandmark ? String(body.customerLandmark).trim() : '',
      customerCity: String(body.customerCity).trim(),
      customerState: String(body.customerState).trim(),
      customerPincode: cleanPincode,
      notes,
      couponCode,
      idempotencyKey: body.idempotencyKey || body.idempotency_key || req.headers.get('x-idempotency-key') || undefined,
      orderStatus: 'NEW' as const,
      paymentStatus: 'UNPAID' as const,
      paymentMethod: 'WhatsApp' as const,
    };

    // Remove client-controlled fields that must be server-authoritative
    delete (safeOrderData as any).id;
    delete (safeOrderData as any).orderNumber;
    delete (safeOrderData as any).subtotal;
    delete (safeOrderData as any).shippingFee;
    delete (safeOrderData as any).discountAmount;
    delete (safeOrderData as any).totalAmount;

    const order = await saveOrder(safeOrderData);
    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return sanitizePublicError(error, 'Failed to process order. Please check your details and try again.');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Admin authentication required' }, { status: 401 });
    }

    if (!verifyAdminCsrfAndOrigin(req)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: CSRF / Origin mismatch' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    let body: any = null;
    try {
      body = await req.json();
    } catch {
      // Body might be empty for query string parameter requests
    }

    if (body?.ids && Array.isArray(body.ids) && body.ids.length > 0) {
      const deletedCount = await deleteOrdersBulkAdmin(body.ids);
      await recordAuditLog({
        action: 'ORDER_BULK_DELETE',
        resource: `${deletedCount} orders`,
        details: { ids: body.ids },
      });
      return NextResponse.json({ success: true, deletedCount });
    }

    if (id) {
      await deleteOrderAdmin(id);
      await recordAuditLog({
        action: 'ORDER_DELETE',
        resource: id,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Order ID or array of IDs required' }, { status: 400 });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to delete order(s).');
  }
}
