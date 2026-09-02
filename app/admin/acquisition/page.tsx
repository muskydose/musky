import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import AcquisitionClient from '@/app/admin/growth/acquisition/AcquisitionClient';

export default function AcquisitionDirectPage() {
  return (
    <AdminLayout title="Growth AI — Lead Acquisition Engine">
      <AcquisitionClient />
    </AdminLayout>
  );
}

