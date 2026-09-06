export interface CatalogRevalidationOptions {
  slugs?: (string | undefined | null)[];
  categorySlugsOrIds?: (string | undefined | null)[];
  guideSlugs?: (string | undefined | null)[];
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

    // 4b. Affected Guide pages
    if (options?.guideSlugs && Array.isArray(options.guideSlugs)) {
      for (const guide of options.guideSlugs) {
        if (guide && typeof guide === 'string' && guide.trim()) {
          try {
            revalidatePath(`/guides/${guide.trim()}`, 'page');
          } catch {}
        }
      }
    }

    // 5. Invalidate Next.js cache tags if used
    try {
      revalidateTag('products');
      revalidateTag('guides');
      revalidateTag('site_settings');
      revalidateTag('business_settings');
    } catch {}
  } catch (err: any) {
    // Graceful fallback when outside Next.js request context (e.g. standalone scripts or tests)
    console.warn('[revalidateCatalogSurfaces] Standalone execution notice:', err?.message);
  }
}

/**
 * Universal entity revalidation helper: Revalidates paths and cache tags
 * for any governed platform entity type.
 */
export async function revalidateEntitySurfaces(
  entityType: string,
  slugs?: (string | undefined | null)[]
): Promise<void> {
  try {
    const { revalidatePath, revalidateTag } = await import('next/cache');

    try {
      revalidatePath('/sitemap.xml');
    } catch {}

    const cleanSlugs = (slugs || []).filter((s): s is string => Boolean(s && s.trim()));

    switch (entityType) {
      case 'PRODUCT':
        await revalidateCatalogSurfaces({ slugs: cleanSlugs });
        break;

      case 'CATEGORY':
        await revalidateCatalogSurfaces({ categorySlugsOrIds: cleanSlugs });
        break;

      case 'GUIDE':
        try {
          revalidatePath('/guides', 'page');
          for (const s of cleanSlugs) {
            revalidatePath(`/guides/${s}`, 'page');
          }
          revalidateTag('guides');
        } catch {}
        break;

      case 'PAGE':
        try {
          for (const s of cleanSlugs) {
            revalidatePath(`/${s}`, 'page');
          }
          revalidateTag('pages');
          revalidateTag('site_settings');
        } catch {}
        break;

      case 'BUSINESS_DOCUMENT':
        try {
          revalidatePath('/documents', 'page');
          revalidatePath('/about', 'page');
          revalidatePath('/factory', 'page');
          revalidateTag('documents');
          revalidateTag('site_settings');
        } catch {}
        break;

      case 'SETTING':
        try {
          revalidatePath('/', 'page');
          revalidateTag('site_settings');
          revalidateTag('business_settings');
        } catch {}
        break;

      case 'BULK_PRICING':
        try {
          revalidatePath('/wholesale', 'page');
          revalidatePath('/products', 'page');
          revalidatePath('/cart', 'page');
          revalidatePath('/checkout', 'page');
          revalidatePath('/api/bulk-pricing');
          revalidatePath('/api/products');
          for (const s of cleanSlugs) {
            if (s && s !== 'global') {
              revalidatePath(`/products/${s}`, 'page');
            }
          }
          revalidateTag('products');
          revalidateTag('site_settings');
        } catch {}
        break;

      default:
        try {
          revalidatePath('/', 'page');
        } catch {}
        break;
    }
  } catch (err: any) {
    console.warn('[revalidateEntitySurfaces] Standalone execution notice:', err?.message);
  }
}
