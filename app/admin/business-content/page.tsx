'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import {
  Award,
  FileCheck,
  ShieldCheck,
  Building,
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Download,
  Calendar,
  Check,
  X,
  FileText,
  BadgeAlert,
  HelpCircle,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  FolderOpen,
} from 'lucide-react';
import { BusinessContentItem, BusinessContentType, BusinessDisplayLocation } from '@/lib/types';

const LOCATION_OPTIONS: { value: BusinessDisplayLocation; label: string }[] = [
  { value: 'documents_page', label: 'Documents Page (/documents)' },
  { value: 'about', label: 'About Us Page (/about)' },
  { value: 'factory', label: 'Our Factory Page (/factory)' },
  { value: 'footer', label: 'Website Footer' },
  { value: 'trust_section', label: 'Homepage Trust Section' },
];

const TYPE_OPTIONS: { value: BusinessContentType; label: string }[] = [
  { value: 'CERTIFICATE', label: 'Certificate / License' },
  { value: 'DOCUMENT', label: 'Report / Document' },
  { value: 'BADGE', label: 'Trust Badge' },
  { value: 'IMAGE', label: 'Media Image' },
  { value: 'TEXT', label: 'Text Block' },
  { value: 'LINK', label: 'External Resource Link' },
];

const BADGE_ICONS = [
  'ShieldCheck',
  'Award',
  'FileCheck',
  'Building',
  'CheckCircle2',
  'FileText',
  'FolderOpen',
];

export default function BusinessContentAdminPage() {
  const [items, setItems] = useState<BusinessContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<BusinessContentItem> | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/business-content');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.items)) {
          setItems(data.items);
        }
      }
    } catch (err) {
      console.error('Failed to load business content items:', err);
      showStatus('error', 'Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleOpenModal = (item?: BusinessContentItem) => {
    if (item) {
      setEditingItem({ ...item });
    } else {
      setEditingItem({
        title: '',
        slug: '',
        type: 'CERTIFICATE',
        shortDescription: '',
        longDescription: '',
        fileUrl: '',
        thumbnailUrl: '',
        badgeIcon: 'ShieldCheck',
        issueDate: '',
        expiryDate: '',
        certificateNumber: '',
        issuingAuthority: '',
        verificationUrl: '',
        downloadEnabled: true,
        published: true,
        displayLocations: ['documents_page'],
        sortOrder: items.length + 1,
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.title?.trim()) {
      showStatus('error', 'Title is required');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/business-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showStatus('success', editingItem.id ? 'Item updated successfully!' : 'New business content created!');
        setIsModalOpen(false);
        setEditingItem(null);
        fetchItems();
      } else {
        showStatus('error', data.error || 'Failed to save business content item.');
      }
    } catch (err: any) {
      showStatus('error', err.message || 'Error saving item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const res = await fetch(`/api/business-content?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showStatus('success', 'Item deleted successfully.');
        fetchItems();
      } else {
        showStatus('error', data.error || 'Failed to delete item.');
      }
    } catch (err: any) {
      showStatus('error', 'Error deleting item.');
    }
  };

  const handleTogglePublished = async (item: BusinessContentItem) => {
    const nextState = !item.published;
    if (nextState && (!item.fileUrl || item.fileUrl.trim() === '' || item.fileUrl === '/images/fallback.svg')) {
      showStatus('error', 'Verification document required before publishing. Please attach a valid document file URL first.');
      return;
    }
    try {
      const updated = { ...item, published: nextState };
      const res = await fetch('/api/business-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        showStatus('success', `Status changed to ${updated.published ? 'Published' : 'Draft'}`);
        fetchItems();
      }
    } catch (err) {
      showStatus('error', 'Failed to toggle status.');
    }
  };

  const toggleLocation = (locationValue: BusinessDisplayLocation) => {
    if (!editingItem) return;
    const currentLocs = editingItem.displayLocations || [];
    let updatedLocs: BusinessDisplayLocation[];
    if (currentLocs.includes(locationValue)) {
      updatedLocs = currentLocs.filter((l) => l !== locationValue);
    } else {
      updatedLocs = [...currentLocs, locationValue];
    }
    setEditingItem({ ...editingItem, displayLocations: updatedLocs });
  };

  // Filtering
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.certificateNumber && item.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.issuingAuthority && item.issuingAuthority.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.shortDescription && item.shortDescription.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'ALL' || item.type.toUpperCase() === selectedType.toUpperCase();

    const matchesLocation =
      selectedLocation === 'ALL' || (item.displayLocations && item.displayLocations.includes(selectedLocation as any));

    return matchesSearch && matchesType && matchesLocation;
  });

  return (
    <AdminLayout title="Business Content & Document CMS">
      <div className="space-y-6">
        {/* Header & Status Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-[#2d6a4f]/20 shadow-sm">
          <div>
            <div className="flex items-center gap-2 text-[#0f2d22]">
              <Award className="w-6 h-6 text-[#c5a059]" />
              <h1 className="text-2xl font-serif-heading font-bold">Business Content & Document CMS</h1>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Manage GST, FSSAI, ISO certificates, lab COA reports, trust badges, and company verification documents across the website.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/documents"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#2d6a4f]/30 text-[#0f2d22] hover:bg-[#f5f1e8] rounded-lg font-medium text-sm transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-[#2d6a4f]" />
              View Public /documents
            </a>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 bg-[#0f2d22] text-[#c5a059] hover:bg-[#1b4332] px-4 py-2.5 rounded-lg font-medium text-sm shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Business Item
            </button>
          </div>
        </div>

        {statusMessage && (
          <div
            className={`p-4 rounded-lg flex items-center justify-between font-medium text-sm ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? <Check className="w-5 h-5 text-emerald-600" /> : <BadgeAlert className="w-5 h-5 text-red-600" />}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-[#2d6a4f]/20">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Total Items</p>
            <p className="text-2xl font-bold text-[#0f2d22] mt-1">{items.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-[#2d6a4f]/20">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Certificates</p>
            <p className="text-2xl font-bold text-[#0f2d22] mt-1">
              {items.filter((i) => i.type === 'CERTIFICATE').length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-[#2d6a4f]/20">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Published</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {items.filter((i) => i.published).length}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg border border-[#2d6a4f]/20">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Footer / About Badges</p>
            <p className="text-2xl font-bold text-[#c5a059] mt-1">
              {items.filter((i) => i.displayLocations?.includes('footer') || i.displayLocations?.includes('about')).length}
            </p>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="bg-white p-4 rounded-xl border border-[#2d6a4f]/20 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, cert number, authority..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/40"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <Filter className="w-4 h-4" />
              <span>Type:</span>
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/40"
            >
              <option value="ALL">All Types</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="py-2 px-3 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/40"
            >
              <option value="ALL">All Display Locations</option>
              {LOCATION_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>

            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 text-sm ${viewMode === 'grid' ? 'bg-[#0f2d22] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                title="Grid View"
              >
                <FolderOpen className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 text-sm ${viewMode === 'table' ? 'bg-[#0f2d22] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                title="Table View"
              >
                <FileText className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Display */}
        {loading ? (
          <div className="bg-white p-12 text-center rounded-xl border border-[#2d6a4f]/20">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-[#2d6a4f] border-t-transparent rounded-full mb-3"></div>
            <p className="text-gray-600 font-medium text-sm">Loading business content records...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-xl border border-[#2d6a4f]/20">
            <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#0f2d22]">No business content found</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
              {searchQuery || selectedType !== 'ALL' || selectedLocation !== 'ALL'
                ? 'Try adjusting your search filters or selected type.'
                : 'Get started by adding your GST, FSSAI, ISO certificates, or trust badges.'}
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="mt-4 inline-flex items-center gap-2 bg-[#0f2d22] text-[#c5a059] px-4 py-2 rounded-lg font-medium text-sm hover:bg-[#1b4332] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Business Item
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`bg-white rounded-xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
                  item.published ? 'border-[#2d6a4f]/30 hover:shadow-md' : 'border-gray-200 opacity-75 bg-gray-50/50'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-[#f5f1e8] text-[#0f2d22] flex items-center justify-center shrink-0">
                        {item.type === 'CERTIFICATE' ? (
                          <Award className="w-5 h-5 text-[#c5a059]" />
                        ) : item.type === 'DOCUMENT' ? (
                          <FileCheck className="w-5 h-5 text-[#2d6a4f]" />
                        ) : (
                          <ShieldCheck className="w-5 h-5 text-[#0f2d22]" />
                        )}
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold tracking-wider text-[#2d6a4f] uppercase bg-[#e8f3ed] px-2 py-0.5 rounded">
                          {item.type}
                        </span>
                        <h3 className="text-base font-bold text-[#0f2d22] line-clamp-1 mt-0.5">{item.title}</h3>
                      </div>
                    </div>

                    <button
                      onClick={() => handleTogglePublished(item)}
                      title={item.published ? 'Click to set as Draft' : 'Click to Publish'}
                      className={`p-1.5 rounded-md text-xs font-semibold flex items-center gap-1 ${
                        item.published
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {item.published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {item.shortDescription && (
                    <p className="text-xs text-gray-600 line-clamp-2 mb-3 leading-relaxed">{item.shortDescription}</p>
                  )}

                  <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                    {item.certificateNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Cert No:</span>
                        <span className="font-mono font-medium text-gray-800">{item.certificateNumber}</span>
                      </div>
                    )}
                    {item.issuingAuthority && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Authority:</span>
                        <span className="font-medium text-gray-800 line-clamp-1">{item.issuingAuthority}</span>
                      </div>
                    )}
                    {item.issueDate && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Issued:</span>
                        <span>{item.issueDate}</span>
                      </div>
                    )}
                  </div>

                  {/* Display locations tags */}
                  <div>
                    <span className="text-[11px] font-medium text-gray-400 block mb-1">Display Locations:</span>
                    <div className="flex flex-wrap gap-1">
                      {item.displayLocations?.map((loc) => (
                        <span key={loc} className="text-[10px] bg-[#f5f1e8] text-[#0f2d22] px-2 py-0.5 rounded font-medium">
                          {loc.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {item.fileUrl && (
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[#2d6a4f] hover:underline font-medium"
                      >
                        <Download className="w-3.5 h-3.5" />
                        File PDF
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(item)}
                      className="p-1.5 text-gray-600 hover:text-[#0f2d22] hover:bg-white rounded transition-colors"
                      title="Edit Item"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, item.title)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-white rounded transition-colors"
                      title="Delete Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#2d6a4f]/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#0f2d22] text-[#c5a059] font-serif-heading">
                    <th className="p-3 font-semibold">Title</th>
                    <th className="p-3 font-semibold">Type</th>
                    <th className="p-3 font-semibold">Certificate / Ref</th>
                    <th className="p-3 font-semibold">Issuing Authority</th>
                    <th className="p-3 font-semibold">Locations</th>
                    <th className="p-3 font-semibold">Status</th>
                    <th className="p-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-700">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="p-3 font-bold text-[#0f2d22]">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-[#c5a059] shrink-0" />
                          <span>{item.title}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="bg-[#e8f3ed] text-[#2d6a4f] px-2 py-0.5 rounded font-semibold text-[10px]">
                          {item.type}
                        </span>
                      </td>
                      <td className="p-3 font-mono">{item.certificateNumber || '—'}</td>
                      <td className="p-3">{item.issuingAuthority || '—'}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {item.displayLocations?.map((loc) => (
                            <span key={loc} className="bg-gray-100 text-gray-700 text-[9px] px-1.5 py-0.5 rounded">
                              {loc.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.published ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {item.published ? 'Published' : 'Draft'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenModal(item)}
                            className="p-1 text-gray-600 hover:text-[#0f2d22]"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.title)}
                            className="p-1 text-red-500 hover:text-red-700"
                            title="Delete"
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

        {/* Create / Edit Modal Form */}
        {isModalOpen && editingItem && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-[#2d6a4f]/30 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-gray-200 mb-6">
                <div className="flex items-center gap-2 text-[#0f2d22]">
                  <Award className="w-6 h-6 text-[#c5a059]" />
                  <h2 className="text-xl font-serif-heading font-bold">
                    {editingItem.id ? 'Edit Business Content' : 'Add New Business Content'}
                  </h2>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GST Registration Certificate"
                      value={editingItem.title || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Content Type
                    </label>
                    <select
                      value={editingItem.type || 'CERTIFICATE'}
                      onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value as BusinessContentType })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/40"
                    >
                      {TYPE_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Short Description
                  </label>
                  <input
                    type="text"
                    placeholder="Brief summary displayed on cards & footer"
                    value={editingItem.shortDescription || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, shortDescription: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/40"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Full Description & Scope
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Detailed explanation of certification, compliance, or document scope..."
                    value={editingItem.longDescription || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, longDescription: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/40"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Certificate / License / Reference Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 08XXXXX1234X1Z5"
                      value={editingItem.certificateNumber || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, certificateNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/40 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Issuing Authority
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Government of India / FSSAI / ISO"
                      value={editingItem.issuingAuthority || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, issuingAuthority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Document File URL (PDF/Image)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. /images/cert-gst.pdf"
                      value={editingItem.fileUrl || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, fileUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      External Verification Portal URL
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. https://services.gst.gov.in"
                      value={editingItem.verificationUrl || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, verificationUrl: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Issue Date
                    </label>
                    <input
                      type="date"
                      value={editingItem.issueDate || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, issueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/40"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Expiry Date (If applicable)
                    </label>
                    <input
                      type="date"
                      value={editingItem.expiryDate || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, expiryDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/40"
                    />
                  </div>
                </div>

                {/* Display Placement Checkboxes */}
                <div className="bg-[#f5f1e8]/50 p-4 rounded-xl border border-[#2d6a4f]/20">
                  <label className="block text-xs font-bold text-[#0f2d22] uppercase tracking-wider mb-2">
                    Where Should This Display? (Select all that apply)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {LOCATION_OPTIONS.map((loc) => {
                      const isChecked = editingItem.displayLocations?.includes(loc.value);
                      return (
                        <label
                          key={loc.value}
                          className="flex items-center gap-2 text-xs text-gray-800 bg-white p-2.5 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleLocation(loc.value)}
                            className="rounded text-[#2d6a4f] focus:ring-[#2d6a4f]"
                          />
                          <span className="font-medium">{loc.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Toggles & Sort */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingItem.published ?? true}
                      onChange={(e) => setEditingItem({ ...editingItem, published: e.target.checked })}
                      className="rounded text-[#2d6a4f] focus:ring-[#2d6a4f]"
                    />
                    <span>Published (Live)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingItem.downloadEnabled ?? true}
                      onChange={(e) => setEditingItem({ ...editingItem, downloadEnabled: e.target.checked })}
                      className="rounded text-[#2d6a4f] focus:ring-[#2d6a4f]"
                    />
                    <span>Allow PDF Download</span>
                  </label>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editingItem.sortOrder ?? 1}
                      onChange={(e) => setEditingItem({ ...editingItem, sortOrder: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/40"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-[#0f2d22] text-[#c5a059] hover:bg-[#1b4332] rounded-lg text-sm font-bold shadow-sm disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Business Content'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
