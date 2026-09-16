'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import AdminLayout from '@/components/AdminLayout';
import { SiteSettings, Product, Category, ProductGuide, MediaItem } from '@/lib/types';
import { KnowledgeEntity } from '@/lib/db/knowledge';
import {
  MediaAsset,
  MediaEntityType,
  MediaAssetRole,
  MediaAssetStatus,
  MediaAssetSource,
} from '@/lib/db/media';
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
  Sparkles,
  Lock,
  Unlock,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Filter,
  ArrowUpDown,
  Tag,
  Layers,
  History,
} from 'lucide-react';

interface AdminMediaClientProps {
  initialSettings: SiteSettings;
  initialProducts: Product[];
  initialCategories: Category[];
  initialGuides?: ProductGuide[];
  initialKnowledgeEntities?: KnowledgeEntity[];
  initialMediaAssets?: MediaAsset[];
}

export default function AdminMediaClient({
  initialSettings,
  initialProducts,
  initialCategories,
  initialGuides = [],
  initialKnowledgeEntities = [],
  initialMediaAssets = [],
}: AdminMediaClientProps) {
  // Navigation tabs: 'canonical' (MediaAsset) vs 'legacy' (MediaItem)
  const [activeTab, setActiveTab] = useState<'canonical' | 'legacy'>('canonical');

  // Canonical Media Assets State
  const [assets, setAssets] = useState<MediaAsset[]>(initialMediaAssets);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [selectedAssetForDetail, setSelectedAssetForDetail] = useState<MediaAsset | null>(null);

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadEntityType, setUploadEntityType] = useState<MediaEntityType>('PRODUCT');
  const [uploadEntityId, setUploadEntityId] = useState<string>('');
  const [uploadRole, setUploadRole] = useState<MediaAssetRole>('GALLERY');
  const [uploadTitle, setUploadTitle] = useState<string>('');
  const [uploadAltText, setUploadAltText] = useState<string>('');
  const [uploadCaption, setUploadCaption] = useState<string>('');
  const [uploadIsLocked, setUploadIsLocked] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>('');

  // AI Visual Generator State
  const [genEntityType, setGenEntityType] = useState<MediaEntityType>('PRODUCT');
  const [genEntityId, setGenEntityId] = useState<string>(initialProducts[0]?.id || '');
  const [genVariant, setGenVariant] = useState<string>('packshot');
  const [genRole, setGenRole] = useState<MediaAssetRole>('GALLERY');
  const [genPromptOverride, setGenPromptOverride] = useState<string>('');
  const [genProviderId, setGenProviderId] = useState<string>('manual-studio');
  const [genStudioFile, setGenStudioFile] = useState<File | null>(null);
  const [genPromptPreview, setGenPromptPreview] = useState<string>('');
  const [promptCopied, setPromptCopied] = useState<boolean>(false);
  const [capabilities, setCapabilities] = useState<any[]>([]);
  const [loadingCapabilities, setLoadingCapabilities] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string>('');
  const [genSuccessNotice, setGenSuccessNotice] = useState<string>('');

  // Legacy Media Items State
  const [legacyMedia, setLegacyMedia] = useState<MediaItem[]>(initialSettings.mediaLibrary || []);
  const [legacyLoading, setLegacyLoading] = useState<boolean>(false);
  const [legacyDeletingId, setLegacyDeletingId] = useState<string | null>(null);

  // Auto-dismiss status messages after 5s
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Fetch canonical media assets
  const refreshCanonicalAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/media-assets');
      const data = await res.json();
      if (data.success && Array.isArray(data.assets)) {
        setAssets(data.assets);
      }
    } catch (err) {
      console.error('Failed to refresh media assets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch legacy media library
  const refreshLegacyMedia = useCallback(async () => {
    setLegacyLoading(true);
    try {
      const res = await fetch('/api/admin/media');
      const data = await res.json();
      if (data.success && Array.isArray(data.mediaLibrary)) {
        setLegacyMedia(data.mediaLibrary);
      }
    } catch (err) {
      console.error('Failed to refresh legacy media:', err);
    } finally {
      setLegacyLoading(false);
    }
  }, []);

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Helper to get human entity label
  const getEntityLabel = useCallback(
    (entityType: MediaEntityType, entityId?: string) => {
      if (!entityId) return entityType;
      if (entityType === 'PRODUCT') {
        const p = initialProducts.find((item) => item.id === entityId);
        return p ? p.name : `Product ${entityId}`;
      }
      if (entityType === 'CATEGORY') {
        const c = initialCategories.find((item) => item.id === entityId || item.slug === entityId);
        return c ? c.name : `Category ${entityId}`;
      }
      if (entityType === 'GUIDE') {
        const g = initialGuides.find((item) => item.id === entityId || item.slug === entityId);
        return g ? g.title : `Guide ${entityId}`;
      }
      if (entityType === 'KNOWLEDGE') {
        const k = initialKnowledgeEntities.find(
          (item) => item.id === entityId || item.entityKey === entityId || item.slug === entityId
        );
        return k ? k.canonicalName : `Entity ${entityId}`;
      }
      return `${entityType}: ${entityId}`;
    },
    [initialProducts, initialCategories, initialGuides, initialKnowledgeEntities]
  );

  // Target entity options for selectors
  const entityOptions = useMemo(() => {
    switch (genEntityType) {
      case 'PRODUCT':
        return initialProducts.map((p) => ({ id: p.id, name: p.name }));
      case 'CATEGORY':
        return initialCategories.map((c) => ({ id: c.id, name: c.name }));
      case 'GUIDE':
        return initialGuides.map((g) => ({ id: g.id, name: g.title }));
      case 'KNOWLEDGE':
        return initialKnowledgeEntities.map((k) => ({ id: k.id || k.entityKey, name: k.canonicalName }));
      case 'BRAND':
        return [{ id: 'brand-main', name: 'Musky Dose Brand Assets' }];
      case 'MARKETING':
        return [{ id: 'marketing-hero', name: 'Storefront Marketing & Banners' }];
      default:
        return [];
    }
  }, [genEntityType, initialProducts, initialCategories, initialGuides, initialKnowledgeEntities]);

  // Sync genEntityId when genEntityType changes
  useEffect(() => {
    if (entityOptions.length > 0) {
      setGenEntityId(entityOptions[0].id);
    } else {
      setGenEntityId('');
    }
  }, [genEntityType, entityOptions]);

  // Load capabilities and dynamic prompt preview when AI Visual modal is active
  useEffect(() => {
    if (!showGenerateModal) return;

    let isMounted = true;
    const fetchCapabilitiesAndPrompt = async () => {
      setLoadingCapabilities(true);
      try {
        const queryParams = new URLSearchParams({
          entityType: genEntityType,
          entityId: genEntityId || '',
          variant: genVariant,
          role: genRole,
        });
        if (genPromptOverride.trim()) {
          queryParams.set('promptOverride', genPromptOverride.trim());
        }

        const res = await fetch(`/api/admin/media-assets/generate?${queryParams.toString()}`);
        const data = await res.json();
        if (isMounted && data.success) {
          if (Array.isArray(data.capabilities)) {
            setCapabilities(data.capabilities);
          }
          if (data.promptPreview?.finalPrompt) {
            setGenPromptPreview(data.promptPreview.finalPrompt);
          }
        }
      } catch (err) {
        console.warn('Failed to load visual capabilities or preview:', err);
      } finally {
        if (isMounted) setLoadingCapabilities(false);
      }
    };

    fetchCapabilitiesAndPrompt();
    return () => {
      isMounted = false;
    };
  }, [showGenerateModal, genEntityType, genEntityId, genVariant, genRole, genPromptOverride]);

  // Upload handler
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
      formData.append('entityType', uploadEntityType);
      if (uploadEntityId) formData.append('entityId', uploadEntityId);
      formData.append('role', uploadRole);
      formData.append('title', uploadTitle);
      formData.append('altText', uploadAltText);
      formData.append('caption', uploadCaption);
      formData.append('isLocked', uploadIsLocked ? 'true' : 'false');

      const res = await fetch('/api/admin/media-assets', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadTitle('');
        setUploadAltText('');
        setUploadCaption('');
        setStatusMessage({
          type: 'success',
          text: data.deduplicated
            ? 'Media uploaded & deduplicated (identical binary already existed in storage)!'
            : 'New media asset successfully uploaded and registered!',
        });
        refreshCanonicalAssets();
      } else {
        setUploadError(data.error || 'Failed to upload asset.');
      }
    } catch (err: any) {
      setUploadError('Network or server error occurred while uploading.');
    } finally {
      setUploading(false);
    }
  };

  // AI Visual Generator handler
  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genEntityId) {
      setGenError('Please select a target entity for visual generation.');
      return;
    }

    if (genProviderId === 'manual-studio' && !genStudioFile) {
      setGenError('Please select or drop the generated image file to import into the Free AI Studio.');
      return;
    }

    setGenerating(true);
    setGenError('');
    setGenSuccessNotice('');

    try {
      let res: Response;

      if (genProviderId === 'manual-studio' && genStudioFile) {
        const formData = new FormData();
        formData.append('file', genStudioFile);
        formData.append('entityType', genEntityType);
        formData.append('entityId', genEntityId);
        formData.append('role', genRole);
        formData.append('variant', genVariant);
        formData.append('providerId', 'manual-studio');
        if (genPromptOverride.trim()) {
          formData.append('promptOverride', genPromptOverride.trim());
        }

        res = await fetch('/api/admin/media-assets/generate', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/admin/media-assets/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType: genEntityType,
            entityId: genEntityId,
            role: genRole,
            variant: genVariant,
            promptOverride: genPromptOverride.trim() || undefined,
            providerId: genProviderId,
          }),
        });
      }

      const data = await res.json();
      if (data.success && data.asset) {
        const costNotice = data.cost ? ` (${data.tier} • ${data.cost})` : '';
        setGenSuccessNotice(
          `AI visual successfully registered${costNotice}! Saved as SUGGESTED. You must review and approve it below before it becomes public.`
        );
        refreshCanonicalAssets();
        setGenStudioFile(null);
        setTimeout(() => {
          setShowGenerateModal(false);
          setGenSuccessNotice('');
        }, 2200);
      } else {
        setGenError(data.error || 'Failed to generate/import visual with AI provider.');
      }
    } catch (err: any) {
      setGenError('Network error while requesting AI generation.');
    } finally {
      setGenerating(false);
    }
  };

  // Status transition handler: approve / reject / archive
  const handleStatusTransition = async (assetId: string, newStatus: MediaAssetStatus) => {
    setActionLoadingId(assetId);
    try {
      const res = await fetch('/api/admin/media-assets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: assetId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: 'success',
          text: `Asset status changed to ${newStatus.toUpperCase()}.`,
        });
        refreshCanonicalAssets();
        if (selectedAssetForDetail?.id === assetId) {
          setSelectedAssetForDetail(data.asset);
        }
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to update asset status.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Server error updating asset status.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Set as PRIMARY with optional lock
  const handleSetPrimary = async (asset: MediaAsset, lock: boolean) => {
    setActionLoadingId(asset.id);
    try {
      const res = await fetch('/api/admin/media-assets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: asset.id,
          setPrimary: true,
          isLocked: lock,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: 'success',
          text: `Asset is now authoritative PRIMARY for ${getEntityLabel(asset.entityType, asset.entityId)}${
            lock ? ' (LOCKED)' : ''
          }!`,
        });
        refreshCanonicalAssets();
        if (selectedAssetForDetail?.id === asset.id) {
          setSelectedAssetForDetail(data.asset);
        }
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to set primary asset.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Server error setting primary asset.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Toggle lock on current primary
  const handleToggleLock = async (asset: MediaAsset) => {
    setActionLoadingId(asset.id);
    try {
      const res = await fetch('/api/admin/media-assets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: asset.id,
          isLocked: !asset.isLocked,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          type: 'success',
          text: `Asset ${!asset.isLocked ? 'LOCKED against AI demotion' : 'UNLOCKED'}.`,
        });
        refreshCanonicalAssets();
        if (selectedAssetForDetail?.id === asset.id) {
          setSelectedAssetForDetail(data.asset);
        }
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Server error toggling lock.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Soft archive handler
  const handleArchive = async (asset: MediaAsset) => {
    if (!window.confirm(`Archive this media asset (${asset.title || asset.fileName || asset.id})?`)) {
      return;
    }
    setActionLoadingId(asset.id);
    try {
      const res = await fetch(`/api/admin/media-assets?id=${asset.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: 'Asset safely archived.' });
        refreshCanonicalAssets();
        if (selectedAssetForDetail?.id === asset.id) {
          setSelectedAssetForDetail(null);
        }
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to archive asset.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Server error archiving asset.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Delete legacy media item
  const handleDeleteLegacyMedia = async (item: MediaItem) => {
    if (!window.confirm(`Delete legacy asset "${item.name}"?`)) return;
    setLegacyDeletingId(item.id);
    try {
      const res = await fetch(`/api/admin/media?id=${item.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: 'Legacy asset removed.' });
        refreshLegacyMedia();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to delete legacy item.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Server error deleting legacy item.' });
    } finally {
      setLegacyDeletingId(null);
    }
  };

  // Filtered Canonical Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      if (selectedEntityType !== 'all' && a.entityType !== selectedEntityType) return false;
      if (selectedStatus !== 'all' && a.status !== selectedStatus) return false;
      if (selectedRole !== 'all' && a.role !== selectedRole) return false;
      if (selectedSource !== 'all' && a.source !== selectedSource) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matches =
          (a.title && a.title.toLowerCase().includes(query)) ||
          (a.fileName && a.fileName.toLowerCase().includes(query)) ||
          (a.altText && a.altText.toLowerCase().includes(query)) ||
          (a.url && a.url.toLowerCase().includes(query)) ||
          (a.entityId && a.entityId.toLowerCase().includes(query));
        if (!matches) return false;
      }
      return true;
    });
  }, [assets, selectedEntityType, selectedStatus, selectedRole, selectedSource, searchTerm]);

  // Suggested assets awaiting admin approval
  const suggestedAssets = useMemo(() => {
    return assets.filter((a) => a.status === 'suggested');
  }, [assets]);

  return (
    <AdminLayout title="Universal Media & Assets">
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Top Header Card */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0f2d22] text-[#c5a059] flex items-center justify-center shadow-sm">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif-heading font-bold text-2xl text-[#0f2d22]">
                  Universal Media & Visual Studio
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  FREE / ₹0 GUARANTEE
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Authoritative media DAL for Products, Categories, Guides, Knowledge entities, and Brand visuals.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                refreshCanonicalAssets();
                refreshLegacyMedia();
              }}
              disabled={loading || legacyLoading}
              className="p-2.5 bg-[#f5f1e8] text-[#1b4332] hover:bg-[#e8e2d5] rounded-xl font-bold transition-colors"
              title="Refresh Assets"
            >
              <RefreshCw className={`w-4 h-4 ${loading || legacyLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setShowGenerateModal(true)}
              className="inline-flex items-center gap-2 bg-[#0f2d22] text-[#c5a059] border border-[#c5a059]/40 px-4 py-2.5 rounded-xl text-xs font-bold shadow hover:bg-[#1b4332] transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate AI Visual</span>
            </button>

            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center gap-2 bg-[#1b4332] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow hover:bg-[#0f2d22] transition-colors"
            >
              <Plus className="w-4 h-4 text-[#c5a059]" />
              <span>Upload Media</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl text-xs flex items-start gap-3 shadow-xs animate-in fade-in duration-200 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border border-rose-300 text-rose-900'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-medium">{statusMessage.text}</div>
            <button onClick={() => setStatusMessage(null)} className="p-1 hover:opacity-75">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Pending AI Visual Approvals Callout */}
        {suggestedAssets.length > 0 && activeTab === 'canonical' && (
          <div className="p-4 bg-amber-50/80 border border-amber-300/80 rounded-2xl text-xs shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-900 font-bold">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>
                  {suggestedAssets.length} AI-Generated Visual(s) Pending Admin Approval
                </span>
              </div>
              <span className="text-[10px] bg-amber-200/80 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                Never Auto-Published
              </span>
            </div>
            <p className="text-amber-800 text-[11px]">
              These suggested visuals will not appear on the storefront until you explicitly approve them.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {suggestedAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="bg-white p-3 rounded-xl border border-amber-200 flex items-center gap-3 shadow-2xs"
                >
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    <Image src={asset.url} alt={asset.title || 'AI Visual'} fill className="object-cover" unoptimized />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#0f2d22] truncate text-[11px]">{asset.title || asset.id}</p>
                    <p className="text-[10px] text-gray-500 truncate">
                      {getEntityLabel(asset.entityType, asset.entityId)}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button
                        onClick={() => handleStatusTransition(asset.id, 'approved')}
                        disabled={actionLoadingId === asset.id}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-2 py-0.5 rounded text-[10px] font-bold"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleStatusTransition(asset.id, 'rejected')}
                        disabled={actionLoadingId === asset.id}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-2 py-0.5 rounded text-[10px] font-bold"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Switcher: Canonical vs Legacy */}
        <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('canonical')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'canonical'
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : 'bg-[#fcfbf7] text-gray-600 hover:bg-[#f5f1e8]'
              }`}
            >
              <Layers className="w-4 h-4 text-[#c5a059]" />
              <span>Universal Media Assets ({assets.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('legacy')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'legacy'
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : 'bg-[#fcfbf7] text-gray-600 hover:bg-[#f5f1e8]'
              }`}
            >
              <History className="w-4 h-4 text-[#c5a059]" />
              <span>Legacy Media Library ({legacyMedia.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-gray-500 hidden sm:block">
            {activeTab === 'canonical'
              ? 'Authoritative public.media_assets source'
              : 'Backward-compatible site_settings.mediaLibrary'}
          </div>
        </div>

        {/* CANONICAL TAB CONTENT */}
        {activeTab === 'canonical' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-[#e8e2d5] space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by title, file, alt, URL..."
                    className="w-full pl-9 pr-4 py-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs focus:outline-none focus:border-[#1b4332]"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs">
                  {/* Entity Type Filter */}
                  <select
                    value={selectedEntityType}
                    onChange={(e) => setSelectedEntityType(e.target.value)}
                    className="p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-medium"
                  >
                    <option value="all">All Entities</option>
                    <option value="PRODUCT">Products</option>
                    <option value="CATEGORY">Categories</option>
                    <option value="GUIDE">Guides</option>
                    <option value="KNOWLEDGE">Knowledge</option>
                    <option value="BRAND">Brand</option>
                    <option value="MARKETING">Marketing</option>
                  </select>

                  {/* Status Filter */}
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-medium"
                  >
                    <option value="all">All Statuses</option>
                    <option value="approved">Approved</option>
                    <option value="suggested">Suggested (AI)</option>
                    <option value="rejected">Rejected</option>
                    <option value="archived">Archived</option>
                  </select>

                  {/* Role Filter */}
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-medium"
                  >
                    <option value="all">All Roles</option>
                    <option value="PRIMARY">PRIMARY</option>
                    <option value="GALLERY">GALLERY</option>
                    <option value="PACKAGING">PACKAGING</option>
                    <option value="LIFESTYLE">LIFESTYLE</option>
                    <option value="INGREDIENTS">INGREDIENTS</option>
                    <option value="HERO">HERO</option>
                  </select>

                  {/* Source Filter */}
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-medium"
                  >
                    <option value="all">All Sources</option>
                    <option value="MANUAL_UPLOAD">Manual Upload</option>
                    <option value="AI_GENERATED">AI Generated</option>
                    <option value="EXTERNAL_IMPORT">External Import</option>
                    <option value="SYSTEM_FALLBACK">System Fallback</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Media Asset Cards Grid */}
            {filteredAssets.length === 0 ? (
              <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-[#e8e2d5] space-y-3">
                <FolderOpen className="w-12 h-12 text-gray-300 mx-auto" />
                <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">No Media Assets Found</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  No assets match your current filter parameters. Try clearing the filters or upload a new asset.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredAssets.map((asset) => {
                  const isPrimary = asset.role === 'PRIMARY';
                  const isAi = asset.source === 'AI_GENERATED';
                  const isLocked = asset.isLocked;

                  return (
                    <div
                      key={asset.id}
                      className={`bg-white border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                        isPrimary
                          ? 'border-[#c5a059] ring-2 ring-[#c5a059]/30'
                          : 'border-[#e8e2d5]'
                      }`}
                    >
                      {/* Image Thumbnail */}
                      <div className="relative aspect-square bg-gray-50 overflow-hidden group">
                        <Image
                          src={asset.url}
                          alt={asset.title || asset.fileName || 'Media Asset'}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized
                        />

                        {/* Top-Left: Entity Type & Name */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          <span className="bg-[#0f2d22]/90 backdrop-blur-xs text-[#c5a059] text-[10px] font-bold px-2 py-0.5 rounded-md">
                            {asset.entityType}
                          </span>
                        </div>

                        {/* Top-Right: Badges */}
                        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                          {isPrimary && (
                            <span className="bg-[#c5a059] text-[#0f2d22] text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                              {isLocked ? <Lock className="w-3 h-3" /> : null} PRIMARY
                            </span>
                          )}

                          {isAi && (
                            <span className="bg-purple-900/90 text-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-purple-300" /> AI
                            </span>
                          )}

                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded capitalize ${
                              asset.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : asset.status === 'suggested'
                                ? 'bg-amber-100 text-amber-800'
                                : asset.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {asset.status}
                          </span>
                        </div>

                        {/* Hover Overlay Controls */}
                        <div className="absolute inset-0 bg-[#0f2d22]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                          <button
                            onClick={() => setSelectedAssetForDetail(asset)}
                            className="p-2 bg-white text-[#0f2d22] rounded-xl font-bold shadow hover:bg-[#c5a059] transition-colors"
                            title="View Full Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleCopyUrl(asset.url, asset.id)}
                            className="p-2 bg-white text-[#0f2d22] rounded-xl font-bold shadow hover:bg-[#c5a059] transition-colors"
                            title="Copy Public URL"
                          >
                            {copiedId === asset.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          {asset.status !== 'archived' && (
                            <button
                              onClick={() => handleArchive(asset)}
                              disabled={actionLoadingId === asset.id}
                              className="p-2 bg-rose-600 text-white rounded-xl font-bold shadow hover:bg-rose-700 transition-colors"
                              title="Archive Asset"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Card Info & Quick Actions */}
                      <div className="p-3 bg-white text-xs border-t border-[#e8e2d5]/60 space-y-2">
                        <div>
                          <p className="font-bold text-[#0f2d22] truncate text-[11px]" title={asset.title || asset.fileName}>
                            {asset.title || asset.fileName || 'Untitled Asset'}
                          </p>
                          <p className="text-[10px] text-gray-500 truncate">
                            {getEntityLabel(asset.entityType, asset.entityId)}
                          </p>
                        </div>

                        {/* Role and Lock Action */}
                        <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px]">
                          <span className="font-mono text-gray-400 uppercase">{asset.role}</span>

                          <div className="flex items-center gap-1">
                            {!isPrimary && asset.status === 'approved' && (
                              <button
                                onClick={() => handleSetPrimary(asset, true)}
                                disabled={actionLoadingId === asset.id}
                                className="text-[10px] font-bold text-[#1b4332] hover:text-[#c5a059] underline"
                              >
                                Set Primary
                              </button>
                            )}

                            {isPrimary && (
                              <button
                                onClick={() => handleToggleLock(asset)}
                                disabled={actionLoadingId === asset.id}
                                className="flex items-center gap-0.5 text-[10px] font-bold text-[#c5a059] hover:underline"
                                title={isLocked ? 'Click to unlock' : 'Click to lock primary against AI demotion'}
                              >
                                {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3 text-gray-400" />}
                                <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* LEGACY TAB CONTENT */}
        {activeTab === 'legacy' && (
          <div className="space-y-4">
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-xs text-amber-900">
              <p className="font-bold">Legacy Media Library Compatibility</p>
              <p className="mt-0.5 text-[11px]">
                These assets are stored in site_settings.mediaLibrary. They have already been registered into
                public.media_assets by the migration engine. Any manual changes here continue to work seamlessly.
              </p>
            </div>

            {legacyMedia.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-[#e8e2d5]">
                <p className="text-xs text-gray-500">No legacy media items found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {legacyMedia.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-[#e8e2d5] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div className="relative aspect-square bg-gray-50 overflow-hidden">
                      <Image src={item.url} alt={item.name} fill className="object-cover" unoptimized />
                    </div>
                    <div className="p-3 bg-white text-[11px] border-t border-[#e8e2d5]/60 space-y-1">
                      <p className="font-bold text-[#0f2d22] truncate" title={item.name}>
                        {item.name}
                      </p>
                      <div className="flex items-center justify-between text-gray-500 text-[10px]">
                        <span>{(item.size / 1024).toFixed(0)} KB</span>
                        <button
                          onClick={() => handleDeleteLegacyMedia(item)}
                          disabled={legacyDeletingId === item.id}
                          className="text-rose-600 hover:text-rose-800 font-bold"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DETAIL & METADATA MODAL */}
        {selectedAssetForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white border border-[#e8e2d5] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-5 border-b border-[#e8e2d5] flex items-center justify-between bg-[#0f2d22] text-white">
                <h3 className="font-serif-heading font-bold text-lg text-white">Media Asset Inspector</h3>
                <button
                  onClick={() => setSelectedAssetForDetail(null)}
                  className="p-1.5 text-gray-300 hover:text-white hover:bg-[#1b4332] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6 text-xs">
                {/* Large Preview */}
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gray-100 border border-[#e8e2d5]">
                  <Image
                    src={selectedAssetForDetail.url}
                    alt={selectedAssetForDetail.title || selectedAssetForDetail.fileName || 'Asset'}
                    fill
                    className="object-contain"
                    unoptimized
                  />
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-[#fcfbf7] p-4 rounded-xl border border-[#e8e2d5]">
                  <div>
                    <label className="text-gray-400 font-bold text-[10px] uppercase">Entity Type</label>
                    <p className="font-bold text-[#0f2d22] mt-0.5">{selectedAssetForDetail.entityType}</p>
                  </div>

                  <div>
                    <label className="text-gray-400 font-bold text-[10px] uppercase">Entity ID</label>
                    <p className="font-bold text-[#0f2d22] mt-0.5 truncate">
                      {selectedAssetForDetail.entityId || 'Global / Unassigned'}
                    </p>
                  </div>

                  <div>
                    <label className="text-gray-400 font-bold text-[10px] uppercase">Role</label>
                    <p className="font-bold text-[#0f2d22] mt-0.5">{selectedAssetForDetail.role}</p>
                  </div>

                  <div>
                    <label className="text-gray-400 font-bold text-[10px] uppercase">Source</label>
                    <p className="font-bold text-[#0f2d22] mt-0.5">{selectedAssetForDetail.source}</p>
                  </div>

                  <div>
                    <label className="text-gray-400 font-bold text-[10px] uppercase">Status</label>
                    <p className="font-bold text-[#0f2d22] mt-0.5 capitalize">{selectedAssetForDetail.status}</p>
                  </div>

                  <div>
                    <label className="text-gray-400 font-bold text-[10px] uppercase">Primary Lock</label>
                    <p className="font-bold text-[#0f2d22] mt-0.5">
                      {selectedAssetForDetail.isLocked ? 'LOCKED (Protected)' : 'Unlocked'}
                    </p>
                  </div>

                  <div>
                    <label className="text-gray-400 font-bold text-[10px] uppercase">MIME Type</label>
                    <p className="font-mono text-[10px] text-[#0f2d22] mt-0.5">{selectedAssetForDetail.mimeType}</p>
                  </div>

                  <div>
                    <label className="text-gray-400 font-bold text-[10px] uppercase">SHA-256 Hash</label>
                    <p className="font-mono text-[9px] text-gray-500 truncate mt-0.5" title={selectedAssetForDetail.fileHash}>
                      {selectedAssetForDetail.fileHash || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <label className="text-gray-400 font-bold text-[10px] uppercase">Dimensions</label>
                    <p className="text-[10px] text-[#0f2d22] mt-0.5">
                      {selectedAssetForDetail.width ? `${selectedAssetForDetail.width}x${selectedAssetForDetail.height}` : selectedAssetForDetail.aspectRatio}
                    </p>
                  </div>
                </div>

                {/* AI Provenance / Metadata (if generated) */}
                {selectedAssetForDetail.source === 'AI_GENERATED' && selectedAssetForDetail.aiMetadata && (
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1.5">
                    <p className="font-bold text-purple-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span>AI Generation Provenance</span>
                    </p>
                    <p className="text-[11px] text-purple-800">
                      <strong>Model:</strong> {selectedAssetForDetail.aiMetadata.model || 'Gemini Imagen'}
                    </p>
                    <p className="text-[11px] text-purple-800">
                      <strong>Prompt Used:</strong> {selectedAssetForDetail.aiMetadata.promptUsed || 'Default grounded prompt'}
                    </p>
                  </div>
                )}

                {/* Public CDN URL */}
                <div>
                  <label className="block text-[#0f2d22] font-bold mb-1">Public URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={selectedAssetForDetail.url}
                      className="flex-1 p-2.5 bg-[#f5f1e8] border border-[#e8e2d5] rounded-xl font-mono text-[10px] text-gray-700"
                    />
                    <button
                      onClick={() => handleCopyUrl(selectedAssetForDetail.url, selectedAssetForDetail.id)}
                      className="bg-[#1b4332] text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-1.5 shrink-0"
                    >
                      {copiedId === selectedAssetForDetail.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Governance Action Buttons */}
                <div className="pt-4 border-t border-[#e8e2d5] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {selectedAssetForDetail.status === 'suggested' && (
                      <>
                        <button
                          onClick={() => handleStatusTransition(selectedAssetForDetail.id, 'approved')}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-xl font-bold"
                        >
                          Approve Visual
                        </button>
                        <button
                          onClick={() => handleStatusTransition(selectedAssetForDetail.id, 'rejected')}
                          className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl font-bold"
                        >
                          Reject Visual
                        </button>
                      </>
                    )}

                    {selectedAssetForDetail.role !== 'PRIMARY' && selectedAssetForDetail.status === 'approved' && (
                      <button
                        onClick={() => handleSetPrimary(selectedAssetForDetail, true)}
                        className="bg-[#1b4332] hover:bg-[#0f2d22] text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5"
                      >
                        <Lock className="w-3.5 h-3.5 text-[#c5a059]" />
                        <span>Set Authoritative Primary</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedAssetForDetail(null)}
                    className="px-5 py-2 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI VISUAL GENERATOR MODAL */}
        {showGenerateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white border border-[#e8e2d5] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-[#e8e2d5] flex items-center justify-between bg-[#0f2d22] text-white shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#c5a059]" />
                  <div>
                    <h3 className="font-serif-heading font-bold text-lg text-white">
                      AI Visual Generation Studio
                    </h3>
                    <p className="text-[11px] text-[#c5a059]">
                      Zero-Cost Free-First Architecture • Factual Anti-Hallucination Prompts
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="p-1.5 text-gray-300 hover:text-white hover:bg-[#1b4332] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleGenerateSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
                {genError && (
                  <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl font-medium">
                    {genError}
                  </div>
                )}

                {genSuccessNotice && (
                  <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl font-medium">
                    {genSuccessNotice}
                  </div>
                )}

                {/* Target Entity & Classification */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#0f2d22] font-bold mb-1">Entity Classification</label>
                    <select
                      value={genEntityType}
                      onChange={(e) => setGenEntityType(e.target.value as MediaEntityType)}
                      className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-medium"
                    >
                      <option value="PRODUCT">PRODUCT (Product Render / Packshot)</option>
                      <option value="CATEGORY">CATEGORY (Collection Scene)</option>
                      <option value="GUIDE">GUIDE (Instructional Infographic)</option>
                      <option value="KNOWLEDGE">KNOWLEDGE (Educational Monograph)</option>
                      <option value="BRAND">BRAND (Brand Story Heritage)</option>
                      <option value="MARKETING">MARKETING (Social / Banners)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#0f2d22] font-bold mb-1">Target Entity Record</label>
                    <select
                      value={genEntityId}
                      onChange={(e) => setGenEntityId(e.target.value)}
                      className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-medium"
                    >
                      {entityOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name} ({opt.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#0f2d22] font-bold mb-1">Visual Variant</label>
                    <select
                      value={genVariant}
                      onChange={(e) => setGenVariant(e.target.value)}
                      className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-medium"
                    >
                      <option value="packshot">Packshot (Clean Commercial Studio)</option>
                      <option value="lifestyle">Lifestyle (Sunlit Rajasthani Courtyard)</option>
                      <option value="ingredient">Ingredient (Macro Botanicals & Stone Mortar)</option>
                      <option value="usage">Usage / Authentic Application Ritual</option>
                      <option value="infographic">Infographic (Museum Botanical Layers)</option>
                      <option value="illustration">Monograph Illustration (Watercolor & Archival Ink)</option>
                      <option value="collection">Collection Display (Harmonious Boutique Shelf)</option>
                      <option value="social">Social Hero Visual (High Impact Editorial)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#0f2d22] font-bold mb-1">Asset Role</label>
                    <select
                      value={genRole}
                      onChange={(e) => setGenRole(e.target.value as MediaAssetRole)}
                      className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-medium"
                    >
                      <option value="GALLERY">GALLERY (Catalog)</option>
                      <option value="PRIMARY">PRIMARY (Demoted if locked primary exists)</option>
                      <option value="PACKAGING">PACKAGING</option>
                      <option value="LIFESTYLE">LIFESTYLE</option>
                      <option value="INGREDIENTS">INGREDIENTS</option>
                      <option value="HERO">HERO</option>
                      <option value="OG_SOCIAL">OG_SOCIAL</option>
                    </select>
                  </div>
                </div>

                {/* Provider Tier Selector */}
                <div>
                  <label className="block text-[#0f2d22] font-bold mb-1.5">
                    Select AI Generation Provider (Free-First)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Free Studio Option */}
                    <button
                      type="button"
                      onClick={() => setGenProviderId('manual-studio')}
                      className={`p-3 text-left rounded-xl border transition-all ${
                        genProviderId === 'manual-studio'
                          ? 'border-[#1b4332] bg-[#f5f1e8] ring-1 ring-[#1b4332]'
                          : 'border-[#e8e2d5] bg-white hover:bg-[#fcfbf7]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#0f2d22]">Free AI Studio</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                          FREE • ₹0
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-600 line-clamp-2">
                        Use prompt with any free AI generator and import directly.
                      </p>
                    </button>

                    {/* Local Self-Hosted Option */}
                    <button
                      type="button"
                      onClick={() => setGenProviderId('local-sd')}
                      className={`p-3 text-left rounded-xl border transition-all ${
                        genProviderId === 'local-sd'
                          ? 'border-[#1b4332] bg-[#f5f1e8] ring-1 ring-[#1b4332]'
                          : 'border-[#e8e2d5] bg-white hover:bg-[#fcfbf7]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#0f2d22]">Local AI</span>
                        <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">
                          LOCAL • ₹0
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-600 line-clamp-2">
                        Stable Diffusion / ComfyUI on local server.
                      </p>
                    </button>

                    {/* Google Gemini Option */}
                    <button
                      type="button"
                      onClick={() => setGenProviderId('gemini')}
                      className={`p-3 text-left rounded-xl border transition-all ${
                        genProviderId === 'gemini'
                          ? 'border-[#1b4332] bg-[#f5f1e8] ring-1 ring-[#1b4332]'
                          : 'border-[#e8e2d5] bg-white hover:bg-[#fcfbf7]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[#0f2d22]">Gemini Flash</span>
                        <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded">
                          OPTIONAL PAID
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-600 line-clamp-2">
                        Native Gemini 3.1 Flash Image model via API key.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Grounded Factual Prompt Preview & 1-Click Copy */}
                <div className="bg-[#f5f1e8] border border-[#e8e2d5] rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[#0f2d22] font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" />
                      <span>Factual Grounded Prompt (Anti-Hallucination)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const textToCopy = genPromptOverride.trim() || genPromptPreview;
                        navigator.clipboard.writeText(textToCopy);
                        setPromptCopied(true);
                        setTimeout(() => setPromptCopied(false), 2500);
                      }}
                      className="inline-flex items-center gap-1 bg-white hover:bg-[#0f2d22] hover:text-white border border-[#e8e2d5] px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#1b4332] transition-colors shadow-2xs"
                    >
                      {promptCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied Prompt!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-[#c5a059]" />
                          <span>Copy Prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#0f2d22]/90 italic bg-white/80 p-2.5 rounded-lg border border-[#e8e2d5]/60 font-serif max-h-28 overflow-y-auto select-all">
                    {genPromptOverride.trim() || genPromptPreview || 'Generating grounded prompt from DB facts...'}
                  </p>
                </div>

                {/* Custom Prompt Override */}
                <div>
                  <label className="block text-[#0f2d22] font-bold mb-1">
                    Custom Prompt Override (Optional)
                  </label>
                  <textarea
                    value={genPromptOverride}
                    onChange={(e) => setGenPromptOverride(e.target.value)}
                    placeholder="Leave blank to use the strict factual prompt above..."
                    rows={2}
                    className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl"
                  />
                </div>

                {/* Free Studio Image Import Dropzone (when manual-studio is active) */}
                {genProviderId === 'manual-studio' && (
                  <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-950 text-[11px]">
                        Import AI Image (₹0 Operation)
                      </span>
                      <span className="text-[10px] text-emerald-800 font-medium">
                        ChatGPT Free • Bing • Fooocus • HuggingFace
                      </span>
                    </div>
                    <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-600 rounded-xl p-4 text-center bg-white relative cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        onChange={(e) => setGenStudioFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Upload className="w-6 h-6 text-emerald-700 mx-auto mb-1.5" />
                      {genStudioFile ? (
                        <div>
                          <p className="font-bold text-emerald-900">{genStudioFile.name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {(genStudioFile.size / 1024).toFixed(1)} KB — Click to change
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-bold text-[#0f2d22]">Choose or Drag Generated Image Here</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            Saves to canonical media_assets as &quot;suggested&quot; with SHA-256 deduplication
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Governance Guardrails Reminder */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-0.5">
                  <p className="font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span>Strict AI Governance & Zero-Mandatory-Cost Guarantee</span>
                  </p>
                  <p>
                    All generated visual assets are registered with status <strong>suggested</strong> and <strong>is_locked = false</strong>. They will never appear publicly on the storefront until you review and approve them.
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-[#e8e2d5]">
                  <button
                    type="button"
                    onClick={() => setShowGenerateModal(false)}
                    className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={generating || (genProviderId === 'manual-studio' && !genStudioFile)}
                    className="inline-flex items-center gap-1.5 bg-[#0f2d22] text-[#c5a059] border border-[#c5a059]/40 px-5 py-2.5 rounded-xl font-bold shadow hover:bg-[#1b4332] disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {generating
                        ? 'Processing Visual...'
                        : genProviderId === 'manual-studio'
                        ? 'Register Visual (₹0)'
                        : `Generate via ${genProviderId === 'local-sd' ? 'Local AI' : 'Gemini'}`}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MANUAL UPLOAD MODAL */}
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

                {/* File Dropzone */}
                <div>
                  <label className="block text-[#0f2d22] font-bold mb-1">Select File</label>
                  <div className="border-2 border-dashed border-[#e8e2d5] hover:border-[#1b4332] rounded-2xl p-6 text-center bg-[#fcfbf7] relative cursor-pointer">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif,image/svg+xml,video/mp4,video/webm"
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
                          Supports JPG, PNG, WEBP, AVIF, SVG (SHA-256 deduplicated)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#0f2d22] font-bold mb-1">Entity Type</label>
                    <select
                      value={uploadEntityType}
                      onChange={(e) => setUploadEntityType(e.target.value as MediaEntityType)}
                      className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-medium"
                    >
                      <option value="PRODUCT">PRODUCT</option>
                      <option value="CATEGORY">CATEGORY</option>
                      <option value="GUIDE">GUIDE</option>
                      <option value="KNOWLEDGE">KNOWLEDGE</option>
                      <option value="BRAND">BRAND</option>
                      <option value="MARKETING">MARKETING</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#0f2d22] font-bold mb-1">Role</label>
                    <select
                      value={uploadRole}
                      onChange={(e) => setUploadRole(e.target.value as MediaAssetRole)}
                      className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-medium"
                    >
                      <option value="GALLERY">GALLERY</option>
                      <option value="PRIMARY">PRIMARY</option>
                      <option value="PACKAGING">PACKAGING</option>
                      <option value="LIFESTYLE">LIFESTYLE</option>
                      <option value="INGREDIENTS">INGREDIENTS</option>
                      <option value="HERO">HERO</option>
                      <option value="OG_SOCIAL">OG_SOCIAL</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[#0f2d22] font-bold mb-1">Target Entity ID (Optional)</label>
                  <input
                    type="text"
                    value={uploadEntityId}
                    onChange={(e) => setUploadEntityId(e.target.value)}
                    placeholder="e.g. prod-1, henna-powder, etc."
                    className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[#0f2d22] font-bold mb-1">Display Title</label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Sojat Pure Henna 100g Packshot"
                    className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-[#0f2d22] font-bold mb-1">Alt Text (Accessibility & SEO)</label>
                  <input
                    type="text"
                    value={uploadAltText}
                    onChange={(e) => setUploadAltText(e.target.value)}
                    placeholder="Describe image for search engines..."
                    className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl"
                  />
                </div>

                {uploadRole === 'PRIMARY' && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <input
                      type="checkbox"
                      id="uploadLock"
                      checked={uploadIsLocked}
                      onChange={(e) => setUploadIsLocked(e.target.checked)}
                      className="rounded border-[#e8e2d5] text-[#1b4332] focus:ring-[#1b4332]"
                    />
                    <label htmlFor="uploadLock" className="text-[11px] text-[#0f2d22] font-bold cursor-pointer">
                      Lock as Authoritative Primary (Immune to AI replacement)
                    </label>
                  </div>
                )}

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
                    {uploading ? 'Uploading & Hashing...' : 'Upload Asset'}
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
