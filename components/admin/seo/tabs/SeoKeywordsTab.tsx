'use client';

import React, { useState } from 'react';
import { SeoKeyword, SeoTargetType, SeoPriority, Product, Category, ProductGuide } from '@/lib/types';
import {
  Search,
  Plus,
  Download,
  Upload,
  Trash2,
  Edit,
  ExternalLink,
  Tag,
  Target,
  CheckCircle,
  AlertCircle,
  Filter,
  X,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';

interface SeoKeywordsTabProps {
  keywords: SeoKeyword[];
  products: Product[];
  categories: Category[];
  guides: ProductGuide[];
  onSaveKeyword: (keyword: Partial<SeoKeyword>) => Promise<void>;
  onDeleteKeyword: (id: string) => Promise<void>;
  onExportKeywords: () => void;
  onImportKeywords: (file: File) => Promise<void>;
}

export default function SeoKeywordsTab({
  keywords,
  products,
  categories,
  guides,
  onSaveKeyword,
  onDeleteKeyword,
  onExportKeywords,
  onImportKeywords,
}: SeoKeywordsTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [targetTypeFilter, setTargetTypeFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingKeyword, setEditingKeyword] = useState<Partial<SeoKeyword> | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const filteredKeywords = keywords.filter((k) => {
    if (searchQuery && !k.keyword.toLowerCase().includes(searchQuery.toLowerCase()) && !k.targetUrl.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (targetTypeFilter !== 'ALL' && k.targetType !== targetTypeFilter) {
      return false;
    }
    if (priorityFilter !== 'ALL' && k.priority !== priorityFilter) {
      return false;
    }
    if (statusFilter === 'ACTIVE' && !k.active) return false;
    if (statusFilter === 'INACTIVE' && k.active) return false;
    return true;
  });

  const handleOpenAdd = () => {
    setEditingKeyword({
      keyword: '',
      targetType: 'homepage',
      targetUrl: '/',
      priority: 'MEDIUM',
      active: true,
      isPrimary: false,
      notes: '',
    });
    setModalError('');
    setIsKeywordModalOpen(true);
  };

  const handleOpenEdit = (k: SeoKeyword) => {
    setEditingKeyword({ ...k });
    setModalError('');
    setIsKeywordModalOpen(true);
  };

  const handleToggleActive = async (k: SeoKeyword) => {
    await onSaveKeyword({ ...k, active: !k.active });
  };

  const handleSaveModal = async () => {
    if (!editingKeyword?.keyword?.trim()) {
      setModalError('Keyword text is required.');
      return;
    }
    if (!editingKeyword?.targetUrl?.trim()) {
      setModalError('Target URL is required.');
      return;
    }

    setModalSaving(true);
    setModalError('');
    try {
      await onSaveKeyword(editingKeyword);
      setIsKeywordModalOpen(false);
      setEditingKeyword(null);
    } catch (err: any) {
      setModalError(err.message || 'Failed to save keyword.');
    } finally {
      setModalSaving(false);
    }
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      await onImportKeywords(importFile);
      setIsImportModalOpen(false);
      setImportFile(null);
    } catch (err: any) {
      alert(err.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-[#e8e2d5] p-4 rounded-2xl">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search keyword or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
            />
          </div>

          <select
            value={targetTypeFilter}
            onChange={(e) => setTargetTypeFilter(e.target.value)}
            className="p-2 text-xs bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
          >
            <option value="ALL">All Types</option>
            <option value="homepage">Homepage</option>
            <option value="product">Product</option>
            <option value="category">Category</option>
            <option value="guide">Guide</option>
            <option value="wholesale">Wholesale</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onExportKeywords}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#f5f1e8] text-[#0f2d22] rounded-xl hover:bg-[#e8e2d5] transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#f5f1e8] text-[#0f2d22] rounded-xl hover:bg-[#e8e2d5] transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV</span>
          </button>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#183F2B] text-white rounded-xl hover:bg-[#123021] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Target Keyword</span>
          </button>
        </div>
      </div>

      {/* Keywords Table */}
      <div className="bg-white border border-[#e8e2d5] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#0f2d22]">
            <thead className="bg-[#FAF8F5] border-b border-[#e8e2d5] text-[#626c66] uppercase text-[10px] font-bold">
              <tr>
                <th className="p-3.5">Keyword</th>
                <th className="p-3.5">Target Type</th>
                <th className="p-3.5">Target URL</th>
                <th className="p-3.5">Priority</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8e2d5]/60">
              {filteredKeywords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-[#626c66]">
                    No keywords found matching current filters.
                  </td>
                </tr>
              ) : (
                filteredKeywords.map((k) => (
                  <tr key={k.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                    <td className="p-3.5 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span>{k.keyword}</span>
                        {k.isPrimary && (
                          <span className="text-[9px] font-mono bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                            PRIMARY
                          </span>
                        )}
                      </div>
                      {k.notes && <p className="text-[10px] text-[#626c66] mt-0.5">{k.notes}</p>}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-[#626c66] capitalize">{k.targetType}</td>
                    <td className="p-3.5 font-mono text-[11px] text-[#183F2B]">{k.targetUrl}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          k.priority === 'HIGH'
                            ? 'bg-rose-100 text-rose-800'
                            : k.priority === 'MEDIUM'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {k.priority}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(k)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                          k.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {k.active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(k)}
                          className="p-1.5 hover:bg-[#FAF8F5] rounded-lg text-gray-600 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteKeyword(k.id)}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Keyword Modal */}
      {isKeywordModalOpen && editingKeyword && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#e8e2d5]">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[#0f2d22]">
                {editingKeyword.id ? 'Edit SEO Keyword' : 'Add Target Keyword'}
              </h3>
              <button
                type="button"
                onClick={() => setIsKeywordModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#626c66] mb-1">Target Keyword / Query</label>
                <input
                  type="text"
                  value={editingKeyword.keyword || ''}
                  onChange={(e) => setEditingKeyword((prev) => ({ ...prev, keyword: e.target.value }))}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                  placeholder="e.g. pure sojat henna powder"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#626c66] mb-1">Target Type</label>
                  <select
                    value={editingKeyword.targetType || 'homepage'}
                    onChange={(e) => setEditingKeyword((prev) => ({ ...prev, targetType: e.target.value as SeoTargetType }))}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                  >
                    <option value="homepage">Homepage</option>
                    <option value="product">Product</option>
                    <option value="category">Category</option>
                    <option value="guide">Guide</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="about">About</option>
                    <option value="contact">Contact</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#626c66] mb-1">Priority</label>
                  <select
                    value={editingKeyword.priority || 'MEDIUM'}
                    onChange={(e) => setEditingKeyword((prev) => ({ ...prev, priority: e.target.value as SeoPriority }))}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                  >
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#626c66] mb-1">Target Landing Page URL</label>
                <input
                  type="text"
                  value={editingKeyword.targetUrl || ''}
                  onChange={(e) => setEditingKeyword((prev) => ({ ...prev, targetUrl: e.target.value }))}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                  placeholder="e.g. /products/sojat-henna-powder"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#626c66] mb-1">Notes / Intent Strategy</label>
                <input
                  type="text"
                  value={editingKeyword.notes || ''}
                  onChange={(e) => setEditingKeyword((prev) => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                  placeholder="e.g. Primary commercial keyword for organic Sojat henna"
                />
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-[#0f2d22] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingKeyword.isPrimary || false}
                    onChange={(e) => setEditingKeyword((prev) => ({ ...prev, isPrimary: e.target.checked }))}
                    className="rounded border-gray-300 text-[#183F2B]"
                  />
                  <span>Primary Target Keyword</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-[#0f2d22] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingKeyword.active !== false}
                    onChange={(e) => setEditingKeyword((prev) => ({ ...prev, active: e.target.checked }))}
                    className="rounded border-gray-300 text-[#183F2B]"
                  />
                  <span>Active</span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-[#e8e2d5] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsKeywordModalOpen(false)}
                className="px-4 py-2 text-xs font-medium bg-[#f5f1e8] text-[#0f2d22] rounded-xl hover:bg-[#e8e2d5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                disabled={modalSaving}
                className="px-5 py-2 text-xs font-medium bg-[#183F2B] text-white rounded-xl hover:bg-[#123021] disabled:opacity-50 cursor-pointer"
              >
                {modalSaving ? 'Saving...' : 'Save Target'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-[#e8e2d5]">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-[#0f2d22]">Import SEO Keywords (CSV)</h3>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#626c66] leading-relaxed">
              Upload a CSV file containing columns: <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">keyword, targetType, targetUrl, priority</code>.
            </p>

            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-[#626c66] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#183F2B] file:text-white hover:file:bg-[#123021] cursor-pointer"
            />

            <div className="pt-3 border-t border-[#e8e2d5] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 text-xs font-medium bg-[#f5f1e8] text-[#0f2d22] rounded-xl hover:bg-[#e8e2d5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                disabled={!importFile || importing}
                className="px-5 py-2 text-xs font-medium bg-[#183F2B] text-white rounded-xl hover:bg-[#123021] disabled:opacity-50 cursor-pointer"
              >
                {importing ? 'Importing...' : 'Upload & Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
