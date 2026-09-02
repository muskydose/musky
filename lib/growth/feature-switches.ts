/**
 * MUSKY DOSE GROWTH ENGINE — FEATURE SWITCHBOARD
 * Central control for Growth Engine subsystems:
 * 1. Growth Engine core
 * 2. Google Search Console Sync
 * 3. Action Execution Layer
 */

let runtimeActionExecutionOverride: boolean | null = null;
let runtimeGrowthEngineOverride: boolean | null = null;
let runtimeGscSyncOverride: boolean | null = null;

export function isGrowthEngineEnabled(): boolean {
  if (runtimeGrowthEngineOverride !== null) return runtimeGrowthEngineOverride;
  const envVal = process.env.GROWTH_ENGINE_ENABLED || process.env.NEXT_PUBLIC_GROWTH_ENGINE_ENABLED;
  if (envVal === 'false' || envVal === '0') return false;
  return true;
}

export function isGscSyncEnabled(): boolean {
  if (runtimeGscSyncOverride !== null) return runtimeGscSyncOverride;
  const envVal = process.env.GROWTH_GSC_SYNC_ENABLED || process.env.NEXT_PUBLIC_GROWTH_GSC_SYNC_ENABLED;
  if (envVal === 'false' || envVal === '0') return false;
  return true;
}

export function isActionExecutionEnabled(): boolean {
  if (runtimeActionExecutionOverride !== null) return runtimeActionExecutionOverride;
  const envVal = process.env.GROWTH_ACTION_EXECUTION_ENABLED || process.env.NEXT_PUBLIC_GROWTH_ACTION_EXECUTION_ENABLED;
  if (envVal === 'false' || envVal === '0') return false;
  return true;
}

export function setActionExecutionRuntimeSwitch(enabled: boolean | null): void {
  runtimeActionExecutionOverride = enabled;
}

export const setActionExecutionEnabled = setActionExecutionRuntimeSwitch;

export function setGrowthEngineRuntimeSwitch(enabled: boolean | null): void {
  runtimeGrowthEngineOverride = enabled;
}

export function setGscSyncRuntimeSwitch(enabled: boolean | null): void {
  runtimeGscSyncOverride = enabled;
}

