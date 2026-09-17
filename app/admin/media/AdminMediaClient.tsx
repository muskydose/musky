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
  Layers,
  History,
  Activity,
  CheckCircle,
  HelpCircle,
  Sliders,
  ChevronRight,
  Shield,
  FileCheck,
  Grid,
  ImageOff,
  Maximize2,
  Cpu,
  Terminal,
} from 'lucide-react';
import MediaThumbnail from '@/components/admin/MediaThumbnail';
import {
  checkComfyUIHealth,
  generateComfyUIImage,
  ComfyUIHealthStatus,
  DEFAULT_COMFYUI_ENDPOINT,
} from '@/lib/ai/comfyui-client';
import {
  resolveMediaAssetUsage,
  getUsedAsDescription,
  MediaAssetUsageInfo,
  EntityLookupContext,
} from '@/lib/growth/media-usage';
import {
  CatalogVisualHealthSummary,
  EntityVisualHealthReport,
  EvaluatedVisualSlot,
} from '@/lib/growth/visual-decision-engine';

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
  // Navigation tabs: 'canonical' (MediaAsset) vs 'visual_health' vs 'legacy' (MediaItem)
  const [activeTab, setActiveTab] = useState<'canonical' | 'visual_health' | 'legacy'>('canonical');

  // Sub-view inside canonical tab: 'entity_grouped' (Default) vs 'flat_grid'
  const [canonicalViewMode, setCanonicalViewMode] = useState<'entity_grouped' | 'flat_grid'>('entity_grouped');

  // Canonical Media Assets State
  const [assets, setAssets] = useState<MediaAsset[]>(initialMediaAssets);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Visual Health State
  const [catalogHealth, setCatalogHealth] = useState<CatalogVisualHealthSummary | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);
  const [healthFilter, setHealthFilter] = useState<string>('ALL');
  const [selectedEntityForSlots, setSelectedEntityForSlots] = useState<EntityVisualHealthReport | null>(null);
  const [inspectModalOpen, setInspectModalOpen] = useState<boolean>(false);

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
  const [genProgressMessage, setGenProgressMessage] = useState<string>('');
  const [genError, setGenError] = useState<string>('');
  const [genSuccessNotice, setGenSuccessNotice] = useState<string>('');

  // Local ComfyUI Connector State
  const [comfyStatus, setComfyStatus] = useState<ComfyUIHealthStatus | null>(null);
  const [showComfyModal, setShowComfyModal] = useState<boolean>(false);
  const [comfyEndpoint, setComfyEndpoint] = useState<string>(DEFAULT_COMFYUI_ENDPOINT);

  // Check ComfyUI Health periodically and on mount
  const refreshComfyHealth = useCallback(async () => {
    const status = await checkComfyUIHealth(comfyEndpoint);
    setComfyStatus(status);
  }, [comfyEndpoint]);

  useEffect(() => {
    refreshComfyHealth();
    const interval = setInterval(refreshComfyHealth, 15000);
    return () => clearInterval(interval);
  }, [refreshComfyHealth]);

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

  // Fetch catalog visual health
  const refreshVisualHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/admin/media-assets?view=visual_health');
      const data = await res.json();
      if (data.success && data.catalogSummary) {
        setCatalogHealth(data.catalogSummary);
      }
    } catch (err) {
      console.error('Failed to refresh visual health:', err);
    } finally {
      setHealthLoading(false);
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

  // Sync genEntityId when genEntityType changes (only if current selection is invalid)
  useEffect(() => {
    if (entityOptions.length > 0) {
      setGenEntityId((current) => {
        const exists = entityOptions.some((opt) => opt.id === current);
        return exists ? current : entityOptions[0].id;
      });
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
      setGenError(
        'Free AI Studio is a prompt-first manual workflow: copy the grounded prompt below, generate in your preferred free tool (ChatGPT, Bing, Fooocus), then drop the resulting image file here to import.'
      );
      return;
    }

    if (genProviderId === 'local-sd' && !comfyStatus?.online) {
      setGenError(
        'Local ComfyUI is currently OFFLINE. Please start ComfyUI with: python main.py --listen 127.0.0.1 --enable-cors-header (or click the LOCAL AI badge in the header for instructions).'
      );
      return;
    }

    setGenerating(true);
    setGenProgressMessage('Preparing visual prompt and context...');
    setGenError('');
    setGenSuccessNotice('');

    try {
      let res: Response;

      if (genProviderId === 'local-sd') {
        // Path A: Browser -> ComfyUI ₹0 generation directly from client machine
        setGenProgressMessage('Executing generation workflow on local ComfyUI instance...');
        const comfyResult = await generateComfyUIImage({
          endpoint: comfyEndpoint,
          prompt: genPromptOverride.trim() || genPromptPreview,
          width: 1024,
          height: 1024,
        });

        setGenProgressMessage('Image rendered! Uploading verified binary to Supabase storage...');
        const formData = new FormData();
        formData.append('file', comfyResult.blob, comfyResult.fileName);
        formData.append('entityType', genEntityType);
        formData.append('entityId', genEntityId);
        formData.append('role', genRole);
        formData.append('variant', genVariant);
        formData.append('providerId', 'local-sd');
        if (genPromptOverride.trim()) {
          formData.append('promptOverride', genPromptOverride.trim());
        }

        res = await fetch('/api/admin/media-assets/generate', {
          method: 'POST',
          body: formData,
        });
      } else if (genProviderId === 'manual-studio' && genStudioFile) {
        setGenProgressMessage('Uploading and validating imported visual...');
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
        setGenProgressMessage('Requesting visual generation from provider...');
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
      setGenError(err?.message || 'Error occurred while requesting AI generation.');
    } finally {
      setGenerating(false);
      setGenProgressMessage('');
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

  // Canonical Entity Lookup Context for Truthful Usage & Routes
  const lookupContext = useMemo<EntityLookupContext>(
    () => ({
      products: initialProducts,
      categories: initialCategories,
      guides: initialGuides,
      knowledge: initialKnowledgeEntities,
    }),
    [initialProducts, initialCategories, initialGuides, initialKnowledgeEntities]
  );

  // Truthful derived asset usage resolver
  const getAssetUsage = useCallback(
    (asset: MediaAsset): MediaAssetUsageInfo => {
      return resolveMediaAssetUsage(asset, assets, lookupContext);
    },
    [assets, lookupContext]
  );

  // Quick Open Modal Helpers pre-selecting entity & role
  const handleOpenUploadForEntity = (
    entityType: MediaEntityType,
    entityId: string,
    role: MediaAssetRole = 'GALLERY'
  ) => {
    setUploadEntityType(entityType);
    setUploadEntityId(entityId);
    setUploadRole(role);
    setShowUploadModal(true);
  };

  const handleOpenGenerateForEntity = (
    entityType: MediaEntityType,
    entityId: string,
    role: MediaAssetRole = 'GALLERY'
  ) => {
    setGenEntityType(entityType);
    setGenEntityId(entityId);
    setGenRole(role);
    switch (entityType) {
      case 'KNOWLEDGE':
        setGenVariant('illustration');
        break;
      case 'CATEGORY':
        setGenVariant('collection');
        break;
      case 'GUIDE':
        setGenVariant('usage');
        break;
      case 'BRAND':
      case 'MARKETING':
        setGenVariant('social');
        break;
      case 'PRODUCT':
      default:
        setGenVariant('packshot');
        break;
    }
    setGenPromptOverride('');
    setGenError('');
    setShowGenerateModal(true);
  };

  // Grouped Entity Clusters for Clustered UX
  const entityClusters = useMemo(() => {
    type ClusterItem = {
      key: string;
      entityType: MediaEntityType;
      entityId: string;
      name: string;
      slug?: string;
      existsInCatalog: boolean;
      primaryAsset?: MediaAsset;
      galleryAssets: MediaAsset[];
      specializedAssets: MediaAsset[];
      suggestedAssets: MediaAsset[];
      allAssets: MediaAsset[];
      storefrontUrl?: string;
      totalAssetsCount: number;
      livePublicCount: number;
    };

    const clusterMap = new Map<string, ClusterItem>();

    const getOrCreateCluster = (entityType: MediaEntityType, entityId: string): ClusterItem => {
      const key = `${entityType}:::${entityId}`;
      let item = clusterMap.get(key);
      if (!item) {
        let name = `${entityType}: ${entityId}`;
        let slug: string | undefined;
        let existsInCatalog = false;
        let storefrontUrl: string | undefined;

        if (entityType === 'PRODUCT') {
          const p = initialProducts.find((x) => x.id === entityId || x.slug === entityId);
          if (p) {
            name = p.name;
            slug = p.slug;
            existsInCatalog = true;
            storefrontUrl = `/products/${p.slug}`;
          }
        } else if (entityType === 'CATEGORY') {
          const c = initialCategories.find((x) => x.id === entityId || x.slug === entityId);
          if (c) {
            name = c.name;
            slug = c.slug;
            existsInCatalog = true;
            storefrontUrl = `/categories/${c.slug}`;
          }
        } else if (entityType === 'GUIDE') {
          const g = initialGuides.find((x) => x.id === entityId || x.slug === entityId);
          if (g) {
            name = g.title;
            slug = g.slug;
            existsInCatalog = true;
            storefrontUrl = `/guides/${g.slug}`;
          }
        } else if (entityType === 'KNOWLEDGE') {
          const k = initialKnowledgeEntities.find(
            (x) => x.id === entityId || x.entityKey === entityId || x.slug === entityId
          );
          if (k) {
            name = k.canonicalName;
            slug = k.slug;
            existsInCatalog = true;
            storefrontUrl = `/knowledge/${k.slug}`;
          }
        } else if (entityType === 'BRAND') {
          name = 'Musky Dose Brand Assets';
          existsInCatalog = true;
          storefrontUrl = '/';
        } else if (entityType === 'MARKETING') {
          name = 'Storefront Marketing & Banners';
          existsInCatalog = true;
          storefrontUrl = '/';
        }

        item = {
          key,
          entityType,
          entityId,
          name,
          slug,
          existsInCatalog,
          galleryAssets: [],
          specializedAssets: [],
          suggestedAssets: [],
          allAssets: [],
          storefrontUrl,
          totalAssetsCount: 0,
          livePublicCount: 0,
        };
        clusterMap.set(key, item);
      }
      return item;
    };

    // Pre-populate clusters from catalog entities
    initialProducts.forEach((p) => getOrCreateCluster('PRODUCT', p.id));
    initialCategories.forEach((c) => getOrCreateCluster('CATEGORY', c.id));
    initialGuides.forEach((g) => getOrCreateCluster('GUIDE', g.id));
    initialKnowledgeEntities.forEach((k) => getOrCreateCluster('KNOWLEDGE', k.id || k.entityKey));
    getOrCreateCluster('BRAND', 'brand-main');
    getOrCreateCluster('MARKETING', 'marketing-hero');

    // Populate assets into clusters
    assets.forEach((asset) => {
      if (asset.status === 'archived') return; // Hide archived assets from active entity clusters
      const cluster = getOrCreateCluster(asset.entityType, asset.entityId || 'unassigned');
      cluster.allAssets.push(asset);
      cluster.totalAssetsCount++;

      const usage = resolveMediaAssetUsage(asset, assets, lookupContext);
      if (usage.isLivePublic) {
        cluster.livePublicCount++;
      }

      if (asset.status === 'suggested') {
        cluster.suggestedAssets.push(asset);
      } else if (asset.status === 'approved') {
        if (asset.role === 'PRIMARY') {
          // If multiple approved primaries, first one sorted by sortOrder is primary
          if (!cluster.primaryAsset || (asset.sortOrder ?? 100) < (cluster.primaryAsset.sortOrder ?? 100)) {
            if (cluster.primaryAsset) {
              cluster.galleryAssets.push(cluster.primaryAsset);
            }
            cluster.primaryAsset = asset;
          } else {
            cluster.galleryAssets.push(asset);
          }
        } else if (asset.role === 'GALLERY') {
          cluster.galleryAssets.push(asset);
        } else {
          cluster.specializedAssets.push(asset);
        }
      }
    });

    // Sort gallery assets by sortOrder
    for (const cluster of clusterMap.values()) {
      cluster.galleryAssets.sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100));
    }

    return Array.from(clusterMap.values()).filter((cluster) => {
      if (selectedEntityType !== 'all' && cluster.entityType !== selectedEntityType) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matches =
          cluster.name.toLowerCase().includes(q) ||
          cluster.entityId.toLowerCase().includes(q) ||
          (cluster.slug && cluster.slug.toLowerCase().includes(q)) ||
          cluster.allAssets.some(
            (a) =>
              (a.title && a.title.toLowerCase().includes(q)) ||
              (a.fileName && a.fileName.toLowerCase().includes(q)) ||
              (a.url && a.url.toLowerCase().includes(q))
          );
        if (!matches) return false;
      }
      return true;
    });
  }, [
    assets,
    initialProducts,
    initialCategories,
    initialGuides,
    initialKnowledgeEntities,
    lookupContext,
    selectedEntityType,
    searchTerm,
  ]);

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

            {/* Local AI Status Indicator (ComfyUI ₹0 Connector) */}
            <button
              type="button"
              onClick={() => setShowComfyModal(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                comfyStatus?.online
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-[#fcfbf7] text-gray-700 border-[#e8e2d5] hover:bg-[#f5f1e8]'
              }`}
              title="Click to view Local ComfyUI connection status & Windows setup instructions"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  comfyStatus?.online ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
                }`}
              />
              <Cpu className="w-3.5 h-3.5 text-[#1b4332]" />
              <span>LOCAL AI: {comfyStatus?.online ? 'CONNECTED' : 'OFFLINE'}</span>
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
                  <div
                    className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 cursor-pointer border border-[#e8e2d5]"
                    onClick={() => setSelectedAssetForDetail(asset)}
                    title="Click to inspect"
                  >
                    <MediaThumbnail
                      src={asset.url}
                      alt={asset.title || 'AI Visual'}
                      defaultFit="cover"
                      role={asset.role}
                      source={asset.source}
                      storagePath={asset.storagePath}
                      fileSizeBytes={asset.fileSizeBytes}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-bold text-[#0f2d22] truncate text-[11px] cursor-pointer hover:text-[#c5a059]"
                      onClick={() => setSelectedAssetForDetail(asset)}
                      title={asset.title || asset.id}
                    >
                      {asset.title || asset.id}
                    </p>
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

        {/* Tab Switcher: Canonical vs Visual Health vs Legacy */}
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
              onClick={() => {
                setActiveTab('visual_health');
                refreshVisualHealth();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'visual_health'
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : 'bg-[#fcfbf7] text-gray-600 hover:bg-[#f5f1e8]'
              }`}
            >
              <Activity className="w-4 h-4 text-[#c5a059]" />
              <span>
                Visual Health &amp; Slots {catalogHealth ? `(${catalogHealth.overallScore}%)` : ''}
              </span>
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
            {/* Filter & View Mode Switcher Bar */}
            <div className="bg-white p-4 rounded-2xl border border-[#e8e2d5] space-y-3">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                {/* Search Bar & View Mode Toggle */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name, ID, title, file, URL..."
                      className="w-full pl-9 pr-4 py-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs focus:outline-none focus:border-[#1b4332]"
                    />
                  </div>

                  {/* View Mode Toggle: Group by Entity vs Flat Grid */}
                  <div className="flex items-center bg-[#f5f1e8] p-1 rounded-xl border border-[#e8e2d5] shrink-0">
                    <button
                      type="button"
                      onClick={() => setCanonicalViewMode('entity_grouped')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        canonicalViewMode === 'entity_grouped'
                          ? 'bg-[#1b4332] text-white shadow-xs'
                          : 'text-gray-600 hover:text-[#0f2d22]'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-[#c5a059]" />
                      <span>Group by Entity ({entityClusters.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCanonicalViewMode('flat_grid')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        canonicalViewMode === 'flat_grid'
                          ? 'bg-[#1b4332] text-white shadow-xs'
                          : 'text-gray-600 hover:text-[#0f2d22]'
                      }`}
                    >
                      <Grid className="w-3.5 h-3.5 text-[#c5a059]" />
                      <span>All Assets Grid ({filteredAssets.length})</span>
                    </button>
                  </div>
                </div>

                {/* Filter Selectors */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
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

            {/* VIEW MODE 1: CLUSTERED GROUP BY ENTITY */}
            {canonicalViewMode === 'entity_grouped' && (
              <div className="space-y-6">
                {entityClusters.length === 0 ? (
                  <div className="p-16 text-center bg-white rounded-2xl border border-dashed border-[#e8e2d5] space-y-3">
                    <FolderOpen className="w-12 h-12 text-gray-300 mx-auto" />
                    <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">No Matching Entities Found</h3>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                      No entity clusters match your search or filter. Try changing your filters.
                    </p>
                  </div>
                ) : (
                  entityClusters.map((cluster) => {
                    return (
                      <div
                        key={cluster.key}
                        className="bg-white rounded-2xl border border-[#e8e2d5] shadow-xs overflow-hidden"
                      >
                        {/* Entity Header Banner */}
                        <div className="p-4 md:p-5 bg-gradient-to-r from-[#fcfbf7] to-white border-b border-[#e8e2d5] flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex items-start md:items-center gap-3">
                            <span className="bg-[#0f2d22] text-[#c5a059] text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg shrink-0">
                              {cluster.entityType}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h2 className="font-bold text-base text-[#0f2d22]">
                                  {cluster.name}
                                </h2>
                                {cluster.storefrontUrl && cluster.existsInCatalog && (
                                  <a
                                    href={cluster.storefrontUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-emerald-800 hover:text-emerald-950 font-mono underline"
                                    title="View live page on storefront"
                                  >
                                    <span>{cluster.storefrontUrl}</span>
                                    <ExternalLink className="w-3 h-3 text-emerald-700" />
                                  </a>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">
                                Entity ID: <span className="font-mono">{cluster.entityId}</span>
                                {cluster.slug ? ` • Slug: ${cluster.slug}` : ''} •{' '}
                                <strong className="text-[#0f2d22]">{cluster.totalAssetsCount}</strong> assets (
                                <strong className="text-emerald-700">{cluster.livePublicCount}</strong> live public
                                {cluster.suggestedAssets.length > 0 && (
                                  <span className="text-amber-700 font-bold ml-1">
                                    • {cluster.suggestedAssets.length} AI pending
                                  </span>
                                )}
                                )
                              </p>
                            </div>
                          </div>

                          {/* Entity Header Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenGenerateForEntity(cluster.entityType, cluster.entityId)}
                              className="inline-flex items-center gap-1.5 bg-[#0f2d22] text-[#c5a059] border border-[#c5a059]/40 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[#1b4332] transition-colors"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Generate AI</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenUploadForEntity(cluster.entityType, cluster.entityId)}
                              className="inline-flex items-center gap-1.5 bg-[#1b4332] text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[#0f2d22] transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5 text-[#c5a059]" />
                              <span>Upload Media</span>
                            </button>
                          </div>
                        </div>

                        {/* Entity Visual Assets Grid */}
                        <div className="p-4 md:p-5 space-y-5">
                          {/* 1. Authoritative Slots: PRIMARY & GALLERY */}
                          <div>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Storefront Public Slots (PRIMARY &amp; GALLERY)</span>
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {/* Primary Slot Card */}
                              {cluster.primaryAsset ? (
                                (() => {
                                  const usage = getAssetUsage(cluster.primaryAsset);
                                  const isLocked = Boolean(cluster.primaryAsset.isLocked);
                                  return (
                                    <div className="bg-white border-2 border-[#c5a059] ring-2 ring-[#c5a059]/20 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
                                      <div className="relative aspect-square bg-[#fcfbf7] overflow-hidden group">
                                        <MediaThumbnail
                                          src={cluster.primaryAsset.url}
                                          alt={cluster.primaryAsset.title || cluster.name}
                                          defaultFit="cover"
                                          role="PRIMARY"
                                          source={cluster.primaryAsset.source}
                                          storagePath={cluster.primaryAsset.storagePath}
                                          fileSizeBytes={cluster.primaryAsset.fileSizeBytes}
                                        />
                                        <div className="absolute top-2 left-2 z-20">
                                          <span className="bg-[#0f2d22] text-[#c5a059] border border-[#c5a059]/50 text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                                            {isLocked ? <Lock className="w-3 h-3 text-[#c5a059]" /> : <ShieldCheck className="w-3 h-3 text-emerald-400" />}
                                            <span>PRIMARY</span>
                                          </span>
                                        </div>
                                        <div className="absolute top-2 right-2 z-20">
                                          <span className="bg-emerald-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            <span>LIVE</span>
                                          </span>
                                        </div>

                                        {/* Hover Controls */}
                                        <div className="absolute inset-0 bg-[#0f2d22]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 z-30">
                                          <button
                                            type="button"
                                            onClick={() => setSelectedAssetForDetail(cluster.primaryAsset!)}
                                            className="p-2 bg-white text-[#0f2d22] rounded-xl font-bold shadow hover:bg-[#c5a059] transition-colors"
                                            title="View Details"
                                          >
                                            <Eye className="w-4 h-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleCopyUrl(cluster.primaryAsset!.url, cluster.primaryAsset!.id)}
                                            className="p-2 bg-white text-[#0f2d22] rounded-xl font-bold shadow hover:bg-[#c5a059] transition-colors"
                                            title="Copy URL"
                                          >
                                            {copiedId === cluster.primaryAsset!.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleArchive(cluster.primaryAsset!)}
                                            className="p-2 bg-rose-600 text-white rounded-xl font-bold shadow hover:bg-rose-700 transition-colors"
                                            title="Archive"
                                          >
                                            <Trash2 className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>

                                      <div className="p-3 bg-white text-xs border-t border-[#e8e2d5]/60 space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-[#0f2d22] text-[11px] truncate">
                                            {cluster.primaryAsset.title || cluster.primaryAsset.fileName || 'Authoritative Primary'}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-gray-500 truncate">{usage.usedAs}</p>
                                        {usage.consumingRoutes[0] && (
                                          <a
                                            href={usage.consumingRoutes[0].route}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-[10px] text-emerald-800 font-mono font-medium hover:underline truncate"
                                          >
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            <span>{usage.consumingRoutes[0].route}</span>
                                          </a>
                                        )}
                                        <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px]">
                                          <span className="font-mono text-gray-400">
                                            {cluster.primaryAsset.id.slice(0, 12)}...
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleToggleLock(cluster.primaryAsset!)}
                                            disabled={actionLoadingId === cluster.primaryAsset.id}
                                            className="flex items-center gap-0.5 text-[10px] font-bold text-[#c5a059] hover:underline"
                                            title={isLocked ? 'Click to unlock' : 'Click to lock primary'}
                                          >
                                            {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3 text-gray-400" />}
                                            <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()
                              ) : (
                                /* Missing Primary Placeholder */
                                <div className="border-2 border-dashed border-amber-300 bg-amber-50/40 rounded-2xl p-5 text-center flex flex-col items-center justify-center min-h-[260px] space-y-2">
                                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                                    <ImageIcon className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-amber-950 text-xs">Missing Primary Packshot</p>
                                    <p className="text-[10px] text-amber-800/80 mt-0.5 max-w-[180px]">
                                      Storefront PDP hero is using legacy/fallback image.
                                    </p>
                                  </div>
                                  <div className="flex flex-col gap-1.5 w-full pt-1">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenUploadForEntity(cluster.entityType, cluster.entityId, 'PRIMARY')}
                                      className="w-full py-1.5 bg-[#1b4332] text-white rounded-lg text-[10px] font-bold hover:bg-[#0f2d22] transition-colors"
                                    >
                                      Upload Primary
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenGenerateForEntity(cluster.entityType, cluster.entityId, 'PRIMARY')}
                                      className="w-full py-1.5 bg-[#0f2d22] text-[#c5a059] border border-[#c5a059]/40 rounded-lg text-[10px] font-bold hover:bg-[#1b4332] transition-colors"
                                    >
                                      Generate AI Primary
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Gallery Slots */}
                              {cluster.galleryAssets.map((asset, index) => {
                                const usage = getAssetUsage(asset);
                                return (
                                  <div
                                    key={asset.id}
                                    className="bg-white border border-[#e8e2d5] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                                  >
                                    <div className="relative aspect-square bg-[#fcfbf7] overflow-hidden group">
                                      <MediaThumbnail
                                        src={asset.url}
                                        alt={asset.title || asset.fileName || 'Gallery Asset'}
                                        defaultFit="cover"
                                        role="GALLERY"
                                        source={asset.source}
                                        storagePath={asset.storagePath}
                                        fileSizeBytes={asset.fileSizeBytes}
                                      />
                                      <div className="absolute top-2 left-2 z-20">
                                        <span className="bg-[#0f2d22]/90 backdrop-blur-xs text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                                          GALLERY #{index + 1}
                                        </span>
                                      </div>
                                      <div className="absolute top-2 right-2 z-20">
                                        {usage.isLivePublic ? (
                                          <span className="bg-emerald-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                                            LIVE
                                          </span>
                                        ) : (
                                          <span className="bg-slate-700 text-slate-200 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                                            STANDBY
                                          </span>
                                        )}
                                      </div>

                                      {/* Hover Controls */}
                                      <div className="absolute inset-0 bg-[#0f2d22]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 z-30">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedAssetForDetail(asset)}
                                          className="p-2 bg-white text-[#0f2d22] rounded-xl font-bold shadow hover:bg-[#c5a059] transition-colors"
                                          title="View Details"
                                        >
                                          <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleCopyUrl(asset.url, asset.id)}
                                          className="p-2 bg-white text-[#0f2d22] rounded-xl font-bold shadow hover:bg-[#c5a059] transition-colors"
                                          title="Copy URL"
                                        >
                                          {copiedId === asset.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleArchive(asset)}
                                          className="p-2 bg-rose-600 text-white rounded-xl font-bold shadow hover:bg-rose-700 transition-colors"
                                          title="Archive"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>

                                    <div className="p-3 bg-white text-xs border-t border-[#e8e2d5]/60 space-y-1.5">
                                      <p className="font-bold text-[#0f2d22] truncate text-[11px]" title={asset.title || asset.fileName}>
                                        {asset.title || asset.fileName || `Gallery Asset #${index + 1}`}
                                      </p>
                                      <p className="text-[10px] text-gray-500 truncate">{usage.usedAs}</p>
                                      <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-[10px]">
                                        <span className="font-mono text-gray-400">
                                          {asset.id.slice(0, 12)}...
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => handleSetPrimary(asset, true)}
                                          disabled={actionLoadingId === asset.id}
                                          className="text-[10px] font-bold text-[#1b4332] hover:text-[#c5a059] underline"
                                        >
                                          Set Primary
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Add Gallery Placeholder Button */}
                              {cluster.entityType === 'PRODUCT' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenUploadForEntity(cluster.entityType, cluster.entityId, 'GALLERY')}
                                  className="border-2 border-dashed border-[#e8e2d5] hover:border-[#1b4332] bg-[#fcfbf7] hover:bg-white rounded-2xl p-5 text-center flex flex-col items-center justify-center min-h-[260px] space-y-2 transition-all cursor-pointer group"
                                >
                                  <div className="w-10 h-10 rounded-xl bg-[#f5f1e8] group-hover:bg-[#1b4332] text-[#1b4332] group-hover:text-white flex items-center justify-center transition-colors">
                                    <Plus className="w-5 h-5" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-[#0f2d22] text-xs">Add Gallery Slide</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                      Upload high-resolution lifestyle or packaging photo
                                    </p>
                                  </div>
                                </button>
                              )}
                            </div>
                          </div>

                          {/* 2. Specialized Roles (Packaging, Lifestyle, Ingredients, Hero) */}
                          {cluster.specializedAssets.length > 0 && (
                            <div>
                              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-blue-600" />
                                <span>Specialized Content Slots ({cluster.specializedAssets.length})</span>
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {cluster.specializedAssets.map((asset) => {
                                  const usage = getAssetUsage(asset);
                                  return (
                                    <div
                                      key={asset.id}
                                      className="bg-white border border-[#e8e2d5] rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between"
                                    >
                                      <div className="relative aspect-square bg-[#fcfbf7] overflow-hidden group">
                                        <MediaThumbnail
                                          src={asset.url}
                                          alt={asset.title || asset.fileName || 'Asset'}
                                          defaultFit="cover"
                                          role={asset.role}
                                          source={asset.source}
                                          storagePath={asset.storagePath}
                                          fileSizeBytes={asset.fileSizeBytes}
                                        />
                                        <div className="absolute top-2 left-2 z-20">
                                          <span className="bg-blue-900 text-blue-100 text-[9px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                                            {asset.role}
                                          </span>
                                        </div>
                                        <div className="absolute inset-0 bg-[#0f2d22]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 z-30">
                                          <button
                                            type="button"
                                            onClick={() => setSelectedAssetForDetail(asset)}
                                            className="p-2 bg-white text-[#0f2d22] rounded-xl font-bold shadow hover:bg-[#c5a059]"
                                          >
                                            <Eye className="w-4 h-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleCopyUrl(asset.url, asset.id)}
                                            className="p-2 bg-white text-[#0f2d22] rounded-xl font-bold shadow hover:bg-[#c5a059]"
                                          >
                                            <Copy className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                      <div className="p-3 bg-white text-xs border-t border-[#e8e2d5]/60 space-y-1">
                                        <p className="font-bold text-[#0f2d22] truncate text-[11px]">
                                          {asset.title || asset.fileName || asset.role}
                                        </p>
                                        <p className="text-[10px] text-gray-500 truncate">{usage.usedAs}</p>
                                        <span className="text-[9px] font-mono text-gray-400 block pt-1 border-t border-gray-100">
                                          {usage.consumptionSummary}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 3. Pending AI Candidates for this Entity */}
                          {cluster.suggestedAssets.length > 0 && (
                            <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-2xl space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
                                  <Sparkles className="w-4 h-4 text-amber-600" />
                                  <span>{cluster.suggestedAssets.length} AI Suggested Visual(s) Awaiting Your Review</span>
                                </div>
                                <span className="bg-amber-200/80 text-amber-950 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                  NON-PUBLIC • ZERO STOREFRONT EXPOSURE
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {cluster.suggestedAssets.map((asset) => (
                                  <div
                                    key={asset.id}
                                    className="bg-white p-3 rounded-xl border border-amber-200 flex items-center gap-3 shadow-2xs"
                                  >
                                    <div
                                      className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[#e8e2d5] cursor-pointer"
                                      onClick={() => setSelectedAssetForDetail(asset)}
                                      title="Inspect visual"
                                    >
                                      <MediaThumbnail
                                        src={asset.url}
                                        alt={asset.title || 'AI Visual'}
                                        defaultFit="cover"
                                        role={asset.role}
                                        source={asset.source}
                                        storagePath={asset.storagePath}
                                        fileSizeBytes={asset.fileSizeBytes}
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p
                                        className="font-bold text-[#0f2d22] truncate text-[11px] cursor-pointer hover:text-[#c5a059]"
                                        onClick={() => setSelectedAssetForDetail(asset)}
                                      >
                                        {asset.title || asset.id}
                                      </p>
                                      <p className="text-[10px] text-gray-500 truncate">
                                        Slot: <strong>{asset.role}</strong>
                                      </p>
                                      <div className="flex items-center gap-1.5 mt-2">
                                        <button
                                          type="button"
                                          onClick={() => handleStatusTransition(asset.id, 'approved')}
                                          disabled={actionLoadingId === asset.id}
                                          className="bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded text-[10px] font-bold transition-colors"
                                        >
                                          Approve
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleStatusTransition(asset.id, 'rejected')}
                                          disabled={actionLoadingId === asset.id}
                                          className="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded text-[10px] font-bold transition-colors"
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
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* VIEW MODE 2: FLAT FILTERABLE GRID */}
            {canonicalViewMode === 'flat_grid' && (
              <>
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
                      const usage = getAssetUsage(asset);
                      const isPrimary = asset.role === 'PRIMARY';
                      const isAi = asset.source === 'AI_GENERATED';
                      const isLocked = Boolean(asset.isLocked);

                      return (
                        <div
                          key={asset.id}
                          className={`bg-white border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                            usage.authorityStatus === 'LIVE_AUTHORITATIVE'
                              ? 'border-[#c5a059] ring-2 ring-[#c5a059]/30'
                              : asset.status === 'suggested'
                              ? 'border-purple-300 ring-1 ring-purple-200'
                              : asset.status === 'rejected'
                              ? 'border-rose-200 opacity-75'
                              : asset.status === 'archived'
                              ? 'border-gray-200 opacity-60'
                              : 'border-[#e8e2d5]'
                          }`}
                        >
                          {/* Image Thumbnail */}
                          <div className="relative aspect-square bg-[#fcfbf7] overflow-hidden group">
                            <MediaThumbnail
                              src={asset.url}
                              alt={asset.title || asset.fileName || 'Media Asset'}
                              defaultFit="cover"
                              role={asset.role}
                              source={asset.source}
                              storagePath={asset.storagePath}
                              fileSizeBytes={asset.fileSizeBytes}
                            />

                            {/* Top-Left: Entity Type */}
                            <div className="absolute top-2 left-2 flex flex-col gap-1 z-20 pointer-events-none">
                              <span className="bg-[#0f2d22]/90 backdrop-blur-xs text-[#c5a059] text-[9px] font-bold px-2 py-0.5 rounded-md shadow-xs">
                                {asset.entityType}
                              </span>
                            </div>

                            {/* Top-Right: Authority & Source Badges */}
                            <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-20 pointer-events-none">
                              {usage.authorityStatus === 'LIVE_AUTHORITATIVE' && (
                                <span className="bg-[#0f2d22] text-[#c5a059] border border-[#c5a059]/60 text-[9px] font-black px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1">
                                  {isLocked ? <Lock className="w-3 h-3 text-[#c5a059]" /> : <ShieldCheck className="w-3 h-3 text-emerald-400" />}
                                  <span>{isLocked ? 'LIVE (LOCKED)' : 'LIVE / AUTH'}</span>
                                </span>
                              )}

                              {usage.authorityStatus === 'APPROVED_NOT_CURRENT' && (
                                <span className="bg-slate-800 text-slate-200 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                                  STANDBY
                                </span>
                              )}

                              {usage.authorityStatus === 'SUGGESTED' && (
                                <span className="bg-purple-900 text-purple-200 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-purple-300" />
                                  <span>SUGGESTED</span>
                                </span>
                              )}

                              {usage.authorityStatus === 'REJECTED' && (
                                <span className="bg-rose-900 text-rose-200 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                                  REJECTED
                                </span>
                              )}

                              {usage.authorityStatus === 'ARCHIVED' && (
                                <span className="bg-gray-800 text-gray-200 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                                  ARCHIVED
                                </span>
                              )}

                              {isAi ? (
                                <span className="bg-purple-100 text-purple-800 text-[8px] font-bold px-1.5 py-0.2 rounded border border-purple-200">
                                  AI GEN
                                </span>
                              ) : asset.source === 'VERIFIED_FREE_LICENSE' ? (
                                <span className="bg-emerald-100 text-emerald-800 text-[8px] font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                                  FREE LIC
                                </span>
                              ) : null}
                            </div>

                            {/* Hover Overlay Controls */}
                            <div className="absolute inset-0 bg-[#0f2d22]/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 z-30">
                              <button
                                type="button"
                                onClick={() => setSelectedAssetForDetail(asset)}
                                className="p-2 bg-white text-[#0f2d22] rounded-xl font-bold shadow hover:bg-[#c5a059] transition-colors"
                                title="View Full Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
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
                                  type="button"
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

                          {/* Card Info & Usage */}
                          <div className="p-3 bg-white text-xs border-t border-[#e8e2d5]/60 space-y-2">
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono text-[9px] text-gray-400 uppercase tracking-wider">
                                  {asset.role}
                                </span>
                                <span className="font-mono text-[9px] text-gray-400 truncate max-w-[80px]" title={asset.id}>
                                  {asset.id.slice(0, 12)}...
                                </span>
                              </div>
                              <p className="font-bold text-[#0f2d22] truncate text-[11px] mt-0.5" title={asset.title || asset.fileName}>
                                {asset.title || asset.fileName || 'Untitled Asset'}
                              </p>
                              <p className="text-[10px] text-gray-500 truncate" title={usage.entityName}>
                                {usage.entityName}
                              </p>
                            </div>

                            {/* Truthful Usage & Consuming Route */}
                            <div className="pt-1.5 border-t border-gray-100 space-y-1">
                              <p className="text-[10px] text-gray-600 leading-tight line-clamp-1" title={usage.usedAs}>
                                <strong className="text-gray-400 uppercase text-[9px] block">Used As:</strong>
                                {usage.usedAs}
                              </p>

                              {usage.isLivePublic && usage.consumingRoutes.length > 0 ? (
                                <a
                                  href={usage.consumingRoutes[0].route}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] text-emerald-800 font-mono font-medium hover:text-emerald-950 transition-colors truncate max-w-full"
                                  title={`View consuming route: ${usage.consumingRoutes[0].route}`}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="truncate">{usage.consumingRoutes[0].route}</span>
                                  <ExternalLink className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                                </a>
                              ) : (
                                <p className="text-[10px] text-gray-400 italic flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                                  <span className="truncate">{usage.consumptionSummary}</span>
                                </p>
                              )}
                            </div>

                            {/* Quick Governance Actions */}
                            <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 text-[10px]">
                              {asset.status === 'suggested' ? (
                                <div className="flex items-center gap-1.5 w-full justify-end">
                                  <button
                                    type="button"
                                    onClick={() => handleStatusTransition(asset.id, 'approved')}
                                    disabled={actionLoadingId === asset.id}
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded text-[10px] font-bold"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleStatusTransition(asset.id, 'rejected')}
                                    disabled={actionLoadingId === asset.id}
                                    className="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded text-[10px] font-bold"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div>
                                    {!isPrimary && asset.status === 'approved' && (
                                      <button
                                        type="button"
                                        onClick={() => handleSetPrimary(asset, true)}
                                        disabled={actionLoadingId === asset.id}
                                        className="text-[10px] font-bold text-[#1b4332] hover:text-[#c5a059] underline"
                                      >
                                        Set Primary
                                      </button>
                                    )}
                                  </div>

                                  <div>
                                    {isPrimary && (
                                      <button
                                        type="button"
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
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* VISUAL HEALTH & SLOTS TAB CONTENT */}
        {activeTab === 'visual_health' && (
          <div className="space-y-6">
            {/* Visual Health Top Summary KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-[#e8e2d5] shadow-xs">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Overall Score</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold font-serif-heading text-[#0f2d22]">
                    {catalogHealth ? `${catalogHealth.overallScore}%` : '...'}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold">Catalog Parity</span>
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-[#e8e2d5] shadow-xs">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total Entities</p>
                <p className="text-2xl font-bold font-serif-heading text-[#0f2d22] mt-1">
                  {catalogHealth ? catalogHealth.totalEntities : '...'}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/20">
                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Complete</p>
                <p className="text-2xl font-bold font-serif-heading text-emerald-900 mt-1">
                  {catalogHealth ? catalogHealth.healthyCount : '...'}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs bg-rose-50/20">
                <p className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Missing Required</p>
                <p className="text-2xl font-bold font-serif-heading text-rose-900 mt-1">
                  {catalogHealth ? catalogHealth.missingCount : '...'}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-orange-200 shadow-xs bg-orange-50/20">
                <p className="text-[10px] font-bold text-orange-800 uppercase tracking-wider">Fallback / Weak</p>
                <p className="text-2xl font-bold font-serif-heading text-orange-900 mt-1">
                  {catalogHealth ? catalogHealth.fallbackCount : '...'}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-xs bg-purple-50/20">
                <p className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Pending AI / Review</p>
                <p className="text-2xl font-bold font-serif-heading text-purple-900 mt-1">
                  {catalogHealth ? catalogHealth.pendingAiCount + catalogHealth.pendingApprovalCount : '...'}
                </p>
              </div>
            </div>

            {/* Health Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-[#e8e2d5] flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                <span className="text-gray-400 text-[11px] mr-1 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Filter:
                </span>
                {[
                  { key: 'ALL', label: 'All Entities' },
                  { key: 'COMPLETE', label: 'Complete' },
                  { key: 'NEEDS_REVIEW', label: 'Needs Review' },
                  { key: 'MISSING', label: 'Missing Slots' },
                  { key: 'FALLBACK', label: 'Fallback' },
                  { key: 'PENDING_AI', label: 'Pending AI' },
                  { key: 'PENDING_APPROVAL', label: 'Pending Approval' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setHealthFilter(item.key)}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      healthFilter === item.key
                        ? 'bg-[#1b4332] text-white shadow-xs'
                        : 'bg-[#f5f1e8] text-gray-700 hover:bg-[#e8e2d5]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <button
                onClick={refreshVisualHealth}
                disabled={healthLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f1e8] hover:bg-[#e8e2d5] text-[#1b4332] rounded-xl text-xs font-bold transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Audit</span>
              </button>
            </div>

            {/* Entity Blueprint Matrix */}
            {healthLoading && !catalogHealth ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-[#e8e2d5]">
                <RefreshCw className="w-8 h-8 text-[#c5a059] animate-spin mx-auto mb-3" />
                <p className="font-bold text-[#0f2d22]">Auditing Visual Blueprint Slots Across Catalog...</p>
                <p className="text-xs text-gray-500 mt-1">Analyzing aspect ratios, fallback status, and reuse candidates.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {catalogHealth?.entityReports
                  .filter((r) => {
                    if (healthFilter === 'ALL') return true;
                    return r.overallHealth === healthFilter;
                  })
                  .map((report) => {
                    // Find authoritative primary asset for thumbnail preview
                    const primarySlot = report.evaluatedSlots.find(
                      (s) => s.slot.role === 'PRIMARY' || s.slot.role === 'HERO' || s.slot.role === 'BANNER'
                    );
                    const primaryUrl = primarySlot?.asset?.url || '/images/fallback.svg';

                    return (
                      <div
                        key={`${report.entityType}-${report.entityId}`}
                        className="bg-white p-4 rounded-2xl border border-[#e8e2d5] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs hover:border-[#c5a059]/60 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-[#e8e2d5]">
                            <MediaThumbnail
                              src={primaryUrl}
                              alt={report.entityName}
                              defaultFit="cover"
                              role="PRIMARY"
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold bg-[#f5f1e8] text-[#1b4332] px-2 py-0.5 rounded">
                                {report.entityType}
                              </span>
                              <h3 className="font-bold text-[#0f2d22] text-sm truncate">
                                {report.entityName}
                              </h3>
                            </div>
                            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                              ID: <span className="font-mono">{report.entityId}</span> • Health Score:{' '}
                              <strong>{report.healthScore}%</strong> ({report.filledRequiredCount}/
                              {report.requiredSlotsCount} required slots filled)
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          {/* Health Badge */}
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                              report.overallHealth === 'COMPLETE'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : report.overallHealth === 'NEEDS_REVIEW'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : report.overallHealth === 'MISSING'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : report.overallHealth === 'FALLBACK'
                                ? 'bg-orange-100 text-orange-800 border-orange-300'
                                : report.overallHealth === 'PENDING_AI'
                                ? 'bg-purple-100 text-purple-800 border-purple-300'
                                : 'bg-blue-100 text-blue-800 border-blue-300'
                            }`}
                          >
                            {report.overallHealth}
                          </span>

                          <button
                            onClick={() => {
                              setSelectedEntityForSlots(report);
                              setInspectModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 bg-[#0f2d22] hover:bg-[#1b4332] text-[#c5a059] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors shadow-2xs"
                          >
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Inspect Slots ({report.totalSlots})</span>
                            <ChevronRight className="w-3.5 h-3.5 opacity-75" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* VISUAL SLOT INSPECTOR MODAL */}
        {inspectModalOpen && selectedEntityForSlots && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white border border-[#e8e2d5] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-5 border-b border-[#e8e2d5] flex items-center justify-between bg-[#0f2d22] text-white shrink-0">
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-5 h-5 text-[#c5a059]" />
                  <div>
                    <h3 className="font-serif-heading font-bold text-lg text-white">
                      Visual Blueprint Slots: {selectedEntityForSlots.entityName}
                    </h3>
                    <p className="text-[11px] text-[#c5a059]">
                      Entity: {selectedEntityForSlots.entityType} ({selectedEntityForSlots.entityId}) • Overall Status:{' '}
                      <span className="font-bold underline">{selectedEntityForSlots.overallHealth}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectModalOpen(false)}
                  className="p-1.5 text-gray-300 hover:text-white hover:bg-[#1b4332] rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedEntityForSlots.evaluatedSlots.map((evaluated) => {
                    const slot = evaluated.slot;
                    const asset = evaluated.asset;

                    return (
                      <div
                        key={slot.slotId}
                        className={`p-3.5 rounded-xl border space-y-2.5 ${
                          evaluated.status === 'FILLED_OPTIMAL'
                            ? 'bg-white border-[#e8e2d5]'
                            : evaluated.status === 'FILLED_REUSED'
                            ? 'bg-blue-50/40 border-blue-200'
                            : evaluated.status === 'WEAK_FALLBACK'
                            ? 'bg-orange-50/40 border-orange-200'
                            : evaluated.status === 'PENDING_AI'
                            ? 'bg-purple-50/40 border-purple-200'
                            : 'bg-rose-50/40 border-rose-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-[#0f2d22] text-xs">
                                {slot.slotId}
                              </span>
                              {slot.isRequired && (
                                <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                  REQUIRED
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-600 mt-0.5">{slot.purpose}</p>
                          </div>

                          {/* Slot Status Badge */}
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded shrink-0 ${
                              evaluated.status === 'FILLED_OPTIMAL'
                                ? 'bg-emerald-100 text-emerald-800'
                                : evaluated.status === 'FILLED_REUSED'
                                ? 'bg-blue-100 text-blue-800'
                                : evaluated.status === 'WEAK_FALLBACK'
                                ? 'bg-orange-100 text-orange-800'
                                : evaluated.status === 'PENDING_AI'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {evaluated.status}
                          </span>
                        </div>

                        {/* Visual Preview & Provenance */}
                        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
                          <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                            <Image
                              src={asset?.url || '/images/fallback.svg'}
                              alt={slot.slotId}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>

                          <div className="flex-1 min-w-0 space-y-1 text-[11px]">
                            <p className="text-gray-600 truncate">
                              <strong>Preferred Ratio:</strong> {slot.preferredAspectRatio}
                              {asset?.aspectRatio && ` (Actual: ${asset.aspectRatio})`}
                            </p>
                            {asset && (
                              <p className="text-gray-500 truncate text-[10px]">
                                <strong>Source:</strong> {asset.source} • Status: {asset.status}
                              </p>
                            )}
                            {evaluated.reusedFromSlotId && (
                              <p className="text-blue-700 text-[10px] font-medium">
                                ↳ Reused from {evaluated.reusedFromSlotId}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Slot Action Button */}
                        <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                          {evaluated.status === 'PENDING_AI' && asset && (
                            <button
                              onClick={() => {
                                handleStatusTransition(asset.id, 'approved');
                                setInspectModalOpen(false);
                              }}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white px-2.5 py-1 rounded-lg font-bold text-[10px]"
                            >
                              Approve AI Visual
                            </button>
                          )}

                          {(evaluated.status === 'MISSING_REQUIRED' || evaluated.status === 'WEAK_FALLBACK') && (
                            <button
                              onClick={() => {
                                setInspectModalOpen(false);
                                setGenEntityType(selectedEntityForSlots.entityType as MediaEntityType);
                                setGenEntityId(selectedEntityForSlots.entityId);
                                setGenRole(slot.role);
                                setShowGenerateModal(true);
                              }}
                              className="bg-[#0f2d22] hover:bg-[#1b4332] text-[#c5a059] px-2.5 py-1 rounded-lg font-bold text-[10px] flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" />
                              <span>Generate Visual</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 border-t border-[#e8e2d5] bg-[#fcfbf7] flex justify-end">
                <button
                  onClick={() => setInspectModalOpen(false)}
                  className="px-5 py-2 bg-[#1b4332] text-white font-bold rounded-xl hover:bg-[#0f2d22]"
                >
                  Done
                </button>
              </div>
            </div>
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
                    <div className="relative aspect-square bg-[#fcfbf7] overflow-hidden">
                      <MediaThumbnail src={item.url} alt={item.name} defaultFit="cover" />
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
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-[#fcfbf7] border border-[#e8e2d5]">
                  <MediaThumbnail
                    src={selectedAssetForDetail.url}
                    alt={selectedAssetForDetail.title || selectedAssetForDetail.fileName || 'Asset'}
                    defaultFit="contain"
                    role={selectedAssetForDetail.role}
                    source={selectedAssetForDetail.source}
                    storagePath={selectedAssetForDetail.storagePath}
                    fileSizeBytes={selectedAssetForDetail.fileSizeBytes}
                  />
                </div>

                {/* Truthful Storefront Usage & Consuming Routes */}
                {(() => {
                  const detailUsage = getAssetUsage(selectedAssetForDetail);
                  return (
                    <div className="p-4 rounded-xl border bg-[#fcfbf7] border-[#e8e2d5] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0f2d22] text-[11px] flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-[#c5a059]" />
                          <span>Storefront Consumption &amp; Authority</span>
                        </span>
                        {detailUsage.isLivePublic ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            <span>{detailUsage.authorityBadgeLabel}</span>
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-300">
                            {detailUsage.authorityBadgeLabel}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-gray-400 font-bold text-[10px] uppercase">Used As:</span>
                          <p className="font-medium text-[#0f2d22] mt-0.5">{detailUsage.usedAs}</p>
                        </div>
                        <div>
                          <span className="text-gray-400 font-bold text-[10px] uppercase">Exact Slot:</span>
                          <p className="font-mono font-medium text-[#0f2d22] mt-0.5">{detailUsage.exactSlot}</p>
                        </div>
                      </div>

                      <div>
                        <span className="text-gray-400 font-bold text-[10px] uppercase">Consuming Storefront Route(s):</span>
                        {detailUsage.consumingRoutes.length > 0 ? (
                          <div className="space-y-1 mt-1">
                            {detailUsage.consumingRoutes.map((r) => (
                              <a
                                key={r.route}
                                href={r.route}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 rounded-lg font-mono text-[11px] transition-colors"
                              >
                                <span>{r.route}</span>
                                <ExternalLink className="w-3 h-3 text-emerald-700" />
                                <span className="text-[10px] text-emerald-700 font-sans">({r.label})</span>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-500 italic mt-0.5">
                            {detailUsage.whyNotPublicYet || 'Not currently consumed by any storefront page.'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}

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
                  <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-purple-950 flex items-center gap-1.5 text-xs">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        <span>AI Visual Provenance &amp; Lineage</span>
                      </p>
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-200/80 text-purple-900">
                        {selectedAssetForDetail.aiMetadata.tier || 'FREE'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-purple-900 bg-white/70 p-3 rounded-xl border border-purple-200/60">
                      <div>
                        <span className="text-purple-700/80 font-bold block text-[9px] uppercase">Engine / Provider</span>
                        <span className="font-semibold">{selectedAssetForDetail.aiMetadata.provider || selectedAssetForDetail.aiMetadata.providerId || 'Custom'}</span>
                      </div>
                      <div>
                        <span className="text-purple-700/80 font-bold block text-[9px] uppercase">Model</span>
                        <span className="font-semibold">{selectedAssetForDetail.aiMetadata.model || 'Unknown Model'}</span>
                      </div>
                      <div>
                        <span className="text-purple-700/80 font-bold block text-[9px] uppercase">Cost Per Visual</span>
                        <span className="font-semibold text-emerald-800">{selectedAssetForDetail.aiMetadata.cost || '₹0'}</span>
                      </div>
                      <div>
                        <span className="text-purple-700/80 font-bold block text-[9px] uppercase">Generated Timestamp</span>
                        <span className="font-mono text-[10px]">{selectedAssetForDetail.aiMetadata.generatedAt ? new Date(selectedAssetForDetail.aiMetadata.generatedAt).toLocaleString() : 'N/A'}</span>
                      </div>
                      {selectedAssetForDetail.storagePath && (
                        <div className="col-span-2">
                          <span className="text-purple-700/80 font-bold block text-[9px] uppercase">Storage Object Path</span>
                          <span className="font-mono text-[10px] truncate block text-gray-700">{selectedAssetForDetail.storagePath}</span>
                        </div>
                      )}
                      {selectedAssetForDetail.fileHash && (
                        <div className="col-span-2">
                          <span className="text-purple-700/80 font-bold block text-[9px] uppercase">SHA-256 Binary Hash</span>
                          <span className="font-mono text-[9px] truncate block text-gray-600 select-all">{selectedAssetForDetail.fileHash}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-purple-900 font-bold block text-[10px] uppercase mb-1">Grounded Prompt Used:</span>
                      <p className="text-[11px] text-purple-950 font-serif italic bg-white/80 p-2.5 rounded-xl border border-purple-200/60 select-all leading-relaxed max-h-32 overflow-y-auto">
                        {selectedAssetForDetail.aiMetadata.promptUsed || 'No prompt recorded'}
                      </p>
                    </div>
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
                      {genEntityType === 'KNOWLEDGE' ? (
                        <>
                          <option value="illustration">Monograph Illustration (Archival Watercolor & Ink)</option>
                          <option value="ingredient">Botanical Specimen (Fresh Leaves & Terroir)</option>
                          <option value="infographic">Infographic (Museum Botanical Anatomy & Taxonomy)</option>
                          <option value="lifestyle">Botanical Study (Sunlit Courtyard Still Life)</option>
                        </>
                      ) : genEntityType === 'CATEGORY' ? (
                        <>
                          <option value="collection">Collection Display (Harmonious Boutique Shelf)</option>
                          <option value="lifestyle">Lifestyle (Sunlit Rajasthani Courtyard)</option>
                          <option value="social">Social Hero Visual (High Impact Editorial)</option>
                        </>
                      ) : genEntityType === 'GUIDE' ? (
                        <>
                          <option value="usage">Usage / Authentic Application Ritual</option>
                          <option value="infographic">Infographic (Instructional Sequence & Steps)</option>
                          <option value="lifestyle">Lifestyle (Sunlit Courtyard Self-Care)</option>
                        </>
                      ) : (
                        <>
                          <option value="packshot">Packshot (Clean Commercial Studio)</option>
                          <option value="lifestyle">Lifestyle (Sunlit Rajasthani Courtyard)</option>
                          <option value="ingredient">Ingredient (Macro Botanicals & Stone Mortar)</option>
                          <option value="usage">Usage / Authentic Application Ritual</option>
                          <option value="infographic">Infographic (Museum Botanical Layers)</option>
                          <option value="illustration">Monograph Illustration (Watercolor & Archival Ink)</option>
                          <option value="collection">Collection Display (Harmonious Boutique Shelf)</option>
                          <option value="social">Social Hero Visual (High Impact Editorial)</option>
                        </>
                      )}
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

                {/* Local ComfyUI Link Status Card (when local-sd is selected) */}
                {genProviderId === 'local-sd' && (
                  <div className="p-3.5 rounded-xl border bg-[#fcfbf7] border-[#e8e2d5] space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            comfyStatus?.online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                          }`}
                        />
                        <span className="font-bold text-[#0f2d22] text-[11px]">
                          Hardware Link: {comfyStatus?.online ? 'CONNECTED (Local ₹0 Generation)' : 'OFFLINE'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={refreshComfyHealth}
                        className="text-[10px] text-emerald-800 font-bold hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Re-test</span>
                      </button>
                    </div>

                    {!comfyStatus?.online ? (
                      <div className="text-[11px] text-amber-900 bg-amber-50 p-2.5 rounded-lg border border-amber-200 space-y-1">
                        <p className="font-bold">ComfyUI is not reachable at {comfyEndpoint}</p>
                        <p className="text-[10px] text-gray-700">
                          To generate directly on your local GPU with ₹0 API cost, launch ComfyUI with CORS enabled:
                        </p>
                        <code className="block p-1.5 bg-black text-amber-300 rounded font-mono text-[10px] select-all">
                          python main.py --listen 127.0.0.1 --enable-cors-header
                        </code>
                      </div>
                    ) : (
                      <p className="text-[10px] text-emerald-800">
                        Connected to ComfyUI at {comfyEndpoint}. Generation will run locally on your GPU/CPU with zero cloud quota consumption.
                      </p>
                    )}
                  </div>
                )}

                {/* Pre-Generation Provenance & Fact Grounding Preview */}
                <div className="p-3 bg-[#f5f1e8] border border-[#e8e2d5] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0f2d22] flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#c5a059]" />
                      <span>Pre-Generation Provenance Plan</span>
                    </span>
                    <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-[#e8e2d5]">
                      {genEntityType} • {genEntityId}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-gray-700 bg-white/80 p-2.5 rounded-lg border border-[#e8e2d5]/60">
                    <div>
                      <span className="text-gray-400 block font-bold uppercase text-[8px]">Target Entity</span>
                      <span className="font-bold text-[#0f2d22] truncate block" title={getEntityLabel(genEntityType, genEntityId)}>
                        {getEntityLabel(genEntityType, genEntityId)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-bold uppercase text-[8px]">Visual Variant</span>
                      <span className="font-bold text-[#1b4332] block">{genVariant.toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-bold uppercase text-[8px]">Assigned Slot</span>
                      <span className="font-bold text-[#0f2d22] block">{genRole}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block font-bold uppercase text-[8px]">Provider Mode</span>
                      <span className="font-bold text-emerald-800 block">
                        {genProviderId === 'local-sd' ? 'Local ComfyUI (₹0)' : genProviderId === 'manual-studio' ? 'Free Studio (₹0)' : 'Gemini Flash'}
                      </span>
                    </div>
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

                {/* Real-Time Generation Progress Banner */}
                {generating && (
                  <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl flex items-center gap-3 font-medium shadow-xs animate-pulse">
                    <div className="w-5 h-5 border-2 border-blue-700 border-t-transparent rounded-full animate-spin shrink-0" />
                    <div>
                      <p className="font-bold text-xs">{genProgressMessage || 'Generating visual...'}</p>
                      <p className="text-[10px] text-blue-700">Please do not close this window while the image is rendering and uploading.</p>
                    </div>
                  </div>
                )}

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

        {/* LOCAL COMFYUI SETUP & HARDWARE LINK MODAL */}
        {showComfyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white border border-[#e8e2d5] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
              <div className="p-5 bg-[#0f2d22] text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-[#c5a059]" />
                  <div>
                    <h3 className="font-bold text-base">Local AI (ComfyUI) Connector</h3>
                    <p className="text-[11px] text-[#c5a059]">₹0 Local Hardware Image Generation Link</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowComfyModal(false)}
                  className="p-1 hover:bg-[#1b4332] rounded-lg text-gray-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div className="p-4 rounded-xl border flex items-center justify-between gap-3 bg-[#fcfbf7] border-[#e8e2d5]">
                  <div>
                    <div className="font-bold text-[#0f2d22] text-sm flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          comfyStatus?.online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                        }`}
                      />
                      <span>Status: {comfyStatus?.online ? 'Connected & Ready' : 'Offline / Unreachable'}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {comfyStatus?.online
                        ? 'Ready for ₹0 browser-orchestrated visual generation.'
                        : comfyStatus?.error || 'Cannot connect to local ComfyUI instance.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={refreshComfyHealth}
                    className="p-2 bg-white hover:bg-gray-100 border border-[#e8e2d5] rounded-lg text-[#0f2d22] font-bold"
                    title="Retry connection"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-[#0f2d22] font-bold mb-1">ComfyUI Endpoint URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={comfyEndpoint}
                      onChange={(e) => setComfyEndpoint(e.target.value)}
                      className="flex-1 p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-mono text-xs"
                      placeholder="http://127.0.0.1:8188"
                    />
                    <button
                      type="button"
                      onClick={refreshComfyHealth}
                      className="px-3 py-2 bg-[#1b4332] text-white rounded-xl font-bold hover:bg-[#0f2d22]"
                    >
                      Test
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-gray-900 text-gray-100 rounded-xl space-y-2 font-mono text-[11px]">
                  <div className="flex items-center gap-1.5 text-[#c5a059] font-bold">
                    <Terminal className="w-4 h-4" />
                    <span>Windows PowerShell Setup (₹0 Local Generation)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-gray-300">
                    <li>Open PowerShell or CMD on your Windows PC.</li>
                    <li>Navigate to your ComfyUI directory:
                      <div className="bg-black/80 text-emerald-400 p-1.5 rounded my-1 select-all">
                        cd C:\ComfyUI_windows_portable
                      </div>
                    </li>
                    <li>Launch with CORS enabled so browser can connect:
                      <div className="bg-black/80 text-amber-300 p-1.5 rounded my-1 select-all">
                        python main.py --listen 127.0.0.1 --enable-cors-header
                      </div>
                    </li>
                    <li>Status indicator in the header will update to <strong>CONNECTED</strong>!</li>
                  </ol>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowComfyModal(false)}
                    className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl"
                  >
                    Done
                  </button>
                </div>
              </div>
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
