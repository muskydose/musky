import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { getAllKnowledgeEntitiesAdmin } from '@/lib/db/knowledge';
import AdminKnowledgeClient from './AdminKnowledgeClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Botanical Knowledge Entities | Musky Dose Admin',
  description: 'Manage canonical botanical entities, slugs, redirects, and taxonomical metadata.',
};

export default async function AdminKnowledgePage() {
  const entities = await getAllKnowledgeEntitiesAdmin();

  return (
    <AdminLayout title="Botanical Knowledge CMS">
      <AdminKnowledgeClient initialEntities={entities} />
    </AdminLayout>
  );
}

