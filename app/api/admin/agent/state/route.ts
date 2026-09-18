// ============================================================================
// MUSKY DOSE — MASTER AGENT STATE & ACTIONS API
// Real-time telemetry, queue pipeline, and owner controls
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { AgentStore } from '@/lib/agent/agent-store';
import { MuskyDoseMasterAgent } from '@/lib/agent/master-agent';
import { SeoIntelligenceStore } from '@/lib/agent/seo-intelligence/seo-store';
import { SeoIntelligenceEngine } from '@/lib/agent/seo-intelligence/seo-intelligence-engine';
import { KeywordUniverseStore } from '@/lib/agent/seo-intelligence/keyword-universe-store';
import { sanitizeAdminError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const store = AgentStore.getInstance();
    await store.ensureLoaded();

    const seoStore = SeoIntelligenceStore.getInstance();
    await seoStore.ensureLoaded();

    const kwStore = KeywordUniverseStore.getInstance();
    await kwStore.ensureLoaded();

    const state = store.getState();
    const tasks = store.getAllTasks();
    const memory = store.getMemoryRecords();
    const audit = store.getAuditLogs(50);
    const seoOpportunities = seoStore.getOpportunities();
    const latestSeoReport = await seoStore.getLatestDailyReport();
    const keywordUniverseSummary = kwStore.getSummaryStats();

    return NextResponse.json({
      success: true,
      state,
      tasks,
      memory,
      audit,
      seoOpportunities,
      latestSeoReport: latestSeoReport || null,
      keywordUniverseSummary,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'GET /api/admin/agent/state');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const agent = MuskyDoseMasterAgent.getInstance();
    const store = AgentStore.getInstance();
    await store.ensureLoaded();

    const action = body?.action;

    switch (action) {
      case 'submit_instruction': {
        const prompt = body?.prompt;
        if (!prompt || typeof prompt !== 'string') {
          return NextResponse.json(
            { success: false, error: 'Valid instruction prompt is required' },
            { status: 400 }
          );
        }
        const objective = await agent.submitInstruction(prompt.trim());
        return NextResponse.json({
          success: true,
          objective,
          state: store.getState(),
          tasks: store.getAllTasks(),
        });
      }

      case 'toggle_autonomous': {
        const isAutonomous = Boolean(body?.isAutonomous);
        const state = await agent.setAutonomous(isAutonomous);
        return NextResponse.json({ success: true, state });
      }

      case 'toggle_pause': {
        const isPaused = Boolean(body?.isPaused);
        const state = await agent.setPaused(isPaused);
        return NextResponse.json({ success: true, state });
      }

      case 'approve_task': {
        const taskId = body?.taskId;
        if (!taskId) {
          return NextResponse.json(
            { success: false, error: 'taskId is required' },
            { status: 400 }
          );
        }
        const task = await agent.approveTask(taskId);
        return NextResponse.json({
          success: true,
          task,
          state: store.getState(),
          tasks: store.getAllTasks(),
        });
      }

      case 'stop_task': {
        await agent.stopCurrentTask();
        return NextResponse.json({
          success: true,
          state: store.getState(),
          tasks: store.getAllTasks(),
        });
      }

      case 'scan_seo': {
        const seoEngine = SeoIntelligenceEngine.getInstance();
        const opps = await seoEngine.detectOpportunities();
        const report = await seoEngine.generateDailySeoBrief();
        const enqueuedTasks = await agent.scanAndEnqueueSeoWork();
        return NextResponse.json({
          success: true,
          seoOpportunities: opps,
          latestSeoReport: report,
          enqueuedTasks,
          state: store.getState(),
          tasks: store.getAllTasks(),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unsupported action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return sanitizeAdminError(error, 'POST /api/admin/agent/state');
  }
}

