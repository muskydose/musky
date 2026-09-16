import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import {
  getAutopilotState,
  getAutopilotActions,
  getLearningPatterns,
  runAutopilotCycle,
  setAutopilotPaused,
  setKillSwitch,
  rollbackAction,
  rollbackLastAction,
  approveQueuedAction,
  rejectQueuedAction,
} from '@/lib/growth/autopilot-engine';
import { getAuditLogs } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const [state, actions, learningPatterns, auditLogs] = await Promise.all([
      getAutopilotState(),
      getAutopilotActions(100),
      getLearningPatterns(),
      getAuditLogs(30),
    ]);

    // Filter audit logs related to autopilot
    const autopilotLogs = (auditLogs || []).filter(
      (log) => log.action?.startsWith('AUTOPILOT_')
    );

    return NextResponse.json({
      success: true,
      state,
      actions,
      learningPatterns,
      auditLogs: autopilotLogs,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'GET /api/admin/growth/autopilot');
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const body = await req.json();
    const { action, actionId, active } = body;

    switch (action) {
      case 'RUN_CYCLE': {
        const summary = await runAutopilotCycle({ force: true });
        const updatedState = await getAutopilotState();
        return NextResponse.json({
          success: true,
          summary,
          state: updatedState,
          message: summary.message,
        });
      }

      case 'PAUSE': {
        const state = await setAutopilotPaused(true);
        return NextResponse.json({
          success: true,
          state,
          message: 'Growth Autopilot is now paused. Automated mutations are suspended.',
        });
      }

      case 'RESUME': {
        const state = await setAutopilotPaused(false);
        return NextResponse.json({
          success: true,
          state,
          message: 'Growth Autopilot resumed. Scheduled cycles will run autonomously.',
        });
      }

      case 'KILL_SWITCH': {
        const state = await setKillSwitch(Boolean(active));
        return NextResponse.json({
          success: true,
          state,
          message: Boolean(active)
            ? 'EMERGENCY KILL SWITCH ACTIVATED! All automated mutations are completely frozen.'
            : 'Emergency kill switch deactivated. Normal operation restored.',
        });
      }

      case 'APPROVE': {
        if (!actionId) {
          return NextResponse.json({ success: false, error: 'actionId is required.' }, { status: 400 });
        }
        const result = await approveQueuedAction(actionId);
        return NextResponse.json(result);
      }

      case 'REJECT': {
        if (!actionId) {
          return NextResponse.json({ success: false, error: 'actionId is required.' }, { status: 400 });
        }
        const result = await rejectQueuedAction(actionId);
        return NextResponse.json(result);
      }

      case 'ROLLBACK': {
        if (!actionId) {
          return NextResponse.json({ success: false, error: 'actionId is required.' }, { status: 400 });
        }
        const result = await rollbackAction(actionId);
        return NextResponse.json(result);
      }

      case 'ROLLBACK_LAST': {
        const result = await rollbackLastAction();
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unrecognized autopilot action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return sanitizeAdminError(error, 'POST /api/admin/growth/autopilot');
  }
}

