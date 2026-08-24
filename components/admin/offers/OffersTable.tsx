'use client';

import React from 'react';
import { Campaign, Category, Product } from '@/lib/types';
import {
  Tag,
  Search,
  Calendar,
  Percent,
  IndianRupee,
  Truck,
  Edit2,
  Trash2,
  Copy,
  ToggleLeft,
  ToggleRight,
  Filter,
} from 'lucide-react';

interface OffersTableProps {
  campaigns: Campaign[];
  categories: Category[];
  products: Product[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (f: string) => void;
  onEdit: (campaign: Campaign) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  onToggleDisable: (campaign: Campaign) => void;
}

export default function OffersTable({
  campaigns,
  categories,
  products,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleDisable,
}: OffersTableProps) {
  const filtered = campaigns.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = c.name.toLowerCase().includes(q);
      const matchCoupon = c.couponCode?.toLowerCase().includes(q);
      const matchDesc = c.publicDescription?.toLowerCase().includes(q) || c.internalDescription?.toLowerCase().includes(q);
      if (!matchName && !matchCoupon && !matchDesc) return false;
    }
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && (c.status !== 'active' || c.isManuallyDisabled)) return false;
      if (statusFilter === 'disabled' && !c.isManuallyDisabled) return false;
      if (statusFilter === 'scheduled' && c.status !== 'scheduled') return false;
      if (statusFilter === 'expired' && c.status !== 'expired') return false;
    }
    return true;
  });

  const getStatusBadge = (camp: Campaign) => {
    if (camp.isManuallyDisabled) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-gray-100 text-gray-700">
          DISABLED
        </span>
      );
    }
    switch (camp.status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-100 text-emerald-800">
            ACTIVE
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-100 text-amber-800">
            SCHEDULED
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-100 text-rose-800">
            EXPIRED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-gray-100 text-gray-700">
            {camp.status}
          </span>
        );
    }
  };

  const formatDiscount = (camp: Campaign) => {
    if (camp.discountType === 'percentage') {
      return `${camp.discountValue}% OFF`;
    }
    if (camp.discountType === 'fixed_amount') {
      return `₹${camp.discountValue} FLAT OFF`;
    }
    if (camp.discountType === 'free_shipping') {
      return 'FREE SHIPPING';
    }
    return 'DISCOUNT';
  };

  return (
    <div className="bg-white border border-[#e8e2d5] rounded-2xl overflow-hidden shadow-xs space-y-0">
      {/* Search & Filter Header */}
      <div className="p-4 border-b border-[#e8e2d5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#FAF8F5]">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search campaigns, coupon codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-2 text-xs bg-white border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
          >
            <option value="all">All Statuses ({campaigns.length})</option>
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="disabled">Disabled</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-[#0f2d22]">
          <thead className="bg-[#FAF8F5] border-b border-[#e8e2d5] text-[#626c66] uppercase text-[10px] font-bold">
            <tr>
              <th className="p-3.5">Campaign Name</th>
              <th className="p-3.5">Discount Offer</th>
              <th className="p-3.5">Coupon & Usage</th>
              <th className="p-3.5">Validity Dates</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e8e2d5]/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#626c66]">
                  No festival or promotional campaigns found.
                </td>
              </tr>
            ) : (
              filtered.map((camp) => (
                <tr key={camp.id} className="hover:bg-[#FAF8F5]/60 transition-colors">
                  <td className="p-3.5">
                    <div className="font-semibold text-sm text-[#0f2d22]">{camp.name}</div>
                    {camp.badgeText && (
                      <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-[#e8f3ed] text-[#183F2B]">
                        {camp.badgeText}
                      </span>
                    )}
                  </td>

                  <td className="p-3.5">
                    <span className="font-bold text-[#183F2B] font-mono text-xs">
                      {formatDiscount(camp)}
                    </span>
                    {camp.minOrderValue ? (
                      <div className="text-[10px] text-[#626c66]">Min order: ₹{camp.minOrderValue}</div>
                    ) : null}
                  </td>

                  <td className="p-3.5">
                    {camp.couponCode ? (
                      <span className="inline-block px-2 py-0.5 bg-[#FAF8F5] border border-[#e8e2d5] text-[#0f2d22] font-mono text-[11px] font-bold rounded-lg">
                        {camp.couponCode}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#626c66]">Auto-Applied</span>
                    )}
                    <div className="text-[10px] text-[#626c66] mt-0.5">
                      Uses: {camp.currentUsageCount || 0}
                      {camp.usageLimit ? ` / ${camp.usageLimit}` : ' (Unlimited)'}
                    </div>
                  </td>

                  <td className="p-3.5 text-[#626c66] space-y-0.5 font-mono text-[11px]">
                    <div className="flex items-center gap-1">
                      <span>{new Date(camp.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - {new Date(camp.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </td>

                  <td className="p-3.5">{getStatusBadge(camp)}</td>

                  <td className="p-3.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onToggleDisable(camp)}
                        title={camp.isManuallyDisabled ? 'Enable Campaign' : 'Disable Campaign'}
                        className="p-1.5 hover:bg-[#FAF8F5] rounded-lg text-gray-600 cursor-pointer"
                      >
                        {camp.isManuallyDisabled ? (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ToggleRight className="w-5 h-5 text-emerald-600" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => onDuplicate(camp.id)}
                        title="Duplicate Campaign"
                        className="p-1.5 hover:bg-[#FAF8F5] rounded-lg text-gray-600 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onEdit(camp)}
                        title="Edit Campaign"
                        className="p-1.5 hover:bg-[#FAF8F5] rounded-lg text-gray-600 cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(camp.id, camp.name)}
                        title="Delete Campaign"
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
  );
}
