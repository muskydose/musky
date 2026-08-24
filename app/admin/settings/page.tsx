import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { getSiteSettings } from '@/lib/db/settings';
import AdminSettingsClient from './AdminSettingsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Website Settings | Musky Dose Admin',
};

export default async function AdminSettingsPage() {
  const siteSettings = await getSiteSettings();

  return (
    <AdminLayout title="Website & Business Settings">
      <AdminSettingsClient initialSettings={siteSettings} />
    </AdminLayout>
  );
}
