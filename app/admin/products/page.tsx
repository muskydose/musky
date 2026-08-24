import React from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import { getAllProductsAdmin } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import AdminProductsClient from './AdminProductsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Manage Products | Musky Dose Admin',
};

export default async function AdminProductsPage() {
  const products = await getAllProductsAdmin();
  const categories = await getCategories();

  return (
    <AdminLayout title="Product Catalog Management">
      <AdminProductsClient initialProducts={products} categories={categories} />
    </AdminLayout>
  );
}
