import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { getCategories } from '@/lib/db/categories';
import AdminCategoriesClient from './AdminCategoriesClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Manage Categories | Musky Dose Admin',
};

export default async function AdminCategoriesPage() {
  const categories = await getCategories();

  return (
    <AdminLayout title="Category Management">
      <AdminCategoriesClient initialCategories={categories} />
    </AdminLayout>
  );
}
