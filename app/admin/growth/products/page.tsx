import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';
import { Package, TrendingUp, AlertCircle, ShoppingBag } from 'lucide-react';
import { getProductPerformance, getProductMarketMatrix } from '@/lib/growth/analytics';

export const dynamic = 'force-dynamic';

export default async function GrowthProductsPage() {
  const products = await getProductPerformance();
  const matrix = await getProductMarketMatrix();

  return (
    <AdminLayout title="Growth AI — Product Intelligence">
      <div className="space-y-6">
        <div>
          <h1 className="font-serif-heading text-2xl font-bold text-[#0f2d22]">
            Product Performance & Regional Demand
          </h1>
          <p className="text-xs text-[#626c66] mt-0.5">
            Regional product velocity and matrix analysis derived strictly from verified store sales history
          </p>
        </div>

        {/* Product Performance Table */}
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif-heading font-bold text-base text-[#0f2d22] flex items-center gap-2">
              <Package className="w-5 h-5 text-[#1b4332]" />
              <span>Verified Product Sales & Status ({products.length})</span>
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e8e2d5] bg-[#faf8f5] text-gray-600 font-bold uppercase">
                  <th className="p-3">Product Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 text-right">Price</th>
                  <th className="p-3 text-right">Units Sold</th>
                  <th className="p-3 text-right">Revenue</th>
                  <th className="p-3 text-right">Orders</th>
                  <th className="p-3">Top Sales State</th>
                  <th className="p-3">Growth Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e2d5]">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-gray-500 italic">
                      No product sales recorded in store history.
                    </td>
                  </tr>
                ) : (
                  products.map((p) => (
                    <tr key={p.id} className="hover:bg-[#fdfbf7]">
                      <td className="p-3 font-bold text-[#0f2d22]">{p.name}</td>
                      <td className="p-3 text-gray-600">{p.category}</td>
                      <td className="p-3 text-right text-gray-700 font-medium">₹{p.price.toLocaleString()}</td>
                      <td className="p-3 text-right font-bold text-[#0f2d22]">{p.unitsSold}</td>
                      <td className="p-3 text-right font-extrabold text-[#1b4332]">₹{p.revenue.toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-700">{p.ordersCount}</td>
                      <td className="p-3 text-gray-800 font-medium">{p.topState}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            p.growthStatus === 'Growing'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {p.growthStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product x Market Matrix */}
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs">
          <h3 className="font-serif-heading font-bold text-base text-[#0f2d22] mb-3 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#1b4332]" />
            <span>Product × Regional Market Matrix</span>
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Cross-tabulation of product sales velocity mapped directly to customer delivery states
          </p>

          {matrix.cells.length === 0 ? (
            <p className="text-xs text-gray-500 py-4 italic text-center">
              No product state mapping available yet. Orders with customer delivery state will appear here automatically.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#e8e2d5] bg-[#faf8f5] text-gray-600 font-bold uppercase">
                    <th className="p-3">Product Name</th>
                    <th className="p-3">State</th>
                    <th className="p-3 text-right">Units Sold</th>
                    <th className="p-3 text-right">Revenue</th>
                    <th className="p-3 text-right">Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e2d5]">
                  {matrix.cells.map((cell, idx) => (
                    <tr key={`${cell.productId}_${cell.state}_${idx}`} className="hover:bg-[#fdfbf7]">
                      <td className="p-3 font-bold text-[#0f2d22]">{cell.productName}</td>
                      <td className="p-3 font-semibold text-[#1b4332]">{cell.state}</td>
                      <td className="p-3 text-right font-bold text-[#0f2d22]">{cell.unitsSold}</td>
                      <td className="p-3 text-right font-extrabold text-[#1b4332]">₹{cell.revenue.toLocaleString()}</td>
                      <td className="p-3 text-right text-gray-700">{cell.ordersCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
