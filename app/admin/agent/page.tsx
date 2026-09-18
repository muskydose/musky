import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import AgentControlCenterClient from './AgentControlCenterClient';
import { AgentStore } from '@/lib/agent/agent-store';

export const dynamic = 'force-dynamic';

export default async function AdminAgentPage() {
  const store = AgentStore.getInstance();
  await store.ensureLoaded();

  const initialState = store.getState();
  const initialTasks = store.getAllTasks();
  const initialMemory = store.getMemoryRecords();
  const initialAudit = store.getAuditLogs(50);

  return (
    <AdminLayout title="Master Agent Control Center">
      <AgentControlCenterClient
        initialState={initialState}
        initialTasks={initialTasks}
        initialMemory={initialMemory}
        initialAudit={initialAudit}
      />
    </AdminLayout>
  );
}

