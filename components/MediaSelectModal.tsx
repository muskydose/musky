'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { MediaItem } from '@/lib/types';
import SideDrawer from '@/components/ui/SideDrawer';
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
    (async () => {
      setLoading(true);
      await fetchMediaItems();
    })();

    return () => {
      active = false;
    };
  }, [isOpen, fetchMediaItems]);

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
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      widthClassName="w-full sm:w-[680px] max-w-full"
      icon={<ImageIcon className="w-4 h-4 text-[#c5a059]" />}
      title={title}
      subtitle="Musky Dose Cloudinary & Supabase Asset Library"
      headerAction={
        <div className="flex bg-[#1b4332] p-0.5 rounded-lg text-xs font-bold mr-1">
          <button
            type="button"
            onClick={() => setActiveTab('library')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
              activeTab === 'library' ? 'bg-[#c5a059] text-[#0f2d22]' : 'text-gray-200 hover:text-white'
            }`}
          >
            Library
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer ${
              activeTab === 'upload' ? 'bg-[#c5a059] text-[#0f2d22]' : 'text-gray-200 hover:text-white'
            }`}
          >
            <Plus className="w-3 h-3" /> Upload
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {activeTab === 'library' ? (
          <>
            {/* Search & Category Filter */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search images by filename or alt text..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#e8e2d5] rounded-xl text-xs focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-[#1b4332] text-[#c5a059]'
                        : 'bg-white text-gray-600 border border-[#e8e2d5] hover:bg-gray-50'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Media Items Grid */}
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-gray-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-[#1b4332]" />
                <span className="text-xs font-medium">Loading media assets...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-xl border border-dashed border-[#e8e2d5] space-y-3">
                <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto text-gray-400">
                  <ImageIcon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0f2d22]">No media found</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {searchTerm
                      ? 'Try adjusting your search query or category filter.'
                      : 'No images uploaded in this category yet.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1b4332] text-white rounded-lg text-xs font-bold hover:bg-[#0f2d22] cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload Image
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[60vh] overflow-y-auto p-1">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelect(item.url, item);
                      onClose();
                    }}
                    className="group relative bg-white border border-[#e8e2d5] rounded-xl overflow-hidden cursor-pointer hover:border-[#1b4332] hover:shadow-md transition-all flex flex-col"
                  >
                    <div className="relative aspect-square w-full bg-[#f5f1e8] overflow-hidden">
                      <Image
                        src={item.url}
                        alt={item.altText || item.name}
                        fill
                        sizes="160px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="bg-[#1b4332] text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1">
                          <Check className="w-3 h-3 text-[#c5a059]" /> Select
                        </span>
                      </div>
                    </div>
                    <div className="p-2 bg-white">
                      <p className="text-[11px] font-bold text-[#0f2d22] truncate">{item.name}</p>
                      <div className="flex items-center justify-between text-[9px] text-gray-400 mt-0.5">
                        <span className="capitalize">{item.category}</span>
                        <span>{item.size ? `${Math.round(item.size / 1024)} KB` : ''}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Upload Tab */
          <form onSubmit={handleUploadSubmit} className="space-y-4 bg-white p-4 rounded-xl border border-[#e8e2d5]">
            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center justify-between">
                <span>{uploadError}</span>
                <button type="button" onClick={() => setUploadError('')} className="p-1 hover:text-red-900 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* File Dropzone Area */}
            <div>
              <label className="block text-xs font-bold text-[#0f2d22] mb-1">Select File to Upload</label>
              <div className="relative border-2 border-dashed border-[#e8e2d5] hover:border-[#1b4332] rounded-2xl p-6 text-center bg-[#fcfbf7] transition-colors cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                      setUploadError('');
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="w-10 h-10 rounded-full bg-[#e8f3ed] text-[#1b4332] flex items-center justify-center mx-auto mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                {uploadFile ? (
                  <div className="space-y-1">
                    <p className="font-bold text-[#0f2d22] text-xs truncate max-w-xs mx-auto">
                      {uploadFile.name}
                    </p>
                    <p className="text-[10px] text-gray-500">
                      Size: {Math.round(uploadFile.size / 1024)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-[#0f2d22] text-xs">
                      Click or Drag & Drop Image File Here
                    </p>
                    <p className="text-[10.5px] text-gray-500 mt-1">
                      Supports JPG, PNG, WEBP, AVIF, SVG (Max 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#0f2d22] mb-1">Asset Folder / Category</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-medium focus:outline-none focus:border-[#1b4332]"
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
                  className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs focus:outline-none focus:border-[#1b4332]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('library')}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploading || !uploadFile}
                className="inline-flex items-center gap-1.5 bg-[#1b4332] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow hover:bg-[#0f2d22] disabled:opacity-50 cursor-pointer active:scale-95 transition-all"
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
    </SideDrawer>
  );
}
