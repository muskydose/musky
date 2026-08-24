'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Product, Category } from '@/lib/types';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Star,
  CheckCircle,
  XCircle,
  ExternalLink,
  Filter,
  X,
  ArrowUpDown,
  CheckSquare,
  Square,
  AlertTriangle,
  FolderTree,
  Tag,
  SlidersHorizontal,
} from 'lucide-react';

interface AdminProductsClientProps {
  initialProducts: Product[];
  categories: Category[];
}

export default function AdminProductsClient({
  initialProducts,
  categories,
}: AdminProductsClientProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all'); // all, active, inactive
  const [featuredFilter, setFeaturedFilter] = useState('all'); // all, featured, not_featured
  const [stockFilter, setStockFilter] = useState('all'); // all, in_stock, out_of_stock, pre_order
  const [sortBy, setSortBy] = useState('updated_recent'); // name_asc, name_desc, price_asc, price_desc, updated_recent, stock_status

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkCategoryTarget, setBulkCategoryTarget] = useState('');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Multi-field filtered and sorted products list
  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          (p.categoryName && p.categoryName.toLowerCase().includes(q))
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      list = list.filter((p) => p.categoryId === categoryFilter);
    }

    // Active filter
    if (activeFilter === 'active') {
      list = list.filter((p) => p.isActive !== false);
    } else if (activeFilter === 'inactive') {
      list = list.filter((p) => p.isActive === false);
    }

    // Featured filter
    if (featuredFilter === 'featured') {
      list = list.filter((p) => p.isFeatured === true);
    } else if (featuredFilter === 'not_featured') {
      list = list.filter((p) => !p.isFeatured);
    }

    // Stock status filter
    if (stockFilter !== 'all') {
      list = list.filter((p) => p.stockStatus === stockFilter);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'stock_status') return (a.stockStatus || '').localeCompare(b.stockStatus || '');
      // default: updated_recent
      return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
    });

    return list;
  }, [products, search, categoryFilter, activeFilter, featuredFilter, stockFilter, sortBy]);

  const hasActiveFilters =
    search !== '' ||
    categoryFilter !== 'all' ||
    activeFilter !== 'all' ||
    featuredFilter !== 'all' ||
    stockFilter !== 'all' ||
    sortBy !== 'updated_recent';

  const clearFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setActiveFilter('all');
    setFeaturedFilter('all');
    setStockFilter('all');
    setSortBy('updated_recent');
  };

  // Checkbox helpers
  const isAllVisibleSelected =
    filteredProducts.length > 0 &&
    filteredProducts.every((p) => selectedIds.includes(p.id));

  const toggleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p.id));
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Single Actions
  const toggleFeatured = async (product: Product) => {
    setLoadingId(product.id);
    try {
      const updated = { ...product, isFeatured: !product.isFeatured };
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) => prev.map((p) => (p.id === product.id ? data.product : p)));
        setFeedback({ message: `"${product.name}" featured status updated`, type: 'success' });
      }
    } catch (e) {
      setFeedback({ message: 'Failed to update product', type: 'error' });
    } finally {
      setLoadingId(null);
    }
  };

  const toggleActive = async (product: Product) => {
    setLoadingId(product.id);
    try {
      const updated = { ...product, isActive: !product.isActive };
      const res = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) => prev.map((p) => (p.id === product.id ? data.product : p)));
        setFeedback({ message: `"${product.name}" visibility updated`, type: 'success' });
      }
    } catch (e) {
      setFeedback({ message: 'Failed to update visibility', type: 'error' });
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        setSelectedIds((prev) => prev.filter((item) => item !== id));
        setFeedback({ message: `"${name}" deleted successfully`, type: 'success' });
      }
    } catch (e) {
      setFeedback({ message: 'Failed to delete product', type: 'error' });
    } finally {
      setLoadingId(null);
    }
  };

  // Bulk Operations
  const handleBulkAction = async (action: string, extraData?: any) => {
    if (selectedIds.length === 0) return;

    if (action === 'delete') {
      if (
        !confirm(
          `WARNING: You are about to permanently delete ${selectedIds.length} selected product(s). Are you sure?`
        )
      ) {
        return;
      }
    }

    setBulkLoading(true);
    try {
      const res = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          productIds: selectedIds,
          ...extraData,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ message: data.message, type: 'success' });

        // Refresh local list state
        if (action === 'activate') {
          setProducts((prev) =>
            prev.map((p) => (selectedIds.includes(p.id) ? { ...p, isActive: true } : p))
          );
        } else if (action === 'deactivate') {
          setProducts((prev) =>
            prev.map((p) => (selectedIds.includes(p.id) ? { ...p, isActive: false } : p))
          );
        } else if (action === 'feature') {
          setProducts((prev) =>
            prev.map((p) => (selectedIds.includes(p.id) ? { ...p, isFeatured: true } : p))
          );
        } else if (action === 'unfeature') {
          setProducts((prev) =>
            prev.map((p) => (selectedIds.includes(p.id) ? { ...p, isFeatured: false } : p))
          );
        } else if (action === 'change_category' && extraData?.categoryId) {
          const targetCat = categories.find((c) => c.id === extraData.categoryId);
          setProducts((prev) =>
            prev.map((p) =>
              selectedIds.includes(p.id)
                ? {
                    ...p,
                    categoryId: extraData.categoryId,
                    categoryName: targetCat?.name || p.categoryName,
                  }
                : p
            )
          );
        } else if (action === 'delete') {
          setProducts((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
          setSelectedIds([]);
        }
      } else {
        setFeedback({ message: data.error || 'Bulk action failed', type: 'error' });
      }
    } catch (e) {
      setFeedback({ message: 'Server error during bulk action', type: 'error' });
    } finally {
      setBulkLoading(false);
      setShowCategoryModal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header & Actions */}
      <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif-heading text-xl font-bold text-[#0f2d22] flex items-center gap-2">
              <span>Catalog Product Management</span>
              <span className="bg-[#e8f3ed] text-[#1b4332] text-xs font-sans px-2.5 py-0.5 rounded-full font-bold">
                {products.length} Products
              </span>
            </h1>
            <p className="text-xs text-[#626c66] mt-0.5">
              Manage product titles, prices, categories, stock, visibility, and batch bulk operations.
            </p>
          </div>

          <Link
            href="/admin/products/new"
            className="inline-flex items-center justify-center gap-2 bg-[#1b4332] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow hover:bg-[#0f2d22] transition-colors shrink-0"
          >
            <Plus className="w-4 h-4 text-[#c5a059]" />
            <span>Add New Product</span>
          </Link>
        </div>

        {/* Deep Filters Control Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-4 border-t border-[#f5f1e8]">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Name, SKU, Slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-medium focus:outline-none focus:border-[#1b4332]"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1b4332]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Visibility Filter */}
          <div>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1b4332]"
            >
              <option value="all">Visibility: All</option>
              <option value="active">Active Only</option>
              <option value="inactive">Hidden / Inactive</option>
            </select>
          </div>

          {/* Featured Filter */}
          <div>
            <select
              value={featuredFilter}
              onChange={(e) => setFeaturedFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1b4332]"
            >
              <option value="all">Featured: All</option>
              <option value="featured">Featured Only</option>
              <option value="not_featured">Non-Featured</option>
            </select>
          </div>

          {/* Stock Filter */}
          <div>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1b4332]"
            >
              <option value="all">Stock: All</option>
              <option value="in_stock">In Stock</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="pre_order">Pre-Order</option>
            </select>
          </div>
        </div>

        {/* Sort & Filter Reset Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#f5f1e8] text-xs">
          <div className="flex items-center gap-2 text-gray-600">
            <span className="font-bold text-[#0f2d22]">
              Showing {filteredProducts.length} of {products.length} Products
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-rose-700 hover:underline font-bold ml-2 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-gray-500 font-medium shrink-0">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-bold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
            >
              <option value="updated_recent">Recently Updated</option>
              <option value="name_asc">Name: A to Z</option>
              <option value="name_desc">Name: Z to A</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="stock_status">Stock Status</option>
            </select>
          </div>
        </div>
      </div>

      {/* Floating / Top Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <div className="bg-[#0f2d22] text-white p-4 rounded-2xl border border-[#1b4332] shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#c5a059] text-[#0f2d22] font-black flex items-center justify-center text-xs">
              {selectedIds.length}
            </div>
            <div>
              <p className="font-bold text-xs text-[#faf5e8]">
                {selectedIds.length} Product(s) Selected for Bulk Operation
              </p>
              <p className="text-[11px] text-emerald-200">
                Choose an action below to update all selected items simultaneously.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <button
              onClick={() => handleBulkAction('activate')}
              disabled={bulkLoading}
              className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              Activate Selected
            </button>

            <button
              onClick={() => handleBulkAction('deactivate')}
              disabled={bulkLoading}
              className="bg-amber-700 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              Deactivate Selected
            </button>

            <button
              onClick={() => handleBulkAction('feature')}
              disabled={bulkLoading}
              className="bg-[#c5a059] hover:bg-[#d4b06a] text-[#0f2d22] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              Feature Selected
            </button>

            <button
              onClick={() => handleBulkAction('unfeature')}
              disabled={bulkLoading}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              Unfeature
            </button>

            <button
              onClick={() => setShowCategoryModal(true)}
              disabled={bulkLoading}
              className="bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              Change Category
            </button>

            <button
              onClick={() => handleBulkAction('delete')}
              disabled={bulkLoading}
              className="bg-rose-700 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              Delete Selected
            </button>

            <button
              onClick={() => setSelectedIds([])}
              className="text-gray-400 hover:text-white px-2 py-1.5 ml-2 text-xs underline"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Product Table Card */}
      <div className="bg-white rounded-2xl border border-[#e8e2d5] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#f5f1e8] text-[#0f2d22] uppercase tracking-wider text-[10px] font-bold border-b border-[#e8e2d5]">
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="w-4 h-4 accent-[#1b4332] cursor-pointer"
                    title="Select All Visible Products"
                  />
                </th>
                <th className="p-4">Product</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Pack Size</th>
                <th className="p-4">SKU</th>
                <th className="p-4 text-center">Featured</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f1e8]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-500 font-medium">
                    No products match your current search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = selectedIds.includes(p.id);
                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-[#f0f7f3]' : 'hover:bg-[#fcfbf7]'
                      }`}
                    >
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectProduct(p.id)}
                          className="w-4 h-4 accent-[#1b4332] cursor-pointer"
                        />
                      </td>

                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-[#e8e2d5]">
                            <Image
                              src={
                                p.images?.[0] ||
                                '/images/fallback.svg'
                              }
                              alt={p.name}
                              fill
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div>
                            <div className="font-serif-heading font-bold text-sm text-[#0f2d22] hover:text-[#1b4332]">
                              <Link href={`/admin/products/${p.id}`}>{p.name}</Link>
                            </div>
                            <div className="text-[10px] text-gray-500 truncate max-w-xs">
                              {p.shortDescription}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 font-semibold text-[#626c66]">
                        {p.categoryName || 'Sojat Herbal'}
                      </td>

                      <td className="p-4 font-extrabold text-[#1b4332]">
                        ₹{p.price}
                        {p.compareAtPrice && (
                          <span className="text-[10px] text-gray-400 line-through ml-1 font-normal">
                            ₹{p.compareAtPrice}
                          </span>
                        )}
                      </td>

                      <td className="p-4 font-medium text-gray-600">{p.quantityOrWeight}</td>

                      <td className="p-4 font-mono text-[11px] text-gray-500">{p.sku}</td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => toggleFeatured(p)}
                          disabled={loadingId === p.id}
                          className={`p-1.5 rounded-md transition-colors ${
                            p.isFeatured
                              ? 'bg-[#faf5e8] text-[#c5a059] border border-[#c5a059]'
                              : 'text-gray-300 hover:text-amber-500'
                          }`}
                          title="Toggle Featured"
                        >
                          <Star className={`w-4 h-4 ${p.isFeatured ? 'fill-[#c5a059]' : ''}`} />
                        </button>
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => toggleActive(p)}
                          disabled={loadingId === p.id}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            p.isActive !== false
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {p.isActive !== false ? 'ACTIVE' : 'HIDDEN'}
                        </button>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/products/${p.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#1b4332] hover:bg-gray-100"
                            title="View Public Product"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>

                          <Link
                            href={`/admin/products/${p.id}`}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                            title="Edit Product"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>

                          <button
                            onClick={() => handleDelete(p.id, p.name)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-[#e8e2d5]">
            <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
              Change Category for {selectedIds.length} Selected Products
            </h3>
            <p className="text-xs text-[#626c66]">
              Select the new category to assign to all selected products:
            </p>

            <select
              value={bulkCategoryTarget}
              onChange={(e) => setBulkCategoryTarget(e.target.value)}
              className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1b4332]"
            >
              <option value="">-- Choose Category --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <div className="flex justify-end gap-3 pt-4 border-t border-[#f5f1e8] text-xs font-bold">
              <button
                type="button"
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!bulkCategoryTarget || bulkLoading}
                onClick={() =>
                  handleBulkAction('change_category', {
                    categoryId: bulkCategoryTarget,
                    categoryName:
                      categories.find((c) => c.id === bulkCategoryTarget)?.name || 'Category',
                  })
                }
                className="bg-[#1b4332] text-white px-5 py-2 rounded-lg hover:bg-[#0f2d22] disabled:opacity-50"
              >
                {bulkLoading ? 'Updating...' : 'Apply Category'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
