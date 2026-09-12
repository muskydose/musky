import React from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { getProductByIdOrSlug } from '@/lib/db/products';
import { getAllCategoriesAdmin, getCategories } from '@/lib/db/categories';
import ProductFormClient from '../ProductFormClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Edit Product | Musky Dose Admin',
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductByIdOrSlug(id, true);

  if (!product) {
    return (
      <AdminLayout title="Product Not Found">
        <div className="bg-white rounded-2xl p-8 border border-[#e8e2d5] text-center max-w-md mx-auto my-12 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 font-bold text-lg">
            !
          </div>
          <h2 className="text-xl font-bold text-[#0f2d22] mb-2">Product Not Found</h2>
          <p className="text-xs text-gray-600 mb-6">
            The product with identifier &ldquo;{id}&rdquo; does not exist or has been removed from the catalog.
          </p>
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 bg-[#1b4332] text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-[#0f2d22] transition-colors"
          >
            Back to Products
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const categories = (await getAllCategoriesAdmin().catch(() => [])) || (await getCategories());

  return (
    <AdminLayout title={`Edit Product: ${product.name}`}>
      <ProductFormClient initialProduct={product} categories={categories} />
    </AdminLayout>
  );
}
