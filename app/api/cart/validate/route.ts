import { NextRequest, NextResponse } from 'next/server';
import { getAllProductsAdmin } from '@/lib/db/products';
import { getEffectiveVariantPrice } from '@/lib/product-variants';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawItems = body?.items;

    if (!Array.isArray(rawItems)) {
      return NextResponse.json(
        { success: false, error: 'Items array is required for cart validation' },
        { status: 400 }
      );
    }

    // Guard against abusive cart sizes
    const items = rawItems.slice(0, 50);

    const allProducts = await getAllProductsAdmin();
    const productMap = new Map(allProducts.map((p) => [p.id, p]));

    const validItems: any[] = [];
    const removedItems: Array<{
      productId: string;
      variantId?: string;
      name: string;
      reason: 'DELETED' | 'INACTIVE' | 'OUT_OF_STOCK' | 'VARIANT_UNAVAILABLE';
    }> = [];

    for (const item of items) {
      const productId = item.productId || item.id;
      if (!productId) continue;

      const product = productMap.get(productId);

      // 1. Deleted or missing product
      if (!product) {
        removedItems.push({
          productId,
          variantId: item.variantId,
          name: item.name || 'Discontinued Botanical Item',
          reason: 'DELETED',
        });
        continue;
      }

      // 2. Inactive product
      if (product.isActive === false) {
        removedItems.push({
          productId: product.id,
          variantId: item.variantId,
          name: product.name,
          reason: 'INACTIVE',
        });
        continue;
      }

      // 3. Out of stock product
      if (product.stockStatus === 'out_of_stock') {
        removedItems.push({
          productId: product.id,
          variantId: item.variantId,
          name: product.name,
          reason: 'OUT_OF_STOCK',
        });
        continue;
      }

      // 4. Variant verification
      let matchedVariant = undefined;
      if (item.variantId && Array.isArray(product.variants) && product.variants.length > 0) {
        matchedVariant = product.variants.find((v) => v.id === item.variantId);
        if (!matchedVariant) {
          removedItems.push({
            productId: product.id,
            variantId: item.variantId,
            name: `${product.name} (Variant unavailable)`,
            reason: 'VARIANT_UNAVAILABLE',
          });
          continue;
        }

        if (matchedVariant.isActive === false) {
          removedItems.push({
            productId: product.id,
            variantId: matchedVariant.id,
            name: `${product.name} (${matchedVariant.weight || matchedVariant.sku})`,
            reason: 'INACTIVE',
          });
          continue;
        }

        if (matchedVariant.stockStatus === 'out_of_stock') {
          removedItems.push({
            productId: product.id,
            variantId: matchedVariant.id,
            name: `${product.name} (${matchedVariant.weight || matchedVariant.sku})`,
            reason: 'OUT_OF_STOCK',
          });
          continue;
        }
      }

      const authoritativePrice = getEffectiveVariantPrice(product, matchedVariant);
      validItems.push({
        id: item.id || `${product.id}::${matchedVariant?.id || 'default'}`,
        productId: product.id,
        variantId: matchedVariant?.id,
        name: product.name,
        authoritativePrice,
        quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
        product,
        selectedVariant: matchedVariant,
      });
    }

    return NextResponse.json({
      success: true,
      valid: removedItems.length === 0,
      validItems,
      removedItems,
    });
  } catch (err: any) {
    console.error('[Cart Validate API] Error validating cart items:', err?.message);
    return NextResponse.json(
      { success: false, error: 'Internal server error validating cart' },
      { status: 500 }
    );
  }
}

