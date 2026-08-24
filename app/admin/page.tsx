import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AdminLayout from '@/components/AdminLayout';
import { getAllProductsAdmin } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getOrders } from '@/lib/db/orders';
import { getPaymentSettings, getSiteSettings } from '@/lib/db/settings';
import {
  Package,
  ShoppingBag,
  FolderTree,
  CreditCard,
  Plus,
  ArrowRight,
  MessageCircle,
  Clock,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  Edit,
  Tag,
  PhoneCall,
  Sliders,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Admin Dashboard | Musky Dose',
};

export default async function AdminDashboardPage() {
  const allProducts = await getAllProductsAdmin();
  const categories = await getCategories();
  const orders = await getOrders();
  const paymentSettings = await getPaymentSettings();
  const siteSettings = await getSiteSettings();

  const activeProducts = allProducts.filter((p) => p.isActive !== false);
  const inactiveProducts = allProducts.filter((p) => p.isActive === false);
  const featuredProducts = allProducts.filter((p) => p.isFeatured);
  const outOfStockProducts = allProducts.filter(
    (p) => p.stockStatus === 'out_of_stock'
  );

  const activeCategories = categories.filter((c) => c.isActive !== false);
  const inactiveCategories = categories.filter((c) => c.isActive === false);

  const totalRevenue = orders
    .filter((o) => o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <AdminLayout title="Dashboard Overview">
      {/* Top Banner Alert on Online Payment Architecture Status */}
      <div className="bg-white p-5 rounded-2xl border border-[#e8e2d5] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
                Active Ordering Mode: WhatsApp Orders
              </h3>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                ONLINE PAYMENT = OFF
              </span>
            </div>
            <p className="text-xs text-[#626c66] mt-0.5">
              Online Payment Gateway architecture is configured and ready for future deployment, but currently strictly disabled. All orders redirect to WhatsApp ({siteSettings.whatsappNumber || '918233703080'}).
            </p>
          </div>
        </div>

        <Link
          href="/admin/payments"
          className="inline-flex items-center gap-1.5 bg-[#1b4332] text-white px-4 py-2 rounded-xl font-bold text-xs shadow hover:bg-[#0f2d22] shrink-0"
        >
          <CreditCard className="w-4 h-4" />
          <span>Payment Toggle Settings</span>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Products Metric Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#626c66] uppercase tracking-wider">
              Total Products
            </p>
            <h3 className="font-serif-heading text-3xl font-extrabold text-[#0f2d22] mt-1">
              {allProducts.length}
            </h3>
            <div className="flex items-center gap-2 text-[11px] font-medium mt-1">
              <span className="text-emerald-700">{activeProducts.length} Active</span>
              <span className="text-gray-400">•</span>
              <span className="text-amber-700">{featuredProducts.length} Featured</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#e8f3ed] text-[#1b4332] flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Orders Metric Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#626c66] uppercase tracking-wider">
              WhatsApp Enquiries
            </p>
            <h3 className="font-serif-heading text-3xl font-extrabold text-[#0f2d22] mt-1">
              {orders.length}
            </h3>
            <p className="text-[11px] text-amber-700 font-medium mt-1">
              {orders.filter((o) => o.orderStatus === 'NEW').length} New Enquiries
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#e8f3ed] text-[#25D366] flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* Categories Metric Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#626c66] uppercase tracking-wider">
              Categories
            </p>
            <h3 className="font-serif-heading text-3xl font-extrabold text-[#0f2d22] mt-1">
              {categories.length}
            </h3>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              {activeCategories.length} Active Categories
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#faf5e8] text-[#c5a059] flex items-center justify-center">
            <FolderTree className="w-6 h-6" />
          </div>
        </div>

        {/* Inventory Stock Metric Card */}
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#626c66] uppercase tracking-wider">
              Stock Status
            </p>
            <h3 className="font-serif-heading text-3xl font-extrabold text-[#0f2d22] mt-1">
              {allProducts.length - outOfStockProducts.length} <span className="text-sm font-normal text-gray-500">In Stock</span>
            </h3>
            <p className="text-[11px] text-rose-700 font-medium mt-1">
              {outOfStockProducts.length} Out of Stock
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#e8f3ed] text-[#1b4332] flex items-center justify-center">
            <Tag className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Growth AI Intelligence Banner */}
      <div className="bg-[#0f2d22] text-white p-6 rounded-2xl border border-[#2d6a4f]/40 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-[#1b4332] text-[#c5a059] shrink-0 mt-0.5">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif-heading font-bold text-xl text-white">
                Musky Growth AI — Micro Market Intelligence
              </h3>
              <span className="bg-emerald-800 text-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded border border-emerald-600">
                ACTIVE DATA ENGINE
              </span>
            </div>
            <p className="text-xs text-[#b2c8be] mt-1 max-w-2xl">
              Real-data market opportunity scoring, regional demand heatmaps, wholesale lead management, and evidence-backed growth recommendations.
            </p>
          </div>
        </div>

        <Link
          href="/admin/growth"
          className="inline-flex items-center gap-1.5 bg-[#c5a059] text-[#0f2d22] px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs hover:bg-[#d4af66] shrink-0"
        >
          <span>Open Growth AI Center</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Quick Action Shortcuts & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions (Col-2) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif-heading text-lg font-bold text-[#0f2d22]">
              Quick Admin Shortcuts
            </h3>
            <Link href="/" target="_blank" className="text-xs font-bold text-[#1b4332] hover:underline flex items-center gap-1">
              <span>View Live Website</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#c5a059]" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-bold">
            <Link
              href="/admin/products/new"
              className="p-4 rounded-xl bg-[#f5f1e8] hover:bg-[#1b4332] hover:text-white text-[#0f2d22] flex items-center gap-2.5 transition-all border border-[#e8e2d5] group"
            >
              <div className="p-1.5 rounded-lg bg-[#1b4332] text-[#c5a059] group-hover:bg-[#c5a059] group-hover:text-[#0f2d22]">
                <Plus className="w-4 h-4" />
              </div>
              <span>Add Product</span>
            </Link>

            <Link
              href="/admin/products"
              className="p-4 rounded-xl bg-[#f5f1e8] hover:bg-[#1b4332] hover:text-white text-[#0f2d22] flex items-center gap-2.5 transition-all border border-[#e8e2d5] group"
            >
              <div className="p-1.5 rounded-lg bg-[#1b4332] text-[#c5a059] group-hover:bg-[#c5a059] group-hover:text-[#0f2d22]">
                <Package className="w-4 h-4" />
              </div>
              <span>Manage Products</span>
            </Link>

            <Link
              href="/admin/categories"
              className="p-4 rounded-xl bg-[#f5f1e8] hover:bg-[#1b4332] hover:text-white text-[#0f2d22] flex items-center gap-2.5 transition-all border border-[#e8e2d5] group"
            >
              <div className="p-1.5 rounded-lg bg-[#1b4332] text-[#c5a059] group-hover:bg-[#c5a059] group-hover:text-[#0f2d22]">
                <FolderTree className="w-4 h-4" />
              </div>
              <span>Manage Categories</span>
            </Link>

            <Link
              href="/admin/settings"
              className="p-4 rounded-xl bg-[#f5f1e8] hover:bg-[#1b4332] hover:text-white text-[#0f2d22] flex items-center gap-2.5 transition-all border border-[#e8e2d5] group"
            >
              <div className="p-1.5 rounded-lg bg-[#1b4332] text-[#c5a059] group-hover:bg-[#c5a059] group-hover:text-[#0f2d22]">
                <Sliders className="w-4 h-4" />
              </div>
              <span>Website Settings</span>
            </Link>

            <Link
              href="/admin/orders"
              className="p-4 rounded-xl bg-[#f5f1e8] hover:bg-[#1b4332] hover:text-white text-[#0f2d22] flex items-center gap-2.5 transition-all border border-[#e8e2d5] group"
            >
              <div className="p-1.5 rounded-lg bg-[#1b4332] text-[#c5a059] group-hover:bg-[#c5a059] group-hover:text-[#0f2d22]">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span>Orders Log</span>
            </Link>

            <Link
              href="/admin/payments"
              className="p-4 rounded-xl bg-[#f5f1e8] hover:bg-[#1b4332] hover:text-white text-[#0f2d22] flex items-center gap-2.5 transition-all border border-[#e8e2d5] group"
            >
              <div className="p-1.5 rounded-lg bg-[#1b4332] text-[#c5a059] group-hover:bg-[#c5a059] group-hover:text-[#0f2d22]">
                <CreditCard className="w-4 h-4" />
              </div>
              <span>Payment Mode</span>
            </Link>
          </div>
        </div>

        {/* Website & Store Status (Col-1) */}
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-4">
          <h3 className="font-serif-heading text-lg font-bold text-[#0f2d22]">
            Store System Status
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#fcfbf7] border border-[#e8e2d5]">
              <span className="font-medium text-[#626c66]">WhatsApp Order System:</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                ACTIVE
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#fcfbf7] border border-[#e8e2d5]">
              <span className="font-medium text-[#626c66]">WhatsApp Number:</span>
              <span className="font-mono font-bold text-[#0f2d22]">
                +{siteSettings.whatsappNumber || '918233703080'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#fcfbf7] border border-[#e8e2d5]">
              <span className="font-medium text-[#626c66]">Online Gateway Mode:</span>
              <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                OFF (Disabled)
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-[#fcfbf7] border border-[#e8e2d5]">
              <span className="font-medium text-[#626c66]">Store Origin:</span>
              <span className="font-bold text-[#0f2d22]">Sojat, Rajasthan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Catalog & Recent Products Summary Table */}
      <div className="bg-white rounded-2xl border border-[#e8e2d5] shadow-xs overflow-hidden">
        <div className="p-6 border-b border-[#e8e2d5] flex items-center justify-between">
          <div>
            <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22]">
              Recent Product Catalog Overview
            </h3>
            <p className="text-xs text-[#626c66]">
              {allProducts.length} Total products in database ({activeProducts.length} active, {inactiveProducts.length} inactive)
            </p>
          </div>
          <Link
            href="/admin/products"
            className="text-xs font-bold text-[#1b4332] hover:underline flex items-center gap-1"
          >
            <span>Manage All Products</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f5f1e8] text-[#0f2d22] uppercase tracking-wider text-[10px] font-bold border-b border-[#e8e2d5]">
                <th className="p-4">Product</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">SKU / Weight</th>
                <th className="p-4">Stock</th>
                <th className="p-4">Visibility</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f1e8] text-[#2b302c]">
              {allProducts.slice(0, 5).map((prod) => (
                <tr key={prod.id} className="hover:bg-[#fcfbf7]">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-[#e8e2d5] shrink-0 bg-[#f5f1e8]">
                        <Image
                          src={prod.images?.[0] || '/images/fallback.svg'}
                          alt={prod.name}
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <div className="font-bold text-[#0f2d22] flex items-center gap-1.5">
                          <span>{prod.name}</span>
                          {prod.isFeatured && (
                            <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded">
                              Featured
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono">{prod.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-medium text-[#0f2d22]">{prod.categoryName || 'Henna'}</td>
                  <td className="p-4 font-extrabold text-[#1b4332]">₹{prod.price}</td>
                  <td className="p-4 text-gray-600">
                    <div>{prod.quantityOrWeight || 'Standard'}</div>
                    {prod.sku && <div className="text-[10px] font-mono text-gray-400">SKU: {prod.sku}</div>}
                  </td>
                  <td className="p-4">
                    {prod.stockStatus === 'out_of_stock' ? (
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Out of Stock
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        In Stock
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        prod.isActive !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {prod.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/admin/products/${prod.id}`}
                      className="inline-flex items-center gap-1 text-[#1b4332] hover:text-[#0f2d22] font-bold text-xs"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Orders Log Table */}
      <div className="bg-white rounded-2xl border border-[#e8e2d5] shadow-xs overflow-hidden">
        <div className="p-6 border-b border-[#e8e2d5] flex items-center justify-between">
          <div>
            <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22]">
              Recent Orders Log
            </h3>
            <p className="text-xs text-[#626c66]">WhatsApp orders recorded from customer enquiries ({orders.length} total)</p>
          </div>
          <Link
            href="/admin/orders"
            className="text-xs font-bold text-[#1b4332] hover:underline flex items-center gap-1"
          >
            <span>View All ({orders.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f5f1e8] text-[#0f2d22] uppercase tracking-wider text-[10px] font-bold border-b border-[#e8e2d5]">
                <th className="p-4">Order ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Items</th>
                <th className="p-4">Total</th>
                <th className="p-4">Status</th>
                <th className="p-4">Payment</th>
                <th className="p-4">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f1e8] text-[#2b302c]">
              {orders.slice(0, 5).map((ord) => (
                <tr key={ord.id} className="hover:bg-[#fcfbf7]">
                  <td className="p-4 font-bold text-[#0f2d22]">{ord.orderNumber}</td>
                  <td className="p-4">
                    <div className="font-semibold">{ord.customerName}</div>
                    <div className="text-[11px] text-gray-500">{ord.customerPhone}</div>
                  </td>
                  <td className="p-4 max-w-xs truncate">
                    {ord.items.map((i) => `${i.productName} (${i.quantity})`).join(', ')}
                  </td>
                  <td className="p-4 font-extrabold text-[#1b4332]">₹{ord.totalAmount}</td>
                  <td className="p-4">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full">
                      {ord.orderStatus}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="bg-[#faf5e8] text-[#0f2d22] text-[10px] font-bold px-2 py-0.5 rounded border border-[#c5a059]">
                      {ord.paymentMethod} ({ord.paymentStatus})
                    </span>
                  </td>
                  <td className="p-4 text-[11px] text-gray-500">
                    {new Date(ord.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

