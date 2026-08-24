import { ProductGuide } from '@/lib/types';
import { INITIAL_PRODUCT_GUIDES } from '@/lib/data-store';
import { getSupabaseAdmin } from '@/lib/supabase';
import { sanitizeSlug } from './custom-pages';

let cachedGuidesMemory: ProductGuide[] | null = null;

export async function getGuides(): Promise<ProductGuide[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    if (!cachedGuidesMemory) {
      cachedGuidesMemory = [...INITIAL_PRODUCT_GUIDES];
    }
    return cachedGuidesMemory;
  }

  try {
    const { data, error } = await supabase.from('product_guides').select('*').order('sort_order', { ascending: true });
    if (error || !data || data.length === 0) {
      if (!cachedGuidesMemory) {
        cachedGuidesMemory = [...INITIAL_PRODUCT_GUIDES];
      }
      return cachedGuidesMemory;
    }

    const mapped: ProductGuide[] = data.map((row: any) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      coverImage: row.cover_image || row.coverImage || '/images/fallback.svg',
      shortIntro: row.short_intro || row.shortIntro || '',
      productId: row.product_id || row.productId || undefined,
      productIds: Array.isArray(row.product_ids) ? row.product_ids : Array.isArray(row.productIds) ? row.productIds : undefined,
      overview: row.overview || '',
      whatIsThis: row.what_is_this || row.whatIsThis || '',
      keyBenefits: Array.isArray(row.key_benefits) ? row.key_benefits : Array.isArray(row.keyBenefits) ? row.keyBenefits : [],
      ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
      whoShouldUse: row.who_should_use || row.whoShouldUse || '',
      whoShouldAvoid: row.who_should_avoid || row.whoShouldAvoid || '',
      howToUse: row.how_to_use || row.howToUse || '',
      quantityPreparation: row.quantity_preparation || row.quantityPreparation || '',
      storageInstructions: row.storage_instructions || row.storageInstructions || '',
      importantNotes: row.important_notes || row.importantNotes || '',
      faqs: Array.isArray(row.faqs) ? row.faqs : [],
      relatedProductIds: Array.isArray(row.related_product_ids) ? row.related_product_ids : Array.isArray(row.relatedProductIds) ? row.relatedProductIds : [],
      seoTitle: row.seo_title || row.seoTitle || '',
      seoDescription: row.seo_description || row.seoDescription || '',
      published: row.published ?? true,
      isFeatured: row.is_featured ?? row.isFeatured ?? false,
      sortOrder: row.sort_order ?? row.sortOrder ?? 1,
      createdAt: row.created_at || row.createdAt || new Date().toISOString(),
      updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
    }));

    cachedGuidesMemory = mapped;
    return mapped;
  } catch (err: any) {
    console.warn('getGuides fallback to memory/initial:', err?.message);
    if (!cachedGuidesMemory) {
      cachedGuidesMemory = [...INITIAL_PRODUCT_GUIDES];
    }
    return cachedGuidesMemory;
  }
}

export async function getPublishedGuides(): Promise<ProductGuide[]> {
  const guides = await getGuides();
  return guides.filter((g) => g.published !== false);
}

export async function getGuideBySlug(slug: string): Promise<ProductGuide | null> {
  const guides = await getGuides();
  const clean = sanitizeSlug(slug);
  return guides.find((g) => sanitizeSlug(g.slug) === clean) || null;
}

export async function getGuideByProductId(productId: string): Promise<ProductGuide | null> {
  const guides = await getPublishedGuides();
  return (
    guides.find(
      (g) => g.productId === productId || (Array.isArray(g.productIds) && g.productIds.includes(productId))
    ) || null
  );
}

export async function getFeaturedGuides(): Promise<ProductGuide[]> {
  const guides = await getPublishedGuides();
  const featured = guides.filter((g) => g.isFeatured);
  return featured.length > 0 ? featured : guides.slice(0, 3);
}

export async function saveGuide(guide: Partial<ProductGuide> & { title: string }): Promise<ProductGuide> {
  const cleanSlug = sanitizeSlug(guide.slug || guide.title);
  if (!cleanSlug) {
    throw new Error('A valid title or slug is required for the guide.');
  }

  const guideId = guide.id || `guide-${Date.now()}`;
  const pubStatus = guide.published ?? guide.isPublished ?? true;
  const updatedGuide: ProductGuide = {
    ...guide,
    id: guideId,
    title: guide.title.trim(),
    slug: cleanSlug,
    shortIntro: guide.shortIntro || '',
    category: guide.category || 'Henna Application',
    published: pubStatus,
    isPublished: pubStatus,
    isFeatured: guide.isFeatured ?? false,
    sortOrder: guide.sortOrder ?? 1,
    updatedAt: new Date().toISOString(),
    createdAt: guide.createdAt || new Date().toISOString(),
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const row = {
      id: updatedGuide.id,
      title: updatedGuide.title,
      slug: updatedGuide.slug,
      cover_image: updatedGuide.coverImage || null,
      short_intro: updatedGuide.shortIntro || '',
      product_id: updatedGuide.productId || null,
      product_ids: updatedGuide.productIds || [],
      overview: updatedGuide.overview || '',
      what_is_this: updatedGuide.whatIsThis || '',
      key_benefits: updatedGuide.keyBenefits || [],
      ingredients: updatedGuide.ingredients || [],
      who_should_use: updatedGuide.whoShouldUse || '',
      who_should_avoid: updatedGuide.whoShouldAvoid || '',
      how_to_use: updatedGuide.howToUse || '',
      quantity_preparation: updatedGuide.quantityPreparation || '',
      storage_instructions: updatedGuide.storageInstructions || '',
      important_notes: updatedGuide.importantNotes || '',
      faqs: updatedGuide.faqs || [],
      related_product_ids: updatedGuide.relatedProductIds || [],
      seo_title: updatedGuide.seoTitle || '',
      seo_description: updatedGuide.seoDescription || '',
      published: updatedGuide.published ?? true,
      is_featured: updatedGuide.isFeatured ?? false,
      sort_order: updatedGuide.sortOrder ?? 1,
      created_at: updatedGuide.createdAt,
      updated_at: updatedGuide.updatedAt,
    };

    const { error } = await supabase.from('product_guides').upsert([row]);
    if (error) {
      console.error('Database error saving product guide:', error.message);
      throw new Error(`Failed to save guide to database: ${error.message}`);
    }
  }

  const guides = await getGuides();
  const existingIdx = guides.findIndex((g) => g.id === guide.id);
  if (existingIdx >= 0) {
    guides[existingIdx] = updatedGuide;
  } else {
    guides.push(updatedGuide);
  }

  cachedGuidesMemory = guides;
  return updatedGuide;
}

export async function deleteGuide(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from('product_guides').delete().eq('id', id);
    if (error) {
      console.error('Database error deleting product guide:', error.message);
      throw new Error(`Failed to delete guide from database: ${error.message}`);
    }
  }

  const guides = await getGuides();
  const filtered = guides.filter((g) => g.id !== id);
  cachedGuidesMemory = filtered;

  return true;
}

export async function getGuideById(id: string): Promise<ProductGuide | null> {
  const guides = await getGuides();
  return guides.find((g) => g.id === id) || null;
}

export const getProductGuides = getGuides;
export const getProductGuideById = getGuideById;
export const saveProductGuide = saveGuide;
export const deleteProductGuide = deleteGuide;
