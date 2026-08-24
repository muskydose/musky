import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { getPaymentSettings } from '@/lib/db/settings';
import AdminPaymentsClient from './AdminPaymentsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Payment Gateway Architecture | Musky Dose Admin',
};

export default async function AdminPaymentsPage() {
  const paymentSettings = await getPaymentSettings();

  return (
    <AdminLayout title="Payment System Architecture & Feature Toggle">
      <AdminPaymentsClient initialPaymentSettings={paymentSettings} />
    </AdminLayout>
  );
}
