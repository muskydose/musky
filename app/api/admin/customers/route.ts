import { NextRequest, NextResponse } from 'next/server';
import { getCustomersPaginated, deleteCustomerByPhone } from '@/lib/db/orders';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import { recordAuditLog } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const search = searchParams.get('search') || undefined;

    const result = await getCustomersPaginated({ page, limit, search });
    return NextResponse.json({
      success: true,
      customers: result.customers,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to retrieve customers.');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { searchParams } = new URL(req.url);
    const phone = searchParams.get('phone');
    if (!phone) {
      return NextResponse.json({ success: false, error: 'Phone parameter required' }, { status: 400 });
    }
    await deleteCustomerByPhone(phone);
    await recordAuditLog({
      action: 'CUSTOMER_DELETE',
      resource: phone,
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to delete customer.');
  }
}
