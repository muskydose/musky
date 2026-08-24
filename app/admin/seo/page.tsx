import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import AdminLayout from '@/components/AdminLayout';
import AdminSeoClient from './AdminSeoClient';
import { getSeoKeywords, getPageSeoConfigs } from '@/lib/db/seo';
import { getProducts } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getPublishedGuides } from '@/lib/db/guides';
import { getCustomPages } from '@/lib/db/custom-pages';
import { getSiteSettings } from '@/lib/db/settings';
import { verifyAdminSessionToken } from '@/lib/auth';

export const metadata = {
  title: 'SEO Keyword Manager & Google Indexing | Musky Dose Admin',
  description: 'Manage SEO keywords, page meta snippets, Search Console verification, and dynamic sitemaps.',
};

export default async function AdminSeoPage() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('md_admin_auth')?.value;

  if (!verifyAdminSessionToken(authCookie)) {
    redirect('/admin/login');
  }

  const [keywords, pageConfigs, products, categories, guides, customPages, siteSettings] = await Promise.all([
    getSeoKeywords(),
    getPageSeoConfigs(),
    getProducts(),
    getCategories(),
    getPublishedGuides(),
    getCustomPages(),
    getSiteSettings(),
  ]);

  return (
    <AdminLayout title="SEO Keyword Manager & Google Indexing">
      <AdminSeoClient
        initialKeywords={keywords}
        initialPageConfigs={pageConfigs}
        products={products}
        categories={categories}
        guides={guides}
        customPages={customPages}
        siteSettings={siteSettings}
      />
    </AdminLayout>
  );
}
