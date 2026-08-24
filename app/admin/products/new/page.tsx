import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { getCategories } from '@/lib/db/categories';
import ProductFormClient from '../ProductFormClient';

export const metadata = {
  title: 'Add New Product | Musky Dose Admin',
};

export default async function AddProductPage() {
  const categories = await getCategories();

  return (
    <AdminLayout title="Add New Product">
      <ProductFormClient categories={categories} />
    </AdminLayout>
  );
}
