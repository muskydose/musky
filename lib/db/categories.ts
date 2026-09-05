import { cache } from 'react';
import { Category } from '@/lib/types';
import { getSupabase, getSupabaseAdmin } from '@/lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeImageUrl } from '@/lib/utils';

function requireSupabaseAdmin(): SupabaseClient {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error(
      'Supabase Database connection is unavailable. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are properly configured.'
    );
  }
  return client;
}

export function mapRowToCategory(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    image: sanitizeImageUrl(row.image),
    sortOrder: row.sort_order ?? row.sortOrder ?? 0,
    isActive: row.is_active ?? row.isActive ?? true,
  };
}

export function mapCategoryToRow(c: Category) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    image: c.image,
    sort_order: c.sortOrder ?? 0,
    is_active: c.isActive ?? true,
  };
}

export const getCategories = cache(async (): Promise<Category[]> => {
  const admin = getSupabaseAdmin();
  if (admin) {
    const { data, error } = await admin.from('categories').select('*');
    if (!error && data && data.length > 0) {
      return data
        .map(mapRowToCategory)
        .filter((c) => c.isActive !== false)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
  }

  const anon = getSupabase();
  if (anon) {
    const { data, error } = await anon.from('categories').select('*');
    if (!error && data && data.length > 0) {
      return data
        .map(mapRowToCategory)
        .filter((c) => c.isActive !== false)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
  }

  return [];
});

export async function getAllCategoriesAdmin(): Promise<Category[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase.from('categories').select('*');
  if (error) {
    console.error(`[getAllCategoriesAdmin] Database error: ${error.message}`);
    return [];
  }
  if (!data || data.length === 0) return [];

  return data.map(mapRowToCategory).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getCategoryByIdOrSlug(identifier: string): Promise<Category | null> {
  if (!identifier) return null;
  let decoded = identifier.trim();
  try {
    decoded = decodeURIComponent(identifier).trim();
  } catch {
    decoded = identifier.trim();
  }
  const lower = decoded.toLowerCase();

  const supabase = getSupabaseAdmin() || getSupabase();
  if (supabase) {
    try {
      let row: any = null;
      const isLikelyId = decoded.startsWith('cat-');

      if (isLikelyId) {
        const { data: byId, error: idErr } = await supabase
          .from('categories')
          .select('*')
          .eq('id', decoded)
          .maybeSingle();

        if (idErr) {
          console.error('[getCategoryByIdOrSlug] DB ID query error:', idErr.message);
        } else if (byId) {
          row = byId;
        }

        if (!row) {
          const { data: bySlug, error: slugErr } = await supabase
            .from('categories')
            .select('*')
            .eq('slug', lower)
            .maybeSingle();

          if (slugErr) {
            console.error('[getCategoryByIdOrSlug] DB slug query error:', slugErr.message);
          } else if (bySlug) {
            row = bySlug;
          }
        }
      } else {
        const { data: bySlug, error: slugErr } = await supabase
          .from('categories')
          .select('*')
          .eq('slug', lower)
          .maybeSingle();

        if (slugErr) {
          console.error('[getCategoryByIdOrSlug] DB slug query error:', slugErr.message);
        } else if (bySlug) {
          row = bySlug;
        }

        if (!row) {
          const { data: byId, error: idErr } = await supabase
            .from('categories')
            .select('*')
            .eq('id', decoded)
            .maybeSingle();

          if (idErr) {
            console.error('[getCategoryByIdOrSlug] DB ID query error:', idErr.message);
          } else if (byId) {
            row = byId;
          }
        }
      }

      if (row) {
        const cat = mapRowToCategory(row);
        if (cat.isActive === false) return null;
        return cat;
      }
    } catch (err: any) {
      console.error('[getCategoryByIdOrSlug] DB query error:', err?.message);
    }

    if (process.env.NODE_ENV === 'production') {
      return null;
    }
  }

  const all = await getCategories();
  return (
    all.find(
      (c) =>
        c.id === decoded ||
        c.slug === lower ||
        (c.id && c.id.trim().toLowerCase() === lower) ||
        (c.slug && c.slug.trim().toLowerCase() === lower)
    ) || null
  );
}

export async function saveCategory(category: Partial<Category>): Promise<Category> {
  const supabase = requireSupabaseAdmin();
  const isNew = !category.id;
  const categoryId = category.id || `cat-${Date.now()}`;

  let rawSlug =
    category.slug || (category.name ? category.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `cat-${Date.now()}`);
  let cleanSlug = rawSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!cleanSlug) cleanSlug = `cat-${Date.now()}`;

  const allCategories = await getCategories();
  const existingWithSlug = allCategories.find((c) => c.slug === cleanSlug && c.id !== categoryId);
  if (existingWithSlug) {
    if (isNew) {
      cleanSlug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;
    } else {
      throw new Error(`Category slug "${cleanSlug}" is already in use by "${existingWithSlug.name}"`);
    }
  }

  const fullCategory: Category = {
    id: categoryId,
    name: category.name ? category.name.trim() : 'New Category',
    slug: cleanSlug,
    description: category.description ? category.description.trim() : '',
    image: category.image || '/images/fallback.svg',
    sortOrder:
      category.sortOrder !== undefined && category.sortOrder !== null && !isNaN(Number(category.sortOrder))
        ? Number(category.sortOrder)
        : allCategories.length + 1,
    isActive: category.isActive ?? true,
  };

  const row = mapCategoryToRow(fullCategory);
  const { data, error } = await supabase.from('categories').upsert([row]).select('*');

  if (error) {
    throw new Error(`Database error saving category: ${error.message}`);
  }

  if (data && data.length > 0) {
    return mapRowToCategory(data[0]);
  }

  return fullCategory;
}

export async function deleteCategory(id: string): Promise<boolean> {
  const supabase = requireSupabaseAdmin();
  const { data: assignedProducts } = await supabase
    .from('products')
    .select('id, name, category_id')
    .eq('category_id', id);

  if (assignedProducts && assignedProducts.length > 0) {
    throw new Error(
      `Cannot delete category: ${assignedProducts.length} product(s) are assigned to it (e.g. "${assignedProducts[0].name}"). Reassign or remove those products first, or mark this category as inactive.`
    );
  }

  const { error } = await supabase.from('categories').delete().eq('id', id);

  if (error) {
    throw new Error(`Database error deleting category: ${error.message}`);
  }

  return true;
}
