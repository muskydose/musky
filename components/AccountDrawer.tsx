'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useUI } from '@/context/UIContext';
import { useCart } from '@/context/CartContext';
import SideDrawer from '@/components/ui/SideDrawer';
import { Order, Product, SiteSettings } from '@/lib/types';
import {
  User,
  Package,
  MessageCircle,
  Truck,
  ShieldCheck,
  HelpCircle,
  FileText,
  Lock,
  ArrowRight,
  Sparkles,
  Search,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ShoppingBag,
  Calendar,
  MapPin,
  Clock,
  Check,
} from 'lucide-react';
import { trackWhatsAppClick, trackAddToCart } from '@/lib/analytics';
import { getClientSiteSettings } from '@/lib/api-client';
import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';

export default function AccountDrawer() {
  const { isAccountOpen, closeAccount } = useUI();
  const { addToCart, openCart } = useCart();
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [orderQuery, setOrderQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [liveCatalog, setLiveCatalog] = useState<Product[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [reorderingOrderId, setReorderingOrderId] = useState<string | null>(null);
  const [reorderingItemId, setReorderingItemId] = useState<string | null>(null);
  const [reorderFeedback, setReorderFeedback] = useState<{
    id: string;
    message: string;
    isError?: boolean;
  } | null>(null);

  // Load recent orders from localStorage & live catalog on drawer open
  useEffect(() => {
    if (typeof window !== 'undefined' && isAccountOpen) {
      try {
        const saved = localStorage.getItem('musky_recent_orders');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setRecentOrders(parsed);
          }
        }
      } catch (e) {
        console.warn('Failed to parse recent orders from localStorage:', e);
      }

      // Fetch siteSettings to ensure canonical WhatsApp and contact numbers
      getClientSiteSettings().then((s) => {
        if (s) setSiteSettings(s);
      });

      // Fetch live catalog once to get authoritative prices & stock statuses
      fetch('/api/products')
        .then((res) => (res.ok && res.headers.get('content-type')?.includes('application/json') ? res.json() : null))
        .then((data) => {
          if (data?.success && Array.isArray(data.products)) {
            setLiveCatalog(data.products);
          }
        })
        .catch(() => {});
    }
  }, [isAccountOpen]);

  const configuredWhatsApp = getConfiguredWhatsAppNumber(siteSettings) || '918233703080';
  const displayPhone = siteSettings?.displayPhone || '+91 82337 03080';

  const liveProductMap = useMemo(() => {
    const map = new Map<string, Product>();
    liveCatalog.forEach((p) => {
      map.set(p.id, p);
      if (p.slug) map.set(p.slug, p);
    });
    return map;
  }, [liveCatalog]);

  // Extract unique recently purchased items across past orders
  const recentlyPurchasedProducts = useMemo(() => {
    const map = new Map<string, { productId: string; productName: string; price: number; quantity: number }>();
    recentOrders.forEach((o) => {
      if (Array.isArray(o.items)) {
        o.items.forEach((item) => {
          if (!map.has(item.productId)) {
            map.set(item.productId, {
              productId: item.productId,
              productName: item.productName,
              price: item.price,
              quantity: item.quantity || 1,
            });
          }
        });
      }
    });
    return Array.from(map.values());
  }, [recentOrders]);

  const handleTrackOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderQuery.trim()) return;

    setSearching(true);
    const clean = orderQuery.trim();
    trackWhatsAppClick({ source: 'Account Drawer Track Order' });
    closeAccount();

    const message = encodeURIComponent(
      `Hi Musky Dose, I want to track my order. My Phone/Order Number is: ${clean}`
    );
    window.open(`https://wa.me/${configuredWhatsApp}?text=${message}`, '_blank');
    setSearching(false);
  };

  // Reorder single item ("Buy Again")
  const handleBuyAgainItem = async (productId: string, productName: string, defaultQty = 1) => {
    setReorderingItemId(productId);
    setReorderFeedback(null);

    try {
      let liveProd = liveProductMap.get(productId);

      if (!liveProd) {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (data?.products) {
          setLiveCatalog(data.products);
          liveProd = data.products.find((p: Product) => p.id === productId || p.name === productName);
        }
      }

      if (!liveProd || liveProd.stockStatus === 'out_of_stock') {
        setReorderFeedback({
          id: productId,
          message: `${productName} is currently out of stock.`,
          isError: true,
        });
        setReorderingItemId(null);
        return;
      }

      const qty = defaultQty > 0 ? defaultQty : 1;
      addToCart(liveProd, qty);
      trackAddToCart({
        id: liveProd.id,
        name: liveProd.name,
        price: liveProd.price,
        quantity: qty,
      });

      setReorderFeedback({
        id: productId,
        message: `Added ${liveProd.name} (×${qty}) to cart!`,
      });

      setTimeout(() => {
        closeAccount();
        openCart();
        setReorderingItemId(null);
        setReorderFeedback(null);
      }, 750);
    } catch (err: any) {
      setReorderFeedback({
        id: productId,
        message: 'Could not add item to cart. Please try again.',
        isError: true,
      });
      setReorderingItemId(null);
    }
  };

  // Reorder entire order ("Reorder All Items")
  const handleReorderAllItems = async (order: Order) => {
    if (!order.items || order.items.length === 0) return;
    setReorderingOrderId(order.id);
    setReorderFeedback(null);

    try {
      let catalog = liveCatalog;
      if (catalog.length === 0) {
        const res = await fetch('/api/products');
        const data = await res.json();
        catalog = data?.products || [];
        setLiveCatalog(catalog);
      }

      const map = new Map<string, Product>();
      catalog.forEach((p) => {
        map.set(p.id, p);
        if (p.slug) map.set(p.slug, p);
      });

      let addedCount = 0;
      let skippedCount = 0;

      for (const item of order.items) {
        const liveProd = map.get(item.productId);
        if (liveProd && liveProd.stockStatus !== 'out_of_stock') {
          const qty = item.quantity > 0 ? item.quantity : 1;
          addToCart(liveProd, qty);
          trackAddToCart({
            id: liveProd.id,
            name: liveProd.name,
            price: liveProd.price,
            quantity: qty,
          });
          addedCount += qty;
        } else {
          skippedCount++;
        }
      }

      if (addedCount > 0) {
        setReorderFeedback({
          id: order.id,
          message: `Reordered ${addedCount} item(s) to your cart!${
            skippedCount > 0 ? ` (${skippedCount} item unavailable)` : ''
          }`,
        });

        setTimeout(() => {
          closeAccount();
          openCart();
          setReorderingOrderId(null);
          setReorderFeedback(null);
        }, 900);
      } else {
        setReorderFeedback({
          id: order.id,
          message: 'All items in this order are currently out of stock.',
          isError: true,
        });
        setReorderingOrderId(null);
      }
    } catch (err: any) {
      setReorderFeedback({
        id: order.id,
        message: 'Could not reorder items. Please try again.',
        isError: true,
      });
      setReorderingOrderId(null);
    }
  };

  const getStatusBadge = (status?: string) => {
    const s = (status || 'NEW').toUpperCase();
    switch (s) {
      case 'DELIVERED':
        return <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded">DELIVERED</span>;
      case 'SHIPPED':
        return <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded">SHIPPED</span>;
      case 'PROCESSING':
      case 'CONFIRMED':
        return <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded">CONFIRMED</span>;
      case 'CANCELLED':
        return <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2 py-0.5 rounded">CANCELLED</span>;
      default:
        return <span className="bg-emerald-50 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded">RECEIVED</span>;
    }
  };

  return (
    <SideDrawer
      isOpen={isAccountOpen}
      onClose={() => {
        setSelectedOrder(null);
        closeAccount();
      }}
      side="right"
      widthClassName="w-full sm:w-[440px] max-w-full"
      icon={<User className="w-4 h-4 text-[#c5a059]" />}
      title={selectedOrder ? `Order #${selectedOrder.orderNumber || selectedOrder.id.substring(0, 8)}` : 'My Account & Orders'}
      subtitle={selectedOrder ? 'Order summary & repeat purchase' : 'Track orders, repeat purchases & customer support'}
      footer={
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1b4332]" /> Verified Musky Dose Store
          </span>
          <Link
            href="/admin/login"
            onClick={closeAccount}
            className="text-[11px] text-gray-400 hover:text-[#0f2d22] flex items-center gap-1"
          >
            <Lock className="w-3 h-3" />
            <span>Admin Login</span>
          </Link>
        </div>
      }
    >
      {/* VIEW 1: ORDER DETAIL DRILL-DOWN */}
      {selectedOrder ? (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setSelectedOrder(null)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1b4332] hover:text-[#0f2d22] p-1 rounded-md transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to All Orders</span>
          </button>

          {/* Order Header Card */}
          <div className="p-4 rounded-xl bg-white border border-[#e8e2d5] shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase block">Order Number</span>
                <span className="font-mono font-extrabold text-sm text-[#0f2d22]">
                  {selectedOrder.orderNumber || `#${selectedOrder.id.substring(0, 8)}`}
                </span>
              </div>
              {getStatusBadge(selectedOrder.orderStatus)}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div>
                <span className="text-[10px] text-gray-400 block">Placed On</span>
                <span className="font-medium text-[#0f2d22]">
                  {selectedOrder.createdAt ? new Date(selectedOrder.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recent'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block">Total Amount</span>
                <span className="font-bold text-emerald-800 text-sm">
                  ₹{selectedOrder.totalAmount?.toLocaleString('en-IN') || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items with Buy Again */}
          <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-2xs space-y-3">
            <h4 className="font-bold text-xs text-[#0f2d22] uppercase tracking-wider">
              Order Items ({selectedOrder.items?.length || 0})
            </h4>

            <div className="divide-y divide-gray-100">
              {selectedOrder.items?.map((item, idx) => {
                const liveProd = liveProductMap.get(item.productId);
                const isOutOfStock = liveProd?.stockStatus === 'out_of_stock';
                const isItemReordering = reorderingItemId === item.productId;

                return (
                  <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#0f2d22] truncate">{item.productName}</p>
                      <p className="text-[11px] text-gray-500 font-mono">
                        Qty: {item.quantity} • ₹{item.price}/unit
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <button
                        type="button"
                        onClick={() => handleBuyAgainItem(item.productId, item.productName, item.quantity)}
                        disabled={isItemReordering || isOutOfStock}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-2xs transition-all cursor-pointer ${
                          isOutOfStock
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059]'
                        }`}
                      >
                        {isItemReordering ? (
                          <Loader2 className="w-3 h-3 animate-spin text-[#c5a059]" />
                        ) : (
                          <RotateCcw className="w-3 h-3 text-[#c5a059]" />
                        )}
                        <span>{isOutOfStock ? 'Out of Stock' : 'Buy Again'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reorder All Items CTA */}
          <button
            type="button"
            onClick={() => handleReorderAllItems(selectedOrder)}
            disabled={reorderingOrderId === selectedOrder.id}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer active:scale-98"
          >
            {reorderingOrderId === selectedOrder.id ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#c5a059]" />
            ) : (
              <RotateCcw className="w-4 h-4 text-[#c5a059]" />
            )}
            <span>REORDER COMPLETE ORDER</span>
          </button>

          {/* WhatsApp Support for this Order */}
          <div className="p-3 bg-[#0f2d22] rounded-xl text-white space-y-2">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-[#c5a059]" />
              <span className="font-bold text-xs text-[#c5a059]">Need Help with this Order?</span>
            </div>
            <a
              href={`https://wa.me/${configuredWhatsApp}?text=${encodeURIComponent(
                `Hi Musky Dose, I need support with my Order #${selectedOrder.orderNumber || selectedOrder.id}.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick({ source: 'Order Detail Screen' })}
              className="w-full flex items-center justify-center gap-2 py-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-xs rounded-lg transition-all shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Chat with Support on WhatsApp</span>
            </a>
          </div>
        </div>
      ) : (
        /* VIEW 2: ACCOUNT OVERVIEW & RECENT PURCHASES */
        <div className="space-y-4">
          {/* Track Order Input */}
          <div className="bg-white p-3.5 rounded-xl border border-[#e8e2d5] shadow-2xs">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-[#e8f3ed] text-[#1b4332] rounded-lg">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-[#0f2d22]">Track Your Order</h4>
                <p className="text-[10px] text-gray-500">Enter mobile number or order ID</p>
              </div>
            </div>

            <form onSubmit={handleTrackOrder} className="flex gap-1.5 mt-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  placeholder="Mobile number or MD-..."
                  className="w-full pl-8 pr-3 py-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs text-[#0f2d22] placeholder-gray-400 focus:outline-none focus:border-[#1b4332]"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-3 py-2 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] text-xs font-bold rounded-lg shadow-2xs transition-all shrink-0 cursor-pointer active:scale-95"
              >
                Track
              </button>
            </form>
          </div>

          {/* Feedback Toast */}
          {reorderFeedback && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-center gap-2 border ${
                reorderFeedback.isError
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {reorderFeedback.isError ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span className="font-medium">{reorderFeedback.message}</span>
            </div>
          )}

          {/* Recently Purchased Items Row */}
          {recentlyPurchasedProducts.length > 0 && (
            <div className="bg-white p-3.5 rounded-xl border border-[#e8e2d5] shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#c5a059]" />
                  <h4 className="font-bold text-xs text-[#0f2d22]">Recently Purchased</h4>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">Quick Reorder</span>
              </div>

              <div className="space-y-2">
                {recentlyPurchasedProducts.slice(0, 4).map((p) => {
                  const liveProd = liveProductMap.get(p.productId);
                  const isItemReordering = reorderingItemId === p.productId;
                  const isOutOfStock = liveProd?.stockStatus === 'out_of_stock';

                  return (
                    <div
                      key={p.productId}
                      className="p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#0f2d22] truncate">{p.productName}</p>
                        <p className="text-[10px] text-emerald-800 font-mono font-semibold">
                          ₹{liveProd ? liveProd.price : p.price}/unit
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleBuyAgainItem(p.productId, p.productName, p.quantity)}
                        disabled={isItemReordering || isOutOfStock}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10.5px] font-bold transition-all shadow-2xs cursor-pointer active:scale-95 ${
                          isOutOfStock
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059]'
                        }`}
                      >
                        {isItemReordering ? (
                          <Loader2 className="w-3 h-3 animate-spin text-[#c5a059]" />
                        ) : (
                          <RotateCcw className="w-3 h-3 text-[#c5a059]" />
                        )}
                        <span>{isOutOfStock ? 'Out of Stock' : 'Buy Again'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past Orders Section */}
          {recentOrders.length > 0 ? (
            <div className="bg-white p-3.5 rounded-xl border border-[#e8e2d5] shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#1b4332]" />
                  <h4 className="font-bold text-xs text-[#0f2d22]">Order History</h4>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">
                  {recentOrders.length} {recentOrders.length === 1 ? 'Order' : 'Orders'}
                </span>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {recentOrders.map((order) => {
                  const isReordering = reorderingOrderId === order.id;

                  return (
                    <div
                      key={order.id}
                      className="p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg space-y-2 hover:border-[#1b4332]/40 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-[#0f2d22] text-[11px]">
                          {order.orderNumber || `#${order.id.substring(0, 8)}`}
                        </span>
                        {getStatusBadge(order.orderStatus)}
                      </div>

                      {order.items && order.items.length > 0 && (
                        <div className="text-[11px] text-gray-600 space-y-0.5">
                          {order.items.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="flex justify-between truncate">
                              <span className="truncate max-w-[200px]">{item.productName}</span>
                              <span className="font-medium text-gray-400">×{item.quantity}</span>
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <span className="text-[10px] text-gray-400 italic">
                              +{order.items.length - 2} more items
                            </span>
                          )}
                        </div>
                      )}

                      <div className="pt-1 border-t border-gray-200/60 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-800">
                          ₹{order.totalAmount?.toLocaleString('en-IN') || 0}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="px-2 py-1 text-[10.5px] font-semibold text-[#1b4332] hover:underline cursor-pointer"
                          >
                            Details
                          </button>

                          <button
                            type="button"
                            onClick={() => handleReorderAllItems(order)}
                            disabled={isReordering}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] text-[10.5px] font-bold rounded-md shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                            title="Reorder all items into cart"
                          >
                            {isReordering ? (
                              <Loader2 className="w-3 h-3 animate-spin text-[#c5a059]" />
                            ) : (
                              <RotateCcw className="w-3 h-3 text-[#c5a059]" />
                            )}
                            <span>Reorder All</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-6 bg-white rounded-xl border border-[#e8e2d5] text-center space-y-2">
              <Package className="w-8 h-8 text-gray-300 mx-auto" />
              <h4 className="font-bold text-xs text-[#0f2d22]">Your orders will appear here</h4>
              <p className="text-[11px] text-gray-500">When you place an order, it will be saved here for easy repeat ordering.</p>
              <Link
                href="/products"
                onClick={closeAccount}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1b4332] underline hover:text-[#0f2d22] pt-1"
              >
                <span>Start Shopping</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}

          {/* WhatsApp Direct Concierge */}
          <div className="bg-[#0f2d22] p-3.5 rounded-xl text-white shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-[#1b4332] text-[#c5a059] rounded-lg">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#c5a059]">Direct WhatsApp Support</h4>
                  <p className="text-[10px] text-gray-300">Fast help with orders, bulk & custom packs</p>
                </div>
              </div>
            </div>
            <a
              href={`https://wa.me/${configuredWhatsApp}?text=Hi%20Musky%20Dose,%20I%20need%20help%20with%20my%20order.`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackWhatsAppClick({ source: 'Account Drawer Support CTA' })}
              className="w-full flex items-center justify-center gap-2 py-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-xs rounded-lg transition-all shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Chat on WhatsApp ({displayPhone})</span>
            </a>
          </div>

          {/* Quick Account Navigation Links */}
          <div className="space-y-1 bg-white p-2 rounded-xl border border-[#e8e2d5] shadow-2xs">
            <Link
              href="/wholesale"
              onClick={closeAccount}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-[#0f2d22] hover:bg-[#f5f1e8] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#c5a059]" />
                <span>Wholesale & Bulk Enquiries</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            </Link>

            <Link
              href="/shipping-policy"
              onClick={closeAccount}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-[#0f2d22] hover:bg-[#f5f1e8] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-[#1b4332]" />
                <span>Shipping & Delivery Policy</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            </Link>

            <Link
              href="/return-policy"
              onClick={closeAccount}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-[#0f2d22] hover:bg-[#f5f1e8] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#1b4332]" />
                <span>Returns & Refunds Policy</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            </Link>

            <Link
              href="/faq"
              onClick={closeAccount}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-[#0f2d22] hover:bg-[#f5f1e8] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-[#1b4332]" />
                <span>Frequently Asked Questions</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            </Link>

            <Link
              href="/about"
              onClick={closeAccount}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-[#0f2d22] hover:bg-[#f5f1e8] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-[#1b4332]" />
                <span>About Musky Dose & Sojat Heritage</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
            </Link>
          </div>
        </div>
      )}
    </SideDrawer>
  );
}
