import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import AdminLeadsClient from './AdminLeadsClient';

export default function AdminLeadsPage() {
  return (
    <AdminLayout title="Growth AI — Lead Center & Follow-Up Engine">
      <AdminLeadsClient />
    </AdminLayout>
  );
}

