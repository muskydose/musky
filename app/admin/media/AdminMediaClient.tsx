'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import AdminLayout from '@/components/AdminLayout';
import { SiteSettings, Product, Category, MediaItem } from '@/lib/types';
import {
  Image as ImageIcon,
  Upload,
  Search,
  Copy,
  Trash2,
  Eye,
  Check,
  AlertTriangle,
  X,
  Plus,
  RefreshCw,
  FolderOpen,
  Info,
  ExternalLink,
} from 'lucide-react';

interface AdminMediaClientProps {
  initialSettings: SiteSettings;
  initialProducts: Product[];
  initialCategories: Category[];
}

export default function AdminMediaClient({
  initialSettings,
  initialProducts,
  initialCategories,
}: AdminMediaClientProps) {
  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>(initialSettings.mediaLibrary || []);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Upload Modal State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>('general');
  const [uploadAltText, setUploadAltText] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');

  // Preview / Detail Modal State
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  // Deletion State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string>('');

  const refreshMediaLibrary = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/media');
      const data = await res.json();
      if (data.success && Array.isArray(data.mediaLibrary)) {
        setMediaLibrary(data.mediaLibrary);
      }
    } catch (err) {
      console.error('Failed to refresh media library:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/admin/media')
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success && Array.isArray(data.mediaLibrary)) {
          setMediaLibrary(data.mediaLibrary);
        }
      })
      .catch((err) => console.error('Failed to fetch media:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please choose a file to upload.');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('category', uploadCategory);
      formData.append('altText', uploadAltText);
      formData.append('customName', customName);

      const res = await fetch('/api/admin/media', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadAltText('');
        setCustomName('');
        refreshMediaLibrary();
      } else {
        setUploadError(data.error || 'Failed to upload file');
      }
    } catch (err: any) {
      setUploadError('Server error while uploading image.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (item: MediaItem, force: boolean = false) => {
    setDeletingId(item.id);
    setDeleteError('');

    try {
      const res = await fetch(`/api/admin/media?id=${item.id}${force ? '&force=true' : ''}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        if (previewItem?.id === item.id) {
          setPreviewItem(null);
        }
        refreshMediaLibrary();
      } else {
        if (data.usedIn && Array.isArray(data.usedIn) && data.usedIn.length > 0) {
          setDeleteError(
            `Cannot delete asset: This image is currently being used in: ${data.usedIn.join(
              ', '
            )}. Please remove references from product/category settings before deleting.`
          );
        } else {
          setDeleteError(data.error || 'Failed to delete image');
        }
      }
    } catch (err) {
      setDeleteError('Server error while deleting image.');
    } finally {
      setDeletingId(null);
    }
  };

  const categories = [
    { id: 'all', label: 'All Files' },
    { id: 'products', label: 'Products' },
    { id: 'categories', label: 'Categories' },
    { id: 'hero', label: 'Hero Banners' },
    { id: 'factory', label: 'Factory Story' },
    { id: 'brand', label: 'Brand Assets' },
    { id: 'og', label: 'SEO & OG' },
    { id: 'general', label: 'General' },
  ];

  const filteredItems = mediaLibrary.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      !searchTerm.trim() ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.altText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.url.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <AdminLayout title="Media Library">
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0f2d22] text-[#c5a059] flex items-center justify-center shadow-sm">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif-heading font-bold text-2xl text-[#0f2d22]">
                Media Library & Digital Assets
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Centralized storage for product gallery photos, category banners, brand logos, and marketing images.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={refreshMediaLibrary}
              disabled={loading}
              className="p-2.5 bg-[#f5f1e8] text-[#1b4332] hover:bg-[#e8e2d5] rounded-xl font-bold transition-colors"
              title="Refresh Library"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 bg-[#1b4332] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow hover:bg-[#0f2d22] transition-colors"
            >
              <Plus className="w-4 h-4 text-[#c5a059]" />
              <span>Upload New Media</span>
            </button>
          </div>
        </div>

        {/* Global Error Alert */}
        {deleteError && (
          <div className="p-4 bg-rose-50 border border-rose-300 text-rose-800 rounded-2xl text-xs flex items-start gap-3 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Media Deletion Guard</p>
              <p className="mt-0.5">{deleteError}</p>
            </div>
            <button
              onClick={() => setDeleteError('')}
              className="p-1 hover:bg-rose-100 rounded-lg text-rose-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#e8e2d5]">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search images by name or alt text..."
              className="w-full pl-9 pr-4 py-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs focus:outline-none focus:border-[#1b4332]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 text-xs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-2 rounded-xl font-bold shrink-0 transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-[#1b4332] text-white shadow-xs'
                    : 'bg-[#fcfbf7] text-gray-600 border border-[#e8e2d5] hover:bg-[#f5f1e8]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Media Grid */}
        {filteredItems.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-[#e8e2d5] space-y-3">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">No Media Assets Found</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              There are no uploaded images matching your search query or folder filter.
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 bg-[#1b4332] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow hover:bg-[#0f2d22] mt-2"
            >
              <Upload className="w-4 h-4 text-[#c5a059]" /> Upload First Asset
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredItems.map((item) => {
              const isUsed = item.usedIn && item.usedIn.length > 0;
              return (
                <div
                  key={item.id}
                  className="bg-white border border-[#e8e2d5] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
                >
                  <div className="relative aspect-square bg-gray-50 overflow-hidden">
                    <Image
                      src={item.url}
                      alt={item.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />

                    {/* Category Badge */}
                    <div className="absolute top-2 left-2 bg-[#0f2d22]/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md capitalize">
                      {item.category || 'general'}
                    </div>

                    {/* Usage Protection Indicator */}
                    {isUsed && (
                      <div
                        className="absolute top-2 right-2 bg-[#c5a059] text-[#0f2d22] text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1"
                        title={`Used in: ${item.usedIn?.join(', ')}`}
                      >
                        <Check className="w-3 h-3" /> Active
                      </div>
                    )}

                    {/* Quick Hover Actions Overlay */}
                    <div className="absolute inset-0 bg-[#0f2d22]/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => setPreviewItem(item)}
                        className="p-2 bg-white text-[#0f2d22] rounded-xl font-bold shadow hover:bg-[#c5a059] transition-colors"
                        title="Preview Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleCopyUrl(item.url, item.id)}
                        className="p-2 bg-white text-[#0f2d22] rounded-xl font-bold shadow hover:bg-[#c5a059] transition-colors"
                        title="Copy Public URL"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => handleDeleteMedia(item)}
                        disabled={deletingId === item.id}
                        className="p-2 bg-rose-600 text-white rounded-xl font-bold shadow hover:bg-rose-700 transition-colors"
                        title="Delete Image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Card Footer Info */}
                  <div className="p-3 bg-white text-[11px] border-t border-[#e8e2d5]/60 space-y-1">
                    <p className="font-bold text-[#0f2d22] truncate" title={item.name}>
                      {item.name}
                    </p>

                    <div className="flex items-center justify-between text-gray-500 text-[10px]">
                      <span>{(item.size / 1024).toFixed(0)} KB</span>
                      <span>{new Date(item.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detail & Preview Modal */}
        {previewItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white border border-[#e8e2d5] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-5 border-b border-[#e8e2d5] flex items-center justify-between bg-[#0f2d22] text-white">
                <h3 className="font-serif-heading font-bold text-lg text-white">Media Asset Details</h3>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 text-gray-300 hover:text-white hover:bg-[#1b4332] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 text-xs">
                {/* Large Image Preview */}
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gray-100 border border-[#e8e2d5]">
                  <Image
                    src={previewItem.url}
                    alt={previewItem.name}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>

                {/* Metadata Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#fcfbf7] p-4 rounded-xl border border-[#e8e2d5]">
                  <div>
                    <label className="block text-gray-400 font-bold text-[10px] uppercase">File Name</label>
                    <p className="font-bold text-[#0f2d22] mt-0.5">{previewItem.name}</p>
                  </div>

                  <div>
                    <label className="block text-gray-400 font-bold text-[10px] uppercase">Category Folder</label>
                    <p className="font-bold text-[#0f2d22] mt-0.5 capitalize">
                      {previewItem.category || 'general'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-400 font-bold text-[10px] uppercase">File Size</label>
                    <p className="font-bold text-[#0f2d22] mt-0.5">
                      {(previewItem.size / 1024).toFixed(1)} KB ({previewItem.size} bytes)
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-400 font-bold text-[10px] uppercase">MIME Type</label>
                    <p className="font-bold text-[#0f2d22] mt-0.5">{previewItem.type}</p>
                  </div>

                  <div>
                    <label className="block text-gray-400 font-bold text-[10px] uppercase">Uploaded On</label>
                    <p className="font-bold text-[#0f2d22] mt-0.5">
                      {new Date(previewItem.uploadedAt).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <label className="block text-gray-400 font-bold text-[10px] uppercase">Alt Text</label>
                    <p className="font-bold text-[#0f2d22] mt-0.5">{previewItem.altText || 'None'}</p>
                  </div>
                </div>

                {/* Active Usage Section */}
                <div>
                  <label className="block text-[#0f2d22] font-bold mb-1.5 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-[#1b4332]" />
                    <span>Active Website Usage Scan</span>
                  </label>

                  {previewItem.usedIn && previewItem.usedIn.length > 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                      <p className="font-bold text-amber-900 text-[11px]">
                        This image is currently active in {previewItem.usedIn.length} location(s):
                      </p>
                      <ul className="list-disc list-inside text-amber-800 text-[11px] space-y-0.5">
                        {previewItem.usedIn.map((loc, idx) => (
                          <li key={idx}>{loc}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl">
                      Unused asset — safe to delete.
                    </div>
                  )}
                </div>

                {/* Direct URL Input */}
                <div>
                  <label className="block text-[#0f2d22] font-bold mb-1">Public CDN URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={previewItem.url}
                      className="flex-1 p-2.5 bg-[#f5f1e8] border border-[#e8e2d5] rounded-xl font-mono text-[11px] text-gray-700"
                    />
                    <button
                      onClick={() => handleCopyUrl(previewItem.url, previewItem.id)}
                      className="bg-[#1b4332] text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0"
                    >
                      {copiedId === previewItem.id ? (
                        <>
                          <Check className="w-4 h-4 text-[#c5a059]" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-[#c5a059]" /> Copy URL
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-[#e8e2d5] flex items-center justify-between">
                  <button
                    onClick={() => handleDeleteMedia(previewItem)}
                    disabled={deletingId === previewItem.id}
                    className="inline-flex items-center gap-1.5 bg-rose-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-rose-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Image Asset
                  </button>

                  <button
                    onClick={() => setPreviewItem(null)}
                    className="px-5 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white border border-[#e8e2d5] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-[#e8e2d5] flex items-center justify-between bg-[#0f2d22] text-white">
                <div className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-[#c5a059]" />
                  <h3 className="font-serif-heading font-bold text-lg text-white">Upload Media Asset</h3>
                </div>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-1.5 text-gray-300 hover:text-white hover:bg-[#1b4332] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 text-xs">
                {uploadError && (
                  <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl font-medium">
                    {uploadError}
                  </div>
                )}

                <div>
                  <label className="block text-[#0f2d22] font-bold mb-1">Select File</label>
                  <div className="border-2 border-dashed border-[#e8e2d5] hover:border-[#1b4332] rounded-2xl p-6 text-center bg-[#fcfbf7] relative cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-8 h-8 text-[#1b4332] mx-auto mb-2" />
                    {uploadFile ? (
                      <div>
                        <p className="font-bold text-[#1b4332]">{uploadFile.name}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {(uploadFile.size / 1024).toFixed(1)} KB — Click to change
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="font-bold text-[#0f2d22]">Click or Drag & Drop Image Here</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Supports JPG, PNG, WEBP, AVIF, SVG (Max 10MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[#0f2d22] font-bold mb-1">Folder / Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-medium"
                  >
                    <option value="general">General</option>
                    <option value="products">Products</option>
                    <option value="categories">Categories</option>
                    <option value="hero">Hero Banners</option>
                    <option value="factory">Factory Story</option>
                    <option value="brand">Brand Assets</option>
                    <option value="og">SEO & OG</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#0f2d22] font-bold mb-1">Custom Display Name (Optional)</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="e.g. Sojat Henna Powder Banner"
                    className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[#0f2d22] font-bold mb-1">Alt Text (Accessibility)</label>
                  <input
                    type="text"
                    value={uploadAltText}
                    onChange={(e) => setUploadAltText(e.target.value)}
                    placeholder="Describe image for search engines..."
                    className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-[#e8e2d5]">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={uploading || !uploadFile}
                    className="inline-flex items-center gap-1.5 bg-[#1b4332] text-white px-5 py-2.5 rounded-xl font-bold shadow hover:bg-[#0f2d22] disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Upload Asset'}
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
