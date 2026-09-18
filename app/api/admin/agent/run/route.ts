// ============================================================================
// MUSKY DOSE — MASTER AGENT RUN (TRIGGER TICK) API
// Executes one or more cycles of the autonomous orchestrator
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { MuskyDoseMasterAgent } from '@/lib/agent/master-agent';
import { AgentStore } from '@/lib/agent/agent-store';
import { sanitizeAdminError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const agent = MuskyDoseMasterAgent.getInstance();
    const store = AgentStore.getInstance();

    const summary = await agent.tick();
    await store.ensureLoaded();

    return NextResponse.json({
      success: true,
      summary,
      state: store.getState(),
      tasks: store.getAllTasks(),
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'POST /api/admin/agent/run');
  }
}

