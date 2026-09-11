import { getSupabaseAdmin, getSupabase } from '@/lib/supabase';

export interface CategorySlugRedirect {
  id: string;
  categoryId: string;
  oldSlug: string;
  currentSlug: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory fallback cache for high-speed edge lookups and local/test environments
const inMemoryRedirectStore = new Map<string, { categoryId: string; currentSlug: string; updatedAt: string }>();

// Seed default redirects if any
const SEED_REDIRECTS: Record<string, string> = {};

function normalizeSlug(slug: string): string {
  if (!slug) return '';
  return slug
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Records a category slug change.
 * - Flattens previous redirect chains (e.g. A -> B, then B -> C becomes A -> C, B -> C).
 * - Prevents and breaks redirect loops (e.g. A -> B -> A).
 * - Idempotent: Old slug equals current slug is ignored.
 */
export async function recordCategorySlugChange(
  categoryId: string,
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
  inMemoryRedirectStore.set(oldSlug, {
    categoryId,
    currentSlug,
    updatedAt: now,
  });

  // If currentSlug was previously an oldSlug pointing somewhere, delete it to prevent loops (A -> B -> A)
  inMemoryRedirectStore.delete(currentSlug);

  // Chain flattening in memory: Any existing redirect pointing to oldSlug now points to currentSlug
  for (const [key, value] of inMemoryRedirectStore.entries()) {
    if (value.currentSlug === oldSlug && key !== currentSlug) {
      inMemoryRedirectStore.set(key, {
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
      await supabase.from('category_slug_redirects').upsert([
        {
          id: `redir-${categoryId}-${oldSlug}`,
          category_id: categoryId,
          old_slug: oldSlug,
          current_slug: currentSlug,
          updated_at: now,
        },
      ]);

      // Remove any redirect where current_slug was registered as an old_slug (loop prevention)
      await supabase.from('category_slug_redirects').delete().eq('old_slug', currentSlug);

      // Flatten DB chains: update all rows that pointed to old_slug to now point to current_slug
      await supabase
        .from('category_slug_redirects')
        .update({ current_slug: currentSlug, updated_at: now })
        .eq('current_slug', oldSlug);
    } catch (err: any) {
      // Non-fatal if table not migrated yet; in-memory store provides seamless coverage
      console.warn('[recordCategorySlugChange] Notice: persisted in-memory fallback:', err?.message);
    }
  }
}

/**
 * Resolves an old/historical category slug to its current authoritative canonical slug.
 * Returns null if no redirect exists or if slug is already the target.
 * Includes loop detection (visited set + max hop limit of 5).
 */
export async function resolveCategorySlugRedirect(rawSlug: string): Promise<string | null> {
  const slug = normalizeSlug(rawSlug);
  if (!slug) return null;

  // Check in-memory store first
  let target = inMemoryRedirectStore.get(slug)?.currentSlug || SEED_REDIRECTS[slug];

  // If not in memory, query Supabase
  if (!target) {
    const supabase = getSupabaseAdmin() || getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('category_slug_redirects')
          .select('category_id, current_slug')
          .eq('old_slug', slug)
          .maybeSingle();

        if (!error && data?.current_slug) {
          target = normalizeSlug(data.current_slug);
          // Cache in memory for subsequent requests
          inMemoryRedirectStore.set(slug, {
            categoryId: data.category_id,
            currentSlug: target,
            updatedAt: new Date().toISOString(),
          });
        }
      } catch {
        // Table not present or query failed
      }
    }
  }

  if (!target || target === slug) {
    return null;
  }

  // Follow redirect chain with cycle detection
  const visited = new Set<string>([slug]);
  let current = target;
  let hops = 0;
  const MAX_HOPS = 5;

  while (hops < MAX_HOPS) {
    hops++;
    if (visited.has(current)) {
      // Loop detected! Break loop and return the most advanced target
      console.warn(`[resolveCategorySlugRedirect] Redirect loop detected for ${slug} -> ${current}. Halting.`);
      break;
    }
    visited.add(current);

    const nextTarget = inMemoryRedirectStore.get(current)?.currentSlug;
    if (nextTarget && nextTarget !== current && !visited.has(nextTarget)) {
      current = nextTarget;
    } else {
      break;
    }
  }

  return current !== slug ? current : null;
}

/**
 * Returns a complete map of all registered category redirects.
 */
export async function getCategoryRedirectMap(): Promise<Record<string, string>> {
  const map: Record<string, string> = { ...SEED_REDIRECTS };

  for (const [oldSlug, entry] of inMemoryRedirectStore.entries()) {
    map[oldSlug] = entry.currentSlug;
  }

  const supabase = getSupabaseAdmin() || getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('category_slug_redirects').select('old_slug, current_slug');
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          if (row.old_slug && row.current_slug) {
            map[normalizeSlug(row.old_slug)] = normalizeSlug(row.current_slug);
          }
        }
      }
    } catch {}
  }

  return map;
}

/**
 * Helper to clear in-memory redirects (used in unit/integration tests).
 */
export function _resetInMemoryCategoryRedirects(): void {
  inMemoryRedirectStore.clear();
}

