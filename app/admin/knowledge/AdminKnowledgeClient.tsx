'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { KnowledgeEntity, KnowledgeDatabaseStatus } from '@/lib/db/knowledge';
import {
  Plus,
  Search,
  Edit3,
  Archive,
  ExternalLink,
  Leaf,
  CheckCircle,
  Clock,
  AlertCircle,
  ShieldCheck,
  Tag,
  ArrowRight,
  Filter,
  RefreshCw,
} from 'lucide-react';

interface AdminKnowledgeClientProps {
  initialEntities: KnowledgeEntity[];
}

export default function AdminKnowledgeClient({
  initialEntities,
}: AdminKnowledgeClientProps) {
  const [entities, setEntities] = useState<KnowledgeEntity[]>(initialEntities);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | KnowledgeDatabaseStatus>('all');
  const [archiveModalEntity, setArchiveModalEntity] = useState<KnowledgeEntity | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Metrics
  const totalCount = entities.length;
  const publishedCount = entities.filter(
    (e) => e.dbStatus === 'published' && e.published && e.entityKey !== 'UNKNOWN'
  ).length;
  const draftCount = entities.filter((e) => e.dbStatus === 'draft').length;
  const reviewCount = entities.filter((e) => e.dbStatus === 'needs_review').length;
  const archivedCount = entities.filter((e) => e.dbStatus === 'archived').length;

  // Filtered entities
  const filteredEntities = entities.filter((entity) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      entity.canonicalName.toLowerCase().includes(q) ||
      entity.entityKey.toLowerCase().includes(q) ||
      entity.slug.toLowerCase().includes(q) ||
      (entity.scientificName && entity.scientificName.toLowerCase().includes(q)) ||
      (entity.botanicalFamily && entity.botanicalFamily.toLowerCase().includes(q)) ||
      entity.aliases.some((a) => a.toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : entity.dbStatus === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Toggle quick publish / draft
  const handleTogglePublish = async (entity: KnowledgeEntity) => {
    if (entity.entityKey === 'UNKNOWN') {
      showNotification('error', 'Sentinel entity "UNKNOWN" cannot be published.');
      return;
    }

    const nextStatus: KnowledgeDatabaseStatus =
      entity.dbStatus === 'published' ? 'draft' : 'published';
    const nextPublished = nextStatus === 'published';

    try {
      const res = await fetch(`/api/admin/knowledge/${entity.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          published: nextPublished,
        }),
      });

      const data = await res.json();
      if (data.success && data.entity) {
        setEntities((prev) =>
          prev.map((e) => (e.id === entity.id ? data.entity : e))
        );
        showNotification(
          'success',
          `Entity "${entity.canonicalName}" is now ${nextStatus}.`
        );
      } else {
        showNotification('error', data.error || 'Failed to update publishing state.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Network error updating entity.');
    }
  };

  // Archive soft-delete
  const handleArchiveConfirm = async () => {
    if (!archiveModalEntity) return;
    setIsArchiving(true);
    try {
      const res = await fetch(`/api/admin/knowledge/${archiveModalEntity.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success && data.entity) {
        setEntities((prev) =>
          prev.map((e) => (e.id === archiveModalEntity.id ? data.entity : e))
        );
        showNotification(
          'success',
          `Entity "${archiveModalEntity.canonicalName}" archived successfully.`
        );
      } else {
        showNotification('error', data.error || 'Failed to archive entity.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error archiving entity.');
    } finally {
      setIsArchiving(false);
      setArchiveModalEntity(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm border transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-500 hover:text-gray-900 ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header & Primary Action */}
      <div className="bg-white rounded-2xl p-6 border border-[#e8e2d5] shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#1b4332]/10 text-[#1b4332] flex items-center justify-center">
              <Leaf className="w-4 h-4 text-[#1b4332]" />
            </span>
            <h1 className="text-xl font-bold text-[#0f2d22] font-serif-heading">
              Botanical Knowledge Entities
            </h1>
          </div>
          <p className="text-xs text-gray-600 mt-1 max-w-2xl">
            Authoritative botanical catalog powering public `/knowledge/[slug]` routes,
            universal entity relationships, VisualContext contracts, and SEO search graph.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/knowledge/new"
            className="inline-flex items-center gap-2 bg-[#1b4332] hover:bg-[#0f2d22] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Botanical Entity</span>
          </Link>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider block">
            Total Entities
          </span>
          <span className="text-lg font-extrabold text-[#0f2d22] mt-0.5 block">
            {totalCount}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            Published Public
          </span>
          <span className="text-lg font-extrabold text-emerald-700 mt-0.5 block">
            {publishedCount}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">
            Drafts
          </span>
          <span className="text-lg font-extrabold text-amber-700 mt-0.5 block">
            {draftCount}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
            Needs Review
          </span>
          <span className="text-lg font-extrabold text-blue-700 mt-0.5 block">
            {reviewCount}
          </span>
        </div>
        <div className="bg-white p-3.5 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
            Archived
          </span>
          <span className="text-lg font-extrabold text-gray-600 mt-0.5 block">
            {archivedCount}
          </span>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, key, slug, botanical family, aliases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#e8e2d5] focus:outline-hidden focus:border-[#1b4332] bg-[#fcfbf9]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                &times;
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
            {[
              { id: 'all', label: 'All', count: totalCount },
              { id: 'published', label: 'Published', count: publishedCount },
              { id: 'draft', label: 'Draft', count: draftCount },
              { id: 'needs_review', label: 'Needs Review', count: reviewCount },
              { id: 'archived', label: 'Archived', count: archivedCount },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  statusFilter === tab.id
                    ? 'bg-[#1b4332] text-white'
                    : 'bg-[#f5f1e8] text-[#1f2421] hover:bg-[#e8e2d5]'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    statusFilter === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-black/5 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Knowledge Entities Table */}
      <div className="bg-white rounded-2xl border border-[#e8e2d5] shadow-xs overflow-hidden">
        {filteredEntities.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Leaf className="w-12 h-12 text-[#1b4332]/30 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#0f2d22]">No botanical entities found</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? `No entities match "${searchQuery}". Try broadening your search.`
                : 'No entities match the selected status filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#fcfbf9] border-b border-[#e8e2d5] text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Botanical Entity</th>
                  <th className="py-3 px-4">Entity Key & Slug</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Aliases & Taxonomy</th>
                  <th className="py-3 px-4 text-center">Order</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e2d5]">
                {filteredEntities.map((entity) => {
                  const isUnknown = entity.entityKey === 'UNKNOWN';
                  const isPublished =
                    entity.dbStatus === 'published' && entity.published && !isUnknown;

                  return (
                    <tr
                      key={entity.id}
                      className="hover:bg-[#fcfbf9] transition-colors"
                    >
                      {/* Botanical Entity */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#0f2d22] text-xs">
                          {entity.canonicalName}
                        </div>
                        {entity.scientificName && (
                          <div className="text-[11px] text-gray-500 italic mt-0.5">
                            {entity.scientificName}
                          </div>
                        )}
                        {entity.botanicalFamily && (
                          <span className="inline-block mt-1 text-[10px] font-medium bg-[#1b4332]/5 text-[#1b4332] px-1.5 py-0.5 rounded border border-[#1b4332]/10">
                            {entity.botanicalFamily}
                          </span>
                        )}
                      </td>

                      {/* Entity Key & Slug */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded font-bold">
                          {entity.entityKey}
                        </span>
                        <div className="text-[11px] text-gray-500 mt-1 flex items-center gap-1 font-mono">
                          <span>/knowledge/</span>
                          <span className="text-[#1b4332] font-semibold">
                            {entity.slug}
                          </span>
                        </div>
                        {entity.redirectSlugs && entity.redirectSlugs.length > 0 && (
                          <div className="text-[10px] text-amber-700 mt-0.5">
                            +{entity.redirectSlugs.length} redirect alias{entity.redirectSlugs.length > 1 ? 'es' : ''}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              entity.dbStatus === 'published' && entity.published
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : entity.dbStatus === 'needs_review'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : entity.dbStatus === 'archived'
                                ? 'bg-gray-100 text-gray-600 border-gray-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                entity.dbStatus === 'published' && entity.published
                                  ? 'bg-emerald-500'
                                  : entity.dbStatus === 'needs_review'
                                  ? 'bg-blue-500'
                                  : entity.dbStatus === 'archived'
                                  ? 'bg-gray-400'
                                  : 'bg-amber-500'
                              }`}
                            />
                            <span className="capitalize">
                              {entity.dbStatus.replace('_', ' ')}
                            </span>
                          </span>

                          {!isUnknown && (
                            <button
                              onClick={() => handleTogglePublish(entity)}
                              className="text-[10px] font-medium text-gray-500 hover:text-[#1b4332] underline"
                            >
                              {entity.dbStatus === 'published' ? 'Switch to Draft' : 'Publish'}
                            </button>
                          )}
                          {isUnknown && (
                            <span className="text-[10px] text-gray-400 italic">
                              Governance Sentinel
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Aliases & Taxonomy */}
                      <td className="py-3 px-4">
                        <div className="text-[11px] text-gray-600 line-clamp-1 max-w-xs">
                          {entity.aliases.length > 0
                            ? entity.aliases.join(', ')
                            : 'No aliases defined'}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(entity.supportedScopes || []).map((sc) => (
                            <span
                              key={sc}
                              className="text-[9px] bg-stone-100 text-stone-700 px-1 py-0.2 rounded font-medium"
                            >
                              {sc}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Sort Order */}
                      <td className="py-3 px-4 text-center font-mono text-xs text-gray-600">
                        {entity.sortOrder}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPublished && (
                            <Link
                              href={`/knowledge/${entity.slug}`}
                              target="_blank"
                              title="View Public Storefront Route"
                              className="p-1.5 text-gray-400 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          )}

                          <Link
                            href={`/admin/knowledge/${entity.id}`}
                            title="Edit Entity Details"
                            className="p-1.5 text-gray-500 hover:text-[#1b4332] rounded-lg hover:bg-[#1b4332]/5 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>

                          {!isUnknown && entity.dbStatus !== 'archived' && (
                            <button
                              onClick={() => setArchiveModalEntity(entity)}
                              title="Soft-Delete / Archive Entity"
                              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Soft-Delete / Archive Confirmation Modal */}
      {archiveModalEntity && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-[#e8e2d5] shadow-xl">
            <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
              <Archive className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0f2d22]">
              Archive Botanical Entity?
            </h3>
            <p className="text-xs text-gray-600 mt-2">
              Are you sure you want to archive{' '}
              <strong className="text-[#0f2d22]">
                &ldquo;{archiveModalEntity.canonicalName}&rdquo;
              </strong>{' '}
              ({archiveModalEntity.entityKey})?
            </p>
            <div className="bg-[#fcfbf9] border border-[#e8e2d5] rounded-xl p-3 my-3 text-[11px] text-gray-600 space-y-1">
              <div>&bull; Soft delete: Status will change to <span className="font-bold">archived</span>.</div>
              <div>&bull; Public visibility: Removed from `/knowledge` and search engines immediately.</div>
              <div>&bull; Preserved history: The database record remains intact for relational integrity.</div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setArchiveModalEntity(null)}
                disabled={isArchiving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleArchiveConfirm}
                disabled={isArchiving}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isArchiving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Archiving...</span>
                  </>
                ) : (
                  <span>Confirm Archive</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

