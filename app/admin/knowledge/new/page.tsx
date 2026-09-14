import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import KnowledgeFormClient from '../KnowledgeFormClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Create Botanical Entity | Musky Dose Admin',
  description: 'Add a new canonical botanical entity to the Musky Dose knowledge graph.',
};

export default function NewKnowledgePage() {
  return (
    <AdminLayout title="Create Botanical Entity">
      <KnowledgeFormClient isNew={true} />
    </AdminLayout>
  );
}

