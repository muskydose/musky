import React from 'react';
import { getSiteSettings } from '@/lib/db/settings';
import { getAllProductsAdmin } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getGuides } from '@/lib/db/guides';
import { getAllKnowledgeEntitiesAdmin } from '@/lib/db/knowledge';
import { getAllMediaAssetsRaw } from '@/lib/db/media';
import MediaRequirementsClient from './MediaRequirementsClient';

export const metadata = {
  title: 'Media Replacement & Requirements — Musky Dose Admin',
  description: 'Control center for the From Earth to Ritual media replacement system, slot validation, and zero-downtime assignment.',
};

export default async function AdminMediaRequirementsPage() {
  const [siteSettings, products, categories, guides, knowledgeEntities, rawMedia] = await Promise.all([
    getSiteSettings(),
    getAllProductsAdmin(),
    getCategories(),
    getGuides(),
    getAllKnowledgeEntitiesAdmin(),
    getAllMediaAssetsRaw(),
  ]);

  return (
    <MediaRequirementsClient
      initialSettings={siteSettings}
      initialProducts={products}
      initialCategories={categories}
      initialGuides={guides}
      initialKnowledgeEntities={knowledgeEntities}
      initialMediaAssets={rawMedia.assets}
    />
  );
}

