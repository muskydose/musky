import { NextRequest, NextResponse } from 'next/server';
import { bulkUpdateProducts, bulkDeleteProducts } from '@/lib/db/products';
import { revalidateCatalogSurfaces } from '@/lib/revalidation';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { recordAuditLog } from '@/lib/auth';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';

export async function POST(req: NextRequest) {
  const requestId = getRequestId();
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const body = await req.json();
    const { action, productIds, categoryId, categoryName } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No product IDs provided for bulk action', requestId },
        { status: 400 }
      );
    }

    if (productIds.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Bulk action exceeds maximum limit of 100 items per request', requestId },
        { status: 400 }
      );
    }

    if (action === 'activate') {
      const result = await bulkUpdateProducts(productIds, { isActive: true });
      await recordAuditLog({ action: 'PRODUCTS_BULK_ACTIVATE', resource: `${result.updatedCount} products` });
      await revalidateCatalogSurfaces();
      return NextResponse.json({
        success: true,
        message: `${result.updatedCount} product(s) activated successfully`,
        updatedCount: result.updatedCount,
      });
    }

    if (action === 'deactivate') {
      const result = await bulkUpdateProducts(productIds, { isActive: false });
      await recordAuditLog({ action: 'PRODUCTS_BULK_DEACTIVATE', resource: `${result.updatedCount} products` });
      await revalidateCatalogSurfaces();
      return NextResponse.json({
        success: true,
        message: `${result.updatedCount} product(s) deactivated successfully`,
        updatedCount: result.updatedCount,
      });
    }

    if (action === 'feature') {
      const result = await bulkUpdateProducts(productIds, { isFeatured: true });
      await recordAuditLog({ action: 'PRODUCTS_BULK_FEATURE', resource: `${result.updatedCount} products` });
      await revalidateCatalogSurfaces();
      return NextResponse.json({
        success: true,
        message: `${result.updatedCount} product(s) marked as featured`,
        updatedCount: result.updatedCount,
      });
    }

    if (action === 'unfeature') {
      const result = await bulkUpdateProducts(productIds, { isFeatured: false });
      await recordAuditLog({ action: 'PRODUCTS_BULK_UNFEATURE', resource: `${result.updatedCount} products` });
      await revalidateCatalogSurfaces();
      return NextResponse.json({
        success: true,
        message: `${result.updatedCount} product(s) unfeatured`,
        updatedCount: result.updatedCount,
      });
    }

    if (action === 'change_category') {
      if (!categoryId) {
        return NextResponse.json(
          { success: false, error: 'Category ID is required for bulk category change', requestId },
          { status: 400 }
        );
      }
      const result = await bulkUpdateProducts(productIds, {
        categoryId,
        categoryName: categoryName || 'Updated Category',
      });
      await recordAuditLog({ action: 'PRODUCTS_BULK_CATEGORY_CHANGE', resource: `${result.updatedCount} products` });
      await revalidateCatalogSurfaces({ categorySlugsOrIds: [categoryId] });
      return NextResponse.json({
        success: true,
        message: `Category updated for ${result.updatedCount} product(s)`,
        updatedCount: result.updatedCount,
      });
    }

    if (action === 'delete') {
      const result = await bulkDeleteProducts(productIds);
      await recordAuditLog({ action: 'PRODUCTS_BULK_DELETE', resource: `${result.deletedCount} products` });
      await revalidateCatalogSurfaces();
      return NextResponse.json({
        success: true,
        message: `${result.deletedCount} product(s) deleted permanently`,
        deletedCount: result.deletedCount,
      });
    }

    return NextResponse.json(
      { success: false, error: `Invalid bulk action: ${action}`, requestId },
      { status: 400 }
    );
  } catch (error: any) {
    return sanitizeAdminError(error, 'Server error during bulk operation.', 500, requestId);
  }
}
