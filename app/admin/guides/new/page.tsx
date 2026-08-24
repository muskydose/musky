import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { getProducts } from '@/lib/db/products';
import GuideFormClient from '../GuideFormClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Create New Guide | Musky Dose Admin',
};

export default async function NewGuidePage() {
  const products = await getProducts();

  return (
    <AdminLayout title="Create Product Guide">
      <GuideFormClient products={products} />
    </AdminLayout>
  );
}
