import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import GuardianDashboardClient from './GuardianDashboardClient';

export const dynamic = 'force-dynamic';

export default function AdminGuardianPage() {
  return (
    <AdminLayout title="Website Guardian">
      <GuardianDashboardClient />
    </AdminLayout>
  );
}

