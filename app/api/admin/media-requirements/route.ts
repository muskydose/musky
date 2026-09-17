import { NextResponse } from 'next/server';
import { getSupabaseAdmin, getSupabase } from '@/lib/supabase';
import { buildEntityRequirements, EntityMediaHealth, SiteMediaRequirementsSummary } from '@/lib/growth/media-requirements-engine';
import { CANONICAL_ENTITY_REGISTRY } from '@/lib/growth/entity-registry';
import { MediaAsset, mapRowToMediaAsset } from '@/lib/db/media';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin() || getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 1. Fetch all catalog entities in parallel
    const [productsRes, categoriesRes, guidesRes, mediaRes] = await Promise.all([
      supabase.from('products').select('id, name, slug, is_active').order('name'),
      supabase.from('categories').select('id, name, slug').order('name'),
      supabase.from('product_guides').select('id, title, slug').order('title'),
      supabase.from('media_assets').select('*').order('created_at', { ascending: false }),
    ]);

    const allMediaAssets: MediaAsset[] = Array.isArray(mediaRes.data)
      ? mediaRes.data.map(mapRowToMediaAsset)
      : [];

    const entityHealthList: EntityMediaHealth[] = [];

    // Brand / Sitewide
    const brandAssets = allMediaAssets.filter((a) => a.entityType === 'BRAND');
    entityHealthList.push(
      buildEntityRequirements('BRAND', 'musky-dose-brand', 'Musky Dose Brand & Heritage', '', brandAssets)
    );

    // Products
    if (Array.isArray(productsRes.data)) {
      for (const p of productsRes.data) {
        const prodAssets = allMediaAssets.filter((a) => a.entityType === 'PRODUCT' && String(a.entityId) === String(p.id));
        entityHealthList.push(
          buildEntityRequirements('PRODUCT', p.id, p.name, p.slug, prodAssets)
        );
      }
    }

    // Categories
    if (Array.isArray(categoriesRes.data)) {
      for (const c of categoriesRes.data) {
        const catAssets = allMediaAssets.filter((a) => a.entityType === 'CATEGORY' && String(a.entityId) === String(c.id));
        entityHealthList.push(
          buildEntityRequirements('CATEGORY', c.id, c.name, c.slug, catAssets)
        );
      }
    }

    // Guides
    if (Array.isArray(guidesRes.data)) {
      for (const g of guidesRes.data) {
        const guideAssets = allMediaAssets.filter((a) => a.entityType === 'GUIDE' && String(a.entityId) === String(g.id));
        entityHealthList.push(
          buildEntityRequirements('GUIDE', g.id, g.title, g.slug, guideAssets)
        );
      }
    }

    // Knowledge Entities
    for (const [key, entry] of Object.entries(CANONICAL_ENTITY_REGISTRY)) {
      if (key === 'UNKNOWN') continue;
      const slug = entry.canonicalName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const knowAssets = allMediaAssets.filter((a) => a.entityType === 'KNOWLEDGE' && (String(a.entityId) === key || String(a.entityId) === `ent-${slug}`));
      entityHealthList.push(
        buildEntityRequirements('KNOWLEDGE', key, entry.canonicalName, slug, knowAssets)
      );
    }

    // Compute aggregate summary
    let totalRequirements = 0;
    let totalRequired = 0;
    let totalOptional = 0;
    let liveCount = 0;
    let readyCount = 0;
    let missingCount = 0;
    let needsReviewCount = 0;
    let invalidCount = 0;
    let healthScoreSum = 0;

    for (const ent of entityHealthList) {
      healthScoreSum += ent.healthScorePercent;
      for (const slot of ent.slots) {
        totalRequirements++;
        if (slot.isRequired) totalRequired++;
        else totalOptional++;

        if (slot.status === 'LIVE') liveCount++;
        else if (slot.status === 'READY') readyCount++;
        else if (slot.status === 'MISSING') missingCount++;
        else if (slot.status === 'NEEDS_REVIEW') needsReviewCount++;
        else if (slot.status === 'INVALID') invalidCount++;
      }
    }

    const totalEntities = entityHealthList.length;
    const overallHealthScore = totalEntities > 0 ? Math.round(healthScoreSum / totalEntities) : 0;

    const summary: SiteMediaRequirementsSummary = {
      totalEntities,
      totalRequirements,
      totalRequired,
      totalOptional,
      liveCount,
      readyCount,
      missingCount,
      needsReviewCount,
      invalidCount,
      overallHealthScore,
      entities: entityHealthList,
    };

    return NextResponse.json(summary);
  } catch (error: any) {
    console.error('Failed to get media requirements:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

