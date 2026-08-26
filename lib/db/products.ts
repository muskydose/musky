import { Product } from '@/lib/types';
import { getSupabase, getSupabaseAdmin } from '@/lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeImageUrl, sanitizeImageUrls } from '@/lib/utils';
import { getCategories } from './categories';
import { syncProductKeywordUniverse, onProductDeletedLifecycle } from '@/lib/growth/product-keyword-engine';

function requireSupabaseAdmin(): SupabaseClient {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error(
      'Supabase Database connection is unavailable. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are properly configured.'
    );
  }
  return client;
}

export function mapRowToProduct(row: any): Product {
  let ingredientsArr: string[] = [];
  if (Array.isArray(row.ingredients)) {
    ingredientsArr = row.ingredients;
  } else if (typeof row.ingredients === 'string' && row.ingredients) {
    try {
      ingredientsArr = JSON.parse(row.ingredients);
    } catch {
      ingredientsArr = row.ingredients.split(',').map((s: string) => s.trim());
    }
  }

  let benefitsArr: string[] = [];
  if (Array.isArray(row.benefits)) {
    benefitsArr = row.benefits;
  } else if (typeof row.benefits === 'string' && row.benefits) {
    try {
      benefitsArr = JSON.parse(row.benefits);
    } catch {
      benefitsArr = row.benefits.split(',').map((s: string) => s.trim());
    }
  }

  let imagesArr: string[] = [];
  if (Array.isArray(row.images)) {
    imagesArr = row.images;
  } else if (typeof row.images === 'string' && row.images) {
    try {
      imagesArr = JSON.parse(row.images);
    } catch {
      imagesArr = [row.images];
    }
  }

  const stockStatusVal =
    row.stock_status ||
    row.stockStatus ||
    (row.in_stock === false ? 'out_of_stock' : 'in_stock');

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    categoryId: row.category_id || row.categoryId || 'cat-1',
    categoryName: row.category_name || row.categoryName || '',
    shortDescription: row.short_description || row.shortDescription || '',
    fullDescription: row.full_description || row.fullDescription || '',
    price: Number(row.price) || 0,
    compareAtPrice:
      row.compare_at_price !== null && row.compare_at_price !== undefined
        ? Number(row.compare_at_price)
        : row.compareAtPrice !== null && row.compareAtPrice !== undefined
        ? Number(row.compareAtPrice)
        : undefined,
    quantityOrWeight: row.quantity || row.quantityOrWeight || '250g',
    sku: row.sku || '',
    images: sanitizeImageUrls(
      imagesArr.length > 0 ? imagesArr : ['/images/fallback.svg']
    ),
    ingredients: ingredientsArr,
    benefits: benefitsArr,
    usageInstructions: row.usage || row.usageInstructions || '',
    stockStatus: stockStatusVal,
    isFeatured: row.is_featured ?? row.isFeatured ?? false,
    isActive: row.is_active ?? row.isActive ?? true,
    sortOrder: row.sort_order ?? row.sortOrder ?? 1,
    productType: row.product_type || row.productType || undefined,
    seoTitle: row.seo_title || row.seoTitle || undefined,
    seoDescription: row.seo_description || row.seoDescription || undefined,
    seoKeywords: Array.isArray(row.seo_keywords) ? row.seo_keywords : (typeof row.seo_keywords === 'string' ? row.seo_keywords.split(',').map((s: string) => s.trim()) : undefined),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export function mapProductToRow(p: Product) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category_id: p.categoryId,
    category_name: p.categoryName,
    short_description: p.shortDescription,
    full_description: p.fullDescription,
    price: p.price,
    compare_at_price: p.compareAtPrice ?? null,
    quantity: p.quantityOrWeight,
    sku: p.sku,
    images: p.images || [],
    ingredients: p.ingredients || [],
    benefits: p.benefits || [],
    usage: p.usageInstructions,
    in_stock: p.stockStatus === 'in_stock',
    stock_status: p.stockStatus,
    is_featured: p.isFeatured ?? false,
    is_active: p.isActive ?? true,
    sort_order: p.sortOrder ?? 1,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

export async function getAllProductsAdmin(): Promise<Product[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('[getAllProductsAdmin] Supabase client is unavailable.');
    return [];
  }

  const { data, error } = await supabase.from('products').select('*');

  if (error) {
    console.error(`[getAllProductsAdmin] Database query error: ${error.message}`);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map(mapRowToProduct).sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function getActiveProductsForStore(): Promise<Product[]> {
  const supabase = getSupabaseAdmin() || getSupabase();
  if (!supabase) {
    console.error('[getActiveProductsForStore] Supabase client is unavailable.');
    return [];
  }

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error(`[getActiveProductsForStore] Database query error: ${error.message}`);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map(mapRowToProduct);
}

export async function getProducts(): Promise<Product[]> {
  return await getActiveProductsForStore();
}

export async function getProductsByCategory(categoryIdOrSlug: string): Promise<Product[]> {
  if (!categoryIdOrSlug) return [];
  const clean = categoryIdOrSlug.trim();
  const supabase = getSupabaseAdmin() || getSupabase();

  if (!supabase) {
    const all = await getActiveProductsForStore();
    return all.filter(
      (p) =>
        p.categoryId === clean ||
        p.categoryName?.toLowerCase() === clean.toLowerCase()
    );
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .or(`category_id.eq.${clean},category_name.ilike.${clean}`)
      .order('sort_order', { ascending: true });

    if (error) {
      console.warn(`[getProductsByCategory] Query warning: ${error.message}`);
      const all = await getActiveProductsForStore();
      return all.filter(
        (p) =>
          p.categoryId === clean ||
          p.categoryName?.toLowerCase() === clean.toLowerCase()
      );
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(mapRowToProduct);
  } catch (err: any) {
    console.error('[getProductsByCategory] Error:', err?.message);
    const all = await getActiveProductsForStore();
    return all.filter((p) => p.categoryId === clean);
  }
}

export async function getRelatedProducts(
  productId: string,
  categoryId?: string,
  limit: number = 4
): Promise<Product[]> {
  const supabase = getSupabaseAdmin() || getSupabase();
  if (!supabase) {
    const all = await getActiveProductsForStore();
    const sameCat = all.filter((p) => p.id !== productId && (!categoryId || p.categoryId === categoryId));
    if (sameCat.length >= limit) return sameCat.slice(0, limit);
    const others = all.filter((p) => p.id !== productId && p.categoryId !== categoryId);
    return [...sameCat, ...others].slice(0, limit);
  }

  try {
    let query = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .neq('id', productId)
      .order('sort_order', { ascending: true })
      .limit(limit);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      // Fallback to any active products excluding current
      const { data: fallbackData } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .neq('id', productId)
        .order('sort_order', { ascending: true })
        .limit(limit);
      return (fallbackData || []).map(mapRowToProduct);
    }

    const mapped = data.map(mapRowToProduct);
    if (mapped.length < limit) {
      const remainingLimit = limit - mapped.length;
      const existingIds = [productId, ...mapped.map((p) => p.id)];
      const { data: moreData } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .not('id', 'in', `(${existingIds.join(',')})`)
        .order('sort_order', { ascending: true })
        .limit(remainingLimit);
      if (moreData && moreData.length > 0) {
        mapped.push(...moreData.map(mapRowToProduct));
      }
    }

    return mapped;
  } catch (err: any) {
    console.error('[getRelatedProducts] Error:', err?.message);
    const all = await getActiveProductsForStore();
    return all.filter((p) => p.id !== productId).slice(0, limit);
  }
}

export async function getFeaturedProducts(limit: number = 8): Promise<Product[]> {
  const supabase = getSupabaseAdmin() || getSupabase();
  if (!supabase) {
    const all = await getActiveProductsForStore();
    const featured = all.filter((p) => p.isFeatured || p.isBestSeller);
    return (featured.length > 0 ? featured : all).slice(0, limit);
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('sort_order', { ascending: true })
      .limit(limit);

    if (error || !data || data.length === 0) {
      const { data: fallbackData } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(limit);
      return (fallbackData || []).map(mapRowToProduct);
    }

    return data.map(mapRowToProduct);
  } catch (err: any) {
    console.error('[getFeaturedProducts] Error:', err?.message);
    const all = await getActiveProductsForStore();
    return all.slice(0, limit);
  }
}

export async function getProductByIdOrSlug(
  identifier: string,
  includeInactive: boolean = false
): Promise<Product | null> {
  if (!identifier) return null;
  const decoded = decodeURIComponent(identifier).trim();
  const lower = decoded.toLowerCase();

  const supabase = getSupabaseAdmin() || getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`id.eq.${decoded},slug.eq.${lower}`)
        .maybeSingle();

      if (!error && data) {
        const product = mapRowToProduct(data);
        if (!includeInactive && product.isActive === false) {
          return null;
        }
        return product;
      }
    } catch (err: any) {
      console.error('[getProductByIdOrSlug] DB query error:', err?.message);
    }
  }

  // Fallback to searching active store list if direct query yields nothing
  const all = await getActiveProductsForStore();
  const found = all.find(
    (p) =>
      p.id === decoded ||
      p.slug === lower ||
      (p.id && p.id.trim().toLowerCase() === lower) ||
      (p.slug && p.slug.trim().toLowerCase() === lower)
  );

  if (found) {
    if (!includeInactive && found.isActive === false) {
      return null;
    }
    return found;
  }

  return null;
}

export async function saveProduct(product: Partial<Product>): Promise<Product> {
  const supabase = requireSupabaseAdmin();
  const isNew = !product.id;
  const now = new Date().toISOString();

  const priceNum = Number(product.price);
  if (isNaN(priceNum) || priceNum < 0) {
    throw new Error('Product price must be a valid non-negative number');
  }

  const productId = product.id || `prod-${Date.now()}`;
  const allProducts = await getAllProductsAdmin();

  // Validate duplicate SKU if provided
  if (product.sku && product.sku.trim()) {
    const trimmedSku = product.sku.trim();
    const existingSku = allProducts.find(
      (p) => p.sku && p.sku.toLowerCase() === trimmedSku.toLowerCase() && p.id !== productId
    );
    if (existingSku) {
      throw new Error(`SKU "${trimmedSku}" is already assigned to another product ("${existingSku.name}")`);
    }
  }

  // Generate unique slug
  let rawSlug =
    product.slug ||
    (product.name ? product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `prod-${Date.now()}`);
  let cleanSlug = rawSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (!cleanSlug) cleanSlug = `prod-${Date.now()}`;

  const existingSlug = allProducts.find((p) => p.slug === cleanSlug && p.id !== productId);
  if (existingSlug) {
    if (isNew) {
      cleanSlug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;
    } else {
      throw new Error(`Slug "${cleanSlug}" is already in use by product "${existingSlug.name}"`);
    }
  }

  // Category matching
  const categories = await getCategories();
  let categoryId = product.categoryId || 'cat-1';
  let categoryName = product.categoryName;
  const matchedCat = categories.find(
    (c) => c.id === categoryId || c.name.toLowerCase() === categoryId.toLowerCase()
  );
  if (matchedCat) {
    categoryId = matchedCat.id;
    categoryName = matchedCat.name;
  } else if (categories.length > 0) {
    categoryId = categories[0].id;
    categoryName = categories[0].name;
  } else {
    categoryName = categoryName || 'Henna Care';
  }

  // Publishing Gate: validate mandatory fields before allowing active status
  let requestedIsActive = product.isActive ?? true;
  const validImages = (product.images || []).filter((img) => img && img.trim() !== '');
  const isNameValid = Boolean(
    product.name && product.name.trim() !== '' && product.name.trim() !== 'New Product'
  );
  const isPriceValid = priceNum > 0;
  const isDescValid = Boolean(product.shortDescription && product.shortDescription.trim() !== '');
  const isCategoryValid = Boolean(categoryId && categoryName);
  const isImagesValid = validImages.length >= 1;

  if (requestedIsActive) {
    if (!isNameValid || !isPriceValid || !isDescValid || !isCategoryValid || !isImagesValid) {
      if (product.isActive === true) {
        const missing = [];
        if (!isNameValid) missing.push('Product Name');
        if (!isPriceValid) missing.push('Price (> ₹0)');
        if (!isDescValid) missing.push('Short Description');
        if (!isCategoryValid) missing.push('Category');
        if (!isImagesValid) missing.push('At least 1 valid product image');
        throw new Error(`Cannot publish incomplete product. Missing: ${missing.join(', ')}`);
      }
      requestedIsActive = false;
    }
  }

  const fullProduct: Product = {
    id: productId,
    name: product.name ? product.name.trim() : 'New Product',
    slug: cleanSlug,
    categoryId: categoryId,
    categoryName: categoryName,
    shortDescription: product.shortDescription ? product.shortDescription.trim() : '',
    fullDescription: product.fullDescription ? product.fullDescription.trim() : '',
    price: priceNum,
    compareAtPrice:
      product.compareAtPrice !== undefined &&
      product.compareAtPrice !== null &&
      !isNaN(Number(product.compareAtPrice))
        ? Number(product.compareAtPrice)
        : undefined,
    quantityOrWeight: product.quantityOrWeight ? product.quantityOrWeight.trim() : '250g',
    sku: product.sku ? product.sku.trim() : `MD-${Date.now().toString().slice(-4)}`,
    images:
      product.images && product.images.length > 0
        ? product.images
        : ['/images/fallback.svg'],
    ingredients: product.ingredients || [],
    benefits: product.benefits || [],
    usageInstructions: product.usageInstructions ? product.usageInstructions.trim() : '',
    stockStatus: product.stockStatus || 'in_stock',
    isFeatured: product.isFeatured ?? false,
    isActive: requestedIsActive,
    sortOrder: product.sortOrder ?? 1,
    productType: product.productType || undefined,
    createdAt: product.createdAt || now,
    updatedAt: now,
  };

  const row = mapProductToRow(fullProduct);
  const { data, error } = await supabase.from('products').upsert([row]).select('*');

  if (error) {
    throw new Error(`Database error saving product to Supabase: ${error.message}`);
  }

  const savedProduct = data && data.length > 0 ? mapRowToProduct(data[0]) : fullProduct;

  // Background Autonomous Keyword Universe synchronization (fast, non-blocking)
  syncProductKeywordUniverse(savedProduct).catch((kwErr) => {
    console.warn(`[saveProduct] Background keyword universe sync notice for ${savedProduct.id}:`, kwErr?.message);
  });

  return savedProduct;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const supabase = requireSupabaseAdmin();
  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) {
    throw new Error(`Database error deleting product: ${error.message}`);
  }

  // Cleanup keyword target associations
  onProductDeletedLifecycle(id).catch((kwErr) => {
    console.warn(`[deleteProduct] Background keyword cleanup notice for ${id}:`, kwErr?.message);
  });

  return true;
}

export async function bulkUpdateProducts(
  ids: string[],
  updates: Partial<Product>
): Promise<{ updatedCount: number; failedIds: string[] }> {
  if (!ids || ids.length === 0) return { updatedCount: 0, failedIds: [] };
  const supabase = requireSupabaseAdmin();
  const now = new Date().toISOString();

  const dbUpdates: any = { updated_at: now };
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  if (updates.isFeatured !== undefined) dbUpdates.is_featured = updates.isFeatured;
  if (updates.stockStatus !== undefined) {
    dbUpdates.stock_status = updates.stockStatus;
    dbUpdates.in_stock = updates.stockStatus === 'in_stock';
  }
  if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
  if (updates.categoryName !== undefined) dbUpdates.category_name = updates.categoryName;

  const { data, error } = await supabase.from('products').update(dbUpdates).in('id', ids).select('id');

  if (error) {
    throw new Error(`Database error bulk updating products: ${error.message}`);
  }

  return { updatedCount: data ? data.length : ids.length, failedIds: [] };
}

export async function bulkDeleteProducts(
  ids: string[]
): Promise<{ deletedCount: number; failedIds: string[] }> {
  if (!ids || ids.length === 0) return { deletedCount: 0, failedIds: [] };
  const supabase = requireSupabaseAdmin();

  const { data, error } = await supabase.from('products').delete().in('id', ids).select('id');

  if (error) {
    throw new Error(`Database error bulk deleting products: ${error.message}`);
  }

  return { deletedCount: data ? data.length : ids.length, failedIds: [] };
}
