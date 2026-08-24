'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ProductGuide, Product } from '@/lib/types';
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  ExternalLink,
  BookOpen,
  CheckCircle,
  Clock,
  Sparkles,
  Star,
  Tag,
  AlertCircle,
  Eye,
} from 'lucide-react';

interface AdminGuidesClientProps {
  initialGuides: ProductGuide[];
  products: Product[];
}

export default function AdminGuidesClient({
  initialGuides,
  products,
}: AdminGuidesClientProps) {
  const [guides, setGuides] = useState<ProductGuide[]>(initialGuides);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteModalGuide, setDeleteModalGuide] = useState<ProductGuide | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const productMap = new Map(products.map((p) => [p.id, p.name]));

  // Get unique categories
  const categories = Array.from(new Set(guides.map((g) => g.category).filter(Boolean)));

  const filteredGuides = guides.filter((guide) => {
    const matchesSearch =
      guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      guide.shortIntro.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'published'
        ? guide.isPublished
        : !guide.isPublished;

    const matchesCategory =
      categoryFilter === 'all' ? true : guide.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleTogglePublished = async (guide: ProductGuide) => {
    const updated = { ...guide, isPublished: !guide.isPublished };
    try {
      const res = await fetch('/api/admin/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.success) {
        setGuides((prev) => prev.map((g) => (g.id === guide.id ? data.guide : g)));
        showNotification('success', `Guide "${guide.title}" updated.`);
      } else {
        showNotification('error', data.error || 'Failed to update guide');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error updating guide');
    }
  };

  const handleToggleFeatured = async (guide: ProductGuide) => {
    const updated = { ...guide, isFeatured: !guide.isFeatured };
    try {
      const res = await fetch('/api/admin/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.success) {
        setGuides((prev) => prev.map((g) => (g.id === guide.id ? data.guide : g)));
        showNotification('success', `Featured status updated for "${guide.title}".`);
      } else {
        showNotification('error', data.error || 'Failed to update featured status');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error updating featured status');
    }
  };

  const handleDeleteGuide = async () => {
    if (!deleteModalGuide) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/guides?id=${deleteModalGuide.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setGuides((prev) => prev.filter((g) => g.id !== deleteModalGuide.id));
        showNotification('success', `Guide deleted successfully.`);
        setDeleteModalGuide(null);
      } else {
        showNotification('error', data.error || 'Failed to delete guide');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error deleting guide');
    } finally {
      setIsDeleting(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm font-medium shadow-md ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold underline opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#1b4332]" />
            <h2 className="font-serif-heading text-2xl font-bold text-[#0f2d22]">
              Product Guides & Educational Content
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#626c66] mt-1 max-w-2xl">
            Create and manage expert preparation guides, dye release step-by-steps, and herbal hair care recipes linked directly to your products.
          </p>
        </div>

        <Link
          href="/admin/guides/new"
          className="inline-flex items-center gap-2 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all shrink-0 border border-[#c5a059]/30"
        >
          <Plus className="w-4 h-4 text-[#c5a059]" />
          <span>Create New Guide</span>
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#e8e2d5] shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search guides by title, slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-[#faf8f5] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center bg-[#faf8f5] p-1 rounded-xl border border-[#e8e2d5] text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                statusFilter === 'all'
                  ? 'bg-[#1b4332] text-white'
                  : 'text-[#626c66] hover:text-[#0f2d22]'
              }`}
            >
              All ({guides.length})
            </button>
            <button
              onClick={() => setStatusFilter('published')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                statusFilter === 'published'
                  ? 'bg-[#1b4332] text-white'
                  : 'text-[#626c66] hover:text-[#0f2d22]'
              }`}
            >
              Published ({guides.filter((g) => g.isPublished).length})
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                statusFilter === 'draft'
                  ? 'bg-[#1b4332] text-white'
                  : 'text-[#626c66] hover:text-[#0f2d22]'
              }`}
            >
              Drafts ({guides.filter((g) => !g.isPublished).length})
            </button>
          </div>

          {/* Category Filter */}
          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-[#faf8f5] border border-[#e8e2d5] rounded-xl text-[#0f2d22] font-semibold focus:outline-none focus:border-[#1b4332]"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Guides Table */}
      <div className="bg-white rounded-2xl border border-[#e8e2d5] shadow-2xs overflow-hidden">
        {filteredGuides.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-gray-300 mx-auto" />
            <h3 className="font-serif-heading text-lg font-bold text-[#0f2d22]">
              No product guides found
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try resetting your search or filter options.'
                : 'Get started by creating your first product guide or blog article.'}
            </p>
            <Link
              href="/admin/guides/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1b4332] text-[#c5a059] font-bold text-xs rounded-xl hover:bg-[#0f2d22]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Guide</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#faf8f5] border-b border-[#e8e2d5] text-[11px] font-bold text-[#626c66] uppercase tracking-wider">
                  <th className="p-4 pl-6">Guide / Article</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Linked Product</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Homepage Featured</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ebe0] text-xs">
                {filteredGuides.map((guide) => {
                  const linkedProductName = guide.associatedProductId
                    ? productMap.get(guide.associatedProductId)
                    : null;

                  return (
                    <tr key={guide.id} className="hover:bg-[#fcfbf7] transition-colors">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-xl bg-gray-100 border border-[#e8e2d5] overflow-hidden shrink-0">
                            <Image
                              src={guide.coverImage || '/images/fallback.svg'}
                              alt={guide.title}
                              fill
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-[#0f2d22] text-sm leading-snug line-clamp-1">
                              {guide.title}
                            </h4>
                            <span className="text-[11px] text-gray-500 font-mono block">
                              /guides/{guide.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="inline-block bg-[#e8f3ed] text-[#1b4332] font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                          {guide.category || 'General'}
                        </span>
                      </td>

                      <td className="p-4 text-gray-700">
                        {linkedProductName ? (
                          <span className="font-semibold text-[#0f2d22] flex items-center gap-1">
                            <Tag className="w-3 h-3 text-[#c5a059]" />
                            {linkedProductName}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleTogglePublished(guide)}
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full transition-all ${
                            guide.isPublished
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                          }`}
                        >
                          {guide.isPublished ? (
                            <>
                              <CheckCircle className="w-3 h-3" /> Published
                            </>
                          ) : (
                            <>
                              <Clock className="w-3 h-3" /> Draft
                            </>
                          )}
                        </button>
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleToggleFeatured(guide)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            guide.isFeatured
                              ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                              : 'text-gray-300 border-gray-200 hover:text-gray-500'
                          }`}
                          title="Toggle Featured on Homepage"
                        >
                          <Star className={`w-4 h-4 ${guide.isFeatured ? 'fill-amber-400' : ''}`} />
                        </button>
                      </td>

                      <td className="p-4 text-right pr-6">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/guides/${guide.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#1b4332] hover:bg-[#e8f3ed] transition-colors"
                            title="Preview Guide"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <Link
                            href={`/admin/guides/${guide.id}`}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-[#1b4332] hover:bg-[#e8f3ed] transition-colors"
                            title="Edit Guide"
                          >
                            <Edit3 className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => setDeleteModalGuide(guide)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Guide"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Delete Modal */}
      {deleteModalGuide && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-[#e8e2d5] shadow-xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-full bg-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
                Delete Product Guide?
              </h3>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-black">&quot;{deleteModalGuide.title}&quot;</strong>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteModalGuide(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-[#626c66] hover:text-[#0f2d22] bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteGuide}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
