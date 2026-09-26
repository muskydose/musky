import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import AgentControlCenterClient from './AgentControlCenterClient';
import { AgentStore } from '@/lib/agent/agent-store';
import { SeoIntelligenceStore } from '@/lib/agent/seo-intelligence/seo-store';
import { KeywordUniverseStore } from '@/lib/agent/seo-intelligence/keyword-universe-store';

export const dynamic = 'force-dynamic';

export default async function AdminAgentPage() {
  const store = AgentStore.getInstance();
  await store.ensureLoaded();

  const seoStore = SeoIntelligenceStore.getInstance();
  await seoStore.ensureLoaded();

  const kwStore = KeywordUniverseStore.getInstance();
  await kwStore.ensureLoaded();

  const agent = (await import('@/lib/agent/master-agent')).MuskyDoseMasterAgent.getInstance();
  const initialUnifiedSystemState = await agent.getUnifiedSystemState();

  const initialState = store.getState();
  const initialTasks = store.getAllTasks();
  const initialMemory = store.getMemoryRecords();
  const initialAudit = store.getAuditLogs(50);
  const initialSeoOpportunities = seoStore.getOpportunities();
  const initialSeoReport = await seoStore.getLatestDailyReport();
  const initialKeywordSummary = kwStore.getSummaryStats();

  return (
    <AdminLayout title="Master Agent Control Center">
      <AgentControlCenterClient
        initialState={initialState}
        initialTasks={initialTasks}
        initialMemory={initialMemory}
        initialAudit={initialAudit}
        initialSeoOpportunities={initialSeoOpportunities}
        initialSeoReport={initialSeoReport || null}
        initialKeywordSummary={initialKeywordSummary}
        initialUnifiedSystemState={initialUnifiedSystemState}
      />
    </AdminLayout>
  );
}

