import { SeoKeyword, PageSeoConfig, SeoTargetType } from '@/lib/types';
import { INITIAL_SEO_KEYWORDS, normalizeKeyword } from '@/lib/data-store';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getSiteSettings, updateSiteSettings } from './settings';

export function mapRowToSeoKeyword(row: any): SeoKeyword {
  return {
    id: row.id,
    keyword: normalizeKeyword(row.keyword || ''),
    targetType: row.target_type || row.targetType || 'homepage',
    targetId: row.target_id || row.targetId || undefined,
    targetUrl: row.target_url || row.targetUrl || '/',
    priority: row.priority || 'MEDIUM',
    active: row.active ?? true,
    isPrimary: row.is_primary ?? row.isPrimary ?? false,
    notes: row.notes || '',
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export function mapSeoKeywordToRow(kw: SeoKeyword) {
  return {
    id: kw.id,
    keyword: normalizeKeyword(kw.keyword),
    target_type: kw.targetType,
    target_id: kw.targetId || null,
    target_url: kw.targetUrl,
    priority: kw.priority,
    active: kw.active,
    is_primary: kw.isPrimary ?? false,
    notes: kw.notes || '',
    created_at: kw.createdAt,
    updated_at: kw.updatedAt,
  };
}

let memorySeoKeywordsStore: SeoKeyword[] = [...INITIAL_SEO_KEYWORDS];
let hasSeoKeywordsTableInDb: boolean | null = null;

export async function getSeoKeywords(): Promise<SeoKeyword[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return memorySeoKeywordsStore;
  }

  if (hasSeoKeywordsTableInDb === false) {
    const siteSettings = await getSiteSettings();
    if (Array.isArray(siteSettings.seoKeywordsStore) && siteSettings.seoKeywordsStore.length > 0) {
      memorySeoKeywordsStore = siteSettings.seoKeywordsStore;
      return memorySeoKeywordsStore;
    }
    return memorySeoKeywordsStore;
  }

  try {
    const { data, error } = await supabase.from('seo_keywords').select('*');
    if (error) {
      if (error.code === 'PGRST205' || error.message?.toLowerCase().includes('schema cache')) {
        hasSeoKeywordsTableInDb = false;
        const siteSettings = await getSiteSettings();
        if (Array.isArray(siteSettings.seoKeywordsStore) && siteSettings.seoKeywordsStore.length > 0) {
          memorySeoKeywordsStore = siteSettings.seoKeywordsStore;
          return memorySeoKeywordsStore;
        }
        return memorySeoKeywordsStore;
      }
      console.warn(`Supabase query warning [seo_keywords]: ${error.message}`);
      return memorySeoKeywordsStore;
    }

    hasSeoKeywordsTableInDb = true;

    if (!data || data.length === 0) {
      try {
        const rows = memorySeoKeywordsStore.map(mapSeoKeywordToRow);
        await supabase.from('seo_keywords').upsert(rows);
        const { data: seededData } = await supabase.from('seo_keywords').select('*');
        if (seededData && seededData.length > 0) {
          memorySeoKeywordsStore = seededData.map(mapRowToSeoKeyword);
          return memorySeoKeywordsStore;
        }
      } catch (seedErr) {
        console.warn('Initial seo_keywords seed skipped:', seedErr);
      }
      return memorySeoKeywordsStore;
    }

    memorySeoKeywordsStore = data.map(mapRowToSeoKeyword);
    return memorySeoKeywordsStore;
  } catch (err) {
    console.warn('Error fetching seo_keywords from Supabase:', err);
    return memorySeoKeywordsStore;
  }
}

export async function saveSeoKeyword(data: Partial<SeoKeyword>): Promise<SeoKeyword> {
  const rawKeyword = data.keyword ? data.keyword.trim() : '';
  const cleanKeyword = normalizeKeyword(rawKeyword);

  if (!cleanKeyword) {
    throw new Error('A valid SEO keyword is required.');
  }

  const targetType = data.targetType || 'homepage';
  const targetId = data.targetId || undefined;
  const targetUrl = data.targetUrl || '/';
  const keywordId = data.id || `kw-${Date.now()}`;
  const now = new Date().toISOString();

  const allKeywords = await getSeoKeywords();
  const existingDuplicate = allKeywords.find(
    (k) =>
      k.id !== keywordId &&
      k.active &&
      k.keyword === cleanKeyword &&
      k.targetType === targetType &&
      (targetId ? k.targetId === targetId : k.targetUrl === targetUrl)
  );

  if (existingDuplicate && data.active !== false) {
    throw new Error(`The keyword "${cleanKeyword}" is already active for this target page (${targetType}). Duplicate active keywords are not permitted.`);
  }

  const updatedKeyword: SeoKeyword = {
    id: keywordId,
    keyword: cleanKeyword,
    targetType,
    targetId,
    targetUrl,
    priority: data.priority || 'MEDIUM',
    active: data.active ?? true,
    isPrimary: data.isPrimary ?? false,
    notes: data.notes || '',
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  const siteSettings = await getSiteSettings();
  const currentStore = Array.isArray(siteSettings.seoKeywordsStore) && siteSettings.seoKeywordsStore.length > 0
    ? siteSettings.seoKeywordsStore
    : [...memorySeoKeywordsStore];

  const idx = currentStore.findIndex((k) => k.id === keywordId);
  const newStore = [...currentStore];
  if (idx >= 0) {
    newStore[idx] = updatedKeyword;
  } else {
    newStore.push(updatedKeyword);
  }
  await updateSiteSettings({ seoKeywordsStore: newStore });

  const supabase = getSupabaseAdmin();
  if (supabase && hasSeoKeywordsTableInDb !== false) {
    const row = mapSeoKeywordToRow(updatedKeyword);
    const { error } = await supabase.from('seo_keywords').upsert([row]);
    if (error) {
      if (error.code === 'PGRST205' || error.message?.toLowerCase().includes('schema cache')) {
        hasSeoKeywordsTableInDb = false;
      } else {
        console.error(`Supabase save error [seo_keywords]: ${error.message}`);
        throw new Error(`Database error saving SEO keyword: ${error.message}`);
      }
    }
  }

  memorySeoKeywordsStore = newStore;
  return updatedKeyword;
}

export async function deleteSeoKeyword(id: string): Promise<boolean> {
  const siteSettings = await getSiteSettings();
  const currentStore = Array.isArray(siteSettings.seoKeywordsStore)
    ? siteSettings.seoKeywordsStore
    : [...memorySeoKeywordsStore];

  const newStore = currentStore.filter((k) => k.id !== id);
  await updateSiteSettings({ seoKeywordsStore: newStore });

  const supabase = getSupabaseAdmin();
  if (supabase && hasSeoKeywordsTableInDb !== false) {
    const { error } = await supabase.from('seo_keywords').delete().eq('id', id);
    if (error) {
      if (error.code === 'PGRST205' || error.message?.toLowerCase().includes('schema cache')) {
        hasSeoKeywordsTableInDb = false;
      } else {
        console.error(`Supabase delete error [seo_keywords]: ${error.message}`);
        throw new Error(`Database error deleting SEO keyword: ${error.message}`);
      }
    }
  }

  memorySeoKeywordsStore = newStore;
  return true;
}

export async function getActiveSeoKeywordsForTarget(
  targetType: SeoTargetType,
  targetId?: string,
  targetUrl?: string
): Promise<SeoKeyword[]> {
  const allKeywords = await getSeoKeywords();
  const cleanTargetUrl = targetUrl ? targetUrl.trim() : '';

  return allKeywords.filter((kw) => {
    if (!kw.active) return false;
    if (kw.targetType !== targetType) return false;

    const hasIdMatch = Boolean(targetId && kw.targetId);
    const hasUrlMatch = Boolean(cleanTargetUrl && kw.targetUrl && kw.targetUrl.trim() !== '/' && kw.targetUrl.trim() !== '');

    if (hasIdMatch && hasUrlMatch) {
      return kw.targetId === targetId && kw.targetUrl.trim() === cleanTargetUrl;
    }

    if (hasIdMatch) {
      return kw.targetId === targetId;
    }

    if (hasUrlMatch) {
      return kw.targetUrl.trim() === cleanTargetUrl;
    }

    if (!kw.targetId && (!kw.targetUrl || kw.targetUrl === '/' || kw.targetUrl === '')) {
      return true;
    }

    return false;
  });
}

export function sanitizeCanonicalUrl(url?: string, defaultPath: string = '/'): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://muskydose.in').replace(/\/+$/, '');
  const cleanDefaultPath = defaultPath ? (defaultPath.startsWith('/') ? defaultPath : `/${defaultPath}`) : '/';

  if (!url || !url.trim()) {
    return `${siteUrl}${cleanDefaultPath}`;
  }

  const trimmed = url.trim();

  if (trimmed.toLowerCase().startsWith('javascript:') || trimmed.toLowerCase().startsWith('data:')) {
    return `${siteUrl}${cleanDefaultPath}`;
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      const siteParsed = new URL(siteUrl);

      if (parsed.hostname.toLowerCase() === siteParsed.hostname.toLowerCase()) {
        return parsed.toString();
      } else {
        return `${siteUrl}${parsed.pathname}${parsed.search}`;
      }
    } catch {
      return `${siteUrl}${cleanDefaultPath}`;
    }
  }

  const relativePath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${siteUrl}${relativePath}`;
}

export function resolveRobotsConfig(
  robotsIndex?: 'index' | 'noindex',
  robotsFollow?: 'follow' | 'nofollow',
  isPrivatePath: boolean = false
) {
  if (isPrivatePath) {
    return {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    };
  }

  const shouldIndex = robotsIndex ? robotsIndex === 'index' : true;
  const shouldFollow = robotsFollow ? robotsFollow === 'follow' : true;

  return {
    index: shouldIndex,
    follow: shouldFollow,
    googleBot: {
      index: shouldIndex,
      follow: shouldFollow,
    },
  };
}

export interface PageSeoResolutionInput {
  targetType: SeoTargetType;
  targetId?: string;
  targetUrl: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultImage?: string;
  defaultKeywords?: string[];
}

export async function getPageSeoConfigs(): Promise<PageSeoConfig[]> {
  const siteSettings = await getSiteSettings();
  return siteSettings.pageSeoConfigs || [];
}

export async function savePageSeoConfig(configData: PageSeoConfig): Promise<PageSeoConfig> {
  const configs = await getPageSeoConfigs();
  const now = new Date().toISOString();

  const updatedConfig: PageSeoConfig = {
    ...configData,
    updatedAt: now,
  };

  const idx = configs.findIndex((c) => c.id === configData.id);
  const newConfigs = [...configs];
  if (idx >= 0) {
    newConfigs[idx] = updatedConfig;
  } else {
    newConfigs.push(updatedConfig);
  }

  await updateSiteSettings({ pageSeoConfigs: newConfigs });
  return updatedConfig;
}

export async function resolvePageSeoMetadata(input: PageSeoResolutionInput) {
  const [siteSettings, pageConfigs, activeKeywords] = await Promise.all([
    getSiteSettings(),
    getPageSeoConfigs(),
    getActiveSeoKeywordsForTarget(input.targetType, input.targetId, input.targetUrl),
  ]);

  const pageConfig = pageConfigs.find((c) => {
    if (c.targetType !== input.targetType) return false;

    const configTargetId = c.targetId || (c.id && c.id !== c.targetType ? c.id : undefined);
    const configTargetUrl = c.targetUrl && c.targetUrl.trim() !== '' && c.targetUrl.trim() !== '/' ? c.targetUrl.trim().toLowerCase() : undefined;

    const inputTargetId = input.targetId;
    const inputTargetUrl = input.targetUrl ? input.targetUrl.trim().toLowerCase() : undefined;

    const hasConfigId = Boolean(configTargetId);
    const hasConfigUrl = Boolean(configTargetUrl);

    if (hasConfigId && hasConfigUrl) {
      const idMatches = Boolean(inputTargetId && configTargetId === inputTargetId);
      const urlMatches = Boolean(inputTargetUrl && configTargetUrl === inputTargetUrl);
      return idMatches && urlMatches;
    }

    if (hasConfigId) {
      if (!inputTargetId) return false;
      return configTargetId === inputTargetId;
    }

    if (hasConfigUrl) {
      if (!inputTargetUrl) return false;
      return configTargetUrl === inputTargetUrl;
    }

    return c.id === input.targetType;
  });

  let title = pageConfig?.seoTitle?.trim() || input.defaultTitle;
  if (!title) {
    title = siteSettings.seoTitle || 'Musky Dose | Premium Henna & Herbal Products from Sojat';
  }

  let description = pageConfig?.metaDescription?.trim() || input.defaultDescription;
  if (!description) {
    description = siteSettings.seoDescription || 'Pure Botanical, Triple-Shifted Sojat Mehendi & Natural Hair Care Products directly from Sojat, Rajasthan.';
  }

  const keywordSet = new Set<string>();

  if (pageConfig?.primaryKeyword) {
    const norm = normalizeKeyword(pageConfig.primaryKeyword);
    if (norm) keywordSet.add(norm);
  }

  if (pageConfig?.secondaryKeywords) {
    pageConfig.secondaryKeywords.split(',').forEach((k) => {
      const norm = normalizeKeyword(k);
      if (norm) keywordSet.add(norm);
    });
  }

  activeKeywords.forEach((kw) => {
    if (kw.keyword) {
      const norm = normalizeKeyword(kw.keyword);
      if (norm) keywordSet.add(norm);
    }
  });

  if (input.defaultKeywords) {
    input.defaultKeywords.forEach((k) => {
      const norm = normalizeKeyword(k);
      if (norm) keywordSet.add(norm);
    });
  }

  if (siteSettings.seoKeywords) {
    siteSettings.seoKeywords.split(',').forEach((k) => {
      const norm = normalizeKeyword(k);
      if (norm) keywordSet.add(norm);
    });
  }

  const mergedKeywords = Array.from(keywordSet);

  const rawCanonical = pageConfig?.canonicalUrl || input.targetUrl;
  const canonicalUrl = sanitizeCanonicalUrl(rawCanonical, input.targetUrl);

  const isPrivate = input.targetUrl.startsWith('/admin') || input.targetUrl.startsWith('/api');
  const robots = resolveRobotsConfig(pageConfig?.robotsIndex, pageConfig?.robotsFollow, isPrivate);

  const ogTitle = pageConfig?.ogTitle?.trim() || title;
  const ogDescription = pageConfig?.ogDescription?.trim() || description;
  const ogImage = pageConfig?.ogImage?.trim() || input.defaultImage || siteSettings.ogImageUrl || siteSettings.heroImageUrl || '/images/hero-bg.jpg';

  return {
    title,
    description,
    keywords: mergedKeywords,
    alternates: {
      canonical: canonicalUrl,
    },
    robots,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url: canonicalUrl,
      siteName: siteSettings.brandName || 'Musky Dose',
      type: 'website',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      images: [ogImage],
    },
    pageConfig,
    activeKeywords,
  };
}
