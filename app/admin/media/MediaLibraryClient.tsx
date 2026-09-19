'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { MediaAsset, MediaEntityType, isDiagnosticMediaAsset, isSafeInternalMediaUrl } from '@/lib/db/media';
import { MediaJobRecord } from '@/lib/growth/media-jobs-engine';

interface Props {
  initialAssets: MediaAsset[];
  queueSummary?: {
    pending: number;
    waitingProvider: number;
    completed: number;
    failed: number;
    blocked: number;
  };
  pendingJobs?: MediaJobRecord[];
}

export default function MediaLibraryClient({ initialAssets, queueSummary, pendingJobs = [] }: Props) {
  const [assets] = useState<MediaAsset[]>(initialAssets);
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [studioPrompt, setStudioPrompt] = useState<string | null>(null);
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return assets.filter((asset) => {
      if (!showDiagnostics && isDiagnosticMediaAsset(asset)) return false;
      if (entityFilter !== 'ALL' && asset.entityType !== entityFilter) return false;
      if (statusFilter !== 'ALL' && asset.status !== statusFilter) return false;
      if (sourceFilter !== 'ALL' && asset.source !== sourceFilter) return false;
      if (!q) return true;
      return [
        asset.id,
        asset.entityId,
        asset.fileName,
        asset.title,
        asset.altText,
        asset.role,
        asset.slotKey,
        asset.source,
        asset.assetOrigin,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [assets, entityFilter, statusFilter, sourceFilter, search, showDiagnostics]);

  const counts = useMemo(() => {
    return {
      total: assets.length,
      approved: assets.filter((a) => a.status === 'approved').length,
      suggested: assets.filter((a) => a.status === 'suggested').length,
      archived: assets.filter((a) => a.status === 'archived').length,
      unhealthy: assets.filter((a) => a.healthStatus === 'UNHEALTHY').length,
    };
  }, [assets]);

  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);

  const refreshAndProcess = async () => {
    setIsProcessingQueue(true);
    setQueueMessage(null);
    try {
      const res = await fetch('/api/admin/media-jobs/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 1 }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Queue processing failed');
      }
      const item = data?.summary?.details?.[0];
      if (item) {
        setQueueMessage(`Media job: ${item.beforeStatus} → ${item.afterStatus}${item.resultAssetId ? ` • Asset ${item.resultAssetId}` : ''}${item.errorMessage ? ` • ${item.errorMessage}` : ''}`);
      } else {
        setQueueMessage('Media queue checked — no runnable job found.');
      }
      setTimeout(() => window.location.reload(), 700);
    } catch (error: any) {
      setQueueMessage(error?.message || 'Queue processing failed');
    } finally {
      setIsProcessingQueue(false);
    }
  };

  const loadStudioPrompt = async (jobId: string) => {
    setIsLoadingPrompt(true);
    setStudioPrompt(null);
    try {
      const res = await fetch('/api/admin/media-jobs/prompt?jobId=' + encodeURIComponent(jobId), {
        headers: { 'x-csrf-token': '1' },
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Prompt generation failed');
      setStudioPrompt(data.prompt || '');
    } catch (error: any) {
      setQueueMessage(error?.message || 'Prompt generation failed');
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f4ee] text-[#18251d] p-5 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 mb-7">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] uppercase text-[#6c756e]">
              <span className="px-2 py-1 rounded bg-[#173b2d] text-[#d7b85a]">Media OS</span>
              <span>Full Visual Library</span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-serif font-bold text-[#173b2d] mt-2">All Media Assets</h1>
            <p className="text-sm text-[#69736c] mt-2 max-w-3xl">
              Ek hi jagah par approved, suggested, archived, AI, manual aur health-status ke saath complete media library.
            </p>
            <div className="mt-3">
              <Link href="/admin/media-requirements" className="text-xs font-semibold text-[#173b2d] hover:underline">
                ← Media Requirements & Slot Control
              </Link>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={refreshAndProcess}
              disabled={isProcessingQueue}
              className="px-4 py-2 rounded-lg bg-[#173b2d] text-[#d7b85a] text-xs font-semibold shadow-sm disabled:opacity-60"
            >
              {isProcessingQueue ? 'Processing Media…' : 'Process Queue + Refresh'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            ['Total', counts.total],
            ['Approved', counts.approved],
            ['Suggested', counts.suggested],
            ['Archived', counts.archived],
            ['Unhealthy', counts.unhealthy],
          ].map(([label, value]) => (
            <div key={label} className="bg-white border border-[#ded7cb] rounded-xl p-4 shadow-sm">
              <div className="text-[10px] uppercase tracking-wider font-bold text-[#778078]">{label}</div>
              <div className="text-2xl font-bold text-[#173b2d] mt-1">{value}</div>
            </div>
          ))}
        </div>

        {queueMessage && (
          <div className="bg-[#173b2d] text-white rounded-xl p-3 mb-4 text-xs font-medium">
            {queueMessage}
          </div>
        )}

        {queueSummary && (
          <div className="bg-white border border-[#ded7cb] rounded-xl p-4 mb-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider font-bold text-[#778078]">Media Queue</div>
                <div className="text-sm font-semibold text-[#173b2d] mt-1">
                  Pending {queueSummary.pending} · Waiting Provider {queueSummary.waitingProvider} · Completed {queueSummary.completed} · Failed {queueSummary.failed} · Blocked {queueSummary.blocked}
                </div>
              </div>
              <button onClick={refreshAndProcess} className="px-3 py-2 rounded-lg border border-[#cfc7ba] bg-[#fbfaf7] text-xs font-semibold text-[#173b2d]">
                Re-run / Refresh
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border border-[#ded7cb] rounded-2xl p-5 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-[#778078]">₹0 Free AI Studio Import</div>
              <div className="text-lg font-semibold text-[#173b2d] mt-1">Generate outside, import here safely</div>
              <p className="text-xs text-[#6c756e] mt-1 max-w-3xl">
                Queue ke pending/waiting slots ke liye image kisi free AI studio/tool se banao aur yahin import karo. Image validation, storage aur canonical registration automatic rahega.
              </p>
            </div>
            <div className="text-[11px] text-[#5f6961]">{pendingJobs.length} importable queue jobs</div>
          </div>
          {pendingJobs.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {pendingJobs.slice(0, 12).map((job) => (
                <div key={job.id} className="rounded-xl border border-[#e3ddd3] bg-[#fbfaf7] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#173b2d] text-white text-[9px] font-bold">{job.entityType}</span>
                    <span className="text-[9px] uppercase font-bold text-[#7a817c]">{job.status}</span>
                  </div>
                  <div className="text-sm font-semibold text-[#28332c] mt-2 line-clamp-1">{job.entityId}</div>
                  <div className="text-[10px] text-[#737b75] mt-1">{job.slotKey} · {job.strategy}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => { setImportJobId(job.id); setStudioPrompt(null); }} className="px-3 py-2 rounded-lg bg-[#173b2d] text-white text-[11px] font-semibold">Import Image</button>
                    <button type="button" onClick={() => { setImportJobId(job.id); loadStudioPrompt(job.id); }} className="px-3 py-2 rounded-lg border border-[#cfc7ba] bg-white text-[#173b2d] text-[11px] font-semibold">Get Free Prompt</button>
                    <span className="text-[10px] text-[#7b817c]">₹0 • validated</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl bg-[#f5f1e9] p-4 text-xs text-[#68716a]">Abhi koi AI/TEMPORARY queue job import ke liye available nahi hai.</div>
          )}
        </div>

        <div className="bg-white border border-[#ded7cb] rounded-2xl p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search filename, product, slot, source, ID..."
              className="md:col-span-2 px-3 py-2 rounded-lg border border-[#d7d1c7] bg-[#fbfaf7] text-sm outline-none"
            />
            <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-[#d7d1c7] bg-[#fbfaf7] text-sm">
              <option value="ALL">All Entity Types</option>
              {['PRODUCT','CATEGORY','GUIDE','KNOWLEDGE','BRAND','MARKETING'].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-[#d7d1c7] bg-[#fbfaf7] text-sm">
              <option value="ALL">All Statuses</option>
              {['approved','suggested','draft','archived','rejected'].map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {['ALL', 'MANUAL_UPLOAD', 'AI_GENERATED', 'SYSTEM_FALLBACK', 'EXTERNAL_IMPORT'].map((v) => (
              <button
                key={v}
                onClick={() => setSourceFilter(v)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ${sourceFilter === v ? 'bg-[#173b2d] text-white' : 'bg-[#f1eee8] text-[#59625a]'}`}
              >
                {v === 'ALL' ? 'All Sources' : v}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between gap-3 text-xs text-[#6c756e]">
          <div>
            Showing <span className="font-bold text-[#173b2d]">{filtered.length}</span> of {assets.length} assets
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showDiagnostics}
              onChange={(e) => setShowDiagnostics(e.target.checked)}
              className="rounded border-[#cfc7ba]"
            />
            Show diagnostic/test media
          </label>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white border border-[#ded7cb] rounded-2xl p-12 text-center text-sm text-[#6c756e]">No media assets match these filters.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {filtered.map((asset) => {
              const canRender = isSafeInternalMediaUrl(asset.url) && asset.mimeType?.startsWith('image/');
              return (
                <button
                  key={asset.id}
                  onClick={() => setSelected(asset)}
                  className="text-left bg-white border border-[#ded7cb] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="aspect-square bg-[#eee9df] flex items-center justify-center overflow-hidden">
                    {canRender ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={asset.url} alt={asset.altText || asset.title || asset.role} className="w-full h-full object-contain" />
                    ) : (
                      <div className="p-4 text-center text-[11px] text-[#7b817c]">
                        <div className="text-2xl mb-2">🎞️</div>
                        <div className="font-semibold">Preview protected</div>
                        <div className="mt-1 break-all">{asset.mimeType || asset.source}</div>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-[#173b2d] text-white text-[9px] font-bold">{asset.entityType}</span>
                      <span className="text-[9px] font-bold uppercase text-[#7c847d]">{asset.status}</span>
                    </div>
                    <div className="font-semibold text-sm text-[#243129] mt-2 line-clamp-1">{asset.title || asset.fileName || asset.id}</div>
                    <div className="text-[10px] text-[#7a827b] mt-1 line-clamp-1">{asset.role}{asset.slotKey ? ` · ${asset.slotKey}` : ''}</div>
                    <div className="text-[10px] text-[#8a918b] mt-1 line-clamp-1">{asset.entityId}</div>
                    <div className="mt-2 flex items-center justify-between text-[9px]">
                      <span className="text-[#6e766f]">{asset.source}</span>
                      <span className={asset.healthStatus === 'UNHEALTHY' ? 'text-red-700 font-bold' : 'text-[#55715f]'}>
                        {asset.healthStatus || 'HEALTHY'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {importJobId && (
          <div className="fixed inset-0 z-[55] bg-black/70 flex items-center justify-center p-4" onClick={() => !isImporting && setImportJobId(null)}>
            <div className="bg-white rounded-2xl max-w-xl w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-[#7a817c]">₹0 Free AI Studio</div>
                  <h2 className="text-xl font-serif font-bold text-[#173b2d] mt-1">Import generated image</h2>
                </div>
                <button type="button" disabled={isImporting} onClick={() => setImportJobId(null)} className="text-2xl text-[#7d847e] disabled:opacity-40">×</button>
              </div>
              <div className="mt-4 rounded-xl bg-[#f8f6f1] border border-[#e3ddd3] p-3 text-xs text-[#58625b]">
                <div className="font-semibold text-[#173b2d]">Selected queue job</div>
                <div className="mt-1 break-all">{importJobId}</div>
              </div>
              {isLoadingPrompt ? (
                <div className="mt-4 rounded-xl border border-[#e3ddd3] bg-[#fbfaf7] p-3 text-xs text-[#6c756e]">Building grounded prompt…</div>
              ) : studioPrompt ? (
                <div className="mt-4">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-[#7a817c]">Grounded generation prompt</div>
                  <textarea readOnly value={studioPrompt} className="mt-2 w-full min-h-40 rounded-xl border border-[#d7d1c7] bg-[#fbfaf7] p-3 text-xs leading-5 text-[#2d382f]" />
                  <button
                    type="button"
                    onClick={() => navigator.clipboard?.writeText(studioPrompt)}
                    className="mt-2 px-3 py-2 rounded-lg border border-[#cfc7ba] bg-white text-[#173b2d] text-[11px] font-semibold"
                  >
                    Copy Prompt
                  </button>
                </div>
              ) : null}

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="mt-4 block w-full text-xs"
                disabled={isImporting}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !importJobId) return;
                  setIsImporting(true);
                  setQueueMessage(null);
                  try {
                    const form = new FormData();
                    form.append('jobId', importJobId);
                    form.append('file', file);
                    const res = await fetch('/api/admin/media-jobs/import', { method: 'POST', body: form });
                    const data = await res.json();
                    if (!res.ok || !data?.success) throw new Error(data?.error || 'Free AI Studio import failed');
                    setQueueMessage('₹0 import completed • ' + (data.result?.slotKey || 'Media') + ' • Asset ' + (data.result?.resultAssetId || 'created'));
                    setImportJobId(null);
                    setTimeout(() => window.location.reload(), 500);
                  } catch (error: any) {
                    setQueueMessage(error?.message || 'Free AI Studio import failed');
                  } finally {
                    setIsImporting(false);
                  }
                }}
              />
              <p className="text-[10px] text-[#7b817c] mt-3">Supported: JPG, PNG, WebP. Canonical slot validation rejects incompatible files.</p>
            </div>
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
            <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-5 border-b border-[#e2ddd4] flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-bold text-[#7a817c]">{selected.entityType} · {selected.role}</div>
                  <h2 className="text-xl font-serif font-bold text-[#173b2d] mt-1">{selected.title || selected.fileName || selected.id}</h2>
                  <div className="text-xs text-[#737b75] mt-1 break-all">{selected.id}</div>
                </div>
                <button onClick={() => setSelected(null)} className="text-2xl text-[#7d847e]">×</button>
              </div>

              <div className="grid lg:grid-cols-[1.4fr,1fr] gap-0">
                <div className="bg-[#eee9df] min-h-[360px] flex items-center justify-center p-6">
                  {isSafeInternalMediaUrl(selected.url) && selected.mimeType?.startsWith('image/') ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={selected.url} alt={selected.altText || selected.title || selected.role} className="max-h-[72vh] max-w-full object-contain" />
                  ) : (
                    <div className="text-sm text-[#68716a] text-center">Preview intentionally blocked for this media URL/type.</div>
                  )}
                </div>
                <div className="p-6 space-y-3 text-xs text-[#49544d]">
                  <Info label="Entity" value={`${selected.entityType} / ${selected.entityId}`} />
                  <Info label="Role" value={selected.role} />
                  <Info label="Slot" value={selected.slotKey || '—'} />
                  <Info label="Status" value={selected.status} />
                  <Info label="Source" value={selected.source} />
                  <Info label="Origin" value={selected.assetOrigin || '—'} />
                  <Info label="Health" value={selected.healthStatus || 'HEALTHY'} />
                  <Info label="Dimensions" value={selected.width && selected.height ? `${selected.width} × ${selected.height}` : '—'} />
                  <Info label="Aspect" value={selected.aspectRatio || '—'} />
                  <Info label="Bucket" value={selected.storageBucket || '—'} />
                  <Info label="Path" value={selected.storagePath || '—'} />
                  <Info label="URL" value={selected.url} breakAll />
                  {selected.parentAssetId && <Info label="Parent Asset" value={selected.parentAssetId} breakAll />}
                  {selected.derivativeType && <Info label="Derivative" value={selected.derivativeType} />}
                  <a href={selected.url} target="_blank" rel="noreferrer" className="inline-flex px-3 py-2 rounded-lg bg-[#173b2d] text-white font-semibold mt-2">
                    Open Media
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Info({ label, value, breakAll }: { label: string; value: string; breakAll?: boolean }) {
  return (
    <div className="rounded-lg bg-[#f8f6f1] border border-[#e3ddd3] p-3">
      <div className="text-[9px] uppercase font-bold tracking-wider text-[#8a918b]">{label}</div>
      <div className={`mt-1 font-mono text-[11px] ${breakAll ? 'break-all' : 'break-words'}`}>{value}</div>
    </div>
  );
}
