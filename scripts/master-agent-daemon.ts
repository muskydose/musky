// ============================================================================
// MUSKY DOSE — AUTONOMOUS MASTER AGENT BACKGROUND DAEMON
// Persistent Server-Side Continuous Worker
// ============================================================================

import { MuskyDoseMasterAgent } from '../lib/agent/master-agent';
import { AgentStore } from '../lib/agent/agent-store';
import { logger } from '../lib/logger';

const SWEEP_INTERVAL_MS = parseInt(process.env.MASTER_AGENT_INTERVAL_MS || '30000', 10); // 30s default
let isRunning = true;
let activeCycle = false;

async function runDaemonLoop() {
  console.log('\n============================================================');
  console.log('🤖 MUSKY DOSE MASTER AGENT PERSISTENT DAEMON INITIALIZING');
  console.log(`Cadence: Every ${SWEEP_INTERVAL_MS / 1000}s`);
  console.log(`Process ID: ${process.pid}`);
  console.log('Autonomous Mode: ACTIVE (Continuous Website Operating System)');
  console.log('============================================================\n');

  const agent = MuskyDoseMasterAgent.getInstance();
  const store = AgentStore.getInstance();

  // Initial durable load
  await store.ensureLoaded(true);

  // Setup graceful termination
  const handleShutdown = async (signal: string) => {
    console.log(`\n[Daemon] Received ${signal}. Gracefully stopping Master Agent daemon...`);
    isRunning = false;
    // Release any lingering locks held by this process
    await store.releaseLock(`daemon-${process.pid}`);
    process.exit(0);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  while (isRunning) {
    if (!activeCycle) {
      activeCycle = true;
      try {
        // Refresh durable state from Supabase
        await store.ensureLoaded(true);
        const state = store.getState();

        if (state.isPaused) {
          console.log(`[Daemon] [${new Date().toLocaleTimeString()}] Agent is paused by owner. Sleeping...`);
        } else {
          // Process batch of tasks or trigger data-driven autonomous sweep
          const summaries = await agent.processQueue(5);
          const executedCount = summaries.filter((s) => !s.idle).length;

          if (executedCount > 0) {
            console.log(
              `[Daemon] [${new Date().toLocaleTimeString()}] Executed ${executedCount} task(s). Last status: ${
                summaries[summaries.length - 1]?.status
              }`
            );
          } else {
            console.log(
              `[Daemon] [${new Date().toLocaleTimeString()}] Autonomous sweep: all systems healthy. Queue idle.`
            );
          }
        }
      } catch (err) {
        logger.error('[Daemon] Error during daemon cycle:', err);
      } finally {
        activeCycle = false;
      }
    }

    // Sleep until next cycle
    await new Promise((resolve) => setTimeout(resolve, SWEEP_INTERVAL_MS));
  }
}

// Start daemon if executed directly
if (require.main === module) {
  runDaemonLoop().catch((err) => {
    console.error('[Daemon] Fatal error:', err);
    process.exit(1);
  });
}

export { runDaemonLoop };

