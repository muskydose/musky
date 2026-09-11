import { NextRequest, NextResponse } from 'next/server';
import { getOrdersPaginated, saveOrder, deleteOrderAdmin, deleteOrdersBulkAdmin } from '@/lib/db/orders';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { UniversalGovernanceCore, CommerceGovernance } from '@/lib/governance';
import { revalidateEntitySurfaces } from '@/lib/revalidation';
import { recordAuditLog } from '@/lib/auth';
import { checkRateLimitAsync, getClientIp } from '@/lib/rate-limit';
import { sanitizePublicError, sanitizeAdminError } from '@/lib/api-errors';
import { normalizeOrderInput } from '@/lib/orders/order-contract';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
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
    const rl = await checkRateLimitAsync(`order:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many order requests. Please try again shortly.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.max(1, Math.ceil(rl.resetMs / 1000))),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': String(rl.remaining),
          },
        }
      );
    }

    const body = await req.json();

    // 1. Central Canonical Order Input Normalization (Single Boundary Adapter)
    const normalization = normalizeOrderInput(body);
    if (!normalization.isValid || !normalization.canonical) {
      return NextResponse.json(
        { success: false, error: normalization.errors[0] || 'Invalid order data.', errors: normalization.errors },
        { status: 400 }
      );
    }

    const safeOrderData = normalization.canonical;

    // 2. Universal Platform Governance Validation
    const govCheck = UniversalGovernanceCore.validateEntity('ORDER', safeOrderData, true);
    if (!govCheck.isValid) {
      return NextResponse.json(
        { success: false, error: `Governance validation failed: ${govCheck.errors.join('; ')}` },
        { status: 400 }
      );
    }

    // 3. Commerce Pricing & Totals Invariant Check
    if (safeOrderData.subtotal !== undefined && safeOrderData.totalAmount !== undefined) {
      const claimedDiscount = safeOrderData.discountAmount || 0;
      const claimedShipping = safeOrderData.shippingFee || 0;
      const totalsVal = CommerceGovernance.validateOrderTotals(
        safeOrderData.items,
        Number(safeOrderData.subtotal),
        Number(claimedDiscount),
        Number(claimedShipping),
        Number(safeOrderData.totalAmount)
      );
      if (!totalsVal.isValid) {
        return NextResponse.json(
          { success: false, error: `Commerce invariant violation: ${totalsVal.errors.join('; ')}` },
          { status: 400 }
        );
      }
    }

    delete (safeOrderData as any).id;
    delete (safeOrderData as any).orderNumber;
    delete (safeOrderData as any).subtotal;
    delete (safeOrderData as any).shippingFee;
    delete (safeOrderData as any).discountAmount;
    delete (safeOrderData as any).totalAmount;

    const order = await saveOrder(safeOrderData);

    // 3. Centralized Order Surface Revalidation
    await revalidateEntitySurfaces('ORDER').catch((revErr: any) => {
      console.warn('[API Orders] Revalidation notice:', revErr?.message);
    });

    return NextResponse.json(
      { success: true, order },
      {
        headers: {
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': String(rl.remaining),
        },
      }
    );
  } catch (error: any) {
    return sanitizePublicError(error, 'Failed to process order. Please check your details and try again.');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
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
