import { getSupabaseAdmin, getSupabase } from '@/lib/supabase';

export interface ProductSlugRedirect {
  id: string;
  productId: string;
  oldSlug: string;
  currentSlug: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory fallback cache for high-speed edge lookups and local/test environments
const inMemoryProductRedirectStore = new Map<
  string,
  { productId: string; currentSlug: string; updatedAt: string }
>();

// Seed default redirects if any
const SEED_PRODUCT_REDIRECTS: Record<string, string> = {};

function normalizeSlug(slug: string): string {
  if (!slug) return '';
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Records a product slug change.
 * - Flattens previous redirect chains (e.g. A -> B, then B -> C becomes A -> C, B -> C).
 * - Prevents and breaks redirect loops (e.g. A -> B -> A).
 * - Idempotent: Old slug equals current slug is ignored.
 * - Strict exact matching only; no fuzzy matching.
 */
export async function recordProductSlugChange(
  productId: string,
  rawOldSlug: string,
  rawCurrentSlug: string
): Promise<void> {
  const oldSlug = normalizeSlug(rawOldSlug);
  const currentSlug = normalizeSlug(rawCurrentSlug);

  if (!oldSlug || !currentSlug || oldSlug === currentSlug) {
    return;
  }

  const now = new Date().toISOString();

  // 1. Update in-memory store
  // Remove any stale mapping where oldSlug was pointing to something else
  inMemoryProductRedirectStore.set(oldSlug, {
    productId,
    currentSlug,
    updatedAt: now,
  });

  // If currentSlug was previously an oldSlug pointing somewhere, delete it to prevent loops (A -> B -> A)
  inMemoryProductRedirectStore.delete(currentSlug);

  // Chain flattening in memory: Any existing redirect pointing to oldSlug now points to currentSlug
  for (const [key, value] of inMemoryProductRedirectStore.entries()) {
    if (value.currentSlug === oldSlug && key !== currentSlug) {
      inMemoryProductRedirectStore.set(key, {
        ...value,
        currentSlug,
        updatedAt: now,
      });
    }
  }

  // 2. Persist to Supabase if available
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      // Upsert current redirect
      const { error: upsertErr } = await supabase.from('product_slug_redirects').upsert([
        {
          id: `redir-${productId}-${oldSlug}`,
          product_id: productId,
          old_slug: oldSlug,
          current_slug: currentSlug,
          updated_at: now,
        },
      ]);

      if (upsertErr) {
        // Table not migrated yet or query warning; in-memory store provides seamless coverage
        return;
      }

      // Remove any redirect where current_slug was registered as an old_slug (loop prevention)
      await supabase.from('product_slug_redirects').delete().eq('old_slug', currentSlug);

      // Flatten DB chains: update all rows that pointed to old_slug to now point to current_slug
      await supabase
        .from('product_slug_redirects')
        .update({ current_slug: currentSlug, updated_at: now })
        .eq('current_slug', oldSlug);
    } catch (err: any) {
      // Non-fatal if table not migrated yet; in-memory store provides seamless coverage
      console.warn('[recordProductSlugChange] Notice: persisted in-memory fallback:', err?.message);
    }
  }
}

/**
 * Resolves an old/historical product slug to its current authoritative canonical slug.
 * Returns null if no redirect exists or if slug is already the target.
 * Strictly exact match only — NEVER fuzzy, NEVER prefix.
 * Includes loop detection (visited set + max hop limit of 5).
 */
export async function resolveProductSlugRedirect(rawSlug: string): Promise<string | null> {
  const slug = normalizeSlug(rawSlug);
  if (!slug) return null;

  // Check in-memory store first
  let target =
    inMemoryProductRedirectStore.get(slug)?.currentSlug || SEED_PRODUCT_REDIRECTS[slug];

  // If not in memory, query Supabase
  if (!target) {
    const supabase = getSupabaseAdmin() || getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('product_slug_redirects')
          .select('product_id, current_slug')
          .eq('old_slug', slug)
          .maybeSingle();

        if (!error && data?.current_slug) {
          target = data.current_slug;
          // Hydrate in-memory cache
          inMemoryProductRedirectStore.set(slug, {
            productId: data.product_id,
            currentSlug: data.current_slug,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch (err) {
        // Fall back gracefully
      }
    }
  }

  if (!target || target === slug) return null;

  // Hop resolution with strict loop guard
  let finalTarget = target;
  let hops = 0;
  const visited = new Set<string>([slug]);

  while (hops < 5) {
    visited.add(finalTarget);
    const nextHop = inMemoryProductRedirectStore.get(finalTarget)?.currentSlug;
    if (nextHop && nextHop !== finalTarget && !visited.has(nextHop)) {
      finalTarget = nextHop;
      hops++;
    } else {
      break;
    }
  }

  return finalTarget !== slug ? finalTarget : null;
}

/**
 * Lists all known product slug redirects (admin/diagnostic use).
 */
export async function getAllProductSlugRedirects(): Promise<ProductSlugRedirect[]> {
  const supabase = getSupabaseAdmin() || getSupabase();
  if (!supabase) {
    return Array.from(inMemoryProductRedirectStore.entries()).map(([oldSlug, val]) => ({
      id: `mem-${val.productId}-${oldSlug}`,
      productId: val.productId,
      oldSlug,
      currentSlug: val.currentSlug,
      createdAt: val.updatedAt,
      updatedAt: val.updatedAt,
    }));
  }

  try {
    const { data, error } = await supabase
      .from('product_slug_redirects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((row) => ({
      id: row.id,
      productId: row.product_id,
      oldSlug: row.old_slug,
      currentSlug: row.current_slug,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch {
    return Array.from(inMemoryProductRedirectStore.entries()).map(([oldSlug, val]) => ({
      id: `mem-${val.productId}-${oldSlug}`,
      productId: val.productId,
      oldSlug,
      currentSlug: val.currentSlug,
      createdAt: val.updatedAt,
      updatedAt: val.updatedAt,
    }));
  }
}
