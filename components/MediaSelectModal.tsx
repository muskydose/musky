'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { MediaItem } from '@/lib/types';
import { Search, Upload, X, Check, Image as ImageIcon, Plus, Loader2 } from 'lucide-react';

interface MediaSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, item?: MediaItem) => void;
  categoryFilter?: string;
  title?: string;
}

export default function MediaSelectModal({
  isOpen,
  onClose,
  onSelect,
  categoryFilter,
  title = 'Select Image from Media Library',
}: MediaSelectModalProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryFilter || 'all');
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');

  // Upload State inside modal
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>(categoryFilter || 'general');
  const [uploadAltText, setUploadAltText] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');

  const [prevCategoryFilter, setPrevCategoryFilter] = useState<string | undefined>(categoryFilter);
  if (categoryFilter !== prevCategoryFilter) {
    setPrevCategoryFilter(categoryFilter);
    setSelectedCategory(categoryFilter || 'all');
    setUploadCategory(categoryFilter || 'general');
  }

  const fetchMediaItems = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/media');
      const data = await res.json();
      if (data.success && Array.isArray(data.mediaLibrary)) {
        setMediaItems(data.mediaLibrary);
      }
    } catch (err) {
      console.error('Failed to load media items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    fetch('/api/admin/media')
      .then((res) => res.json())
      .then((data) => {
        if (active && data.success && Array.isArray(data.mediaLibrary)) {
          setMediaItems(data.mediaLibrary);
        }
      })
      .catch((err) => console.error('Failed to load media items:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('category', uploadCategory);
      formData.append('altText', uploadAltText);

      const res = await fetch('/api/admin/media', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.mediaItem) {
        // Auto-select newly uploaded media
        onSelect(data.mediaItem.url, data.mediaItem);
        onClose();
      } else {
        setUploadError(data.error || 'Failed to upload image.');
      }
    } catch (err: any) {
      setUploadError('Server error while uploading image.');
    } finally {
      setUploading(false);
    }
  };

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Media' },
    { id: 'products', label: 'Products' },
    { id: 'categories', label: 'Categories' },
    { id: 'hero', label: 'Hero Banners' },
    { id: 'factory', label: 'Factory Story' },
    { id: 'brand', label: 'Brand & Logo' },
    { id: 'og', label: 'SEO & OG' },
    { id: 'general', label: 'General' },
  ];

  const filteredItems = mediaItems.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      !searchTerm.trim() ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.altText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.url.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-[#e8e2d5] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#e8e2d5] flex items-center justify-between bg-[#0f2d22] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#1b4332] flex items-center justify-center text-[#c5a059]">
              <ImageIcon className="w-4 h-4" />
            </div>
            <h3 className="font-serif-heading font-bold text-lg text-white">{title}</h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-[#1b4332] p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('library')}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  activeTab === 'library' ? 'bg-[#c5a059] text-[#0f2d22]' : 'text-gray-200 hover:text-white'
                }`}
              >
                Browse Library
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-3 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                  activeTab === 'upload' ? 'bg-[#c5a059] text-[#0f2d22]' : 'text-gray-200 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> Upload New
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-gray-300 hover:text-white hover:bg-[#1b4332] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4 bg-[#fcfbf7]">
          {activeTab === 'library' ? (
            <>
              {/* Search & Category Filter */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search images by name..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-[#e8e2d5] rounded-xl text-xs focus:outline-none focus:border-[#1b4332]"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 text-xs">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg font-medium shrink-0 transition-colors ${
                        selectedCategory === cat.id
                          ? 'bg-[#1b4332] text-white font-bold'
                          : 'bg-white text-gray-600 border border-[#e8e2d5] hover:bg-[#f5f1e8]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid View */}
              {loading ? (
                <div className="py-20 text-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-[#1b4332] mx-auto" />
                  <p className="text-xs font-bold text-[#0f2d22]">Loading Media Assets...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-[#e8e2d5] space-y-3">
                  <ImageIcon className="w-10 h-10 text-gray-300 mx-auto" />
                  <p className="text-sm font-bold text-[#0f2d22]">No Media Images Found</p>
                  <p className="text-xs text-gray-500">
                    Try clearing search or upload a new image to your library.
                  </p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="inline-flex items-center gap-1.5 bg-[#1b4332] text-white px-4 py-2 rounded-xl text-xs font-bold shadow hover:bg-[#0f2d22]"
                  >
                    <Plus className="w-4 h-4 text-[#c5a059]" /> Upload Image Now
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onSelect(item.url, item);
                        onClose();
                      }}
                      className="group relative bg-white border border-[#e8e2d5] hover:border-[#1b4332] rounded-xl overflow-hidden cursor-pointer shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="relative aspect-square bg-gray-50 overflow-hidden">
                        <Image
                          src={item.url}
                          alt={item.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-[#0f2d22]/0 group-hover:bg-[#0f2d22]/40 transition-all flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 bg-[#1b4332] text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1 scale-95 group-hover:scale-100 transition-all">
                            <Check className="w-3.5 h-3.5 text-[#c5a059]" /> Select
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 text-[11px] bg-white border-t border-[#e8e2d5]/60">
                        <div className="font-bold text-[#0f2d22] truncate" title={item.name}>
                          {item.name}
                        </div>
                        <div className="text-gray-400 text-[10px] flex items-center justify-between mt-0.5">
                          <span className="capitalize">{item.category || 'general'}</span>
                          <span>{(item.size / 1024).toFixed(0)} KB</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Upload Tab */
            <form onSubmit={handleUploadSubmit} className="max-w-xl mx-auto space-y-4 py-4">
              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-medium">
                  {uploadError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#0f2d22] mb-1">
                  Select Local Image File
                </label>
                <div className="border-2 border-dashed border-[#e8e2d5] hover:border-[#1b4332] rounded-2xl p-8 text-center bg-white transition-colors relative cursor-pointer">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-8 h-8 text-[#1b4332] mx-auto mb-2" />
                  {uploadFile ? (
                    <div>
                      <p className="font-bold text-[#1b4332] text-xs">{uploadFile.name}</p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        {(uploadFile.size / 1024).toFixed(1)} KB — Click to change file
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-[#0f2d22] text-xs">
                        Click or Drag & Drop Image File Here
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Supports JPG, PNG, WEBP, AVIF, SVG (Max 10MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0f2d22] mb-1">Asset Folder / Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-medium"
                  >
                    <option value="general">General</option>
                    <option value="products">Products</option>
                    <option value="categories">Categories</option>
                    <option value="hero">Hero Banners</option>
                    <option value="factory">Factory Story</option>
                    <option value="brand">Brand & Logo</option>
                    <option value="og">SEO & OG Share</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0f2d22] mb-1">Alt Text (Accessibility)</label>
                  <input
                    type="text"
                    value={uploadAltText}
                    onChange={(e) => setUploadAltText(e.target.value)}
                    placeholder="Brief image description..."
                    className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('library')}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="inline-flex items-center gap-1.5 bg-[#1b4332] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow hover:bg-[#0f2d22] disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#c5a059]" /> Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-[#c5a059]" /> Upload & Select Image
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
