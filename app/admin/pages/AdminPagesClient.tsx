'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CustomPage,
  CustomPageSection,
  CustomSectionType,
  Product,
  Category,
  FAQItem,
} from '@/lib/types';
import {
  Plus,
  Trash2,
  Edit,
  Eye,
  ArrowUp,
  ArrowDown,
  Check,
  X,
  FileText,
  ExternalLink,
  Layers,
  Save,
  Globe,
  Search,
  Sparkles,
  HelpCircle,
  MessageCircle,
  Grid,
  Type,
  Image as ImageIcon,
  AlertCircle,
  Clock,
} from 'lucide-react';

interface AdminPagesClientProps {
  initialPages: CustomPage[];
  products: Product[];
  categories: Category[];
}

const SECTION_TYPE_LABELS: Record<CustomSectionType, { name: string; description: string; icon: any }> = {
  heading_text: {
    name: 'Heading & Text Block',
    description: 'Formatted title, subtitle, and paragraph text with custom background.',
    icon: Type,
  },
  image_text: {
    name: 'Image + Text Block',
    description: 'Side-by-side image with text description and call-to-action button.',
    icon: ImageIcon,
  },
  banner_cta: {
    name: 'Banner / Call to Action',
    description: 'Promotional highlight box with title, subtitle, and primary button.',
    icon: Sparkles,
  },
  product_grid: {
    name: 'Product Grid',
    description: 'Showcase selected products or category collections.',
    icon: Grid,
  },
  category_grid: {
    name: 'Category Grid',
    description: 'Highlight herbal product categories with direct navigation.',
    icon: Layers,
  },
  faq: {
    name: 'FAQ Accordion',
    description: 'Interactive expandable question & answer list.',
    icon: HelpCircle,
  },
  whatsapp_cta: {
    name: 'WhatsApp Order CTA',
    description: 'High-conversion WhatsApp order and enquiry callout.',
    icon: MessageCircle,
  },
};

export default function AdminPagesClient({
  initialPages = [],
  products = [],
  categories = [],
}: AdminPagesClientProps) {
  const [pages, setPages] = useState<CustomPage[]>(initialPages);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Editor Modal state
  const [editingPage, setEditingPage] = useState<CustomPage | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'sections'>('details');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  // Confirm Delete Modal state
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);

  const refreshPages = async () => {
    try {
      const res = await fetch('/api/custom-pages');
      const data = await res.json();
      if (data.success) {
        setPages(data.pages || []);
      }
    } catch (err) {
      console.error('Failed to refresh custom pages:', err);
    }
  };

  const handleCreateNewPage = () => {
    const newPage: CustomPage = {
      id: `page-${Date.now()}`,
      title: 'New Custom Page',
      slug: `custom-page-${Date.now().toString().slice(-4)}`,
      description: 'A custom content page for Musky Dose customers.',
      seoTitle: '',
      seoDescription: '',
      published: false,
      sections: [
        {
          id: `sec-${Date.now()}-1`,
          type: 'heading_text',
          title: 'Welcome to Our Custom Page',
          subtitle: 'Pure Sojat Henna Heritage',
          enabled: true,
          sortOrder: 1,
          content: {
            heading: 'Authentic Henna Solutions',
            subheading: 'SOJAT HERBAL CARE',
            bodyText:
              'Learn more about our premium henna and herbal products direct from Sojat, Rajasthan.',
            textAlignment: 'left',
            backgroundColor: 'default',
          },
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingPage(newPage);
    setActiveTab('details');
    setEditingSectionId(newPage.sections[0]?.id || null);
  };

  const handleSavePage = async () => {
    if (!editingPage) return;
    if (!editingPage.title.trim()) {
      setMessage({ type: 'error', text: 'Page Title cannot be empty.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/custom-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPage),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Custom page saved successfully!' });
        setEditingPage(null);
        await refreshPages();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save custom page.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePage = async (id: string) => {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/custom-pages?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Page deleted successfully.' });
        setDeletingPageId(null);
        await refreshPages();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to delete page.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An unexpected error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (page: CustomPage) => {
    setLoading(true);
    try {
      const updated = { ...page, published: !page.published };
      const res = await fetch('/api/custom-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: 'success',
          text: `Page "${page.title}" ${updated.published ? 'published' : 'unpublished'}.`,
        });
        await refreshPages();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update status.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update page status.' });
    } finally {
      setLoading(false);
    }
  };

  const filteredPages = pages.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs">
        <div>
          <h1 className="font-serif-heading text-2xl font-bold text-[#0f2d22] flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#1b4332]" />
            <span>Custom CMS Pages</span>
          </h1>
          <p className="text-xs text-gray-600 mt-1">
            Create, manage, and publish custom marketing and customer content pages.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateNewPage}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1b4332] hover:bg-[#0f2d22] text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Page</span>
        </button>
      </div>

      {/* Global Status Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#e8e2d5] flex items-center gap-3">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search custom pages by title or slug..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs outline-hidden bg-transparent text-[#0f2d22]"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Clear
          </button>
        )}
      </div>

      {/* Pages Table / Grid */}
      {filteredPages.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-[#e8e2d5] text-center space-y-3">
          <FileText className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="font-bold text-sm text-[#0f2d22]">No custom pages found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            {searchQuery
              ? 'No pages match your search query.'
              : 'Click "Create New Page" above to add your first customer-facing content page.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#e8e2d5] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] text-gray-700 font-bold uppercase tracking-wider border-b border-[#e8e2d5]">
                <tr>
                  <th className="py-3.5 px-4">Page Title & Slug</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Sections</th>
                  <th className="py-3.5 px-4">Last Updated</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f1e8]">
                {filteredPages.map((page) => (
                  <tr key={page.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-sm text-[#0f2d22]">{page.title}</div>
                      <div className="text-[11px] font-mono text-emerald-800 pt-0.5">
                        /pages/{page.slug}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(page)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${
                          page.published
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            page.published ? 'bg-emerald-600' : 'bg-amber-600'
                          }`}
                        />
                        <span>{page.published ? 'Published' : 'Draft'}</span>
                      </button>
                    </td>

                    <td className="py-4 px-4 text-gray-600 font-medium">
                      {page.sections?.length || 0} sections
                    </td>

                    <td className="py-4 px-4 text-gray-500 text-[11px]">
                      {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/pages/${page.slug}`}
                          target="_blank"
                          className="p-2 text-gray-500 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="View Live Page"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingPage({ ...page });
                            setActiveTab('details');
                            setEditingSectionId(page.sections?.[0]?.id || null);
                          }}
                          className="p-2 text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors font-semibold flex items-center gap-1"
                          title="Edit Page & Sections"
                        >
                          <Edit className="w-4 h-4" />
                          <span className="hidden sm:inline text-xs">Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingPageId(page.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Page"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* PAGE EDITOR MODAL */}
      {/* ============================================================ */}
      {editingPage && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-[#e8e2d5] max-h-[92vh] flex flex-col overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="bg-[#0f2d22] text-white p-5 px-6 flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-serif-heading font-bold text-lg text-white">
                  {editingPage.id.startsWith('page-') ? 'Edit Custom Page' : 'Edit Custom Page'}
                </h2>
                <p className="text-xs text-emerald-200/80">/pages/{editingPage.slug || 'slug'}</p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/pages/${editingPage.slug}`}
                  target="_blank"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setEditingPage(null)}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="bg-[#FAF8F5] border-b border-[#e8e2d5] px-6 flex gap-6 shrink-0 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`py-3 border-b-2 transition-all ${
                  activeTab === 'details'
                    ? 'border-[#1b4332] text-[#0f2d22]'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                1. Page Info & SEO
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('sections')}
                className={`py-3 border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'sections'
                    ? 'border-[#1b4332] text-[#0f2d22]'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>2. Content Sections</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px]">
                  {editingPage.sections?.length || 0}
                </span>
              </button>
            </div>

            {/* Modal Body Scroll Area */}
            <div className="p-6 overflow-y-auto flex-grow space-y-6">
              {/* TAB 1: DETAILS & SEO */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Title */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">
                        Page Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editingPage.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditingPage({
                            ...editingPage,
                            title: val,
                          });
                        }}
                        placeholder="e.g. Pure Sojat Henna Buying Guide"
                        className="w-full text-xs p-3 rounded-xl border border-[#e8e2d5] outline-hidden focus:border-[#1b4332]"
                      />
                    </div>

                    {/* Slug */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700">
                        URL Slug <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 font-mono">/pages/</span>
                        <input
                          type="text"
                          value={editingPage.slug}
                          onChange={(e) =>
                            setEditingPage({
                              ...editingPage,
                              slug: e.target.value
                                .toLowerCase()
                                .replace(/[^a-z0-9-]/g, '-'),
                            })
                          }
                          placeholder="sojat-henna-guide"
                          className="w-full text-xs p-3 rounded-xl border border-[#e8e2d5] font-mono outline-hidden focus:border-[#1b4332]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700">Page Short Description</label>
                    <textarea
                      rows={2}
                      value={editingPage.description || ''}
                      onChange={(e) => setEditingPage({ ...editingPage, description: e.target.value })}
                      placeholder="Brief overview displayed on top banner and listings..."
                      className="w-full text-xs p-3 rounded-xl border border-[#e8e2d5] outline-hidden focus:border-[#1b4332]"
                    />
                  </div>

                  {/* Published Toggle */}
                  <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#e8e2d5] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-[#0f2d22]">Page Visibility Status</div>
                      <div className="text-[11px] text-gray-500">
                        {editingPage.published
                          ? 'This page is active and publicly accessible at /pages/' + editingPage.slug
                          : 'Draft mode — visible only to logged-in admins.'}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEditingPage({ ...editingPage, published: !editingPage.published })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        editingPage.published ? 'bg-[#1b4332]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          editingPage.published ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* SEO Metadata Box */}
                  <div className="space-y-4 pt-4 border-t border-[#f5f1e8]">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <Globe className="w-4 h-4" />
                      <span>SEO & Search Engine Settings</span>
                    </h3>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">SEO Meta Title</label>
                        <input
                          type="text"
                          value={editingPage.seoTitle || ''}
                          onChange={(e) => setEditingPage({ ...editingPage, seoTitle: e.target.value })}
                          placeholder={editingPage.title || 'Page Title | Musky Dose'}
                          className="w-full text-xs p-3 rounded-xl border border-[#e8e2d5] outline-hidden focus:border-[#1b4332]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700">SEO Meta Description</label>
                        <textarea
                          rows={2}
                          value={editingPage.seoDescription || ''}
                          onChange={(e) =>
                            setEditingPage({ ...editingPage, seoDescription: e.target.value })
                          }
                          placeholder={editingPage.description || 'Describe this page for Google search results...'}
                          className="w-full text-xs p-3 rounded-xl border border-[#e8e2d5] outline-hidden focus:border-[#1b4332]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SECTIONS MANAGEMENT */}
              {activeTab === 'sections' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Sections List */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#0f2d22]">Page Sections Order</span>

                      {/* Add Section Selector */}
                      <AddSectionDropdown
                        onAdd={(type) => {
                          const newSec: CustomPageSection = {
                            id: `sec-${Date.now()}`,
                            type,
                            title: SECTION_TYPE_LABELS[type].name,
                            subtitle: 'Section Subheading',
                            enabled: true,
                            sortOrder: (editingPage.sections?.length || 0) + 1,
                            content: {
                              heading: SECTION_TYPE_LABELS[type].name,
                              subheading: 'SOJAT HERBAL',
                              bodyText: 'Content paragraph details...',
                              textAlignment: 'left',
                              backgroundColor: 'default',
                              buttonText: 'EXPLORE MORE',
                              buttonLink: '/products',
                            },
                          };
                          const updatedSecs = [...(editingPage.sections || []), newSec];
                          setEditingPage({ ...editingPage, sections: updatedSecs });
                          setEditingSectionId(newSec.id);
                        }}
                      />
                    </div>

                    {/* List of Sections */}
                    <div className="space-y-2">
                      {editingPage.sections?.map((sec, idx) => {
                        const isSelected = editingSectionId === sec.id;
                        const SecIcon = SECTION_TYPE_LABELS[sec.type]?.icon || FileText;

                        return (
                          <div
                            key={sec.id}
                            className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-emerald-50 border-[#1b4332] shadow-xs'
                                : 'bg-white border-[#e8e2d5] hover:border-gray-300'
                            }`}
                          >
                            <div
                              className="flex items-center gap-3 cursor-pointer flex-grow min-w-0"
                              onClick={() => setEditingSectionId(sec.id)}
                            >
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                  isSelected ? 'bg-[#1b4332] text-white' : 'bg-[#FAF8F5] text-emerald-800'
                                }`}
                              >
                                <SecIcon className="w-4 h-4" />
                              </div>

                              <div className="truncate">
                                <div className="font-bold text-xs text-[#0f2d22] truncate">
                                  {sec.title || SECTION_TYPE_LABELS[sec.type]?.name}
                                </div>
                                <div className="text-[10px] text-gray-500 truncate">
                                  {SECTION_TYPE_LABELS[sec.type]?.name}
                                </div>
                              </div>
                            </div>

                            {/* Section Actions */}
                            <div className="flex items-center gap-1 shrink-0">
                              {/* Move Up */}
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => {
                                  if (idx === 0) return;
                                  const secs = [...editingPage.sections];
                                  const temp = secs[idx - 1];
                                  secs[idx - 1] = secs[idx];
                                  secs[idx] = temp;
                                  setEditingPage({ ...editingPage, sections: secs });
                                }}
                                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>

                              {/* Move Down */}
                              <button
                                type="button"
                                disabled={idx === editingPage.sections.length - 1}
                                onClick={() => {
                                  if (idx === editingPage.sections.length - 1) return;
                                  const secs = [...editingPage.sections];
                                  const temp = secs[idx + 1];
                                  secs[idx + 1] = secs[idx];
                                  secs[idx] = temp;
                                  setEditingPage({ ...editingPage, sections: secs });
                                }}
                                className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>

                              {/* Toggle Enable */}
                              <button
                                type="button"
                                onClick={() => {
                                  const secs = editingPage.sections.map((s) =>
                                    s.id === sec.id ? { ...s, enabled: !s.enabled } : s
                                  );
                                  setEditingPage({ ...editingPage, sections: secs });
                                }}
                                className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  sec.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                                }`}
                              >
                                {sec.enabled ? 'ON' : 'OFF'}
                              </button>

                              {/* Delete Section */}
                              <button
                                type="button"
                                onClick={() => {
                                  const secs = editingPage.sections.filter((s) => s.id !== sec.id);
                                  setEditingPage({ ...editingPage, sections: secs });
                                  if (editingSectionId === sec.id) {
                                    setEditingSectionId(secs[0]?.id || null);
                                  }
                                }}
                                className="p-1 text-red-500 hover:bg-red-50 rounded-md"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Active Section Editor */}
                  <div className="lg:col-span-7 bg-[#FAF8F5] p-5 rounded-2xl border border-[#e8e2d5] space-y-4">
                    {editingSectionId ? (
                      <SectionEditorForm
                        section={editingPage.sections.find((s) => s.id === editingSectionId)!}
                        products={products}
                        categories={categories}
                        onChange={(updatedSec) => {
                          const secs = editingPage.sections.map((s) =>
                            s.id === updatedSec.id ? updatedSec : s
                          );
                          setEditingPage({ ...editingPage, sections: secs });
                        }}
                      />
                    ) : (
                      <div className="text-center py-12 text-xs text-gray-500 font-medium">
                        Select a section on the left to customize its contents.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="bg-[#FAF8F5] border-t border-[#e8e2d5] p-4 px-6 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setEditingPage(null)}
                className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleSavePage}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1b4332] hover:bg-[#0f2d22] text-white font-extrabold text-xs rounded-xl shadow-md transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Saving Page...' : 'Save & Update Page'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingPageId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#e8e2d5] shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
                Delete Custom Page?
              </h3>
              <p className="text-xs text-gray-600">
                This action will permanently remove this page and its sections. Public links to this slug will return 404.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingPageId(null)}
                className="w-1/2 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDeletePage(deletingPageId)}
                className="w-1/2 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                {loading ? 'Deleting...' : 'Yes, Delete Page'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AddSectionDropdown({ onAdd }: { onAdd: (type: CustomSectionType) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1b4332] text-white hover:bg-[#0f2d22] font-bold text-[11px] rounded-xl transition-all"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add Section</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-[#e8e2d5] shadow-xl z-20 py-2 divide-y divide-[#f5f1e8]">
            {(Object.keys(SECTION_TYPE_LABELS) as CustomSectionType[]).map((type) => {
              const info = SECTION_TYPE_LABELS[type];
              const Icon = info.icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    onAdd(type);
                    setOpen(false);
                  }}
                  className="w-full p-2.5 px-3 text-left hover:bg-[#FAF8F5] flex items-start gap-2.5 transition-colors"
                >
                  <Icon className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-xs text-[#0f2d22]">{info.name}</div>
                    <div className="text-[10px] text-gray-500 leading-tight">
                      {info.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function SectionEditorForm({
  section,
  products,
  categories,
  onChange,
}: {
  section: CustomPageSection;
  products: Product[];
  categories: Category[];
  onChange: (sec: CustomPageSection) => void;
}) {
  if (!section) return null;

  const content = section.content || {};

  const updateContent = (field: string, value: any) => {
    onChange({
      ...section,
      content: {
        ...content,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-3">
        <div>
          <h4 className="font-bold text-xs text-[#0f2d22]">
            Editing: {SECTION_TYPE_LABELS[section.type]?.name}
          </h4>
          <span className="text-[10px] text-gray-500 font-mono">ID: {section.id}</span>
        </div>
      </div>

      {/* Internal Section Title */}
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-gray-700">Internal Admin Title</label>
        <input
          type="text"
          value={section.title || ''}
          onChange={(e) => onChange({ ...section, title: e.target.value })}
          placeholder="e.g. Hero Section"
          className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#e8e2d5] outline-hidden focus:border-[#1b4332]"
        />
      </div>

      {/* TYPE-SPECIFIC EDITORS */}
      {(section.type === 'heading_text' ||
        section.type === 'image_text' ||
        section.type === 'banner_cta' ||
        section.type === 'whatsapp_cta') && (
        <>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-700">Heading Text</label>
            <input
              type="text"
              value={content.heading || ''}
              onChange={(e) => updateContent('heading', e.target.value)}
              placeholder="e.g. Authentic Sojat Quality"
              className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#e8e2d5] outline-hidden focus:border-[#1b4332]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-700">Subheading / Eyebrow Text</label>
            <input
              type="text"
              value={content.subheading || ''}
              onChange={(e) => updateContent('subheading', e.target.value)}
              placeholder="e.g. DIRECT FROM RAJASTHAN"
              className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#e8e2d5] outline-hidden focus:border-[#1b4332]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-700">Body Paragraph Text</label>
            <textarea
              rows={4}
              value={content.bodyText || ''}
              onChange={(e) => updateContent('bodyText', e.target.value)}
              placeholder="Enter detailed content text..."
              className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#e8e2d5] outline-hidden focus:border-[#1b4332]"
            />
          </div>
        </>
      )}

      {/* Image Text Specific */}
      {section.type === 'image_text' && (
        <>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-700">Image URL</label>
            <input
              type="text"
              value={content.imageUrl || ''}
              onChange={(e) => updateContent('imageUrl', e.target.value)}
              placeholder="/images/fallback.svg or https://..."
              className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#e8e2d5] outline-hidden focus:border-[#1b4332]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700">Image Position</label>
              <select
                value={content.imagePosition || 'left'}
                onChange={(e) => updateContent('imagePosition', e.target.value)}
                className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#e8e2d5]"
              >
                <option value="left">Left Side</option>
                <option value="right">Right Side</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-700">Button Text</label>
              <input
                type="text"
                value={content.buttonText || ''}
                onChange={(e) => updateContent('buttonText', e.target.value)}
                placeholder="EXPLORE PRODUCTS"
                className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#e8e2d5]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-700">Button Link URL</label>
            <input
              type="text"
              value={content.buttonLink || ''}
              onChange={(e) => updateContent('buttonLink', e.target.value)}
              placeholder="/products or https://..."
              className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#e8e2d5]"
            />
          </div>
        </>
      )}

      {/* Heading Text Specific Options */}
      {section.type === 'heading_text' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-700">Text Alignment</label>
            <select
              value={content.textAlignment || 'left'}
              onChange={(e) => updateContent('textAlignment', e.target.value)}
              className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#e8e2d5]"
            >
              <option value="left">Left Aligned</option>
              <option value="center">Centered</option>
              <option value="right">Right Aligned</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-700">Background Color</label>
            <select
              value={content.backgroundColor || 'default'}
              onChange={(e) => updateContent('backgroundColor', e.target.value)}
              className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#e8e2d5]"
            >
              <option value="default">Default White</option>
              <option value="neutral">Warm Neutral Cream</option>
              <option value="emerald">Sojat Emerald Dark</option>
              <option value="dark">Charcoal Dark</option>
            </select>
          </div>
        </div>
      )}

      {/* Banner CTA Options */}
      {section.type === 'banner_cta' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-700">Button Text</label>
            <input
              type="text"
              value={content.buttonText || ''}
              onChange={(e) => updateContent('buttonText', e.target.value)}
              placeholder="ORDER ON WHATSAPP"
              className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#e8e2d5]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-700">Button Link</label>
            <input
              type="text"
              value={content.buttonLink || ''}
              onChange={(e) => updateContent('buttonLink', e.target.value)}
              placeholder="/products or https://wa.me/..."
              className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#e8e2d5]"
            />
          </div>
        </div>
      )}

      {/* Product Grid Options */}
      {section.type === 'product_grid' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-700">Filter by Category</label>
            <select
              value={content.categoryId || ''}
              onChange={(e) => updateContent('categoryId', e.target.value || undefined)}
              className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#e8e2d5]"
            >
              <option value="">All Active Products</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-gray-700">Display Limit Count</label>
            <input
              type="number"
              min={1}
              max={24}
              value={content.productCount || 8}
              onChange={(e) => updateContent('productCount', parseInt(e.target.value) || 8)}
              className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#e8e2d5]"
            />
          </div>
        </div>
      )}

      {/* FAQ Editor */}
      {section.type === 'faq' && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-gray-700">Q&A Items List</label>
            <button
              type="button"
              onClick={() => {
                const faqs = content.faqs || [];
                const newFaq = {
                  id: `faq-${Date.now()}`,
                  question: 'New Question?',
                  answer: 'Answer detail text...',
                };
                updateContent('faqs', [...faqs, newFaq]);
              }}
              className="text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-1 rounded-md"
            >
              + Add Q&A
            </button>
          </div>

          <div className="space-y-3">
            {(content.faqs || []).map((faqItem: any, idx: number) => (
              <div key={faqItem.id} className="bg-white p-3 rounded-xl border border-[#e8e2d5] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500">Q&A #{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const faqs = (content.faqs || []).filter((f: any) => f.id !== faqItem.id);
                      updateContent('faqs', faqs);
                    }}
                    className="text-red-500 text-[10px] hover:underline"
                  >
                    Remove
                  </button>
                </div>

                <input
                  type="text"
                  value={faqItem.question}
                  onChange={(e) => {
                    const faqs = [...(content.faqs || [])];
                    faqs[idx].question = e.target.value;
                    updateContent('faqs', faqs);
                  }}
                  placeholder="Question text..."
                  className="w-full text-xs p-2 bg-[#FAF8F5] rounded-lg border border-[#e8e2d5]"
                />

                <textarea
                  rows={2}
                  value={faqItem.answer}
                  onChange={(e) => {
                    const faqs = [...(content.faqs || [])];
                    faqs[idx].answer = e.target.value;
                    updateContent('faqs', faqs);
                  }}
                  placeholder="Answer explanation..."
                  className="w-full text-xs p-2 bg-[#FAF8F5] rounded-lg border border-[#e8e2d5]"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WhatsApp CTA Options */}
      {section.type === 'whatsapp_cta' && (
        <div className="space-y-2">
          <label className="text-[11px] font-bold text-gray-700">Pre-filled WhatsApp Message Template</label>
          <textarea
            rows={3}
            value={content.whatsappMessage || ''}
            onChange={(e) => updateContent('whatsappMessage', e.target.value)}
            placeholder="Hello Musky Dose! I would like to place an enquiry..."
            className="w-full text-xs p-2.5 bg-white rounded-xl border border-[#e8e2d5]"
          />
        </div>
      )}
    </div>
  );
}
