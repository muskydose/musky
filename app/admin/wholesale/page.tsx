'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { WholesaleEnquiry } from '@/lib/types';
import {
  Building2,
  Search,
  MessageCircle,
  Trash2,
  CheckCircle2,
  Clock,
  CheckCheck,
  XCircle,
  AlertCircle,
  Loader2,
  MapPin,
  Phone,
  Mail,
  Box,
} from 'lucide-react';
import { getWhatsAppDirectUrl } from '@/lib/whatsapp';

export default function AdminWholesalePage() {
  const [enquiries, setEnquiries] = useState<WholesaleEnquiry[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadData = async (
    targetPage = page,
    currentStatus = statusFilter,
    currentSearch = searchQuery
  ) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: limit.toString(),
      });
      if (currentStatus && currentStatus !== 'ALL') {
        params.set('status', currentStatus);
      }
      if (currentSearch.trim()) {
        params.set('search', currentSearch.trim());
      }

      const res = await fetch(`/api/wholesale?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEnquiries(data.enquiries || []);
        setTotal(data.total ?? 0);
        setPage(data.page ?? targetPage);
        setTotalPages(data.totalPages ?? 1);
      } else {
        setError(data.error || 'Failed to load wholesale enquiries.');
      }
    } catch (err: any) {
      setError('Network error fetching wholesale enquiries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => loadData(1, statusFilter, searchQuery));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    loadData(1, statusFilter, val);
  };

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    loadData(1, val, searchQuery);
  };

  const handleStatusChange = async (id: string, newStatus: WholesaleEnquiry['status']) => {
    try {
      const res = await fetch('/api/wholesale', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update enquiry status.');
      }
      setSuccess(`Status updated to ${newStatus}`);
      setTimeout(() => setSuccess(''), 3000);
      loadData(page, statusFilter, searchQuery);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this wholesale enquiry?')) return;

    try {
      const res = await fetch(`/api/wholesale?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete enquiry.');
      }
      setSuccess('Enquiry deleted successfully.');
      setTimeout(() => setSuccess(''), 3000);
      loadData(page, statusFilter, searchQuery);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <AdminLayout title="Wholesale & B2B Bulk Enquiries">
      <div className="space-y-6">
        {/* Banner Header */}
        <div className="bg-[#0f2d22] text-white p-6 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 border border-[#2d6a4f]/30">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#c5a059]" />
              <h2 className="font-serif-heading text-lg font-bold">Wholesale & Trade Inquiries</h2>
            </div>
            <p className="text-xs text-[#b2c8be] max-w-2xl">
              Track and respond to bulk trade orders, distributors, salons, and exporter inquiries from Sojat, Rajasthan.
            </p>
          </div>
          <div className="px-3 py-1.5 rounded bg-[#1b4332] text-xs font-semibold text-[#c5a059] border border-[#2d6a4f]">
            Total Inquiries: {total}
          </div>
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
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{success}</span>
          </div>
        )}

        {/* Filters and Search Bar */}
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, business or product..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] text-xs text-[#1f2421] focus:outline-none focus:border-[#1b4332]"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {['ALL', 'NEW', 'CONTACTED', 'QUOTED', 'COMPLETED', 'CLOSED'].map((st) => (
              <button
                key={st}
                onClick={() => handleStatusFilterChange(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  statusFilter === st
                    ? 'bg-[#0f2d22] text-[#c5a059]'
                    : 'bg-[#FAF8F5] text-[#626c66] hover:bg-gray-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Table List */}
        <div className="bg-white rounded-xl border border-[#e8e2d5] shadow-xs overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[#626c66] text-xs flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#c5a059]" /> Loading wholesale enquiries...
            </div>
          ) : enquiries.length === 0 ? (
            <div className="p-12 text-center text-[#626c66] text-xs space-y-2">
              <Building2 className="w-8 h-8 text-[#c5a059] mx-auto opacity-40" />
              <p className="font-semibold text-sm">No wholesale enquiries found.</p>
              <p className="text-[#8d9690]">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'Try clearing your search filters.'
                  : 'New B2B submissions from your /wholesale page will appear here.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#e8e2d5] bg-[#f5f1e8]/60 text-[#0f2d22] font-semibold">
                    <th className="p-3.5 pl-6">Contact / Business</th>
                    <th className="p-3.5">Required Products & Qty</th>
                    <th className="p-3.5">Location</th>
                    <th className="p-3.5">Received Date</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e2d5]">
                  {enquiries.map((enquiry) => {
                    const waPhone = enquiry.whatsapp || enquiry.phone;
                    const replyText = `Hello ${enquiry.customerName}, Thank you for your wholesale enquiry on Musky Dose regarding ${enquiry.productsRequired}. We are happy to provide wholesale terms for ${enquiry.approxQuantity}. How can we assist you today?`;
                    const waUrl = getWhatsAppDirectUrl(waPhone, replyText);

                    return (
                      <tr key={enquiry.id} className="hover:bg-[#FAF8F5] transition-colors">
                        {/* Name / Business */}
                        <td className="p-3.5 pl-6 space-y-1">
                          <div className="font-bold text-[#0f2d22] text-sm">
                            {enquiry.customerName}
                          </div>
                          {enquiry.businessName && (
                            <div className="text-[11px] text-[#2d6a4f] font-semibold flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> {enquiry.businessName}
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-[11px] text-[#626c66]">
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-[#1b4332]" /> {enquiry.phone}
                            </span>
                            {enquiry.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-gray-500" /> {enquiry.email}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Products & Quantity */}
                        <td className="p-3.5 max-w-xs space-y-1">
                          <div className="font-semibold text-[#1f2421] line-clamp-2">
                            {enquiry.productsRequired}
                          </div>
                          <div className="inline-block font-mono text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded">
                            <Box className="w-3 h-3 inline mr-1" />
                            Approx Qty: {enquiry.approxQuantity}
                          </div>
                          {enquiry.notes && (
                            <p className="text-[11px] text-[#626c66] italic line-clamp-1">
                              &quot;{enquiry.notes}&quot;
                            </p>
                          )}
                        </td>

                        {/* Location */}
                        <td className="p-3.5 text-[#1f2421]">
                          <div className="flex items-center gap-1 text-[11px]">
                            <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span>
                              {[enquiry.city, enquiry.state].filter(Boolean).join(', ') || 'Not specified'}
                            </span>
                          </div>
                        </td>

                        {/* Date */}
                        <td className="p-3.5 text-[#626c66] whitespace-nowrap text-[11px]">
                          {new Date(enquiry.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Status Select */}
                        <td className="p-3.5">
                          <select
                            value={enquiry.status}
                            onChange={(e) => handleStatusChange(enquiry.id, e.target.value as any)}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold border focus:outline-none ${
                              enquiry.status === 'NEW'
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : enquiry.status === 'CONTACTED'
                                ? 'bg-blue-100 text-blue-900 border-blue-300'
                                : enquiry.status === 'QUOTED'
                                ? 'bg-purple-100 text-purple-900 border-purple-300'
                                : enquiry.status === 'CONVERTED'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-gray-100 text-gray-700 border-gray-300'
                            }`}
                          >
                            <option value="NEW">NEW</option>
                            <option value="CONTACTED">CONTACTED</option>
                            <option value="QUOTED">QUOTED</option>
                            <option value="CONVERTED">CONVERTED</option>
                            <option value="CLOSED">CLOSED</option>
                          </select>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 pr-6 text-right space-x-2 whitespace-nowrap">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-700 transition-colors shadow-2xs"
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> Reply
                          </a>
                          <button
                            onClick={() => handleDelete(enquiry.id)}
                            className="p-1.5 rounded hover:bg-rose-50 text-rose-600 transition-colors"
                            title="Delete Enquiry"
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

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-[#FAF8F5] p-4 border-t border-[#e8e2d5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-gray-500 font-medium">
                Showing <strong>{enquiries.length > 0 ? (page - 1) * limit + 1 : 0}</strong> - <strong>{Math.min(page * limit, total)}</strong> of <strong>{total}</strong> enquiries
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => loadData(page - 1, statusFilter, searchQuery)}
                  className="px-3 py-1.5 bg-white border border-[#e8e2d5] rounded-xl font-bold text-[#0f2d22] hover:bg-[#f5f1e8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <span className="font-bold text-[#0f2d22] px-2">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => loadData(page + 1, statusFilter, searchQuery)}
                  className="px-3 py-1.5 bg-white border border-[#e8e2d5] rounded-xl font-bold text-[#0f2d22] hover:bg-[#f5f1e8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
