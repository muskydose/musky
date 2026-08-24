import { NextRequest, NextResponse } from 'next/server';
import {
  getWholesaleEnquiries,
  getWholesaleEnquiriesPaginated,
  saveWholesaleEnquiry,
  updateWholesaleEnquiryStatus,
  deleteWholesaleEnquiry,
} from '@/lib/db/wholesale';
import { requireAdminAuthAndCsrf, isRequestAdminAuthenticated, recordAuditLog } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';

export async function GET(req: NextRequest) {
  const requestId = getRequestId();
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authentication required', requestId },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    const result = await getWholesaleEnquiriesPaginated({ page, limit, status, search });
    return createSuccessResponse(
      {
        enquiries: result.enquiries,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
      undefined,
      requestId
    );
  } catch (err: any) {
    return sanitizeAdminError(err, 'Failed to fetch wholesale enquiries.', 500, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId();
  try {
    const ip = getClientIp(req.headers);

    // Rate limiting: max 5 submissions per 15 minutes per IP
    const rl = checkRateLimit(`wholesale:${ip}`, 5, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many enquiry submissions. Please try again in 15 minutes.', requestId },
        { status: 429 }
      );
    }

    const body = await req.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid request payload.', requestId }, { status: 400 });
    }

    const customerName = String(body.customerName || body.contactName || '').trim();
    if (!customerName || customerName.length < 2 || customerName.length > 100) {
      return NextResponse.json({ success: false, error: 'Customer name is required (between 2 and 100 characters).', requestId }, { status: 400 });
    }

    const cleanPhone = String(body.phone || body.whatsapp || '').replace(/\D/g, '');
    if (!cleanPhone || (cleanPhone.length !== 10 && cleanPhone.length !== 12)) {
      return NextResponse.json({ success: false, error: 'Valid 10-digit mobile / WhatsApp number is required.', requestId }, { status: 400 });
    }

    const email = body.email ? String(body.email).trim() : '';
    if (email && (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return NextResponse.json({ success: false, error: 'Valid email address is required.', requestId }, { status: 400 });
    }

    const productsRequired = String(body.productsRequired || body.requirements || '').trim();
    if (!productsRequired || productsRequired.length < 2 || productsRequired.length > 1000) {
      return NextResponse.json({ success: false, error: 'Products required description is mandatory (up to 1000 characters).', requestId }, { status: 400 });
    }

    const enquiryType = String(body.enquiryType || 'wholesale').trim();
    const isBulkOrWholesale = ['wholesale', 'bulk_order', 'bulk_inquiry'].includes(enquiryType);

    const approxQuantity = String(body.approxQuantity || body.quantity || '').trim();
    if (isBulkOrWholesale && !approxQuantity) {
      return NextResponse.json({ success: false, error: 'Approximate quantity is required for wholesale inquiries.', requestId }, { status: 400 });
    }

    const businessName = String(body.businessName || body.firmName || '').trim();
    if (businessName.length > 150) {
      return NextResponse.json({ success: false, error: 'Business name must not exceed 150 characters.', requestId }, { status: 400 });
    }

    const notes = body.notes ? String(body.notes).trim() : '';
    if (notes.length > 2000) {
      return NextResponse.json({ success: false, error: 'Notes must not exceed 2000 characters.', requestId }, { status: 400 });
    }

    // Force server authority for status, timestamp, and IDs
    const safeEnquiryData = {
      customerName,
      phone: cleanPhone,
      whatsapp: body.whatsapp ? String(body.whatsapp).replace(/\D/g, '') : cleanPhone,
      email,
      businessName,
      city: body.city ? String(body.city).trim().substring(0, 100) : '',
      state: body.state ? String(body.state).trim().substring(0, 100) : '',
      productsRequired,
      approxQuantity: approxQuantity.substring(0, 100),
      notes,
      enquiryType,
      status: 'NEW' as const,
    };

    const saved = await saveWholesaleEnquiry(safeEnquiryData);
    return createSuccessResponse({ enquiry: saved }, undefined, requestId);
  } catch (err: any) {
    console.error('[API /api/wholesale] Error saving wholesale enquiry:', err);
    return NextResponse.json({ success: false, error: 'Failed to submit wholesale enquiry.', requestId }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const requestId = getRequestId();
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Enquiry ID and status are required.', requestId }, { status: 400 });
    }

    const updated = await updateWholesaleEnquiryStatus(id, status);
    await recordAuditLog({
      action: 'WHOLESALE_ENQUIRY_UPDATE',
      resource: id,
      details: { status },
    });

    return createSuccessResponse({ enquiry: updated }, undefined, requestId);
  } catch (err: any) {
    return sanitizeAdminError(err, 'Failed to update wholesale enquiry.', 400, requestId);
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = getRequestId();
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Enquiry ID is required.', requestId }, { status: 400 });
    }

    await deleteWholesaleEnquiry(id);
    await recordAuditLog({
      action: 'WHOLESALE_ENQUIRY_DELETE',
      resource: id,
    });

    return createSuccessResponse({ message: 'Wholesale enquiry deleted successfully.' }, undefined, requestId);
  } catch (err: any) {
    return sanitizeAdminError(err, 'Failed to delete wholesale enquiry.', 400, requestId);
  }
}
