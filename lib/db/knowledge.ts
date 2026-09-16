import {
  CANONICAL_ENTITY_REGISTRY,
  CanonicalEntityRecord,
  CanonicalEntityStatus,
  EntityConfidence,
  EntityClass,
  normalizeEntityTerm,
} from '@/lib/growth/entity-registry';
import {
  ENTITY_KEY_TO_SLUG,
  HENNA_ALIAS_SLUGS,
} from '@/lib/growth/search-intent-router';
import { ProductFamily, ProductScope, VerifiedAttributeSlug } from '@/lib/growth/universal-product-contract';
import { GuideFamily } from '@/lib/growth/guide-opportunity-engine';
import { getSupabase, getSupabaseAdmin } from '@/lib/supabase';
import { UniversalGovernanceCore } from '@/lib/governance/core';
import {
  attachCanonicalMediaToKnowledge,
  attachCanonicalMediaToKnowledgeList,
  getPrimaryMedia,
} from '@/lib/db/media';

// ============================================================================
// 1. KNOWLEDGE ENTITY TYPES & CONTRACTS
// ============================================================================

export type KnowledgeDatabaseStatus = 'draft' | 'published' | 'needs_review' | 'archived';

export interface KnowledgeEntity extends CanonicalEntityRecord {
  id: string;
  slug: string;
  redirectSlugs: string[];
  dbStatus: KnowledgeDatabaseStatus;
  published: boolean;
  sortOrder: number;
  seoTitle?: string;
  seoDescription?: string;
  ogImageUrl?: string;
  canonicalPrimaryUrl?: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeLookupResult {
  entity: KnowledgeEntity | null;
  isRedirect: boolean;
  redirectCanonicalSlug?: string;
}

// ============================================================================
// 2. NORMALIZATION & ROW MAPPING (DB ROW -> CanonicalEntityRecord)
// ============================================================================

/**
 * Maps a raw Supabase database row into a fully-typed KnowledgeEntity.
 * Compatible with CanonicalEntityRecord for all downstream consumers.
 */
export function mapRowToKnowledgeEntity(row: any): KnowledgeEntity {
  const entityKey = String(row.entity_key || row.entityKey || '').trim();
  const canonicalName = String(row.canonical_name || row.canonicalName || '').trim();
  const scientificName = row.scientific_name || row.scientificName || undefined;
  const botanicalFamily = row.botanical_family || row.botanicalFamily || undefined;
  const productFamily = (row.product_family || row.productFamily || 'BOTANICAL_SINGLE') as ProductFamily;
  const entityClass = (row.entity_class || row.entityClass || 'BOTANICAL_SINGLE') as EntityClass;

  const rawAliases = Array.isArray(row.aliases) ? row.aliases : [];
  const aliases = rawAliases.map((a: any) => String(a).trim()).filter(Boolean);

  const rawNormAliases = Array.isArray(row.normalized_aliases)
    ? row.normalized_aliases
    : Array.isArray(row.normalizedAliases)
    ? row.normalizedAliases
    : [];
  const normalizedAliases = rawNormAliases.length > 0
    ? rawNormAliases.map((a: any) => normalizeEntityTerm(String(a)))
    : aliases.map((a: string) => normalizeEntityTerm(a));

  const rawRedirects = Array.isArray(row.redirect_slugs)
    ? row.redirect_slugs
    : Array.isArray(row.redirectSlugs)
    ? row.redirectSlugs
    : [];
  const redirectSlugs = rawRedirects.map((r: any) => String(r).toLowerCase().trim()).filter(Boolean);

  const supportedScopes = (
    Array.isArray(row.supported_scopes)
      ? row.supported_scopes
      : Array.isArray(row.supportedScopes)
      ? row.supportedScopes
      : ['HAIR']
  ) as ProductScope[];

  const safeUseCases = Array.isArray(row.safe_use_cases)
    ? row.safe_use_cases
    : Array.isArray(row.safeUseCases)
    ? row.safeUseCases
    : [];

  const compatibleAttributes = (
    Array.isArray(row.compatible_attributes)
      ? row.compatible_attributes
      : Array.isArray(row.compatibleAttributes)
      ? row.compatibleAttributes
      : []
  ) as VerifiedAttributeSlug[];

  const relatedEntities = Array.isArray(row.related_entity_keys)
    ? row.related_entity_keys
    : Array.isArray(row.relatedEntities)
    ? row.relatedEntities
    : [];

  const guideFamilies = (
    Array.isArray(row.guide_families)
      ? row.guide_families
      : Array.isArray(row.guideFamilies)
      ? row.guideFamilies
      : []
  ) as GuideFamily[];

  const description = String(row.description || '').trim();
  const published = Boolean(row.published ?? (row.status === 'published'));
  const dbStatus = (row.status || (published ? 'published' : 'draft')) as KnowledgeDatabaseStatus;

  // Determine CanonicalEntityStatus and EntityConfidence
  const isUnknown = entityKey === 'UNKNOWN';
  const status: CanonicalEntityStatus = isUnknown
    ? 'UNKNOWN'
    : dbStatus === 'needs_review'
    ? 'NEEDS_REVIEW'
    : 'KNOWN';
  const confidence: EntityConfidence = isUnknown ? 'NEEDS_REVIEW' : 'HIGH';

  return {
    id: String(row.id || `ent-${row.slug || entityKey.toLowerCase()}`),
    entityKey,
    slug: String(row.slug || '').toLowerCase().trim(),
    canonicalName,
    scientificName,
    botanicalFamily,
    productFamily,
    entityClass,
    aliases,
    normalizedAliases,
    redirectSlugs,
    supportedScopes,
    safeUseCases,
    compatibleAttributes,
    searchRepresentations: {
      canonical: canonicalName,
      naturalAliases: aliases.slice(0, 4),
      scientific: scientificName,
    },
    guideFamilies,
    relatedEntities,
    status,
    confidence,
    description,
    seoTitle: row.seo_title || row.seoTitle || undefined,
    seoDescription: row.seo_description || row.seoDescription || undefined,
    ogImageUrl: row.og_image_url || row.ogImageUrl || undefined,
    robotsIndex: row.robots_index ?? row.robotsIndex ?? true,
    robotsFollow: row.robots_follow ?? row.robotsFollow ?? true,
    dbStatus,
    published,
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 100),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

/**
 * Maps a KnowledgeEntity into a database row format for public.knowledge_entities.
 */
export function mapKnowledgeEntityToRow(entity: KnowledgeEntity): any {
  return {
    id: entity.id,
    entity_key: entity.entityKey,
    slug: entity.slug,
    canonical_name: entity.canonicalName,
    scientific_name: entity.scientificName || null,
    botanical_family: entity.botanicalFamily || null,
    product_family: entity.productFamily || 'BOTANICAL_SINGLE',
    entity_class: entity.entityClass || 'BOTANICAL_SINGLE',
    aliases: Array.isArray(entity.aliases) ? entity.aliases : [],
    normalized_aliases: Array.isArray(entity.normalizedAliases) ? entity.normalizedAliases : [],
    redirect_slugs: Array.isArray(entity.redirectSlugs) ? entity.redirectSlugs : [],
    supported_scopes: Array.isArray(entity.supportedScopes) ? entity.supportedScopes : ['HAIR'],
    safe_use_cases: Array.isArray(entity.safeUseCases) ? entity.safeUseCases : [],
    compatible_attributes: Array.isArray(entity.compatibleAttributes) ? entity.compatibleAttributes : [],
    related_entity_keys: Array.isArray(entity.relatedEntities) ? entity.relatedEntities : [],
    guide_families: Array.isArray(entity.guideFamilies) ? entity.guideFamilies : [],
    description: entity.description || '',
    seo_title: entity.seoTitle || null,
    seo_description: entity.seoDescription || null,
    og_image_url: entity.ogImageUrl || null,
    robots_index: entity.robotsIndex ?? true,
    robots_follow: entity.robotsFollow ?? true,
    status: entity.dbStatus || 'draft',
    published: entity.published ?? false,
    sort_order: entity.sortOrder ?? 100,
    created_at: entity.createdAt || new Date().toISOString(),
    updated_at: entity.updatedAt || new Date().toISOString(),
  };
}

// ============================================================================
// 3. IN-MEMORY REGISTRY FALLBACK CONVERTER & STORE
// ============================================================================

/**
 * Converts the static in-memory CANONICAL_ENTITY_REGISTRY into KnowledgeEntity[]
 * when the database table is pending execution or unavailable.
 */
function buildFallbackRegistryEntities(): KnowledgeEntity[] {
  return Object.entries(CANONICAL_ENTITY_REGISTRY).map(([key, record], index) => {
    const isUnknown = key === 'UNKNOWN';
    const slug = isUnknown ? 'unknown' : (ENTITY_KEY_TO_SLUG[key] || key.toLowerCase());
    const redirectSlugs = key === 'HENNA_MEHNDI' ? Array.from(HENNA_ALIAS_SLUGS) : [];
    const published = !isUnknown && record.status === 'KNOWN';
    const dbStatus: KnowledgeDatabaseStatus = isUnknown ? 'draft' : 'published';

    return {
      ...record,
      id: `ent-${slug}`,
      slug,
      redirectSlugs,
      dbStatus,
      published,
      sortOrder: isUnknown ? 999 : index + 1,
      seoTitle: `${record.canonicalName}${record.scientificName ? ` (${record.scientificName})` : ''} | Botanical Care & Sourcing — Musky Dose`,
      seoDescription: `${record.description} Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.`,
      robotsIndex: !isUnknown && record.status === 'KNOWN',
      robotsFollow: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
  });
}

let fallbackEntitiesStore: KnowledgeEntity[] | null = null;

function getFallbackStore(): KnowledgeEntity[] {
  if (!fallbackEntitiesStore) {
    fallbackEntitiesStore = buildFallbackRegistryEntities();
  }
  return fallbackEntitiesStore;
}

function updateFallbackStore(entity: KnowledgeEntity): void {
  const store = getFallbackStore();
  const idx = store.findIndex((e) => e.id === entity.id || e.entityKey === entity.entityKey);
  if (idx >= 0) {
    store[idx] = entity;
  } else {
    store.push(entity);
  }
}

// ============================================================================
// 4. SERVER-SIDE CACHED DATA ACCESS LAYER (DAL)
// ============================================================================

interface CacheContainer {
  entities: KnowledgeEntity[];
  source: 'database' | 'registry';
  loadedAt: number;
}

let memoryCache: CacheContainer | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds TTL

/**
 * Resets the DAL memory cache (useful for clean testing or administrative refresh).
 */
export function resetKnowledgeCache(options?: { resetFallbackStore?: boolean }): void {
  memoryCache = null;
  if (options?.resetFallbackStore) {
    fallbackEntitiesStore = null;
  }
}

/**
 * Resolves all knowledge entities with DB-first precedence and safe in-memory fallback.
 * Rule:
 * - DB available & has records -> DB data is authoritative.
 * - DB unavailable (pending DDL, offline) -> CANONICAL_ENTITY_REGISTRY fallback.
 * - Zero conflicting records merged.
 */
export async function getAllKnowledgeEntitiesRaw(): Promise<{
  entities: KnowledgeEntity[];
  source: 'database' | 'registry';
}> {
  const now = Date.now();
  if (memoryCache && now - memoryCache.loadedAt < CACHE_TTL_MS) {
    return { entities: memoryCache.entities, source: memoryCache.source };
  }

  const supabase = getSupabaseAdmin() || getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('knowledge_entities')
        .select('*')
        .order('sort_order', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapRowToKnowledgeEntity);
        memoryCache = { entities: mapped, source: 'database', loadedAt: now };
        return { entities: mapped, source: 'database' };
      }
    } catch {
      // In-memory fallback on connection error or schema cache error
    }
  }

  // Authoritative fallback to in-memory store
  const fallback = getFallbackStore();
  // Do NOT cache registry fallback permanently to allow seamless discovery when DB table is created
  return { entities: [...fallback], source: 'registry' };
}

// ============================================================================
// 5. PUBLIC DAL QUERY INTERFACES
// ============================================================================

/**
 * Returns all knowledge entities (admin / internal queries).
 */
export async function getAllKnowledgeEntities(): Promise<KnowledgeEntity[]> {
  const { entities } = await getAllKnowledgeEntitiesRaw();
  return entities;
}

/**
 * Returns all publicly published knowledge entities.
 * Excludes: draft, archived, needs_review, and UNKNOWN sentinel.
 */
export async function getPublishedKnowledgeEntities(): Promise<KnowledgeEntity[]> {
  const { entities } = await getAllKnowledgeEntitiesRaw();
  const published = entities.filter(
    (e) => e.published === true && e.dbStatus === 'published' && e.entityKey !== 'UNKNOWN'
  );
  return attachCanonicalMediaToKnowledgeList(published);
}

/**
 * Resolves a knowledge entity by its public URL slug or recognized redirect alias.
 * - Honors published status unless options.includeDrafts = true.
 * - Signals 308 redirect intent if matched via redirectSlugs.
 */
export async function getKnowledgeBySlug(
  slug: string,
  options?: { includeDrafts?: boolean }
): Promise<KnowledgeLookupResult> {
  if (!slug || typeof slug !== 'string') {
    return { entity: null, isRedirect: false };
  }

  const cleanSlug = slug.toLowerCase().trim();
  const { entities } = await getAllKnowledgeEntitiesRaw();

  // 1. Check exact canonical slug match
  const exactMatch = entities.find((e) => e.slug === cleanSlug);
  if (exactMatch) {
    const isPubliclyAccessible =
      options?.includeDrafts ||
      (exactMatch.published === true &&
        exactMatch.dbStatus === 'published' &&
        exactMatch.entityKey !== 'UNKNOWN');

    if (isPubliclyAccessible) {
      const primaryMedia = await getPrimaryMedia('KNOWLEDGE', exactMatch.id || exactMatch.entityKey);
      return { entity: attachCanonicalMediaToKnowledge(exactMatch, primaryMedia), isRedirect: false };
    }
    return { entity: null, isRedirect: false };
  }

  // 2. Check alias redirect slugs (e.g. 'henna', 'mehndi' -> 'henna-mehndi')
  const redirectMatch = entities.find((e) => e.redirectSlugs.includes(cleanSlug));
  if (redirectMatch) {
    const isPubliclyAccessible =
      options?.includeDrafts ||
      (redirectMatch.published === true &&
        redirectMatch.dbStatus === 'published' &&
        redirectMatch.entityKey !== 'UNKNOWN');

    if (isPubliclyAccessible) {
      const primaryMedia = await getPrimaryMedia('KNOWLEDGE', redirectMatch.id || redirectMatch.entityKey);
      return {
        entity: attachCanonicalMediaToKnowledge(redirectMatch, primaryMedia),
        isRedirect: true,
        redirectCanonicalSlug: redirectMatch.slug,
      };
    }
  }

  return { entity: null, isRedirect: false };
}

/**
 * Resolves a knowledge entity by its uppercase canonical entity_key (e.g. 'HENNA_MEHNDI').
 * Used by relationship engine (public.entity_relationships) and internal graph engine.
 */
export async function getKnowledgeByKey(
  entityKey: string,
  options?: { includeDrafts?: boolean }
): Promise<KnowledgeEntity | null> {
  if (!entityKey || typeof entityKey !== 'string') return null;

  const upperKey = entityKey.toUpperCase().trim();
  const { entities } = await getAllKnowledgeEntitiesRaw();
  const match = entities.find((e) => e.entityKey === upperKey);

  if (!match) return null;

  const isPubliclyAccessible =
    options?.includeDrafts ||
    (match.published === true && match.dbStatus === 'published' && match.entityKey !== 'UNKNOWN');

  if (!isPubliclyAccessible) return null;

  const primaryMedia = await getPrimaryMedia('KNOWLEDGE', match.id || match.entityKey);
  return attachCanonicalMediaToKnowledge(match, primaryMedia);
}

/**
 * Resolves a knowledge entity by its primary key ID (e.g. 'ent-henna-mehndi').
 */
export async function getKnowledgeById(
  id: string,
  options?: { includeDrafts?: boolean }
): Promise<KnowledgeEntity | null> {
  if (!id || typeof id !== 'string') return null;

  const cleanId = id.trim();
  const { entities } = await getAllKnowledgeEntitiesRaw();
  const match = entities.find((e) => e.id === cleanId);

  if (!match) return null;

  const isPubliclyAccessible =
    options?.includeDrafts ||
    (match.published === true && match.dbStatus === 'published' && match.entityKey !== 'UNKNOWN');

  if (!isPubliclyAccessible) return null;

  const primaryMedia = await getPrimaryMedia('KNOWLEDGE', match.id || match.entityKey);
  return attachCanonicalMediaToKnowledge(match, primaryMedia);
}

/**
 * Administrative retrieval of all knowledge entities regardless of publishing state.
 * Strictly for CMS / Admin portal use.
 */
export async function getAllKnowledgeEntitiesAdmin(): Promise<KnowledgeEntity[]> {
  const { entities } = await getAllKnowledgeEntitiesRaw();
  return entities;
}

// ============================================================================
// 6. ADMINISTRATIVE MUTATIONS (CREATE, UPDATE, ARCHIVE, REVALIDATION)
// ============================================================================

export interface SaveKnowledgeEntityInput {
  id?: string;
  entityKey?: string;
  slug?: string;
  canonicalName: string;
  scientificName?: string;
  botanicalFamily?: string;
  productFamily?: ProductFamily;
  entityClass?: EntityClass;
  aliases?: string[];
  normalizedAliases?: string[];
  redirectSlugs?: string[];
  supportedScopes?: ProductScope[];
  safeUseCases?: string[];
  compatibleAttributes?: VerifiedAttributeSlug[];
  relatedEntities?: string[];
  relatedEntityKeys?: string[];
  guideFamilies?: GuideFamily[];
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImageUrl?: string;
  robotsIndex?: boolean;
  robotsFollow?: boolean;
  dbStatus?: KnowledgeDatabaseStatus;
  status?: KnowledgeDatabaseStatus;
  published?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Revalidates public Next.js knowledge routes, sitemap, and Next.js tags.
 */
export async function revalidateKnowledgeSurfaces(
  slugs?: (string | undefined | null)[]
): Promise<void> {
  try {
    const { revalidatePath, revalidateTag } = await import('next/cache');
    try {
      revalidatePath('/knowledge', 'page');
      revalidatePath('/sitemap.xml');
    } catch {}

    const cleanSlugs = (slugs || []).filter((s): s is string => Boolean(s && s.trim()));
    for (const s of cleanSlugs) {
      try {
        revalidatePath(`/knowledge/${s.trim()}`, 'page');
      } catch {}
    }

    try {
      revalidateTag('knowledge');
    } catch {}

    // Safe indexing notification for updated botanical URLs
    try {
      const { notifySearchEngines } = await import('@/lib/indexing/indexing-service');
      const urls = cleanSlugs.map((s) => `/knowledge/${s.trim()}`);
      if (urls.length > 0) {
        notifySearchEngines(urls, { entityType: 'KNOWLEDGE', action: 'UPDATE' });
      }
    } catch {}
  } catch (err: any) {
    // Graceful fallback in standalone test/script runners
    console.warn('[revalidateKnowledgeSurfaces] Standalone execution notice:', err?.message);
  }
}

/**
 * Saves a KnowledgeEntity (insert or update) with full governance,
 * slug validation, redirect preservation, immutability, and publishing gates.
 */
export async function saveKnowledgeEntity(
  input: SaveKnowledgeEntityInput,
  options?: { isCreate?: boolean }
): Promise<KnowledgeEntity> {
  const isNew = Boolean(options?.isCreate || !input.id);

  // 1. Governance validation
  const govCheck = UniversalGovernanceCore.validateEntity('KNOWLEDGE', input, isNew);
  if (!govCheck.isValid) {
    throw new Error(`Governance violation: ${govCheck.errors.join('; ')}`);
  }

  const allEntities = await getAllKnowledgeEntitiesAdmin();

  // 2. Resolve existing record if updating
  let existing: KnowledgeEntity | null = null;
  if (!isNew) {
    const targetId = input.id?.trim();
    existing =
      allEntities.find(
        (e) =>
          e.id === targetId ||
          e.slug === input.slug?.toLowerCase().trim() ||
          e.entityKey === input.entityKey?.toUpperCase().trim()
      ) || null;

    if (!existing) {
      throw new Error(`Knowledge entity not found.`);
    }
  }

  // 3. Validate Entity Key
  let entityKey: string;
  if (isNew) {
    const rawKey = String(input.entityKey || '').toUpperCase().trim();
    if (!rawKey) {
      throw new Error('Entity key is required for new knowledge entities.');
    }
    if (!/^[A-Z0-9_]{2,50}$/.test(rawKey)) {
      throw new Error(
        'Entity key must contain only uppercase letters, numbers, and underscores (2-50 characters).'
      );
    }
    if (rawKey === 'UNKNOWN') {
      throw new Error('Cannot manually create sentinel entity "UNKNOWN".');
    }
    if (allEntities.some((e) => e.entityKey === rawKey)) {
      throw new Error(`Entity key "${rawKey}" already exists.`);
    }
    entityKey = rawKey;
  } else {
    entityKey = existing!.entityKey;
    if (input.entityKey && input.entityKey.toUpperCase().trim() !== existing!.entityKey) {
      throw new Error('Entity key is immutable and cannot be modified after creation.');
    }
  }

  // 4. Validate & Process Slug
  const canonicalName = String(input.canonicalName || '').trim();
  if (!canonicalName || canonicalName.length < 2) {
    throw new Error('Canonical name must be at least 2 characters.');
  }

  let cleanSlug: string;
  if (input.slug) {
    cleanSlug = input.slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  } else if (existing) {
    cleanSlug = existing.slug;
  } else {
    cleanSlug = canonicalName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  if (!cleanSlug || cleanSlug.length < 2) {
    throw new Error('A valid URL-safe slug is required.');
  }

  const slugConflict = allEntities.find(
    (e) => e.slug === cleanSlug && e.id !== (existing?.id || input.id)
  );
  if (slugConflict) {
    throw new Error(
      `Slug "${cleanSlug}" is already in use by entity "${slugConflict.canonicalName}" (${slugConflict.entityKey}).`
    );
  }

  // 5. Preserve Redirect Slugs on Slug Change (Requirement 11)
  const redirectSet = new Set<string>();
  if (existing) {
    for (const r of existing.redirectSlugs) redirectSet.add(r.toLowerCase());
    if (existing.slug !== cleanSlug) {
      redirectSet.add(existing.slug.toLowerCase());
    }
  }
  if (Array.isArray(input.redirectSlugs)) {
    for (const r of input.redirectSlugs) {
      if (r && typeof r === 'string') {
        const cl = r
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        if (cl) redirectSet.add(cl);
      }
    }
  }
  redirectSet.delete(cleanSlug); // Canonical slug cannot redirect to itself
  const redirectSlugs = Array.from(redirectSet);

  // 6. Enforce Status Lifecycle & Public Publishing Rules (Requirements 6, 7, 8)
  const isUnknown = entityKey === 'UNKNOWN';
  const incomingStatus = (input.dbStatus ||
    input.status ||
    (isNew ? 'draft' : existing?.dbStatus || 'draft')) as KnowledgeDatabaseStatus;
  const validStatuses: KnowledgeDatabaseStatus[] = [
    'draft',
    'published',
    'needs_review',
    'archived',
  ];

  if (!validStatuses.includes(incomingStatus)) {
    throw new Error(
      `Invalid status "${incomingStatus}". Allowed values: draft, published, needs_review, archived.`
    );
  }

  const incomingPublished = input.published ?? (incomingStatus === 'published');

  if (isUnknown && (incomingStatus === 'published' || incomingPublished === true)) {
    throw new Error('Sentinel entity "UNKNOWN" cannot be published.');
  }

  let dbStatus: KnowledgeDatabaseStatus = incomingStatus;
  let published = false;

  if (incomingStatus === 'published' && incomingPublished === true) {
    published = true;
    dbStatus = 'published';
  } else {
    published = false;
    dbStatus = incomingStatus === 'published' ? 'draft' : incomingStatus;
  }

  const id = isNew ? (input.id || `ent-${cleanSlug}`) : existing!.id;
  const rawAliases = Array.isArray(input.aliases)
    ? input.aliases
    : (existing?.aliases || []);
  const aliases = rawAliases.map((a) => String(a).trim()).filter(Boolean);
  const normalizedAliases =
    Array.isArray(input.normalizedAliases) && input.normalizedAliases.length > 0
      ? input.normalizedAliases.map((a) => normalizeEntityTerm(String(a)))
      : aliases.map((a) => normalizeEntityTerm(a));

  const scientificName =
    input.scientificName !== undefined
      ? input.scientificName?.trim() || undefined
      : existing?.scientificName;
  const botanicalFamily =
    input.botanicalFamily !== undefined
      ? input.botanicalFamily?.trim() || undefined
      : existing?.botanicalFamily;
  const productFamily =
    input.productFamily || existing?.productFamily || 'BOTANICAL_SINGLE';
  const entityClass =
    input.entityClass || existing?.entityClass || 'BOTANICAL_SINGLE';
  const supportedScopes =
    input.supportedScopes || existing?.supportedScopes || ['HAIR'];
  const safeUseCases = input.safeUseCases || existing?.safeUseCases || [];
  const compatibleAttributes =
    input.compatibleAttributes || existing?.compatibleAttributes || [];
  const relatedEntities =
    input.relatedEntities ||
    input.relatedEntityKeys ||
    existing?.relatedEntities ||
    [];
  const guideFamilies = input.guideFamilies || existing?.guideFamilies || [];
  const description = (
    input.description !== undefined ? input.description : (existing?.description || '')
  ).trim();

  const now = new Date().toISOString();
  const createdAt = existing?.createdAt || input.createdAt || now;
  const updatedAt = now;

  const status: CanonicalEntityStatus = isUnknown
    ? 'UNKNOWN'
    : dbStatus === 'needs_review'
    ? 'NEEDS_REVIEW'
    : 'KNOWN';
  const confidence: EntityConfidence = isUnknown ? 'NEEDS_REVIEW' : 'HIGH';

  const updatedEntity: KnowledgeEntity = {
    id,
    entityKey,
    slug: cleanSlug,
    canonicalName,
    scientificName,
    botanicalFamily,
    productFamily,
    entityClass,
    aliases,
    normalizedAliases,
    redirectSlugs,
    supportedScopes,
    safeUseCases,
    compatibleAttributes,
    searchRepresentations: {
      canonical: canonicalName,
      naturalAliases: aliases.slice(0, 4),
      scientific: scientificName,
    },
    guideFamilies,
    relatedEntities,
    status,
    confidence,
    description,
    seoTitle:
      input.seoTitle ||
      existing?.seoTitle ||
      `${canonicalName}${scientificName ? ` (${scientificName})` : ''} | Botanical Care & Sourcing — Musky Dose`,
    seoDescription:
      input.seoDescription ||
      existing?.seoDescription ||
      `${description} Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.`,
    ogImageUrl: input.ogImageUrl || existing?.ogImageUrl || undefined,
    robotsIndex: input.robotsIndex ?? (published && !isUnknown),
    robotsFollow: input.robotsFollow ?? true,
    dbStatus,
    published,
    sortOrder: Number(input.sortOrder ?? existing?.sortOrder ?? (allEntities.length + 1)),
    createdAt,
    updatedAt,
  };

  // 7. Persist to Supabase when available
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const row = mapKnowledgeEntityToRow(updatedEntity);
      const { error } = await supabase.from('knowledge_entities').upsert([row]);
      if (error) {
        console.warn(`[saveKnowledgeEntity] Supabase upsert notice: ${error.message}`);
      }
    } catch (dbErr: any) {
      console.warn(`[saveKnowledgeEntity] Database operation notice: ${dbErr?.message}`);
    }
  }

  // 8. Update fallback in-memory store and invalidate cache
  updateFallbackStore(updatedEntity);
  resetKnowledgeCache();

  // 9. Revalidate affected surfaces
  const affectedSlugs = [updatedEntity.slug];
  if (existing && existing.slug !== updatedEntity.slug) {
    affectedSlugs.push(existing.slug);
  }
  await revalidateKnowledgeSurfaces(affectedSlugs);

  return updatedEntity;
}

/**
 * Soft-deletes (archives) a KnowledgeEntity by ID.
 * Enforces status = 'archived' and published = false.
 */
export async function archiveKnowledgeEntity(id: string): Promise<KnowledgeEntity> {
  const allEntities = await getAllKnowledgeEntitiesAdmin();
  const cleanId = id.trim();
  const existing = allEntities.find(
    (e) =>
      e.id === cleanId ||
      e.slug === cleanId.toLowerCase() ||
      e.entityKey === cleanId.toUpperCase()
  );

  if (!existing) {
    throw new Error(`Knowledge entity with ID "${id}" not found.`);
  }

  if (existing.entityKey === 'UNKNOWN') {
    throw new Error('Sentinel entity "UNKNOWN" cannot be archived or deleted.');
  }

  const archived: KnowledgeEntity = {
    ...existing,
    dbStatus: 'archived',
    published: false,
    robotsIndex: false,
    updatedAt: new Date().toISOString(),
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const row = mapKnowledgeEntityToRow(archived);
      const { error } = await supabase.from('knowledge_entities').upsert([row]);
      if (error) {
        console.warn(`[archiveKnowledgeEntity] Supabase archive notice: ${error.message}`);
      }
    } catch (dbErr: any) {
      console.warn(`[archiveKnowledgeEntity] Database operation notice: ${dbErr?.message}`);
    }
  }

  updateFallbackStore(archived);
  resetKnowledgeCache();

  await revalidateKnowledgeSurfaces([archived.slug]);
  return archived;
}


