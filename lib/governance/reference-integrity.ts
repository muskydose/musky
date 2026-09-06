/**
 * ============================================================================
 * MUSKY DOSE — UNIVERSAL REFERENCE INTEGRITY & CASCADE PRUNING (V1.0)
 *
 * Ensures that deleting, archiving, or unpublishing an entity leaves zero
 * dangling references across site settings, navigation, guides, or layouts.
 * ============================================================================
 */

import { UniversalEntityType } from './types';
import { getSiteSettings, updateSiteSettings } from '@/lib/db/settings';
import { revalidateCatalogSurfaces } from '@/lib/revalidation';

export interface PruneResult {
  modified: boolean;
  prunedFields: string[];
}

/**
 * Universal reference pruner: Purges an entity's ID and slug across
 * all platform layout configurations, menus, and setting stores.
 */
export async function pruneEntityReferences(
  entityType: UniversalEntityType,
  entityId: string,
  slug?: string
): Promise<PruneResult> {
  const settings = await getSiteSettings();
  let modified = false;
  const prunedFields: string[] = [];

  const targetId = String(entityId).trim();
  const targetSlug = slug ? String(slug).trim().toLowerCase() : '';

  // 1. Navigation items (header & footer)
  if (Array.isArray(settings.navItems)) {
    const originalLen = settings.navItems.length;
    const filteredNav = settings.navItems.filter((nav: any) => {
      const href = String(nav.href || '').toLowerCase();
      if (targetSlug && href.includes(targetSlug)) return false;
      if (nav.targetId && nav.targetId === targetId) return false;
      return true;
    });
    if (filteredNav.length !== originalLen) {
      settings.navItems = filteredNav;
      modified = true;
      prunedFields.push('navItems');
    }
  }

  // 2. Footer link columns
  if (Array.isArray(settings.footerSections)) {
    let footerChanged = false;
    const updatedFooter = settings.footerSections.map((sec: any) => {
      if (!Array.isArray(sec.links)) return sec;
      const originalLen = sec.links.length;
      const cleanLinks = sec.links.filter((l: any) => {
        const href = String(l.href || '').toLowerCase();
        if (targetSlug && href.includes(targetSlug)) return false;
        return true;
      });
      if (cleanLinks.length !== originalLen) {
        footerChanged = true;
      }
      return { ...sec, links: cleanLinks };
    });
    if (footerChanged) {
      settings.footerSections = updatedFooter;
      modified = true;
      prunedFields.push('footerSections');
    }
  }

  // 3. Layout controls & Homepage merchandising
  if (settings.layoutControls && typeof settings.layoutControls === 'object') {
    const lc = { ...settings.layoutControls } as Record<string, any>;
    let lcChanged = false;

    // Featured product arrays
    if (Array.isArray(lc.featuredProductIds) && lc.featuredProductIds.includes(targetId)) {
      lc.featuredProductIds = lc.featuredProductIds.filter((id: string) => id !== targetId);
      lcChanged = true;
      prunedFields.push('layoutControls.featuredProductIds');
    }

    // Hero carousel slides
    if (Array.isArray(lc.heroSlides)) {
      const origLen = lc.heroSlides.length;
      lc.heroSlides = lc.heroSlides.filter((slide: any) => {
        const slideUrl = String(slide.linkUrl || slide.ctaLink || '').toLowerCase();
        if (targetSlug && slideUrl.includes(targetSlug)) return false;
        if (slide.productId && slide.productId === targetId) return false;
        return true;
      });
      if (lc.heroSlides.length !== origLen) {
        lcChanged = true;
        prunedFields.push('layoutControls.heroSlides');
      }
    }

    if (lcChanged) {
      settings.layoutControls = lc as any;
      modified = true;
    }
  }

  // 4. Custom Pages store
  if (entityType === 'PAGE' && Array.isArray(settings.customPages)) {
    const origLen = settings.customPages.length;
    settings.customPages = settings.customPages.filter((p: any) => p.id !== targetId && p.slug !== targetSlug);
    if (settings.customPages.length !== origLen) {
      modified = true;
      prunedFields.push('customPages');
    }
  }

  // 5. Business Content items
  if (entityType === 'BUSINESS_DOCUMENT' && Array.isArray(settings.businessContentItems)) {
    const origLen = settings.businessContentItems.length;
    settings.businessContentItems = settings.businessContentItems.filter((d: any) => d.id !== targetId && d.slug !== targetSlug);
    if (settings.businessContentItems.length !== origLen) {
      modified = true;
      prunedFields.push('businessContentItems');
    }
  }

  // Commit cleansed settings if changes occurred
  if (modified) {
    await updateSiteSettings(settings);
    await revalidateCatalogSurfaces({ slugs: targetSlug ? [targetSlug] : [] });
  }

  return { modified, prunedFields };
}
