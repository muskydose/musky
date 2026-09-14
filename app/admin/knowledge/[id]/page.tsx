import React from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { getAllKnowledgeEntitiesAdmin } from '@/lib/db/knowledge';
import KnowledgeFormClient from '../KnowledgeFormClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Edit Botanical Entity | Musky Dose Admin',
  description: 'Manage botanical monograph, aliases, redirects, and SEO fields.',
};

export default async function EditKnowledgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cleanId = id?.trim();

  const allEntities = await getAllKnowledgeEntitiesAdmin();
  const entity = allEntities.find(
    (e) =>
      e.id === cleanId ||
      e.slug === cleanId.toLowerCase() ||
      e.entityKey === cleanId.toUpperCase()
  );

  if (!entity) {
    return (
      <AdminLayout title="Botanical Entity Not Found">
        <div className="bg-white rounded-2xl p-8 border border-[#e8e2d5] text-center max-w-md mx-auto my-12 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
            !
          </div>
          <h2 className="text-xl font-bold text-[#0f2d22] mb-2">Entity Not Found</h2>
          <p className="text-xs text-gray-600 mb-6">
            The botanical entity with identifier &ldquo;{id}&rdquo; does not exist or has been removed.
          </p>
          <Link
            href="/admin/knowledge"
            className="inline-flex items-center gap-2 bg-[#1b4332] text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-[#0f2d22] transition-colors"
          >
            Back to Knowledge Entities
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`Edit Entity: ${entity.canonicalName}`}>
      <KnowledgeFormClient initialEntity={entity} isNew={false} />
    </AdminLayout>
  );
}

