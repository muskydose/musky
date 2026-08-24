'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Campaign, Category, Product } from '@/lib/types';
import { Plus, Tag, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

import OffersStatsCards from '@/components/admin/offers/OffersStatsCards';
import OffersTable from '@/components/admin/offers/OffersTable';
import CampaignEditorModal from '@/components/admin/offers/CampaignEditorModal';

export default function AdminOffersPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Partial<Campaign> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, catRes, pRes] = await Promise.all([
        fetch('/api/campaigns?admin=true'),
        fetch('/api/categories'),
        fetch('/api/products?admin=true'),
      ]);

      const cData = await cRes.json();
      const catData = await catRes.json();
      const pData = await pRes.json();

      if (cData.success) {
        setCampaigns(cData.campaigns || []);
      }
      if (catData.success) {
        setCategories(catData.categories || []);
      }
      if (pData.success) {
        setProducts(pData.products || []);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load offers data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 5000);
  };

  const handleOpenCreateModal = () => {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    setEditingCampaign({
      name: '',
      publicDescription: '',
      festivalName: 'General Festive',
      discountType: 'percentage',
      discountValue: 10,
      minOrderValue: 0,
      targetType: 'storewide',
      targetCategoryIds: [],
      targetProductIds: [],
      startDate: now.toISOString(),
      endDate: nextWeek.toISOString(),
      priority: 10,
      isManuallyDisabled: false,
      couponCode: '',
      usageLimit: undefined,
      perCustomerLimit: 1,
      badgeText: '',
      bannerImageUrl: '',
      bannerCtaLink: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (camp: Campaign) => {
    setEditingCampaign({ ...camp });
    setIsModalOpen(true);
  };

  const handleSaveCampaign = async (campaignData: Partial<Campaign>) => {
    const isEdit = !!campaignData.id;
    const url = '/api/campaigns';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(campaignData),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to save campaign');
    }

    await fetchData();
    showSuccess(isEdit ? 'Campaign updated successfully.' : 'New campaign created successfully.');
  };

  const handleToggleDisable = async (camp: Campaign) => {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: camp.id,
          isManuallyDisabled: !camp.isManuallyDisabled,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update campaign status');
      }
      await fetchData();
      showSuccess(`Campaign ${camp.isManuallyDisabled ? 'enabled' : 'disabled'} successfully.`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDuplicate = async (id: string) => {
    const target = campaigns.find((c) => c.id === id);
    if (!target) return;

    try {
      const copy: Partial<Campaign> = {
        ...target,
        id: undefined,
        name: `${target.name} (Copy)`,
        couponCode: target.couponCode ? `${target.couponCode}_COPY` : '',
        currentUsageCount: 0,
      };

      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(copy),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to duplicate campaign');
      }
      await fetchData();
      showSuccess('Campaign duplicated successfully.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete campaign "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/campaigns?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete campaign');
      }
      await fetchData();
      showSuccess('Campaign deleted successfully.');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <AdminLayout title="Festival Campaigns & Offers">
      <div className="space-y-6 max-w-6xl mx-auto pb-16">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e8e2d5] pb-5">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#183F2B]">Festival Campaigns & Offers</h1>
            <p className="text-sm text-[#626c66] mt-1">
              Configure storewide discounts, festival promotional sales, coupon codes, and announcement banners.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-[#FAF8F5] border border-[#e8e2d5] text-[#0f2d22] text-xs font-semibold rounded-xl hover:bg-[#f5f1e8] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#183F2B] text-white text-xs font-bold rounded-xl hover:bg-[#123021] transition-all shadow-sm hover:scale-102 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#C5A059]" />
              <span>Create Campaign</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {success && (
          <div className="p-4 bg-[#e8f3ed] border border-[#2d6a4f]/20 text-[#2d6a4f] rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-[#9A4F32]/10 border border-[#9A4F32]/20 text-[#9A4F32] rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Metrics */}
        <OffersStatsCards campaigns={campaigns} />

        {/* Offers Table */}
        <OffersTable
          campaigns={campaigns}
          categories={categories}
          products={products}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onEdit={handleOpenEditModal}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onToggleDisable={handleToggleDisable}
        />

        {/* Campaign Editor Modal */}
        {isModalOpen && editingCampaign && (
          <CampaignEditorModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingCampaign(null);
            }}
            campaign={editingCampaign}
            categories={categories}
            products={products}
            onSave={handleSaveCampaign}
          />
        )}
      </div>
    </AdminLayout>
  );
}
