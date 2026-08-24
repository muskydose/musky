import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { getCustomersPaginated } from '@/lib/db/orders';
import AdminCustomersClient from './AdminCustomersClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Customer Directory | Musky Dose Admin',
};

export default async function AdminCustomersPage() {
  const result = await getCustomersPaginated({ page: 1, limit: 50 });

  return (
    <AdminLayout title="Customer Directory">
      <AdminCustomersClient
        initialCustomers={result.customers}
        initialTotal={result.total}
        initialPage={result.page}
        initialLimit={result.limit}
        initialTotalPages={result.totalPages}
      />
    </AdminLayout>
  );
}
