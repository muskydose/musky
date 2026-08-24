import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import IndiaHeatmap from '@/components/growth/IndiaHeatmap';
import { getMarketMetrics } from '@/lib/growth/growth-db';

export const dynamic = 'force-dynamic';

export default async function GrowthMapPage() {
  const metrics = await getMarketMetrics();

  return (
    <AdminLayout title="Growth AI — Interactive India Heatmap">
      <IndiaHeatmap metrics={metrics} />
    </AdminLayout>
  );
}
