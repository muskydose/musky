'use client';

import React, { useState } from 'react';
import { Campaign, Category, Product, DiscountType, CampaignTargetType, CampaignStatus } from '@/lib/types';
import {
  XCircle,
  Sparkles,
  Percent,
  IndianRupee,
  Truck,
  Tag,
  Layers,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';

interface CampaignEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: Partial<Campaign>;
  categories: Category[];
  products: Product[];
  onSave: (campaign: Partial<Campaign>) => Promise<void>;
}

export default function CampaignEditorModal({
  isOpen,
  onClose,
  campaign: initialCampaign,
  categories,
  products,
  onSave,
}: CampaignEditorModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'discount' | 'coupon' | 'banner'>('basic');
  const [editingCampaign, setEditingCampaign] = useState<Partial<Campaign>>(initialCampaign);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !editingCampaign) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign.name?.trim()) {
      setError('Campaign name is required.');
      return;
    }
    if (!editingCampaign.startDate || !editingCampaign.endDate) {
      setError('Start and End dates are required.');
      return;
    }
    if (new Date(editingCampaign.endDate) <= new Date(editingCampaign.startDate)) {
      setError('End date must be after Start date.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave(editingCampaign);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save campaign.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'basic', label: 'Basic Details', icon: Sparkles },
    { id: 'discount', label: 'Discount Rules', icon: Percent },
    { id: 'coupon', label: 'Coupon & Limits', icon: Tag },
    { id: 'banner', label: 'Banner & Badges', icon: Layers },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-[#e8e2d5] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto">
        {/* Modal Header */}
        <div className="bg-[#183F2B] text-white p-6 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-serif font-bold text-xl text-white">
              {editingCampaign.id ? 'Edit Festival Campaign' : 'Create Festival Campaign'}
            </h3>
            <p className="text-xs text-white/80 mt-0.5">
              Configure discount rules, date limits, coupons, and public banner presentation.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-[#e8e2d5] bg-[#FAF8F5] px-6 pt-3 gap-2 shrink-0 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-semibold transition-all border-b-2 cursor-pointer ${
                  isActive
                    ? 'bg-white text-[#183F2B] border-[#183F2B] shadow-xs'
                    : 'text-[#626c66] hover:text-[#0f2d22] border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: BASIC */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0f2d22] mb-1">Campaign Name *</label>
                <input
                  type="text"
                  required
                  value={editingCampaign.name || ''}
                  onChange={(e) => setEditingCampaign((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                  placeholder="e.g. Diwali Mega Henna Festive Sale"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f2d22] mb-1">Description / Subheading</label>
                <input
                  type="text"
                  value={editingCampaign.publicDescription || ''}
                  onChange={(e) => setEditingCampaign((prev) => ({ ...prev, publicDescription: e.target.value }))}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                  placeholder="e.g. Flat 15% OFF on pure Sojat henna powders"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0f2d22] mb-1">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={editingCampaign.startDate ? new Date(editingCampaign.startDate).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditingCampaign((prev) => ({ ...prev, startDate: new Date(e.target.value).toISOString() }))}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0f2d22] mb-1">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={editingCampaign.endDate ? new Date(editingCampaign.endDate).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setEditingCampaign((prev) => ({ ...prev, endDate: new Date(e.target.value).toISOString() }))}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0f2d22] mb-1">Display Priority (1 = Highest)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={editingCampaign.priority ?? 10}
                    onChange={(e) => setEditingCampaign((prev) => ({ ...prev, priority: parseInt(e.target.value) || 10 }))}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#0f2d22] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!editingCampaign.isManuallyDisabled}
                      onChange={(e) => setEditingCampaign((prev) => ({ ...prev, isManuallyDisabled: !e.target.checked }))}
                      className="rounded border-gray-300 text-[#183F2B]"
                    />
                    <span>Campaign Active</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DISCOUNT RULES */}
          {activeTab === 'discount' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0f2d22] mb-1">Discount Type *</label>
                  <select
                    value={editingCampaign.discountType || 'percentage'}
                    onChange={(e) => setEditingCampaign((prev) => ({ ...prev, discountType: e.target.value as DiscountType }))}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                  >
                    <option value="percentage">Percentage Discount (%)</option>
                    <option value="fixed_amount">Fixed Amount Discount (₹)</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0f2d22] mb-1">Discount Value</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editingCampaign.discountValue ?? 10}
                    onChange={(e) => setEditingCampaign((prev) => ({ ...prev, discountValue: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                    placeholder="e.g. 15 for 15% or 100 for ₹100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0f2d22] mb-1">Minimum Order Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingCampaign.minOrderValue ?? 0}
                    onChange={(e) => setEditingCampaign((prev) => ({ ...prev, minOrderValue: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                    placeholder="0 for no minimum"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0f2d22] mb-1">Max Discount Cap (₹, for % discounts)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingCampaign.maxDiscountAmount ?? ''}
                    onChange={(e) => setEditingCampaign((prev) => ({ ...prev, maxDiscountAmount: parseFloat(e.target.value) || undefined }))}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                    placeholder="Optional max discount cap"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f2d22] mb-1">Target Application Scope</label>
                <select
                  value={editingCampaign.targetType || 'all'}
                  onChange={(e) => setEditingCampaign((prev) => ({ ...prev, targetType: e.target.value as CampaignTargetType }))}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                >
                  <option value="storewide">Entire Store Catalog (All Products)</option>
                  <option value="categories">Specific Product Categories</option>
                  <option value="products">Specific Products Only</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: COUPON & LIMITS */}
          {activeTab === 'coupon' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0f2d22] mb-1">Coupon Code (Leave empty for Auto-Applied offer)</label>
                <input
                  type="text"
                  value={editingCampaign.couponCode || ''}
                  onChange={(e) => setEditingCampaign((prev) => ({ ...prev, couponCode: e.target.value.toUpperCase().trim() }))}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl font-mono text-xs text-[#0f2d22] uppercase tracking-wider"
                  placeholder="e.g. DIWALI15 or SOJATFREESHIP"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0f2d22] mb-1">Overall Usage Limit</label>
                  <input
                    type="number"
                    min="0"
                    value={editingCampaign.usageLimit ?? ''}
                    onChange={(e) => setEditingCampaign((prev) => ({ ...prev, usageLimit: parseInt(e.target.value) || undefined }))}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                    placeholder="Leave empty for unlimited"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0f2d22] mb-1">Usage Limit Per Customer</label>
                  <input
                    type="number"
                    min="1"
                    value={editingCampaign.perCustomerLimit ?? 1}
                    onChange={(e) => setEditingCampaign((prev) => ({ ...prev, perCustomerLimit: parseInt(e.target.value) || 1 }))}
                    className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BANNER & BADGES */}
          {activeTab === 'banner' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0f2d22] mb-1">Promotional Badge Text</label>
                <input
                  type="text"
                  value={editingCampaign.badgeText || ''}
                  onChange={(e) => setEditingCampaign((prev) => ({ ...prev, badgeText: e.target.value }))}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                  placeholder="e.g. FESTIVE SALE or FLAT 15% OFF"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f2d22] mb-1">Promotional Banner Image URL</label>
                <input
                  type="text"
                  value={editingCampaign.bannerImageUrl || ''}
                  onChange={(e) => setEditingCampaign((prev) => ({ ...prev, bannerImageUrl: e.target.value }))}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                  placeholder="https://.../festive-banner.jpg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f2d22] mb-1">Banner Click Link</label>
                <input
                  type="text"
                  value={editingCampaign.bannerCtaLink || ''}
                  onChange={(e) => setEditingCampaign((prev) => ({ ...prev, bannerCtaLink: e.target.value }))}
                  className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22]"
                  placeholder="e.g. /categories/henna-care or /products"
                />
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="pt-4 border-t border-[#e8e2d5] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold bg-[#f5f1e8] text-[#0f2d22] rounded-xl hover:bg-[#e8e2d5] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#183F2B] text-white text-xs font-bold rounded-xl hover:bg-[#123021] disabled:opacity-50 cursor-pointer shadow-sm"
            >
              <Save className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>{saving ? 'Saving...' : 'Save Campaign'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
