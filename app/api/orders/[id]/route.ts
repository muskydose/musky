import { NextRequest, NextResponse } from 'next/server';
import { updateOrderStatus } from '@/lib/db/orders';
import { requireAdminAuthAndCsrf, recordAuditLog } from '@/lib/auth';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId();
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { id } = await params;
    const body = await req.json();
    const { orderStatus, paymentStatus } = body;

    const updated = await updateOrderStatus(id, orderStatus, paymentStatus);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Order not found', requestId }, { status: 404 });
    }

    await recordAuditLog({
      action: 'ORDER_STATUS_UPDATE',
      resource: id,
      details: { orderStatus, paymentStatus },
    });

    return createSuccessResponse({ order: updated }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to update order status.', 500, requestId);
  }
}
