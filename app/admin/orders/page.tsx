import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { getOrdersPaginated } from '@/lib/db/orders';
import AdminOrdersClient from './AdminOrdersClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Manage Orders | Musky Dose Admin',
};

export default async function AdminOrdersPage() {
  const result = await getOrdersPaginated({ page: 1, limit: 50 });

  return (
    <AdminLayout title="Orders Log & Dispatch Management">
      <AdminOrdersClient
        initialOrders={result.orders}
        initialTotal={result.total}
        initialPage={result.page}
        initialLimit={result.limit}
        initialTotalPages={result.totalPages}
      />
    </AdminLayout>
  );
}
