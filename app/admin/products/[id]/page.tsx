import React from 'react';
import { notFound } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import { getProductByIdOrSlug } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
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
  const product = await getProductByIdOrSlug(id);
  if (!product) notFound();

  const categories = await getCategories();

  return (
    <AdminLayout title={`Edit Product: ${product.name}`}>
      <ProductFormClient initialProduct={product} categories={categories} />
    </AdminLayout>
  );
}
