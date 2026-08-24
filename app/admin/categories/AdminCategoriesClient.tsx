'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Category } from '@/lib/types';
import { Plus, Edit, Trash2, Save, X, AlertCircle, Image as ImageIcon, FolderOpen } from 'lucide-react';
import MediaSelectModal from '@/components/MediaSelectModal';

interface AdminCategoriesClientProps {
  initialCategories: Category[];
}

export default function AdminCategoriesClient({
  initialCategories,
}: AdminCategoriesClientProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [editingCategory, setEditingCategory] = useState<Partial<Category> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  const handleOpenNew = () => {
    setErrorMsg(null);
    setEditingCategory({
      name: '',
      slug: '',
      description: '',
      image: '/images/fallback.svg',
      sortOrder: categories.length + 1,
      isActive: true,
    });
    setIsNew(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setErrorMsg(null);
    setEditingCategory({ ...cat });
    setIsNew(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name) return;

    setErrorMsg(null);
    setSaving(true);
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingCategory),
      });

      const data = await res.json();
      if (data.success) {
        if (isNew) {
          setCategories((prev) => [...prev, data.category].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
        } else {
          setCategories((prev) =>
            prev.map((c) => (c.id === data.category.id ? data.category : c)).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
          );
        }
        setEditingCategory(null);
      } else {
        setErrorMsg(data.error || 'Failed to save category.');
      }
    } catch (e: any) {
      console.error('Failed to save category:', e);
      setErrorMsg(e.message || 'An unexpected error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setCategories((prev) => prev.filter((c) => c.id !== id));
      } else {
        setErrorMsg(data.error || 'Failed to delete category.');
      }
    } catch (e: any) {
      console.error('Failed to delete category:', e);
      setErrorMsg(e.message || 'Failed to delete category.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs flex items-center justify-between">
        <div>
          <h3 className="font-serif-heading text-lg font-bold text-[#0f2d22]">
            Category Directory ({categories.length})
          </h3>
          <p className="text-xs text-[#626c66]">
            Organize products into Henna, Hair Care, Face Care, and Herbal Products.
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="inline-flex items-center gap-2 bg-[#1b4332] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow hover:bg-[#0f2d22]"
        >
          <Plus className="w-4 h-4 text-[#c5a059]" />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Edit / New Category Form Modal / Drawer */}
      {editingCategory && (
        <form onSubmit={handleSave} className="bg-white p-6 rounded-2xl border-2 border-[#1b4332] shadow-md space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-3">
            <h4 className="font-serif-heading text-xl font-bold text-[#0f2d22]">
              {isNew ? 'Create Category' : `Edit Category: ${editingCategory.name}`}
            </h4>
            <button
              type="button"
              onClick={() => setEditingCategory(null)}
              className="text-gray-400 hover:text-rose-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#0f2d22] font-bold mb-1">Category Name *</label>
              <input
                type="text"
                required
                value={editingCategory.name || ''}
                onChange={(e) =>
                  setEditingCategory((prev) => ({
                    ...prev,
                    name: e.target.value,
                    slug: isNew ? e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') : prev?.slug,
                  }))
                }
                className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-semibold"
              />
            </div>

            <div>
              <label className="block text-[#0f2d22] font-bold mb-1">Slug</label>
              <input
                type="text"
                value={editingCategory.slug || ''}
                onChange={(e) => setEditingCategory((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="e.g. henna-care"
                className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-mono text-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[#0f2d22] font-bold">Category Image URL</label>
                <button
                  type="button"
                  onClick={() => setIsMediaModalOpen(true)}
                  className="text-[11px] font-bold text-[#1b4332] hover:text-[#0f2d22] flex items-center gap-1"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-[#c5a059]" /> Select Media
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editingCategory.image || ''}
                  onChange={(e) => setEditingCategory((prev) => ({ ...prev, image: e.target.value }))}
                  placeholder="https://..."
                  className="flex-1 p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs"
                />
                <button
                  type="button"
                  onClick={() => setIsMediaModalOpen(true)}
                  className="bg-[#1b4332] text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-[#c5a059]" /> Media
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[#0f2d22] font-bold mb-1">Display Order</label>
              <input
                type="number"
                value={editingCategory.sortOrder ?? 1}
                onChange={(e) => setEditingCategory((prev) => ({ ...prev, sortOrder: Number(e.target.value) }))}
                className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[#0f2d22] font-bold mb-1">Description</label>
              <textarea
                rows={2}
                value={editingCategory.description || ''}
                onChange={(e) => setEditingCategory((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="catIsActive"
                checked={editingCategory.isActive ?? true}
                onChange={(e) => setEditingCategory((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 accent-[#1b4332] rounded"
              />
              <label htmlFor="catIsActive" className="text-xs font-bold text-[#0f2d22]">
                Active (Visible on Public Website)
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e8e2d5]">
            <button
              type="button"
              onClick={() => setEditingCategory(null)}
              className="px-4 py-2 font-bold text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-[#1b4332] text-white px-5 py-2 rounded-xl font-bold shadow hover:bg-[#0f2d22]"
            >
              <Save className="w-4 h-4 text-[#c5a059]" />
              <span>{saving ? 'Saving...' : 'Save Category'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Category Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-2xl border border-[#e8e2d5] overflow-hidden shadow-xs space-y-3 p-4 flex flex-col justify-between">
            <div>
              <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 mb-3 border border-[#e8e2d5]">
                <Image
                  src={cat.image || '/images/fallback.svg'}
                  alt={cat.name}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
                <span
                  className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs ${
                    cat.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {cat.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <h4 className="font-serif-heading text-xl font-bold text-[#0f2d22]">{cat.name}</h4>
                <span className="text-[10px] text-gray-400 font-mono">Order: {cat.sortOrder ?? 1}</span>
              </div>
              <p className="text-xs text-[#626c66] line-clamp-2 mt-1">{cat.description}</p>
            </div>

            <div className="pt-3 border-t border-[#f5f1e8] flex items-center justify-between">
              <span className="text-[11px] font-mono text-gray-400">/{cat.slug}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="p-1.5 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                  title="Edit"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
                  className="p-1.5 rounded bg-rose-50 text-rose-600 hover:bg-rose-100"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <MediaSelectModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelect={(url) => {
          if (editingCategory) {
            setEditingCategory((prev) => ({ ...prev, image: url }));
          }
        }}
        categoryFilter="categories"
        title="Select Category Image"
      />
    </div>
  );
}
