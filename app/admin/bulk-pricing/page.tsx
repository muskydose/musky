'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { BulkPricingRule, Product } from '@/lib/types';
import {
  Percent,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Layers,
  HelpCircle,
} from 'lucide-react';

export default function AdminBulkPricingPage() {
  const [rules, setRules] = useState<BulkPricingRule[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BulkPricingRule | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [productId, setProductId] = useState('global');
  const [minQuantity, setMinQuantity] = useState<number | ''>(5);
  const [maxQuantity, setMaxQuantity] = useState<number | ''>('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount' | 'fixed_price'>('percentage');
  const [discountValue, setDiscountValue] = useState<number | ''>(10);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [rulesRes, prodsRes] = await Promise.all([
        fetch('/api/bulk-pricing?admin=true'),
        fetch('/api/products?admin=true'),
      ]);

      const rulesData = await rulesRes.json();
      const prodsData = await prodsRes.json();

      if (rulesData.success) {
        setRules(rulesData.rules || []);
      } else {
        setError(rulesData.error || 'Failed to load bulk pricing rules.');
      }

      if (prodsData.success) {
        setProducts(prodsData.products || []);
      }
    } catch (err: any) {
      setError('Network error fetching bulk pricing rules.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => loadData());
  }, []);

  const openCreateModal = () => {
    setEditingRule(null);
    setProductId('global');
    setMinQuantity(5);
    setMaxQuantity('');
    setDiscountType('percentage');
    setDiscountValue(10);
    setIsActive(true);
    setSortOrder(rules.length + 1);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (rule: BulkPricingRule) => {
    setEditingRule(rule);
    setProductId(rule.productId || 'global');
    setMinQuantity(rule.minQuantity);
    setMaxQuantity(rule.maxQuantity !== undefined && rule.maxQuantity !== null ? rule.maxQuantity : '');
    setDiscountType(rule.discountType || 'percentage');
    setDiscountValue(rule.discountValue);
    setIsActive(rule.isActive !== false);
    setSortOrder(rule.sortOrder || 1);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!minQuantity || Number(minQuantity) < 1) {
      setFormError('Minimum quantity must be at least 1.');
      return;
    }

    if (maxQuantity !== '' && maxQuantity !== null && Number(maxQuantity) < Number(minQuantity)) {
      setFormError('Maximum quantity must be greater than or equal to minimum quantity.');
      return;
    }

    if (!discountValue || Number(discountValue) <= 0) {
      setFormError('Discount value must be greater than 0.');
      return;
    }

    if (discountType === 'percentage' && Number(discountValue) > 100) {
      setFormError('Percentage discount value cannot exceed 100%.');
      return;
    }

    setSaving(true);
    try {
      const payload: Partial<BulkPricingRule> = {
        id: editingRule ? editingRule.id : undefined,
        productId,
        minQuantity: Number(minQuantity),
        maxQuantity: maxQuantity !== '' ? Number(maxQuantity) : undefined,
        discountType,
        discountValue: Number(discountValue),
        isActive,
        sortOrder: Number(sortOrder) || 1,
      };

      const res = await fetch('/api/bulk-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save bulk pricing rule.');
      }

      setSuccess(editingRule ? 'Rule updated successfully!' : 'Rule created successfully!');
      setTimeout(() => setSuccess(''), 4000);
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this bulk pricing rule?')) return;

    try {
      const res = await fetch(`/api/bulk-pricing?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete rule.');
      }
      setSuccess('Rule deleted successfully!');
      setTimeout(() => setSuccess(''), 4000);
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <AdminLayout title="Bulk Pricing & Tier Discounts">
      <div className="space-y-6">
        {/* Banner Explanation */}
        <div className="bg-[#1b4332] text-white p-6 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-[#c5a059]" />
              <h2 className="font-serif-heading text-lg font-bold">Automatic Quantity Volume Discounts</h2>
            </div>
            <p className="text-xs text-[#b2c8be] max-w-2xl">
              Configure tier-based quantity discounts (e.g. 10% OFF for 5+ units). All discounts are validated on the server and automatically calculated in Cart, Checkout, and WhatsApp Order logs.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#c5a059] text-[#0f2d22] font-semibold text-xs hover:bg-[#d4af66] transition-colors shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Pricing Tier Rule
          </button>
        </div>

        {/* Global Feedback Messages */}
        {error && (
          <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Rules Table */}
        <div className="bg-white rounded-xl border border-[#e8e2d5] shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e8e2d5] flex items-center justify-between bg-[#FAF8F5]">
            <h3 className="font-serif-heading text-sm font-bold text-[#0f2d22] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#c5a059]" /> Active & Inactive Pricing Rules ({rules.length})
            </h3>
          </div>

          {loading ? (
            <div className="p-12 text-center text-[#626c66] text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#c5a059]" /> Loading bulk pricing rules...
            </div>
          ) : rules.length === 0 ? (
            <div className="p-12 text-center text-[#626c66] text-xs space-y-2">
              <Percent className="w-8 h-8 text-[#c5a059] mx-auto opacity-40" />
              <p className="font-semibold text-sm">No bulk pricing rules defined yet.</p>
              <p className="text-[#8d9690]">Click &quot;Add Pricing Tier Rule&quot; above to create your first volume discount rule.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#e8e2d5] bg-[#f5f1e8]/60 text-[#0f2d22] font-semibold">
                    <th className="p-3.5 pl-6">Target Product</th>
                    <th className="p-3.5">Quantity Range</th>
                    <th className="p-3.5">Discount</th>
                    <th className="p-3.5">Discount Type</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e2d5]">
                  {rules.map((rule) => {
                    const isGlobal = !rule.productId || rule.productId === 'global';
                    return (
                      <tr key={rule.id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="p-3.5 pl-6 font-semibold text-[#0f2d22]">
                          {isGlobal ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#e8f3ed] text-[#1b4332] text-[11px] font-bold">
                              Global / All Products
                            </span>
                          ) : (
                            <span>{rule.productName}</span>
                          )}
                        </td>
                        <td className="p-3.5 text-[#1f2421]">
                          <span className="font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded">
                            {rule.minQuantity} {rule.maxQuantity ? `- ${rule.maxQuantity}` : '+'} units
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-emerald-800 text-sm">
                          {rule.discountType === 'percentage' && `${rule.discountValue}% OFF`}
                          {rule.discountType === 'fixed_amount' && `₹${rule.discountValue} OFF / unit`}
                          {rule.discountType === 'fixed_price' && `₹${rule.discountValue} fixed unit price`}
                        </td>
                        <td className="p-3.5 text-[#626c66] capitalize">
                          {rule.discountType.replace('_', ' ')}
                        </td>
                        <td className="p-3.5">
                          {rule.isActive !== false ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">
                              <XCircle className="w-3 h-3" /> Inactive
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 pr-6 text-right space-x-2">
                          <button
                            onClick={() => openEditModal(rule)}
                            className="p-1.5 rounded hover:bg-[#e8f3ed] text-[#1b4332] transition-colors"
                            title="Edit Rule"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(rule.id)}
                            className="p-1.5 rounded hover:bg-rose-50 text-rose-600 transition-colors"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Form */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-[#e8e2d5] max-w-lg w-full p-6 shadow-xl space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-3">
                <h3 className="font-serif-heading text-lg font-bold text-[#0f2d22]">
                  {editingRule ? 'Edit Bulk Pricing Rule' : 'Add Bulk Pricing Rule'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4 text-xs">
                {/* Target Product */}
                <div>
                  <label className="block font-semibold text-[#0f2d22] mb-1">
                    Apply Rule To:
                  </label>
                  <select
                    value={productId}
                    onChange={(e) => setProductId(e.target.value)}
                    className="w-full px-3 py-2 rounded border border-[#e8e2d5] bg-[#FAF8F5] text-[#1f2421] focus:outline-none focus:border-[#1b4332]"
                  >
                    <option value="global">Global / All Products</option>
                    <optgroup label="Specific Products">
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (₹{p.price})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <p className="text-[11px] text-[#626c66] mt-0.5">
                    Product-specific rules take priority over Global rules.
                  </p>
                </div>

                {/* Quantity Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#0f2d22] mb-1">
                      Minimum Quantity *
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={minQuantity}
                      onChange={(e) => setMinQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded border border-[#e8e2d5] bg-[#FAF8F5] text-[#1f2421] focus:outline-none focus:border-[#1b4332]"
                      placeholder="e.g. 5"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#0f2d22] mb-1">
                      Maximum Quantity (Optional)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={maxQuantity}
                      onChange={(e) => setMaxQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded border border-[#e8e2d5] bg-[#FAF8F5] text-[#1f2421] focus:outline-none focus:border-[#1b4332]"
                      placeholder="Leave blank for no upper limit"
                    />
                  </div>
                </div>

                {/* Discount Type & Value */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#0f2d22] mb-1">
                      Discount Type *
                    </label>
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded border border-[#e8e2d5] bg-[#FAF8F5] text-[#1f2421] focus:outline-none focus:border-[#1b4332]"
                    >
                      <option value="percentage">Percentage OFF (%)</option>
                      <option value="fixed_amount">Fixed Amount OFF (₹)</option>
                      <option value="fixed_price">Fixed Price per Unit (₹)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#0f2d22] mb-1">
                      Discount Value *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={0.01}
                      required
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded border border-[#e8e2d5] bg-[#FAF8F5] text-[#1f2421] focus:outline-none focus:border-[#1b4332]"
                      placeholder={discountType === 'percentage' ? 'e.g. 10 (%)' : 'e.g. 50 (₹)'}
                    />
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-[#1b4332] rounded focus:ring-0"
                  />
                  <label htmlFor="isActiveToggle" className="font-semibold text-[#0f2d22] cursor-pointer">
                    Enable & Activate This Rule Immediately
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e8e2d5]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded border border-[#e8e2d5] text-[#626c66] hover:bg-gray-100 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded bg-[#0f2d22] text-white font-semibold hover:bg-[#1b4332] disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c5a059]" />}
                    {editingRule ? 'Update Rule' : 'Create Rule'}
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
