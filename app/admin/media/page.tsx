import React from 'react';
import { getSiteSettings } from '@/lib/db/settings';
import { getAllProductsAdmin } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getGuides } from '@/lib/db/guides';
import { getAllKnowledgeEntitiesAdmin } from '@/lib/db/knowledge';
import { getAllMediaAssetsRaw } from '@/lib/db/media';
import AdminMediaClient from './AdminMediaClient';

export const metadata = {
  title: 'Universal Media & Assets — Musky Dose Admin',
  description: 'Canonical media asset management, AI visual studio, and digital assets across all catalog entities.',
};

export default async function AdminMediaPage() {
  const [siteSettings, products, categories, guides, knowledgeEntities, rawMedia] = await Promise.all([
    getSiteSettings(),
    getAllProductsAdmin(),
    getCategories(),
    getGuides(),
    getAllKnowledgeEntitiesAdmin(),
    getAllMediaAssetsRaw(),
  ]);

  return (
    <AdminMediaClient
      initialSettings={siteSettings}
      initialProducts={products}
      initialCategories={categories}
      initialGuides={guides}
      initialKnowledgeEntities={knowledgeEntities}
      initialMediaAssets={rawMedia.assets}
    />
  );
}
