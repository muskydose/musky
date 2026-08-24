'use client';

import React, { useState } from 'react';
import { Customer } from '@/lib/types';
import { Search, Trash2, Users } from 'lucide-react';

interface AdminCustomersClientProps {
  initialCustomers: Customer[];
  initialTotal?: number;
  initialPage?: number;
  initialLimit?: number;
  initialTotalPages?: number;
}

export default function AdminCustomersClient({
  initialCustomers,
  initialTotal,
  initialPage,
  initialLimit,
  initialTotalPages,
}: AdminCustomersClientProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [page, setPage] = useState(initialPage || 1);
  const [limit] = useState(initialLimit || 50);
  const [total, setTotal] = useState(initialTotal ?? initialCustomers.length);
  const [totalPages, setTotalPages] = useState(initialTotalPages || 1);
  const [search, setSearch] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [deletingPhone, setDeletingPhone] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchCustomers = async (targetPage: number, currentSearch: string) => {
    setIsFetching(true);
    try {
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: limit.toString(),
      });
      if (currentSearch.trim()) {
        params.set('search', currentSearch.trim());
      }

      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCustomers(data.customers || []);
        setTotal(data.total ?? 0);
        setPage(data.page ?? targetPage);
        setTotalPages(data.totalPages ?? 1);
      }
    } catch (err) {
      console.error('Failed to fetch paginated customers:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    fetchCustomers(1, val);
  };

  const handleDeleteCustomer = async (cust: Customer) => {
    const confirmMessage = `Are you sure you want to delete customer "${cust.name}" (${cust.phone})?\n\nThis removes the customer entry from your directory. All historical order records for this customer will be safely preserved.`;
    if (!window.confirm(confirmMessage)) return;

    setDeletingPhone(cust.phone);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/customers?phone=${encodeURIComponent(cust.phone)}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setCustomers((prev) => prev.filter((c) => c.phone !== cust.phone));
        setTotal((prev) => Math.max(0, prev - 1));
        setFeedback({
          type: 'success',
          message: `Customer "${cust.name}" removed successfully. Historical orders were preserved.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to delete customer record.',
        });
      }
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: e.message || 'Error occurred while deleting customer.',
      });
    } finally {
      setDeletingPhone(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Top Controls */}
      <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer by name, phone, email, city..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-medium focus:outline-none focus:border-[#1b4332]"
          />
        </div>

        <div className="text-gray-500 font-medium text-right flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-800" />
          <span>Total Customers:</span>
          <strong className="text-[#0f2d22] text-sm">{total}</strong>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-bold border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Customer Directory Table */}
      <div className="bg-white rounded-2xl border border-[#e8e2d5] shadow-xs overflow-hidden">
        <div className="p-6 border-b border-[#e8e2d5]">
          <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22]">
            Registered Customers ({total})
          </h3>
          <p className="text-xs text-[#626c66] mt-1">
            Directory of buyers submitting WhatsApp order enquiries and website purchases.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f5f1e8] text-[#0f2d22] uppercase tracking-wider text-[10px] font-bold border-b border-[#e8e2d5]">
                <th className="p-4">Customer Name</th>
                <th className="p-4">Contact (Mobile & WA)</th>
                <th className="p-4">Email</th>
                <th className="p-4">Delivery Address</th>
                <th className="p-4 text-center">Orders</th>
                <th className="p-4">Total Spent</th>
                <th className="p-4">Last Order</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f1e8]">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 font-medium">
                    {isFetching ? 'Loading customers...' : 'No customers match your search query.'}
                  </td>
                </tr>
              ) : (
                customers.map((cust) => (
                  <tr key={cust.id || cust.phone} className="hover:bg-[#fcfbf7]">
                    <td className="p-4 font-serif-heading font-bold text-sm text-[#0f2d22]">
                      {cust.name}
                    </td>
                    <td className="p-4 font-semibold">
                      <div className="text-emerald-800">Phone: {cust.phone}</div>
                      {cust.whatsapp && <div className="text-[11px] text-[#25D366]">WA: {cust.whatsapp}</div>}
                    </td>
                    <td className="p-4 text-gray-500">{cust.email || 'N/A'}</td>
                    <td className="p-4 text-gray-600 max-w-xs">
                      {cust.houseShop && <div className="font-semibold text-gray-800">{cust.houseShop}</div>}
                      <div className="truncate">{cust.address || 'India'}</div>
                      {(cust.city || cust.state || cust.pincode) && (
                        <div className="text-[11px] font-medium text-emerald-900">
                          {[cust.city, cust.state].filter(Boolean).join(', ')} {cust.pincode ? `- ${cust.pincode}` : ''}
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-bold text-center text-sm">{cust.totalOrders}</td>
                    <td className="p-4 font-extrabold text-[#1b4332] text-sm">₹{cust.totalSpent}</td>
                    <td className="p-4 text-gray-500 text-[11px]">
                      {cust.lastOrderAt ? new Date(cust.lastOrderAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Recent'}
                    </td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteCustomer(cust)}
                        disabled={deletingPhone === cust.phone}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors inline-flex items-center gap-1 font-semibold text-xs disabled:opacity-50"
                        title="Delete customer record"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="sr-only">Delete Customer</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="bg-[#FAF8F5] p-4 border-t border-[#e8e2d5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="text-gray-500 font-medium">
              Showing <strong>{customers.length > 0 ? (page - 1) * limit + 1 : 0}</strong> - <strong>{Math.min(page * limit, total)}</strong> of <strong>{total}</strong> customers
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1 || isFetching}
                onClick={() => fetchCustomers(page - 1, search)}
                className="px-3 py-1.5 bg-white border border-[#e8e2d5] rounded-xl font-bold text-[#0f2d22] hover:bg-[#f5f1e8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="font-bold text-[#0f2d22] px-2">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages || isFetching}
                onClick={() => fetchCustomers(page + 1, search)}
                className="px-3 py-1.5 bg-white border border-[#e8e2d5] rounded-xl font-bold text-[#0f2d22] hover:bg-[#f5f1e8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
