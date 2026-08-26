import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { getSiteSettings } from '@/lib/db/settings';
import { getAllProductsAdmin } from '@/lib/db/products';
import { getAllCategoriesAdmin } from '@/lib/db/categories';
import AdminSettingsClient from './AdminSettingsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Website Settings | Musky Dose Admin',
};

export default async function AdminSettingsPage() {
  const [siteSettings, products, categories] = await Promise.all([
    getSiteSettings(),
    getAllProductsAdmin(),
    getAllCategoriesAdmin(),
  ]);

  return (
    <AdminLayout title="Website & Business Settings">
      <AdminSettingsClient
        initialSettings={siteSettings}
        products={products}
        categories={categories}
      />
    </AdminLayout>
  );
}
