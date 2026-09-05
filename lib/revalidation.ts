export interface CatalogRevalidationOptions {
  slugs?: (string | undefined | null)[];
  categorySlugsOrIds?: (string | undefined | null)[];
}

/**
 * Single centralized catalog revalidation helper.
 * Revalidates all public storefront product surfaces using Next.js caching APIs.
 * Safely handles environments where Next.js cache context is not mounted (scripts/tests).
 */
export async function revalidateCatalogSurfaces(options?: CatalogRevalidationOptions): Promise<void> {
  try {
    const { revalidatePath, revalidateTag } = await import('next/cache');

    // 1. Global public product listing surfaces
    try {
      revalidatePath('/', 'page');
      revalidatePath('/products', 'page');
      revalidatePath('/categories', 'page');
      revalidatePath('/wholesale', 'page');
      revalidatePath('/sitemap.xml');
    } catch (e: any) {
      console.warn('[revalidateCatalogSurfaces] Path revalidation warning:', e?.message);
    }

    // 2. Feeds and public API endpoints
    try {
      revalidatePath('/api/feeds/google-merchant.xml');
      revalidatePath('/api/products');
    } catch (e: any) {
      console.warn('[revalidateCatalogSurfaces] Feed revalidation warning:', e?.message);
    }

    // 3. Affected PDP slugs
    if (options?.slugs && Array.isArray(options.slugs)) {
      for (const slug of options.slugs) {
        if (slug && typeof slug === 'string' && slug.trim()) {
          try {
            revalidatePath(`/products/${slug.trim()}`, 'page');
          } catch {}
        }
      }
    }

    // 4. Affected Category pages
    if (options?.categorySlugsOrIds && Array.isArray(options.categorySlugsOrIds)) {
      for (const cat of options.categorySlugsOrIds) {
        if (cat && typeof cat === 'string' && cat.trim()) {
          try {
            revalidatePath(`/categories/${cat.trim()}`, 'page');
          } catch {}
        }
      }
    }

    // 5. Invalidate Next.js cache tags if used
    try {
      revalidateTag('products');
      revalidateTag('site_settings');
      revalidateTag('business_settings');
    } catch {}
  } catch (err: any) {
    // Graceful fallback when outside Next.js request context (e.g. standalone scripts or tests)
    console.warn('[revalidateCatalogSurfaces] Standalone execution notice:', err?.message);
  }
}
