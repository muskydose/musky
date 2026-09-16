import React from 'react';
import AutopilotClient from './AutopilotClient';
import { getAutopilotState, getAutopilotActions, getLearningPatterns } from '@/lib/growth/autopilot-engine';
import { getAuditLogs } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Autonomous Growth Autopilot | Musky Dose Admin',
  description: 'Continuous autonomous loop for search discovery, safe metadata optimization, and intelligent distribution.',
};

export default async function AutopilotPage() {
  const [initialState, initialActions, initialPatterns, allLogs] = await Promise.all([
    getAutopilotState(),
    getAutopilotActions(50),
    getLearningPatterns(),
    getAuditLogs(20),
  ]);

  const initialAuditLogs = (allLogs || []).filter((log) => log.action?.startsWith('AUTOPILOT_'));

  return (
    <AutopilotClient
      initialState={initialState}
      initialActions={initialActions}
      initialPatterns={initialPatterns}
      initialAuditLogs={initialAuditLogs}
    />
  );
}

