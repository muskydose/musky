'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  MediaSlotRequirement,
  EntityMediaHealth,
  buildEntityRequirements,
} from '@/lib/growth/media-requirements-engine';
import { STANDARD_MEDIA_SPECS } from '@/lib/growth/media-specs';
import { MediaAsset, MediaEntityType, MediaAssetRole, isSafeInternalMediaUrl } from '@/lib/db/media';
import { Product, Category, ProductGuide } from '@/lib/types';
import { KnowledgeEntity } from '@/lib/db/knowledge';
import { BrandedMediaPlaceholder } from '@/components/ui/BrandedMediaPlaceholder';
import { DetailedUploadValidationResult } from '@/lib/media/upload-validator';

interface MediaRequirementsClientProps {
  initialSettings: any;
  initialProducts: Product[];
  initialCategories: Category[];
  initialGuides: ProductGuide[];
  initialKnowledgeEntities: KnowledgeEntity[];
  initialMediaAssets: MediaAsset[];
}

export default function MediaRequirementsClient({
  initialSettings,
  initialProducts,
  initialCategories,
  initialGuides,
  initialKnowledgeEntities,
  initialMediaAssets,
}: MediaRequirementsClientProps) {
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(initialMediaAssets);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [onlyRequired, setOnlyRequired] = useState(false);

  // Upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [activeSlotReq, setActiveSlotReq] = useState<MediaSlotRequirement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [validationResult, setValidationResult] = useState<DetailedUploadValidationResult | null>(null);
  const [autoApprove, setAutoApprove] = useState(true);
  const [isRealOwnerPhoto, setIsRealOwnerPhoto] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Bulk upload modal state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkResults, setBulkResults] = useState<any[] | null>(null);

  // Health check state
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Archival modal state
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  // Derive entity requirement checklists
  const entityHealthList: EntityMediaHealth[] = useMemo(() => {
    const list: EntityMediaHealth[] = [];

    // Brand
    const brandAssets = mediaAssets.filter((a) => a.entityType === 'BRAND');
    list.push(buildEntityRequirements('BRAND', 'musky-dose-brand', 'Musky Dose Brand & Heritage', '', brandAssets));

    // Products
    for (const p of initialProducts) {
      const prodAssets = mediaAssets.filter((a) => a.entityType === 'PRODUCT' && String(a.entityId) === String(p.id));
      list.push(buildEntityRequirements('PRODUCT', p.id, p.name, p.slug, prodAssets));
    }

    // Categories
    for (const c of initialCategories) {
      const catAssets = mediaAssets.filter((a) => a.entityType === 'CATEGORY' && String(a.entityId) === String(c.id));
      list.push(buildEntityRequirements('CATEGORY', c.id, c.name, c.slug, catAssets));
    }

    // Guides
    for (const g of initialGuides) {
      const guideAssets = mediaAssets.filter((a) => a.entityType === 'GUIDE' && String(a.entityId) === String(g.id));
      list.push(buildEntityRequirements('GUIDE', g.id, g.title, g.slug, guideAssets));
    }

    // Knowledge
    for (const k of initialKnowledgeEntities) {
      const knowAssets = mediaAssets.filter((a) => a.entityType === 'KNOWLEDGE' && (String(a.entityId) === k.id || String(a.entityId) === k.entityKey));
      list.push(buildEntityRequirements('KNOWLEDGE', k.id, k.canonicalName, k.slug, knowAssets));
    }

    return list;
  }, [initialProducts, initialCategories, initialGuides, initialKnowledgeEntities, mediaAssets]);

  // Aggregate KPI summary
  const summary = useMemo(() => {
    let totalRequirements = 0;
    let totalRequired = 0;
    let totalOptional = 0;
    let liveCount = 0;
    let readyCount = 0;
    let missingCount = 0;
    let needsReviewCount = 0;
    let invalidCount = 0;
    let healthScoreSum = 0;

    for (const ent of entityHealthList) {
      healthScoreSum += ent.healthScorePercent;
      for (const slot of ent.slots) {
        totalRequirements++;
        if (slot.isRequired) totalRequired++;
        else totalOptional++;

        if (slot.status === 'LIVE') liveCount++;
        else if (slot.status === 'READY') readyCount++;
        else if (slot.status === 'MISSING') missingCount++;
        else if (slot.status === 'NEEDS_REVIEW') needsReviewCount++;
        else if (slot.status === 'INVALID') invalidCount++;
      }
    }

    const totalEntities = entityHealthList.length;
    const overallHealthScore = totalEntities > 0 ? Math.round(healthScoreSum / totalEntities) : 0;

    return {
      totalEntities,
      totalRequirements,
      totalRequired,
      totalOptional,
      liveCount,
      readyCount,
      missingCount,
      needsReviewCount,
      invalidCount,
      overallHealthScore,
    };
  }, [entityHealthList]);

  // Filtered entities
  const filteredEntities = useMemo(() => {
    return entityHealthList.filter((ent) => {
      // Entity type filter
      if (selectedEntityType !== 'ALL' && ent.entityType !== selectedEntityType) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = ent.entityName.toLowerCase().includes(q);
        const matchesSlug = (ent.entitySlug || '').toLowerCase().includes(q);
        const matchesId = ent.entityId.toLowerCase().includes(q);
        if (!matchesName && !matchesSlug && !matchesId) return false;
      }

      // Status filter
      if (selectedStatusFilter !== 'ALL') {
        const hasSlotWithStatus = ent.slots.some((s) => s.status === selectedStatusFilter);
        if (!hasSlotWithStatus) return false;
      }

      // Required only filter
      if (onlyRequired) {
        const hasMissingRequired = ent.slots.some((s) => s.isRequired && s.status !== 'LIVE');
        if (!hasMissingRequired) return false;
      }

      return true;
    });
  }, [entityHealthList, selectedEntityType, searchQuery, selectedStatusFilter, onlyRequired]);

  // Handle slot upload trigger
  const handleOpenUpload = (slot: MediaSlotRequirement) => {
    setActiveSlotReq(slot);
    setSelectedFile(null);
    setPreviewUrl(null);
    setValidationResult(null);
    setAutoApprove(true);
    setUploadModalOpen(true);
  };

  // Handle file selection and client-side pre-validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setValidationResult(null);
  };

  // Execute upload and validation
  const handleExecuteUpload = async () => {
    if (!selectedFile || !activeSlotReq) return;

    setIsUploading(true);
    setNotification(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('entityType', activeSlotReq.entityType);
      formData.append('entityId', activeSlotReq.entityId);
      formData.append('slotKey', activeSlotReq.slotKey);
      formData.append('role', activeSlotReq.role);
      formData.append('autoApprove', String(autoApprove));
      formData.append('isRealOwnerPhoto', String(isRealOwnerPhoto));

      const res = await fetch('/api/admin/media-requirements/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setValidationResult(data.validationResult || null);
        setNotification({ type: 'error', message: data.error || 'Upload failed validation.' });
        return;
      }

      setValidationResult(data.validationResult);

      // If auto-approved, switch live with zero downtime
      if (autoApprove && data.asset) {
        const assignRes = await fetch('/api/admin/media-requirements/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType: activeSlotReq.entityType,
            entityId: activeSlotReq.entityId,
            role: activeSlotReq.role,
            assetId: data.asset.id,
            consumingRoute: activeSlotReq.exactRoute,
            reason: 'manual_upload_live_assignment',
          }),
        });

        const assignData = await assignRes.json();
        if (assignData.success) {
          setNotification({
            type: 'success',
            message: `Successfully uploaded, validated, and published ${activeSlotReq.role} for ${activeSlotReq.entityName} with ZERO downtime!`,
          });
        }
      } else {
        setNotification({
          type: 'success',
          message: `Uploaded draft for ${activeSlotReq.entityName}. Awaiting approval.`,
        });
      }

      // Refresh media assets
      const refreshRes = await fetch('/api/admin/media-assets');
      if (refreshRes.ok) {
        const refData = await refreshRes.json();
        if (Array.isArray(refData.assets)) {
          setMediaAssets(refData.assets);
        }
      }

      setTimeout(() => {
        setUploadModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Network error during upload.' });
    } finally {
      setIsUploading(false);
    }
  };

  // Run Broken Media Health Check & Self-Healing Scan
  const handleRunHealthCheck = async () => {
    setIsCheckingHealth(true);
    setNotification(null);
    try {
      const res = await fetch('/api/admin/media-requirements/health-check', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.summary) {
        const s = data.summary;
        setNotification({
          type: s.brokenCount > 0 ? 'error' : 'success',
          message: `Health Scan Completed: ${s.totalChecked} assets checked. ${s.healthyCount} healthy, ${s.brokenCount} broken detected (${s.repairedJobsEnqueued} self-healing repair tasks enqueued).`,
        });
        // Refresh assets
        const refreshRes = await fetch('/api/admin/media-assets');
        if (refreshRes.ok) {
          const refData = await refreshRes.json();
          if (Array.isArray(refData.assets)) setMediaAssets(refData.assets);
        }
      } else {
        setNotification({ type: 'error', message: data.error || 'Health scan failed.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error running health check.' });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  // Submit Bulk Upload Batch
  const handleBulkUploadSubmit = async () => {
    if (!bulkFiles || bulkFiles.length === 0) return;
    setIsBulkUploading(true);
    setBulkResults(null);
    try {
      const formData = new FormData();
      bulkFiles.forEach((file) => formData.append('files', file));
      formData.append('isRealOwnerPhoto', String(isRealOwnerPhoto));

      const res = await fetch('/api/admin/media-requirements/bulk-upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBulkResults(data.results);
        setNotification({
          type: 'success',
          message: `Bulk Import Batch Processed: ${data.assignedCount} assigned, ${data.unmatchedCount} unmatched (for review), ${data.failedCount} validation errors.`,
        });
        // Refresh assets
        const refreshRes = await fetch('/api/admin/media-assets');
        if (refreshRes.ok) {
          const refData = await refreshRes.json();
          if (Array.isArray(refData.assets)) setMediaAssets(refData.assets);
        }
      } else {
        setNotification({ type: 'error', message: data.error || 'Bulk upload failed.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error during bulk upload.' });
    } finally {
      setIsBulkUploading(false);
    }
  };

  // Safe Archive Legacy Media
  const handleArchiveLegacy = async () => {
    setIsArchiving(true);
    try {
      const res = await fetch('/api/admin/media-requirements/archive', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: 'success', message: data.message });
        setArchiveModalOpen(false);

        // Refresh media assets
        const refreshRes = await fetch('/api/admin/media-assets');
        if (refreshRes.ok) {
          const refData = await refreshRes.json();
          if (Array.isArray(refData.assets)) {
            setMediaAssets(refData.assets);
          }
        }
      } else {
        setNotification({ type: 'error', message: data.error || 'Archival failed.' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message });
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf9] text-[#1a202c] p-6 lg:p-10">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 max-w-md p-4 rounded-xl shadow-lg border text-sm font-medium flex items-start justify-between gap-3 animate-fade-in ${
            notification.type === 'success'
              ? 'bg-[#1b4332] text-white border-[#d4af37]/40'
              : 'bg-red-900 text-white border-red-700'
          }`}
        >
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-white/70 hover:text-white text-base leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 pb-6 border-b border-[#e2d9cc]">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider bg-[#1b4332] text-[#d4af37] uppercase">
              From Earth to Ritual
            </span>
            <span className="text-xs text-[#718096] font-mono">CANONICAL MEDIA CONTROL</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-[#1b4332] mt-1">
            Media Requirements & Replacement Hub
          </h1>
          <p className="text-sm text-[#52796f] mt-1 max-w-2xl">
            Manual-first replacement center for all catalog entities. Strictly zero external stock or mock media. Every visual validated against standard specifications before live publishing.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRunHealthCheck}
            disabled={isCheckingHealth}
            className="px-3.5 py-2 rounded-lg border border-[#cbd5e0] bg-white text-xs font-semibold text-[#2d3748] hover:bg-[#f7fafc] transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>{isCheckingHealth ? '⏳ Scanning...' : '🩺 Scan Media Health'}</span>
          </button>
          <button
            onClick={() => setBulkModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-[#1b4332] text-[#d4af37] text-xs font-semibold hover:bg-[#143225] transition-colors shadow-sm flex items-center gap-1.5"
          >
            <span>📁 Bulk Upload Assets</span>
          </button>
          <button
            onClick={() => setArchiveModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-[#742a2a] text-white text-xs font-semibold hover:bg-[#9b2c2c] transition-colors shadow-sm"
          >
            Safely Archive Old Media
          </button>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
        <div className="bg-white border border-[#e2d9cc] rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] font-bold text-[#718096] uppercase tracking-wider block">Total Slots</span>
          <span className="text-2xl font-bold text-[#1a202c] mt-0.5 block">{summary.totalRequirements}</span>
          <span className="text-[11px] text-[#a0aec0]">{summary.totalEntities} entities</span>
        </div>

        <div className="bg-white border border-[#c6f6d5] rounded-xl p-3.5 shadow-sm bg-gradient-to-br from-white to-[#f0fff4]">
          <span className="text-[10px] font-bold text-[#22543d] uppercase tracking-wider block">Live Public</span>
          <span className="text-2xl font-bold text-[#276749] mt-0.5 block">{summary.liveCount}</span>
          <span className="text-[11px] text-[#38a169]">100% Truthful</span>
        </div>

        <div className="bg-white border border-[#feebc8] rounded-xl p-3.5 shadow-sm bg-gradient-to-br from-white to-[#fffaf0]">
          <span className="text-[10px] font-bold text-[#744210] uppercase tracking-wider block">Ready (Draft)</span>
          <span className="text-2xl font-bold text-[#b7791f] mt-0.5 block">{summary.readyCount}</span>
          <span className="text-[11px] text-[#d69e2e]">Needs Approval</span>
        </div>

        <div className="bg-white border border-[#fed7d7] rounded-xl p-3.5 shadow-sm bg-gradient-to-br from-white to-[#fff5f5]">
          <span className="text-[10px] font-bold text-[#742a2a] uppercase tracking-wider block">Missing</span>
          <span className="text-2xl font-bold text-[#c53030] mt-0.5 block">{summary.missingCount}</span>
          <span className="text-[11px] text-[#e53e3e]">Media Required</span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] font-bold text-[#4a5568] uppercase tracking-wider block">Required</span>
          <span className="text-2xl font-bold text-[#2d3748] mt-0.5 block">{summary.totalRequired}</span>
          <span className="text-[11px] text-[#718096]">Core visual slots</span>
        </div>

        <div className="bg-white border border-[#e2e8f0] rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] font-bold text-[#4a5568] uppercase tracking-wider block">Optional</span>
          <span className="text-2xl font-bold text-[#2d3748] mt-0.5 block">{summary.totalOptional}</span>
          <span className="text-[11px] text-[#718096]">Enhancement slots</span>
        </div>

        <div className="bg-white border border-[#fed7d7] rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] font-bold text-[#742a2a] uppercase tracking-wider block">Needs Review</span>
          <span className="text-2xl font-bold text-[#9b2c2c] mt-0.5 block">{summary.needsReviewCount}</span>
          <span className="text-[11px] text-[#e53e3e]">Spec warnings</span>
        </div>

        <div className="bg-[#1b4332] text-white rounded-xl p-3.5 shadow-sm border border-[#d4af37]/40 flex flex-col justify-between">
          <span className="text-[10px] font-bold text-[#d4af37] uppercase tracking-wider block">Catalog Health</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-2xl font-bold font-mono">{summary.overallHealthScore}%</span>
          </div>
          <span className="text-[10px] text-[#faf5e8]/80 font-medium">Standard Spec</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#e2d9cc] rounded-xl p-4 mb-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="w-full md:w-80 relative">
          <input
            type="text"
            placeholder="Search entities, slugs, or IDs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#cbd5e0] focus:outline-none focus:border-[#1b4332] bg-[#fcfbf9]"
          />
          <svg className="w-4 h-4 text-[#a0aec0] absolute left-2.5 top-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        {/* Entity Type Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {['ALL', 'PRODUCT', 'CATEGORY', 'GUIDE', 'KNOWLEDGE', 'BRAND'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedEntityType(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedEntityType === type
                  ? 'bg-[#1b4332] text-white shadow-sm'
                  : 'bg-[#f7fafc] text-[#4a5568] hover:bg-[#edf2f7]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Status Dropdown & Required Checkbox */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-[#cbd5e0] bg-white text-[#4a5568] focus:outline-none focus:border-[#1b4332]"
          >
            <option value="ALL">All Slot Statuses</option>
            <option value="MISSING">Missing Only</option>
            <option value="LIVE">Live Public Only</option>
            <option value="READY">Ready (Draft) Only</option>
            <option value="NEEDS_REVIEW">Needs Review Only</option>
            <option value="INVALID">Invalid Only</option>
          </select>

          <label className="flex items-center gap-2 text-xs text-[#4a5568] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyRequired}
              onChange={(e) => setOnlyRequired(e.target.checked)}
              className="rounded text-[#1b4332] focus:ring-0"
            />
            <span>Missing Required Only</span>
          </label>
        </div>
      </div>

      {/* Entity Group List */}
      <div className="space-y-8">
        {filteredEntities.length === 0 ? (
          <div className="bg-white border border-[#e2d9cc] rounded-2xl p-12 text-center">
            <p className="text-[#718096] text-sm">No entities match the current search or filters.</p>
          </div>
        ) : (
          filteredEntities.map((ent) => (
            <div key={`${ent.entityType}-${ent.entityId}`} className="bg-white border border-[#e2d9cc] rounded-2xl shadow-sm overflow-hidden">
              {/* Entity Header */}
              <div className="p-5 border-b border-[#e2d9cc] bg-gradient-to-r from-white via-[#fcfbf9] to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#edf2f7] text-[#2d3748]">
                    {ent.entityType}
                  </span>
                  <div>
                    <h2 className="text-lg font-serif font-bold text-[#1a202c]">
                      {ent.entityName}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-[#718096] mt-0.5">
                      <span className="font-mono text-[11px]">{ent.entityId}</span>
                      {ent.entitySlug && (
                        <>
                          <span>•</span>
                          <Link
                            href={ent.entityType === 'PRODUCT' ? `/products/${ent.entitySlug}` : `/${ent.entityType.toLowerCase()}/${ent.entitySlug}`}
                            target="_blank"
                            className="text-[#1b4332] hover:underline font-medium inline-flex items-center gap-1"
                          >
                            <span>View on Storefront</span>
                            <span className="text-[10px]">↗</span>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Entity Health Meter */}
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-[#718096] block tracking-wider">Health</span>
                    <span className="text-sm font-bold font-mono text-[#1b4332]">
                      {ent.filledSlots}/{ent.totalSlots} slots ({ent.healthScorePercent}%)
                    </span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      ent.healthGrade === 'OPTIMAL'
                        ? 'bg-[#c6f6d5] text-[#22543d]'
                        : ent.healthGrade === 'GOOD'
                        ? 'bg-[#d4edda] text-[#155724]'
                        : ent.healthGrade === 'NEEDS_ATTENTION'
                        ? 'bg-[#feebc8] text-[#744210]'
                        : 'bg-[#fed7d7] text-[#742a2a]'
                    }`}
                  >
                    {ent.healthGrade.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Slot Cards Grid */}
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {ent.slots.map((slot) => {
                  const spec = STANDARD_MEDIA_SPECS[slot.slotKey] || {};
                  return (
                    <div
                      key={slot.slotKey}
                      className={`relative flex flex-col justify-between border rounded-xl p-4 transition-all ${
                        slot.status === 'LIVE'
                          ? 'border-[#c6f6d5] bg-[#f0fff4]/30'
                          : slot.status === 'READY'
                          ? 'border-[#feebc8] bg-[#fffaf0]/40'
                          : slot.isRequired
                          ? 'border-[#fed7d7] bg-[#fff5f5]/30'
                          : 'border-[#e2e8f0] bg-white'
                      }`}
                    >
                      {/* Slot Header */}
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              slot.isRequired ? 'bg-[#1b4332] text-white' : 'bg-[#edf2f7] text-[#718096]'
                            }`}
                          >
                            {slot.isRequired ? 'REQUIRED' : 'OPTIONAL'}
                          </span>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              slot.status === 'LIVE'
                                ? 'bg-[#c6f6d5] text-[#22543d]'
                                : slot.status === 'READY'
                                ? 'bg-[#feebc8] text-[#744210]'
                                : slot.status === 'NEEDS_REVIEW'
                                ? 'bg-[#fed7d7] text-[#9b2c2c]'
                                : slot.status === 'INVALID'
                                ? 'bg-red-800 text-white'
                                : 'bg-[#edf2f7] text-[#718096]'
                            }`}
                          >
                            {slot.status}
                          </span>
                        </div>

                        <h3 className="text-xs font-serif font-bold text-[#1a202c] line-clamp-1">
                          {slot.role} ({slot.aspectRatio})
                        </h3>
                        <p className="text-[11px] text-[#718096] line-clamp-1 mt-0.5">
                          {slot.purpose}
                        </p>
                      </div>

                      {/* Visual Preview or Branded Placeholder */}
                      <div className="my-3 w-full rounded-lg overflow-hidden border border-[#e2d9cc] bg-[#faf5e8]">
                        {slot.currentAssetUrl && isSafeInternalMediaUrl(slot.currentAssetUrl) && (slot.status === 'LIVE' || slot.status === 'NEEDS_REVIEW') ? (
                          <div className="relative w-full aspect-square bg-[#1b4332]/5 flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={slot.currentAssetUrl}
                              alt={slot.role}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          </div>
                        ) : (
                          <BrandedMediaPlaceholder
                            role={slot.role}
                            slotName={`${slot.role} (${slot.aspectRatio})`}
                            entityName={ent.entityName}
                            aspectRatio={slot.aspectRatio}
                            hasLegacyAsset={slot.hasLegacyOrInvalidAsset}
                            className="w-full"
                          />
                        )}
                      </div>

                      {/* Technical Specs Summary */}
                      <div className="text-[10px] text-[#718096] space-y-1 mb-3 bg-white/80 p-2 rounded border border-[#edf2f7]">
                        <div className="flex justify-between">
                          <span className="text-[#a0aec0]">Target Ratio:</span>
                          <span className="font-mono font-semibold text-[#2d3748]">{slot.aspectRatio}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#a0aec0]">Recommended:</span>
                          <span className="font-mono text-[#2d3748]">{slot.recommendedWidth}×{slot.recommendedHeight}px</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#a0aec0]">Min Resolution:</span>
                          <span className="font-mono text-[#2d3748]">{slot.minWidth}×{slot.minHeight}px</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#a0aec0]">Format:</span>
                          <span className="font-mono text-[#2d3748]">WebP, JPG, PNG</span>
                        </div>
                      </div>

                      {/* Issues if any */}
                      {slot.validationIssues && slot.validationIssues.length > 0 && (
                        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-900 space-y-0.5">
                          {slot.validationIssues.map((issue, idx) => (
                            <p key={idx} className="line-clamp-2">⚠️ {issue}</p>
                          ))}
                        </div>
                      )}

                      {/* Action Button */}
                      <button
                        onClick={() => handleOpenUpload(slot)}
                        className={`w-full py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
                          slot.status === 'LIVE'
                            ? 'bg-white border border-[#cbd5e0] text-[#2d3748] hover:bg-[#f7fafc]'
                            : 'bg-[#1b4332] text-[#d4af37] hover:bg-[#143225]'
                        }`}
                      >
                        <span>{slot.status === 'LIVE' ? 'Replace Asset' : '+ Upload Asset'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upload & Validation Modal */}
      {uploadModalOpen && activeSlotReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-[#e2d9cc] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#e2d9cc]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#1b4332] text-[#d4af37] rounded">
                  {activeSlotReq.entityType} • {activeSlotReq.role}
                </span>
                <h3 className="text-xl font-serif font-bold text-[#1b4332] mt-1">
                  Upload Visual: {activeSlotReq.entityName}
                </h3>
                <p className="text-xs text-[#718096] mt-0.5">
                  Target Route: <span className="font-mono text-[#2d3748]">{activeSlotReq.exactRoute}</span>
                </p>
              </div>

              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-[#a0aec0] hover:text-[#4a5568] text-2xl leading-none p-1"
              >
                ×
              </button>
            </div>

            {/* Visual Guidelines Card */}
            <div className="my-4 p-4 bg-[#faf5e8] border border-[#e0d6c3] rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#1b4332] uppercase tracking-wider text-[10px]">
                  Visual Standard Specification
                </span>
                <span className="font-mono font-bold text-[#1b4332]">
                  {activeSlotReq.aspectRatio} Ratio • {activeSlotReq.recommendedWidth}×{activeSlotReq.recommendedHeight}px
                </span>
              </div>
              <p className="text-[#4a5568]">
                <strong>What to create:</strong> {activeSlotReq.whatToCreate}
              </p>
              <p className="text-[#4a5568]">
                <strong>Visual direction:</strong> {activeSlotReq.visualDirection}
              </p>
              <p className="text-[#4a5568]">
                <strong>Safe Area:</strong> {activeSlotReq.safeAreaGuide}
              </p>
            </div>

            {/* File Selection Dropzone */}
            <div className="my-4">
              <label className="block text-xs font-bold text-[#2d3748] uppercase tracking-wider mb-2">
                Choose Image File (JPG, PNG, WebP)
              </label>

              <div className="border-2 border-dashed border-[#cbd5e0] hover:border-[#1b4332] rounded-xl p-6 text-center bg-[#fcfbf9] transition-colors cursor-pointer relative">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                {previewUrl ? (
                  <div className="flex flex-col items-center">
                    <div className="w-48 h-48 relative rounded-lg overflow-hidden border border-[#e2d9cc] bg-white mb-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-xs font-semibold text-[#1b4332]">{selectedFile?.name}</span>
                    <span className="text-[11px] text-[#718096]">
                      {selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : ''} • Click or drag to change
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4">
                    <div className="w-12 h-12 rounded-full bg-[#1b4332]/10 flex items-center justify-center text-[#1b4332] mb-2">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-[#1b4332]">Click to browse or drop image here</span>
                    <span className="text-[11px] text-[#718096] mt-1">WebP, JPEG, PNG (max 8MB)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Live Validation Results */}
            {validationResult && (
              <div
                className={`my-4 p-4 rounded-xl border text-xs space-y-2 ${
                  validationResult.verdict === 'PASS'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : validationResult.verdict === 'WARNING'
                    ? 'bg-amber-50 border-amber-300 text-amber-950'
                    : 'bg-red-50 border-red-300 text-red-950'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="uppercase tracking-wider text-[11px]">Validation Verdict:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      validationResult.verdict === 'PASS'
                        ? 'bg-emerald-600 text-white'
                        : validationResult.verdict === 'WARNING'
                        ? 'bg-amber-600 text-white'
                        : 'bg-red-600 text-white'
                    }`}
                  >
                    {validationResult.verdict}
                  </span>
                </div>

                {validationResult.errors.length > 0 && (
                  <div className="space-y-1">
                    <strong className="text-red-800">Errors:</strong>
                    {validationResult.errors.map((e, idx) => (
                      <p key={idx} className="text-red-700">• {e}</p>
                    ))}
                  </div>
                )}

                {validationResult.warnings.length > 0 && (
                  <div className="space-y-1">
                    <strong className="text-amber-800">Warnings:</strong>
                    {validationResult.warnings.map((w, idx) => (
                      <p key={idx} className="text-amber-700">• {w}</p>
                    ))}
                  </div>
                )}

                {validationResult.passes.length > 0 && (
                  <div className="space-y-1">
                    <strong className="text-emerald-800">Verified Checks:</strong>
                    {validationResult.passes.map((p, idx) => (
                      <p key={idx} className="text-emerald-700">• {p}</p>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-current/20 font-mono text-[11px] flex items-center justify-between">
                  <span>SHA-256: {validationResult.metadata.hash.slice(0, 16)}...</span>
                  <span>{validationResult.metadata.width}×{validationResult.metadata.height}px ({validationResult.metadata.aspectRatio})</span>
                </div>
              </div>
            )}

            {/* Auto-Approve Checkbox */}
            <div className="my-3 flex items-center gap-2 text-xs text-[#2d3748] bg-[#f7fafc] p-3 rounded-lg border border-[#e2e8f0]">
              <input
                type="checkbox"
                id="autoApproveCheck"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="rounded text-[#1b4332] focus:ring-0"
              />
              <label htmlFor="autoApproveCheck" className="cursor-pointer select-none">
                <strong>Zero-Downtime Live Switch:</strong> Automatically approve and assign as live public asset immediately upon successful validation.
              </label>
            </div>

            {/* Real Owner Photo Checkbox */}
            <div className="my-3 flex items-center gap-2 text-xs text-[#2d3748] bg-[#f0fff4] p-3 rounded-lg border border-[#c6f6d5]">
              <input
                type="checkbox"
                id="isRealOwnerPhotoCheck"
                checked={isRealOwnerPhoto}
                onChange={(e) => setIsRealOwnerPhoto(e.target.checked)}
                className="rounded text-[#1b4332] focus:ring-0"
              />
              <label htmlFor="isRealOwnerPhotoCheck" className="cursor-pointer select-none">
                <strong className="text-[#22543d]">Real Owner Photograph:</strong> Mark as authentic owner photography. Permanently protected and locked against automated AI overwrite.
              </label>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e2d9cc]">
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#4a5568] hover:bg-[#edf2f7] rounded-lg transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteUpload}
                disabled={!selectedFile || isUploading}
                className="px-5 py-2.5 bg-[#1b4332] text-[#d4af37] text-xs font-bold rounded-lg hover:bg-[#143225] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isUploading ? 'Validating & Uploading...' : autoApprove ? 'Validate & Switch Live' : 'Validate & Save Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Archive Confirmation Modal */}
      {archiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-[#e2d9cc] rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-serif font-bold text-[#742a2a]">
              Safely Archive Legacy & Stock Media?
            </h3>
            <p className="text-xs text-[#4a5568] mt-2">
              This will safely transition all legacy fallback records, Unsplash URLs, and staging CDN media to <code>{`status: 'archived'`}</code> with full replacement metadata.
            </p>

            <div className="my-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
              🛡️ <strong>Safety Guarantee:</strong>
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                <li>Official brand logo (<code>/logo.png</code>) is strictly preserved.</li>
                <li>Official favicons are strictly preserved.</li>
                <li>Product, order, customer, and catalog data will NOT be modified.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => setArchiveModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#4a5568] hover:bg-[#edf2f7] rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveLegacy}
                disabled={isArchiving}
                className="px-4 py-2 bg-[#742a2a] text-white text-xs font-bold rounded-lg hover:bg-[#9b2c2c] transition-colors disabled:opacity-50"
              >
                {isArchiving ? 'Archiving...' : 'Confirm Safe Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-[#e2d9cc] shadow-2xl overflow-hidden p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-[#e2d9cc]">
              <div>
                <h3 className="font-bold text-base text-[#1b4332]">Bulk Upload & Automated Slot Mapping</h3>
                <p className="text-xs text-[#718096] mt-0.5">
                  Accepts filename pattern: <code className="bg-[#f0f4f2] px-1 py-0.5 rounded text-[#1b4332] font-mono">&#123;entity-slug&#125;-&#123;slot-key&#125;.&#123;ext&#125;</code>
                </p>
              </div>
              <button
                onClick={() => {
                  setBulkModalOpen(false);
                  setBulkFiles([]);
                  setBulkResults(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>

            <div className="my-5">
              <div
                className="border-2 border-dashed border-[#cbd5e0] hover:border-[#1b4332] rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#faf5e8]/40"
                onClick={() => {
                  const input = document.getElementById('bulkFileInput') as HTMLInputElement;
                  input?.click();
                }}
              >
                <input
                  type="file"
                  id="bulkFileInput"
                  multiple
                  accept="image/webp,image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setBulkFiles(Array.from(e.target.files));
                    }
                  }}
                />
                <div className="w-10 h-10 mx-auto mb-2 text-[#1b4332] flex items-center justify-center">
                  📁
                </div>
                <span className="text-xs font-bold text-[#1b4332] block">Select files or drag & drop</span>
                <span className="text-[11px] text-[#718096]">
                  Examples: <span className="font-mono">baq-henna-powder-primary.webp, hair-care-hero.webp</span>
                </span>
                {bulkFiles.length > 0 && (
                  <div className="mt-3 text-xs font-semibold text-[#276749]">
                    ✓ {bulkFiles.length} files selected for automated import
                  </div>
                )}
              </div>
            </div>

            {/* Results Preview */}
            {bulkResults && (
              <div className="my-4 max-h-48 overflow-y-auto border border-[#e2d9cc] rounded-lg p-2 text-xs space-y-1">
                {bulkResults.map((r, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-1.5 rounded ${
                      r.status === 'ASSIGNED'
                        ? 'bg-emerald-50 text-emerald-900'
                        : r.status === 'UNMATCHED_REVIEW'
                        ? 'bg-amber-50 text-amber-900'
                        : 'bg-red-50 text-red-900'
                    }`}
                  >
                    <span className="font-mono text-[11px] truncate max-w-[200px]">{r.fileName}</span>
                    <span className="text-[10px] font-bold uppercase">{r.status}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e2d9cc]">
              <button
                type="button"
                onClick={() => {
                  setBulkModalOpen(false);
                  setBulkFiles([]);
                  setBulkResults(null);
                }}
                className="px-4 py-2 text-xs font-semibold text-[#4a5568] hover:bg-[#edf2f7] rounded-lg"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleBulkUploadSubmit}
                disabled={bulkFiles.length === 0 || isBulkUploading}
                className="px-5 py-2.5 bg-[#1b4332] text-[#d4af37] text-xs font-bold rounded-lg hover:bg-[#143225] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isBulkUploading ? 'Processing Batch...' : `Import ${bulkFiles.length} Assets`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

