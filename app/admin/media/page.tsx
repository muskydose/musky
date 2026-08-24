import React from 'react';
import { getSiteSettings } from '@/lib/db/settings';
import { getProducts } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import AdminMediaClient from './AdminMediaClient';

export const metadata = {
  title: 'Media Library — Musky Dose Admin',
  description: 'Manage website image assets, products gallery, and brand uploads.',
};

export default async function AdminMediaPage() {
  const siteSettings = await getSiteSettings();
  const products = await getProducts();
  const categories = await getCategories();

  return (
    <AdminMediaClient
      initialSettings={siteSettings}
      initialProducts={products}
      initialCategories={categories}
    />
  );
}
