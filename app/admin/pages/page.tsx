import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import AdminLayout from '@/components/AdminLayout';
import AdminPagesClient from './AdminPagesClient';
import { getCustomPages } from '@/lib/db/custom-pages';
import { getProducts } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';

export const metadata = {
  title: 'Custom Pages CMS | Musky Dose Admin',
  description: 'Manage custom content pages and customer landing experiences.',
};

export default async function AdminPagesServerPage() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('md_admin_auth');

  if (!authCookie || authCookie.value !== 'true') {
    redirect('/admin/login');
  }

  const [pages, products, categories] = await Promise.all([
    getCustomPages(),
    getProducts(),
    getCategories(),
  ]);

  return (
    <AdminLayout title="Custom Pages CMS">
      <AdminPagesClient initialPages={pages} products={products} categories={categories} />
    </AdminLayout>
  );
}
