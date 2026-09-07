'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  ProductMediaItem,
  ProductMediaType,
  ProductMediaRole,
  ProductVariant,
} from '@/lib/types';
import {
  MEDIA_PLACEMENT_SPECS,
  validateExternalVideoUrl,
} from '@/lib/growth/product-media-governance';
import { uploadMediaFile } from '@/lib/media-upload';
import MediaSelectModal from '@/components/MediaSelectModal';
import {
  Image as ImageIcon,
  Video,
  Upload,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Star,
  Film,
  Play,
  Info,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Edit3,
  Sparkles,
  Layers,
  X,
} from 'lucide-react';

interface ProductMediaManagerProps {
  media: ProductMediaItem[];
  images: string[];
  productId?: string;
  productName?: string;
  variants?: ProductVariant[];
  onChange: (updatedMedia: ProductMediaItem[], updatedImages: string[]) => void;
}

export default function ProductMediaManager({
  media = [],
  images = [],
  productId = 'new-product',
  productName = '',
  variants = [],
  onChange,
}: ProductMediaManagerProps) {
  // Active Tab: 'images' or 'videos' or 'specs'
  const [activeMediaTab, setActiveMediaTab] = useState<'images' | 'videos' | 'specs'>('images');

  // Modals & States
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  // Image URL Input
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Video Input States
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [videoTitleInput, setVideoTitleInput] = useState('');
  const [videoCaptionInput, setVideoCaptionInput] = useState('');
  const [videoPosterInput, setVideoPosterInput] = useState('');
  const [videoDurationInput, setVideoDurationInput] = useState<string>('');
  const [videoVariantInput, setVideoVariantInput] = useState<string>('');
  const [videoUploadError, setVideoUploadError] = useState('');

  // Image Edit Metadata Modal
  const [editingImage, setEditingImage] = useState<ProductMediaItem | null>(null);

  // Derive consolidated media items from media prop and legacy images
  const consolidatedMedia: ProductMediaItem[] = React.useMemo(() => {
    if (media && media.length > 0) {
      return media;
    }
    // Synthesize media items from images array if media array is empty
    return (images || []).map((url, idx) => ({
      id: `img-${idx}-${Date.now()}`,
      type: 'image' as ProductMediaType,
      url,
      role: (idx === 0 ? 'PRIMARY' : 'GALLERY') as ProductMediaRole,
      sortOrder: idx + 1,
      enabled: true,
      altText: productName ? `${productName} view ${idx + 1}` : undefined,
    }));
  }, [media, images, productName]);

  const imageItems = consolidatedMedia.filter((m) => m.type === 'image');
  const videoItems = consolidatedMedia.filter((m) => m.type === 'video');

  // Notify parent of state change
  const propagateChange = (nextMedia: ProductMediaItem[]) => {
    // Generate clean image string URLs for legacy consumers
    const nextImages = nextMedia
      .filter((m) => m.type === 'image' && m.enabled !== false && m.url && !m.url.includes('fallback.svg'))
      .sort((a, b) => {
        if (a.role === 'PRIMARY') return -1;
        if (b.role === 'PRIMARY') return 1;
        return a.sortOrder - b.sortOrder;
      })
      .map((m) => m.url);

    onChange(nextMedia, nextImages);
  };

  // ---------------------------------------------------------------------------
  // IMAGE HANDLERS
  // ---------------------------------------------------------------------------
  const handleUploadImageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadError('');
    setUploadSuccess('');
    setIsUploading(true);

    const fileList = Array.from(files);
    const newItems: ProductMediaItem[] = [];

    for (const file of fileList) {
      if (!file.type.startsWith('image/')) {
        setUploadError(`"${file.name}" is not an image file. Please select JPG, PNG, WEBP, or AVIF.`);
        setIsUploading(false);
        return;
      }

      if (file.size > MEDIA_PLACEMENT_SPECS.PRODUCT_PRIMARY_IMAGE.maxSizeBytes) {
        setUploadError(`"${file.name}" exceeds 16MB maximum file size limit.`);
        setIsUploading(false);
        return;
      }

      const res = await uploadMediaFile(file, 'products', undefined, productId);
      if (res.success && res.url) {
        const isFirst = imageItems.length === 0 && newItems.length === 0;
        newItems.push({
          id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          type: 'image',
          url: res.url,
          role: isFirst ? 'PRIMARY' : 'GALLERY',
          sortOrder: consolidatedMedia.length + newItems.length + 1,
          enabled: true,
          altText: productName ? `${productName} photo` : file.name,
        });
      } else {
        setUploadError(`Failed to upload "${file.name}": ${res.error || 'Upload failed'}`);
      }
    }

    if (newItems.length > 0) {
      const updated = [...consolidatedMedia, ...newItems];
      propagateChange(updated);
      setUploadSuccess(`Successfully uploaded ${newItems.length} product image(s).`);
      setTimeout(() => setUploadSuccess(''), 3000);
    }

    setIsUploading(false);
    e.target.value = '';
  };

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    const url = imageUrlInput.trim();
    const isFirst = imageItems.length === 0;

    const newItem: ProductMediaItem = {
      id: `img-url-${Date.now()}`,
      type: 'image',
      url,
      role: isFirst ? 'PRIMARY' : 'GALLERY',
      sortOrder: consolidatedMedia.length + 1,
      enabled: true,
      altText: productName ? `${productName} view` : undefined,
    };

    propagateChange([...consolidatedMedia, newItem]);
    setImageUrlInput('');
  };

  const handleSelectFromLibrary = (selectedUrl: string) => {
    const isFirst = imageItems.length === 0;
    const newItem: ProductMediaItem = {
      id: `img-lib-${Date.now()}`,
      type: 'image',
      url: selectedUrl,
      role: isFirst ? 'PRIMARY' : 'GALLERY',
      sortOrder: consolidatedMedia.length + 1,
      enabled: true,
      altText: productName || 'Botanical product image',
    };
    propagateChange([...consolidatedMedia, newItem]);
  };

  const handleSetCover = (targetId: string) => {
    const updated = consolidatedMedia.map((item) => {
      if (item.type === 'image') {
        if (item.id === targetId) {
          return { ...item, role: 'PRIMARY' as ProductMediaRole, sortOrder: 1 };
        }
        return {
          ...item,
          role: (item.role === 'PRIMARY' ? 'GALLERY' : item.role) as ProductMediaRole,
          sortOrder: item.sortOrder + 1,
        };
      }
      return item;
    });

    propagateChange(updated);
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    const imagesOnly = [...imageItems];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= imagesOnly.length) return;

    const [moved] = imagesOnly.splice(index, 1);
    imagesOnly.splice(targetIndex, 0, moved);

    // Reassign sort orders
    const reorderedImages = imagesOnly.map((img, idx) => ({
      ...img,
      role: (idx === 0 ? 'PRIMARY' : img.role === 'PRIMARY' ? 'GALLERY' : img.role) as ProductMediaRole,
      sortOrder: idx + 1,
    }));

    // Merge back with videos
    const updated = [...reorderedImages, ...videoItems];
    propagateChange(updated);
  };

  const handleRemoveMedia = (targetId: string) => {
    const remaining = consolidatedMedia.filter((m) => m.id !== targetId);
    // If we removed the primary image, promote next available image
    const remainingImages = remaining.filter((m) => m.type === 'image');
    if (remainingImages.length > 0 && !remainingImages.some((m) => m.role === 'PRIMARY')) {
      remainingImages[0].role = 'PRIMARY';
    }
    propagateChange(remaining);
  };

  // ---------------------------------------------------------------------------
  // VIDEO HANDLERS
  // ---------------------------------------------------------------------------
  const handleUploadVideoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setVideoUploadError('');
    setIsUploading(true);

    const file = files[0];
    if (!file.type.startsWith('video/')) {
      setVideoUploadError('Please select a valid video file (MP4, WebM).');
      setIsUploading(false);
      return;
    }

    if (file.size > MEDIA_PLACEMENT_SPECS.PRODUCT_VIDEO.maxSizeBytes) {
      setVideoUploadError('Video file exceeds 25MB maximum upload limit.');
      setIsUploading(false);
      return;
    }

    const res = await uploadMediaFile(file, 'products', videoTitleInput || 'Product Video', productId);
    if (res.success && res.url) {
      const newVideo: ProductMediaItem = {
        id: `vid-${Date.now()}`,
        type: 'video',
        url: res.url,
        role: 'GALLERY',
        sortOrder: consolidatedMedia.length + 1,
        title: videoTitleInput.trim() || 'Product Demonstration',
        caption: videoCaptionInput.trim() || undefined,
        thumbnailUrl: videoPosterInput.trim() || undefined,
        duration: videoDurationInput ? Number(videoDurationInput) : undefined,
        variantId: videoVariantInput || undefined,
        provider: 'upload',
        enabled: true,
      };

      propagateChange([...consolidatedMedia, newVideo]);
      setVideoUrlInput('');
      setVideoTitleInput('');
      setVideoCaptionInput('');
      setVideoPosterInput('');
      setVideoDurationInput('');
      setVideoVariantInput('');
    } else {
      setVideoUploadError(res.error || 'Failed to upload video.');
    }

    setIsUploading(false);
    e.target.value = '';
  };

  const handleAddExternalVideo = () => {
    setVideoUploadError('');
    const validation = validateExternalVideoUrl(videoUrlInput);
    if (!validation.valid) {
      setVideoUploadError(validation.error || 'Invalid video URL.');
      return;
    }

    const newVideo: ProductMediaItem = {
      id: `vid-ext-${Date.now()}`,
      type: 'video',
      url: videoUrlInput.trim(),
      role: 'GALLERY',
      sortOrder: consolidatedMedia.length + 1,
      title: videoTitleInput.trim() || 'Product Video',
      caption: videoCaptionInput.trim() || undefined,
      thumbnailUrl: videoPosterInput.trim() || validation.thumbnailUrl || undefined,
      duration: videoDurationInput ? Number(videoDurationInput) : undefined,
      variantId: videoVariantInput || undefined,
      provider: validation.provider,
      enabled: true,
    };

    propagateChange([...consolidatedMedia, newVideo]);
    setVideoUrlInput('');
    setVideoTitleInput('');
    setVideoCaptionInput('');
    setVideoPosterInput('');
    setVideoDurationInput('');
    setVideoVariantInput('');
  };

  const handleToggleVideoEnabled = (targetId: string) => {
    const updated = consolidatedMedia.map((item) =>
      item.id === targetId ? { ...item, enabled: !item.enabled } : item
    );
    propagateChange(updated);
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div className="bg-white rounded-2xl border border-[#e8e2d5] p-6 space-y-6 shadow-xs">
      {/* Header & Mode Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#f0ebe0]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif-heading font-bold text-xl text-[#0f2d22]">Product Media System</h3>
            <span className="bg-[#1b4332]/10 text-[#1b4332] text-xs font-bold px-2.5 py-0.5 rounded-full">
              Universal Governance
            </span>
          </div>
          <p className="text-gray-500 text-xs mt-1">
            Manage high-definition product images and video demonstrations across storefront, search, and Google Merchant feeds.
          </p>
        </div>

        {/* Sub-Tabs */}
        <div className="flex items-center bg-[#f4f0e6] p-1 rounded-xl border border-[#e8e2d5]">
          <button
            type="button"
            onClick={() => setActiveMediaTab('images')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeMediaTab === 'images' ? 'bg-white text-[#1b4332] shadow-xs' : 'text-gray-600 hover:text-black'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-[#1b4332]" />
            <span>Images ({imageItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMediaTab('videos')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeMediaTab === 'videos' ? 'bg-white text-[#1b4332] shadow-xs' : 'text-gray-600 hover:text-black'
            }`}
          >
            <Film className="w-3.5 h-3.5 text-[#c5a059]" />
            <span>Videos ({videoItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMediaTab('specs')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeMediaTab === 'specs' ? 'bg-white text-[#1b4332] shadow-xs' : 'text-gray-600 hover:text-black'
            }`}
          >
            <Info className="w-3.5 h-3.5 text-gray-500" />
            <span>Specs</span>
          </button>
        </div>
      </div>

      {/* Upload Feedback Notices */}
      {uploadError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{uploadError}</span>
        </div>
      )}

      {uploadSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{uploadSuccess}</span>
        </div>
      )}

      {/* TAB 1: PRODUCT IMAGES */}
      {activeMediaTab === 'images' && (
        <div className="space-y-6">
          {/* Quick Specification Banner */}
          <div className="p-3.5 bg-[#fbf9f4] border border-[#e8e2d5] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#0f2d22]">
              <Sparkles className="w-4 h-4 text-[#c5a059]" />
              <span className="font-bold">Image Standards:</span>
              <span className="text-gray-600">1:1 Square &bull; Min 500x500px &bull; Recommended 1500x1500px &bull; Max 16MB</span>
            </div>
            <button
              type="button"
              onClick={() => setActiveMediaTab('specs')}
              className="text-[#1b4332] hover:underline font-semibold text-[11px]"
            >
              View Full Placement Specs &rarr;
            </button>
          </div>

          {/* Action Row: Media Library, Upload, URL */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
            {/* Action 1: Media Library */}
            <div className="md:col-span-4 p-4 bg-[#1b4332] text-white rounded-xl flex flex-col justify-between space-y-3">
              <div>
                <h4 className="font-bold text-xs flex items-center gap-1.5 text-[#c5a059]">
                  <ImageIcon className="w-4 h-4" /> Cloud Media Library
                </h4>
                <p className="text-[11px] text-gray-200 mt-1">
                  Select previously uploaded botanical photos or brand media assets.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMediaModalOpen(true)}
                className="w-full bg-[#c5a059] hover:bg-[#d4af37] text-[#0f2d22] py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                Open Library
              </button>
            </div>

            {/* Action 2: Direct File Upload */}
            <div className="md:col-span-4 p-4 bg-[#fcfbf7] border-2 border-dashed border-[#e8e2d5] hover:border-[#1b4332] rounded-xl text-center relative flex flex-col items-center justify-center cursor-pointer transition-colors">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleUploadImageFiles}
                disabled={isUploading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-5 h-5 text-[#1b4332] mb-1" />
              <p className="font-bold text-xs text-[#0f2d22]">
                {isUploading ? 'Uploading...' : 'Upload Image Files'}
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">Drag & Drop or Click (JPG, PNG, WEBP)</p>
            </div>

            {/* Action 3: Add Image URL */}
            <div className="md:col-span-4 p-4 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl flex flex-col justify-between space-y-2">
              <div>
                <label className="block font-bold text-xs text-[#0f2d22]">Paste External Image URL</label>
                <p className="text-[10px] text-gray-500 mt-0.5">Direct HTTPS image URL or CDN path</p>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-2.5 py-1.5 text-xs bg-white border border-[#e8e2d5] rounded-lg focus:outline-none focus:border-[#1b4332]"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-1.5 bg-[#1b4332] text-white text-xs font-bold rounded-lg hover:bg-[#2d6a4f] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Image Gallery Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-xs text-[#0f2d22] uppercase tracking-wider">
                Product Image Gallery ({imageItems.length})
              </h4>
              <span className="text-[11px] text-gray-500">
                Item #1 is designated as the Primary Storefront & Merchant Cover
              </span>
            </div>

            {imageItems.length === 0 ? (
              <div className="p-8 text-center bg-[#faf8f5] border border-dashed border-[#e8e2d5] rounded-xl text-gray-400 space-y-2">
                <ImageIcon className="w-8 h-8 mx-auto text-gray-300" />
                <p className="font-bold text-xs text-gray-600">No Product Images Configured</p>
                <p className="text-[11px]">Upload images above or choose from your media library.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {imageItems.map((item, idx) => {
                  const isPrimary = item.role === 'PRIMARY' || idx === 0;

                  return (
                    <div
                      key={item.id}
                      className={`relative group bg-[#faf8f5] rounded-xl overflow-hidden border transition-all flex flex-col justify-between aspect-square ${
                        isPrimary ? 'border-[#1b4332] ring-2 ring-[#c5a059]/40 shadow-sm' : 'border-[#e8e2d5] hover:border-gray-400'
                      }`}
                    >
                      <Image
                        src={item.url}
                        alt={item.altText || `Gallery image ${idx + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />

                      {/* Top Overlay Badges */}
                      <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                        {isPrimary ? (
                          <span className="bg-[#1b4332] text-[#c5a059] text-[9px] font-extrabold px-2 py-0.5 rounded-md shadow flex items-center gap-1 border border-[#c5a059]/40">
                            <Star className="w-2.5 h-2.5 fill-[#c5a059]" /> Primary Cover
                          </span>
                        ) : (
                          <span className="bg-[#0f2d22]/80 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                            #{idx + 1}
                          </span>
                        )}

                        <div className="flex items-center gap-1">
                          {/* Edit Details Button */}
                          <button
                            type="button"
                            onClick={() => setEditingImage(item)}
                            className="bg-white/90 hover:bg-white text-gray-700 p-1 rounded-md shadow transition-colors cursor-pointer"
                            title="Edit Alt Text & Role"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveMedia(item.id)}
                            className="bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-md shadow transition-colors cursor-pointer"
                            title="Remove Image"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Controls on Hover */}
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-[#0f2d22]/90 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between gap-1 z-10">
                        {!isPrimary && (
                          <button
                            type="button"
                            onClick={() => handleSetCover(item.id)}
                            className="text-[9px] bg-[#c5a059] text-[#0f2d22] font-extrabold px-2 py-1 rounded-md hover:bg-[#d4af37] cursor-pointer"
                          >
                            Set Cover
                          </button>
                        )}

                        <div className="flex items-center gap-1 ml-auto">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'left')}
                              className="p-1 bg-[#1b4332] hover:bg-[#2d6a4f] text-white rounded cursor-pointer"
                              title="Move Left"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                          )}
                          {idx < imageItems.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'right')}
                              className="p-1 bg-[#1b4332] hover:bg-[#2d6a4f] text-white rounded cursor-pointer"
                              title="Move Right"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCT VIDEOS */}
      {activeMediaTab === 'videos' && (
        <div className="space-y-6">
          {/* Quick Specification Banner */}
          <div className="p-3.5 bg-[#fbf9f4] border border-[#e8e2d5] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#0f2d22]">
              <Film className="w-4 h-4 text-[#c5a059]" />
              <span className="font-bold">Video Standards:</span>
              <span className="text-gray-600">16:9 Landscape &bull; MP4 or WebM &bull; YouTube/Vimeo &bull; 6–240s duration &bull; Max 25MB</span>
            </div>
            <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-bold text-[10px]">
              Google Merchant Feed Compatible
            </span>
          </div>

          {/* Add Video Form */}
          <div className="p-5 bg-[#faf8f5] border border-[#e8e2d5] rounded-xl space-y-4">
            <h4 className="font-bold text-xs text-[#0f2d22] uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-[#1b4332]" /> Add Product Video (Upload or Link)
            </h4>

            {videoUploadError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                <span>{videoUploadError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Video URL or Direct File */}
              <div className="sm:col-span-8">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Video Source (YouTube, Vimeo, or Direct Stream URL)
                </label>
                <input
                  type="text"
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/... or https://.../video.mp4"
                  className="w-full p-2 bg-white border border-[#e8e2d5] rounded-lg text-xs focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              {/* Or Direct Video File Upload */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Or Upload Video File (Max 25MB)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="video/mp4,video/webm"
                    onChange={handleUploadVideoFile}
                    disabled={isUploading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <button
                    type="button"
                    className="w-full p-2 bg-white border border-[#e8e2d5] rounded-lg text-xs font-semibold text-[#1b4332] hover:bg-gray-50 flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Uploading Video...' : 'Choose MP4/WebM'}</span>
                  </button>
                </div>
              </div>

              {/* Video Title */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Video Title</label>
                <input
                  type="text"
                  value={videoTitleInput}
                  onChange={(e) => setVideoTitleInput(e.target.value)}
                  placeholder="e.g. Pure Sojat Henna Application & Results"
                  className="w-full p-2 bg-white border border-[#e8e2d5] rounded-lg text-xs focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              {/* Video Poster Thumbnail */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Poster Thumbnail Image URL (Optional)
                </label>
                <input
                  type="text"
                  value={videoPosterInput}
                  onChange={(e) => setVideoPosterInput(e.target.value)}
                  placeholder="https://.../poster.jpg (auto-extracted for YouTube)"
                  className="w-full p-2 bg-white border border-[#e8e2d5] rounded-lg text-xs focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              {/* Duration & Variant */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Duration (Sec)</label>
                <input
                  type="number"
                  min="6"
                  max="240"
                  value={videoDurationInput}
                  onChange={(e) => setVideoDurationInput(e.target.value)}
                  placeholder="45"
                  className="w-full p-2 bg-white border border-[#e8e2d5] rounded-lg text-xs focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="button"
                  onClick={handleAddExternalVideo}
                  disabled={!videoUrlInput.trim()}
                  className="w-full py-2 bg-[#1b4332] text-white rounded-lg text-xs font-bold hover:bg-[#2d6a4f] disabled:opacity-50 cursor-pointer"
                >
                  Add Video
                </button>
              </div>
            </div>
          </div>

          {/* Configured Video List */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs text-[#0f2d22] uppercase tracking-wider">
              Configured Product Videos ({videoItems.length})
            </h4>

            {videoItems.length === 0 ? (
              <div className="p-8 text-center bg-[#faf8f5] border border-dashed border-[#e8e2d5] rounded-xl text-gray-400 space-y-2">
                <Film className="w-8 h-8 mx-auto text-gray-300" />
                <p className="font-bold text-xs text-gray-600">No Product Videos Added Yet</p>
                <p className="text-[11px]">
                  Add a YouTube video demonstration or upload an MP4 clip to showcase formulation, purity, or application.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {videoItems.map((vid) => {
                  const validation = validateExternalVideoUrl(vid.url);

                  return (
                    <div
                      key={vid.id}
                      className="p-4 bg-white border border-[#e8e2d5] rounded-xl space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-900 border border-amber-200 flex items-center justify-center">
                            <Play className="w-3 h-3 fill-amber-700 text-amber-700" />
                          </span>
                          <span className="font-bold text-xs text-gray-800">
                            {vid.title || 'Product Video'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleVideoEnabled(vid.id)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${
                              vid.enabled
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {vid.enabled ? 'Active' : 'Disabled'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveMedia(vid.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer"
                            title="Remove Video"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Video Player Preview */}
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-black border border-gray-200">
                        {validation.provider === 'youtube' || validation.provider === 'vimeo' ? (
                          <iframe
                            src={validation.embedUrl}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        ) : (
                          <video
                            src={vid.url}
                            poster={vid.thumbnailUrl}
                            controls
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                        <span className="truncate max-w-[200px]">URL: {vid.url}</span>
                        {vid.duration && <span>Duration: {vid.duration}s</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: PLACEMENT SPECIFICATIONS REFERENCE */}
      {activeMediaTab === 'specs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h4 className="font-bold text-xs text-[#0f2d22] uppercase tracking-wider">
              Authoritative Product Media Specifications
            </h4>
            <span className="text-[11px] text-gray-500">Google Merchant Center & Core Web Vitals Standard</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(MEDIA_PLACEMENT_SPECS).map((spec) => (
              <div key={spec.id} className="p-4 bg-[#faf8f5] border border-[#e8e2d5] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#1b4332]">{spec.name}</span>
                  <span className="bg-[#1b4332]/10 text-[#1b4332] text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                    {spec.aspectRatio}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-600">
                  <div>
                    <span className="text-gray-400">Recommended: </span>
                    <span className="font-bold">{spec.recommendedWidth}&times;{spec.recommendedHeight}px</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Min Dimensions: </span>
                    <span>{spec.minWidth}&times;{spec.minHeight}px</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Max Size: </span>
                    <span>{Math.round(spec.maxSizeBytes / 1024 / 1024)}MB</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Preferred Format: </span>
                    <span className="uppercase">{spec.preferredFormat.replace('image/', '').replace('video/', '')}</span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 pt-1 border-t border-gray-200">
                  {spec.desktopGuidance}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Image Details Modal */}
      {editingImage && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 border border-[#e8e2d5] shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h4 className="font-bold text-sm text-[#0f2d22]">Edit Image Details</h4>
              <button
                type="button"
                onClick={() => setEditingImage(null)}
                className="p-1 text-gray-400 hover:text-black cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Alt Text (Accessibility & SEO)</label>
                <input
                  type="text"
                  value={editingImage.altText || ''}
                  onChange={(e) => setEditingImage({ ...editingImage, altText: e.target.value })}
                  placeholder="e.g. 100% Pure Sojat Henna Powder in foil seal packaging"
                  className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Media Role</label>
                <select
                  value={editingImage.role || 'GALLERY'}
                  onChange={(e) => setEditingImage({ ...editingImage, role: e.target.value as ProductMediaRole })}
                  className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg focus:outline-none focus:border-[#1b4332]"
                >
                  <option value="PRIMARY">PRIMARY (Main Storefront Cover)</option>
                  <option value="GALLERY">GALLERY (Standard Gallery)</option>
                  <option value="PACKAGING">PACKAGING (Box/Pouch Details)</option>
                  <option value="DETAIL">DETAIL (Texture / Micro-sift)</option>
                  <option value="LIFESTYLE">LIFESTYLE (Application)</option>
                  <option value="USAGE">USAGE (Mixing / Steps)</option>
                  <option value="INGREDIENTS">INGREDIENTS (Botanical Harvest)</option>
                  <option value="VARIANT">VARIANT (Specific Pack Size)</option>
                </select>
              </div>

              {variants && variants.length > 0 && (
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Associate with Specific Variant</label>
                  <select
                    value={editingImage.variantId || ''}
                    onChange={(e) => setEditingImage({ ...editingImage, variantId: e.target.value || undefined })}
                    className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg focus:outline-none focus:border-[#1b4332]"
                  >
                    <option value="">All Variants (Product-Wide)</option>
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.weight || 'Variant'} {v.sku ? `(${v.sku})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setEditingImage(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-black cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = consolidatedMedia.map((m) => (m.id === editingImage.id ? editingImage : m));
                  propagateChange(updated);
                  setEditingImage(null);
                }}
                className="px-4 py-2 bg-[#1b4332] text-white text-xs font-bold rounded-lg hover:bg-[#2d6a4f] cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Central Media Library Modal */}
      {isMediaModalOpen && (
        <MediaSelectModal
          isOpen={isMediaModalOpen}
          onClose={() => setIsMediaModalOpen(false)}
          onSelect={(url) => {
            handleSelectFromLibrary(url);
            setIsMediaModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
