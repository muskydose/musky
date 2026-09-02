import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import AdminLeadsClient from '@/app/admin/leads/AdminLeadsClient';

export default function GrowthLeadsPage() {
  return (
    <AdminLayout title="Growth AI — Lead Center & CRM">
      <AdminLeadsClient />
    </AdminLayout>
  );
}
