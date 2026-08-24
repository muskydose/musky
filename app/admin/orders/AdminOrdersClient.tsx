'use client';

import React, { useState } from 'react';
import { Order } from '@/lib/types';
import { Search, ShoppingBag, MessageCircle, Phone, MapPin, Trash2, CheckSquare, Square } from 'lucide-react';

interface AdminOrdersClientProps {
  initialOrders: Order[];
  initialTotal?: number;
  initialPage?: number;
  initialLimit?: number;
  initialTotalPages?: number;
}

export default function AdminOrdersClient({
  initialOrders,
  initialTotal,
  initialPage,
  initialLimit,
  initialTotalPages,
}: AdminOrdersClientProps) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [page, setPage] = useState(initialPage || 1);
  const [limit] = useState(initialLimit || 50);
  const [total, setTotal] = useState(initialTotal ?? initialOrders.length);
  const [totalPages, setTotalPages] = useState(initialTotalPages || 1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchOrders = async (
    targetPage: number,
    currentStatus: string,
    currentSearch: string
  ) => {
    setIsFetching(true);
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

      const res = await fetch(`/api/orders?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        setTotal(data.total ?? 0);
        setPage(data.page ?? targetPage);
        setTotalPages(data.totalPages ?? 1);
        setSelectedIds([]);
      }
    } catch (err) {
      console.error('Failed to fetch paginated orders:', err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    fetchOrders(1, statusFilter, val);
  };

  const handleStatusFilterChange = (val: string) => {
    setStatusFilter(val);
    fetchOrders(1, val, search);
  };

  const allFilteredSelected =
    orders.length > 0 && orders.every((o) => selectedIds.includes(o.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => prev.filter((id) => !orders.some((o) => o.id === id)));
    } else {
      const orderIds = orders.map((o) => o.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...orderIds])));
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleStatusChange = async (
    orderId: string,
    newOrderStatus: Order['orderStatus'],
    newPaymentStatus?: Order['paymentStatus']
  ) => {
    setLoadingId(orderId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderStatus: newOrderStatus,
          paymentStatus: newPaymentStatus,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? data.order : o))
        );
      }
    } catch (e) {
      console.error('Failed to update order status:', e);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteSingleOrder = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete order "${orderNumber}"? This action cannot be undone.`)) {
      return;
    }

    setLoadingId(orderId);
    setFeedback(null);

    try {
      const res = await fetch(`/api/orders?id=${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        setSelectedIds((prev) => prev.filter((id) => id !== orderId));
        setFeedback({
          type: 'success',
          message: `Order ${orderNumber} deleted successfully.`,
        });
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to delete order.',
        });
      }
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: e.message || 'Error occurred while deleting order.',
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmMessage = `WARNING: Are you sure you want to permanently delete ${selectedIds.length} selected order(s)?\n\nThis action is irreversible and will permanently purge the selected order snapshots.`;

    if (!window.confirm(confirmMessage)) return;

    setIsDeletingBulk(true);
    setFeedback(null);

    try {
      const res = await fetch('/api/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();

      if (data.success) {
        const deletedSet = new Set(selectedIds);
        setOrders((prev) => prev.filter((o) => !deletedSet.has(o.id)));
        setFeedback({
          type: 'success',
          message: `${selectedIds.length} order(s) deleted successfully.`,
        });
        setSelectedIds([]);
      } else {
        setFeedback({
          type: 'error',
          message: data.error || 'Failed to delete selected orders.',
        });
      }
    } catch (e: any) {
      setFeedback({
        type: 'error',
        message: e.message || 'Error occurred during bulk order deletion.',
      });
    } finally {
      setIsDeletingBulk(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Order ID, Name, Phone..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-medium focus:outline-none focus:border-[#1b4332]"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-semibold focus:outline-none focus:border-[#1b4332]"
          >
            <option value="ALL">All Order Statuses ({total})</option>
            <option value="NEW">NEW</option>
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="SHIPPED">SHIPPED</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div className="flex items-center gap-4 text-gray-500 font-medium text-right">
          <div>
            Total Recorded Orders: <strong className="text-[#0f2d22]">{total}</strong>
          </div>
        </div>
      </div>

      {/* Bulk Action Bar */}
      <div className="bg-[#FAF8F5] p-4 rounded-xl border border-[#e8e2d5] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleSelectAll}
            className="inline-flex items-center gap-1.5 font-bold text-[#0f2d22] hover:text-[#1b4332]"
          >
            {allFilteredSelected ? (
              <CheckSquare className="w-4 h-4 text-emerald-700" />
            ) : (
              <Square className="w-4 h-4 text-gray-400" />
            )}
            <span>Select Page ({orders.length})</span>
          </button>
          {selectedIds.length > 0 && (
            <span className="bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full font-bold text-[11px]">
              {selectedIds.length} Selected
            </span>
          )}
        </div>

        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={isDeletingBulk}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Selected ({selectedIds.length})</span>
          </button>
        )}
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

      {/* Orders List Cards */}
      <div className="space-y-4">
        {orders.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-[#e8e2d5] text-center text-gray-400 text-xs font-medium">
            {isFetching ? 'Loading orders...' : 'No orders found matching your search or filter.'}
          </div>
        ) : (
          orders.map((ord) => {
            const isSelected = selectedIds.includes(ord.id);
            return (
              <div
                key={ord.id}
                className={`bg-white p-6 rounded-2xl border transition-colors shadow-xs space-y-4 ${
                  isSelected ? 'border-emerald-600 ring-1 ring-emerald-500 bg-[#fcfdfc]' : 'border-[#e8e2d5]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#f5f1e8] pb-3 gap-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSelectOrder(ord.id)}
                      className="text-gray-400 hover:text-emerald-700 focus:outline-none"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-emerald-700" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                    <span className="font-serif-heading font-extrabold text-lg text-[#0f2d22]">
                      {ord.orderNumber}
                    </span>
                    <span className="bg-[#e8f3ed] text-[#1b4332] text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                      {ord.paymentMethod}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-400 font-medium">
                      Recorded: {new Date(ord.createdAt).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSingleOrder(ord.id, ord.orderNumber)}
                      disabled={loadingId === ord.id}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-bold flex items-center gap-1 text-[11px]"
                      title="Delete Order"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-xs">
                  {/* Customer Details */}
                  <div className="md:col-span-5 space-y-2 border-r border-[#f5f1e8] pr-4">
                    <div className="font-bold text-[#0f2d22] text-sm">{ord.customerName}</div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-emerald-800 font-semibold">
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        <span>Mobile: {ord.customerPhone}</span>
                      </div>
                      {ord.customerWhatsapp && (
                        <div className="flex items-center gap-1 text-[#25D366]">
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WA: {ord.customerWhatsapp}</span>
                        </div>
                      )}
                    </div>

                    {ord.customerEmail && (
                      <div className="text-gray-500 text-[11px]">
                        Email: <span className="text-gray-700 font-medium">{ord.customerEmail}</span>
                      </div>
                    )}

                    <div className="bg-[#FAF8F5] p-3 rounded-xl border border-[#e8e2d5] space-y-1 text-gray-700">
                      <div className="font-bold text-[#0f2d22] text-[11px] flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-700" /> Delivery Address
                      </div>
                      {ord.customerHouseShop && (
                        <div className="text-[11px] font-medium text-gray-800">
                          House/Shop: {ord.customerHouseShop}
                        </div>
                      )}
                      <div className="text-[11px] leading-relaxed">
                        {ord.customerAddress}
                      </div>
                      {(ord.customerCity || ord.customerState || ord.customerPincode) && (
                        <div className="text-[11px] font-bold text-emerald-900 pt-0.5">
                          {[ord.customerCity, ord.customerState].filter(Boolean).join(', ')} {ord.customerPincode ? `- ${ord.customerPincode}` : ''}
                        </div>
                      )}
                    </div>

                    {ord.notes && (
                      <div className="text-[11px] bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-amber-900">
                        <strong className="block text-[10px] uppercase tracking-wider text-amber-800 font-bold">Special Notes:</strong>
                        {ord.notes}
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="md:col-span-4 space-y-2 border-r border-[#f5f1e8] pr-4">
                    <div className="font-bold text-[#0f2d22] uppercase tracking-wider text-[10px]">
                      Ordered Items:
                    </div>
                    <ul className="space-y-1.5">
                      {ord.items.map((item, idx) => (
                        <li key={idx} className="flex justify-between font-medium text-gray-800 bg-[#fcfbf7] p-2 rounded-lg border border-gray-100">
                          <div>
                            <div className="font-bold text-[#0f2d22]">{item.productName}</div>
                            <div className="text-[10px] text-gray-500">Qty: {item.quantity} x ₹{item.price}</div>
                          </div>
                          <span className="font-bold text-[#1b4332] text-xs">₹{item.price * item.quantity}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="pt-2 border-t border-[#f5f1e8] space-y-1 text-xs">
                      <div className="flex justify-between text-gray-500">
                        <span>Subtotal:</span>
                        <span>₹{ord.subtotal || ord.totalAmount}</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>Shipping:</span>
                        <span className="text-emerald-700 font-semibold">₹{ord.shippingFee || 0}</span>
                      </div>
                      <div className="flex justify-between font-extrabold text-sm text-[#0f2d22] pt-1 border-t border-gray-200">
                        <span>Total Amount:</span>
                        <span className="text-[#1b4332]">₹{ord.totalAmount}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Controls */}
                  <div className="md:col-span-3 space-y-3 flex flex-col justify-between">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Order Dispatch Status
                      </label>
                      <select
                        value={ord.orderStatus}
                        disabled={loadingId === ord.id}
                        onChange={(e: any) => handleStatusChange(ord.id, e.target.value)}
                        className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-bold text-[#0f2d22] focus:outline-none"
                      >
                        <option value="NEW">NEW</option>
                        <option value="PENDING">PENDING</option>
                        <option value="CONFIRMED">CONFIRMED</option>
                        <option value="PROCESSING">PROCESSING</option>
                        <option value="SHIPPED">SHIPPED</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Payment Status
                      </label>
                      <select
                        value={ord.paymentStatus}
                        disabled={loadingId === ord.id}
                        onChange={(e: any) => handleStatusChange(ord.id, ord.orderStatus, e.target.value)}
                        className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-bold text-[#1b4332] focus:outline-none"
                      >
                        <option value="UNPAID">UNPAID</option>
                        <option value="PENDING">PENDING</option>
                        <option value="PAID">PAID</option>
                        <option value="FAILED">FAILED</option>
                        <option value="REFUNDED">REFUNDED</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="bg-white p-4 rounded-2xl border border-[#e8e2d5] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-gray-500 font-medium">
            Showing <strong>{orders.length > 0 ? (page - 1) * limit + 1 : 0}</strong> - <strong>{Math.min(page * limit, total)}</strong> of <strong>{total}</strong> orders
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isFetching}
              onClick={() => fetchOrders(page - 1, statusFilter, search)}
              className="px-3 py-1.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-bold text-[#0f2d22] hover:bg-[#f5f1e8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="font-bold text-[#0f2d22] px-2">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || isFetching}
              onClick={() => fetchOrders(page + 1, statusFilter, search)}
              className="px-3 py-1.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-bold text-[#0f2d22] hover:bg-[#f5f1e8] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

