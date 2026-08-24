import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { getProductGuides } from '@/lib/db/guides';
import { getProducts } from '@/lib/db/products';
import AdminGuidesClient from './AdminGuidesClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Product Guides & Blog CMS | Musky Dose Admin',
};

export default async function AdminGuidesPage() {
  const [guides, products] = await Promise.all([
    getProductGuides(),
    getProducts(),
  ]);

  return (
    <AdminLayout title="Product Guides & Sojat Care CMS">
      <AdminGuidesClient initialGuides={guides} products={products} />
    </AdminLayout>
  );
}
