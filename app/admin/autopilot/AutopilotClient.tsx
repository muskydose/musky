'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import {
  AutopilotState,
  AutopilotActionRecord,
  LearningPattern,
} from '@/lib/growth/autopilot-engine';
import {
  Play,
  Pause,
  AlertOctagon,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Zap,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Sliders,
  Check,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AutopilotClientProps {
  initialState: AutopilotState;
  initialActions: AutopilotActionRecord[];
  initialPatterns: LearningPattern[];
  initialAuditLogs: any[];
}

export default function AutopilotClient({
  initialState,
  initialActions,
  initialPatterns,
  initialAuditLogs,
}: AutopilotClientProps) {
  const [state, setState] = useState<AutopilotState>(initialState);
  const [actions, setActions] = useState<AutopilotActionRecord[]>(initialActions);
  const [patterns, setPatterns] = useState<LearningPattern[]>(initialPatterns);
  const [auditLogs, setAuditLogs] = useState<any[]>(initialAuditLogs);

  const [activeTab, setActiveTab] = useState<'APPROVAL' | 'ACTIONS' | 'LEARNING' | 'AUDIT'>('APPROVAL');
  const [loading, setLoading] = useState(false);
  const [cycleRunning, setCycleRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);

  const pendingApprovals = actions.filter((a) => a.status === 'PENDING_APPROVAL');
  const autoExecutedActions = actions.filter((a) => a.status === 'AUTO_EXECUTED' || a.status === 'REVERTED' || a.status === 'APPROVED');

  const refreshData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/growth/autopilot');
      const data = await res.json();
      if (data.success) {
        setState(data.state);
        setActions(data.actions);
        setPatterns(data.learningPatterns);
        setAuditLogs(data.auditLogs);
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to refresh autopilot data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRunCycle = async () => {
    setCycleRunning(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/admin/growth/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RUN_CYCLE' }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: data.message || 'Autopilot cycle completed.' });
        await refreshData();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Autopilot cycle failed.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error executing autopilot cycle.' });
    } finally {
      setCycleRunning(false);
    }
  };

  const handleTogglePause = async () => {
    const nextAction = state.isPaused ? 'RESUME' : 'PAUSE';
    try {
      const res = await fetch('/api/admin/growth/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: nextAction }),
      });
      const data = await res.json();
      if (data.success) {
        setState(data.state);
        setStatusMessage({ type: 'success', text: data.message });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to toggle pause state.' });
    }
  };

  const handleToggleKillSwitch = async () => {
    const nextActive = !state.killSwitchActive;
    if (nextActive && !window.confirm('EMERGENCY KILL SWITCH: Immediately freeze all autonomous mutations?')) {
      return;
    }
    try {
      const res = await fetch('/api/admin/growth/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'KILL_SWITCH', active: nextActive }),
      });
      const data = await res.json();
      if (data.success) {
        setState(data.state);
        setStatusMessage({
          type: nextActive ? 'error' : 'success',
          text: data.message,
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to toggle emergency kill switch.' });
    }
  };

  const handleApproveAction = async (actionId: string) => {
    try {
      const res = await fetch('/api/admin/growth/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPROVE', actionId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: data.message });
        await refreshData();
      } else {
        setStatusMessage({ type: 'error', text: data.message || 'Approval failed.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Server error approving action.' });
    }
  };

  const handleRejectAction = async (actionId: string) => {
    try {
      const res = await fetch('/api/admin/growth/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT', actionId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: data.message });
        await refreshData();
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Server error rejecting action.' });
    }
  };

  const handleRollback = async (actionId: string) => {
    if (!window.confirm('Revert this change back to its exact before-snapshot?')) return;
    try {
      const res = await fetch('/api/admin/growth/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ROLLBACK', actionId }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: data.message });
        await refreshData();
      } else {
        setStatusMessage({ type: 'error', text: data.message || 'Rollback failed.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Server error performing rollback.' });
    }
  };

  const handleRollbackLast = async () => {
    if (!window.confirm('Undo the most recent auto-executed safe action?')) return;
    try {
      const res = await fetch('/api/admin/growth/autopilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ROLLBACK_LAST' }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({ type: 'success', text: data.message });
        await refreshData();
      } else {
        setStatusMessage({ type: 'error', text: data.message || 'No action to undo.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Server error performing undo.' });
    }
  };

  return (
    <AdminLayout title="Autonomous Growth Autopilot">
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Top Header Card */}
        <div className="bg-[#0f2d22] text-white p-6 rounded-2xl border border-[#2d6a4f]/40 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1b4332] text-[#c5a059] flex items-center justify-center shadow-sm shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif-heading font-bold text-2xl text-white">
                  Musky Dose True Autopilot
                </h1>
                {state.killSwitchActive ? (
                  <span className="bg-rose-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    EMERGENCY STOPPED
                  </span>
                ) : state.isPaused ? (
                  <span className="bg-amber-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Pause className="w-3 h-3" />
                    PAUSED
                  </span>
                ) : (
                  <span className="bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    RUNNING AUTONOMOUSLY
                  </span>
                )}
              </div>
              <p className="text-xs text-[#b2c8be] mt-0.5">
                Continuous autonomous search optimization, safe metadata enrichment, and low-risk catalog maintenance.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={refreshData}
              disabled={loading || cycleRunning}
              className="p-2.5 bg-[#1b4332] text-[#c5a059] hover:bg-[#2d6a4f] rounded-xl font-bold transition-colors"
              title="Refresh Autopilot"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={handleRunCycle}
              disabled={cycleRunning || state.killSwitchActive}
              className="inline-flex items-center gap-2 bg-[#c5a059] text-[#0f2d22] px-4 py-2.5 rounded-xl text-xs font-bold shadow hover:bg-[#d8b46d] disabled:opacity-50 transition-colors"
            >
              <Play className={`w-4 h-4 ${cycleRunning ? 'animate-spin' : ''}`} />
              <span>{cycleRunning ? 'Running Cycle...' : 'Run Cycle Now'}</span>
            </button>

            <button
              onClick={handleTogglePause}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                state.isPaused
                  ? 'bg-emerald-800/80 text-white border-emerald-500 hover:bg-emerald-700'
                  : 'bg-[#1b4332] text-white border-[#2d6a4f] hover:bg-[#25573e]'
              }`}
            >
              {state.isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{state.isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            <button
              onClick={handleRollbackLast}
              disabled={autoExecutedActions.length === 0}
              className="inline-flex items-center gap-1.5 bg-[#1b4332] text-[#c5a059] border border-[#c5a059]/40 px-3.5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#2d6a4f] disabled:opacity-40"
              title="Undo the most recent auto-executed safe action"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo Last Action</span>
            </button>

            <button
              onClick={handleToggleKillSwitch}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors ${
                state.killSwitchActive
                  ? 'bg-rose-600 text-white border-rose-400 hover:bg-rose-700'
                  : 'bg-rose-900/40 text-rose-300 border-rose-800 hover:bg-rose-900/80'
              }`}
              title="Emergency Stop: Freeze all automated mutations immediately"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>{state.killSwitchActive ? 'Kill Switch Active' : 'Kill Switch'}</span>
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {statusMessage && (
          <div
            className={`p-4 rounded-2xl text-xs flex items-start gap-3 shadow-xs animate-in fade-in duration-200 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-300 text-emerald-900'
                : 'bg-rose-50 border border-rose-300 text-rose-900'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-medium">{statusMessage.text}</div>
            <button onClick={() => setStatusMessage(null)} className="p-1 hover:opacity-75">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 4 Overview Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-[#e8e2d5] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Approvals</span>
              <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-bold text-[#0f2d22] mt-2">{pendingApprovals.length}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">High-risk actions awaiting human sign-off</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e8e2d5] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Auto-Actions Executed</span>
              <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-bold text-[#0f2d22] mt-2">{state.autoActionsCount}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Safe, reversible catalog optimizations</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e8e2d5] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Learning Patterns</span>
              <span className="p-2 rounded-xl bg-blue-50 text-blue-700">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-bold text-[#0f2d22] mt-2">{patterns.length}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Historical winning & failed heuristics</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e8e2d5] shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Next Scheduled Run</span>
              <span className="p-2 rounded-xl bg-purple-50 text-purple-700">
                <Sparkles className="w-4 h-4" />
              </span>
            </div>
            <p className="text-sm font-bold text-[#0f2d22] mt-2 truncate">
              {state.nextScheduledRunAt ? new Date(state.nextScheduledRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Every 4 Hours'}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Last run: {state.lastRunDurationMs ? `${state.lastRunDurationMs}ms` : 'None yet'}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-3 border-b border-[#e8e2d5] pb-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('APPROVAL')}
            className={`pb-2 px-1 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'APPROVAL'
                ? 'border-[#0f2d22] text-[#0f2d22]'
                : 'border-transparent text-gray-500 hover:text-[#0f2d22]'
            }`}
          >
            <span>Approval Queue</span>
            {pendingApprovals.length > 0 && (
              <span className="bg-amber-200 text-amber-900 text-[10px] px-1.5 py-0.2 rounded-full">
                {pendingApprovals.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ACTIONS')}
            className={`pb-2 px-1 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'ACTIONS'
                ? 'border-[#0f2d22] text-[#0f2d22]'
                : 'border-transparent text-gray-500 hover:text-[#0f2d22]'
            }`}
          >
            <span>Auto-Actions History</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full">
              {autoExecutedActions.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('LEARNING')}
            className={`pb-2 px-1 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'LEARNING'
                ? 'border-[#0f2d22] text-[#0f2d22]'
                : 'border-transparent text-gray-500 hover:text-[#0f2d22]'
            }`}
          >
            <span>Winning Patterns & Learning</span>
          </button>

          <button
            onClick={() => setActiveTab('AUDIT')}
            className={`pb-2 px-1 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'AUDIT'
                ? 'border-[#0f2d22] text-[#0f2d22]'
                : 'border-transparent text-gray-500 hover:text-[#0f2d22]'
            }`}
          >
            <span>Audit Log</span>
          </button>
        </div>

        {/* TAB 1: PENDING APPROVAL QUEUE */}
        {activeTab === 'APPROVAL' && (
          <div className="space-y-4">
            {pendingApprovals.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-[#e8e2d5] text-xs text-gray-500 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-bold text-[#0f2d22] text-sm">Approval Queue Clear</p>
                <p>All routine safe actions have run autonomously. No high-risk actions currently require human approval.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.map((action) => (
                  <div
                    key={action.id}
                    className="bg-white p-5 rounded-2xl border border-amber-300 shadow-xs space-y-3"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          {action.actionType}
                        </span>
                        <span className="text-xs font-bold text-[#0f2d22]">
                          Target: {action.entityType} ({action.entityId})
                        </span>
                        <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">
                          HIGH RISK (Approval Required)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleApproveAction(action.id)}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Execute</span>
                        </button>
                        <button
                          onClick={() => handleRejectAction(action.id)}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-gray-700 font-serif bg-amber-50/50 p-3 rounded-xl border border-amber-200/60">
                      <strong>Hypothesis:</strong> {action.hypothesis}
                    </p>

                    {action.actionPayload && (
                      <div className="bg-[#fcfbf7] p-3 rounded-xl border border-[#e8e2d5] text-[11px] space-y-1">
                        <p className="font-bold text-[#0f2d22]">Proposed Content / Payload:</p>
                        <pre className="text-gray-600 overflow-x-auto whitespace-pre-wrap font-mono text-[10px]">
                          {JSON.stringify(action.actionPayload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AUTO-ACTIONS HISTORY & ROLLBACK */}
        {activeTab === 'ACTIONS' && (
          <div className="space-y-4">
            {autoExecutedActions.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-[#e8e2d5] text-xs text-gray-500">
                No automated actions executed yet. Click &quot;Run Cycle Now&quot; to begin.
              </div>
            ) : (
              <div className="space-y-3">
                {autoExecutedActions.map((action) => {
                  const isExpanded = expandedActionId === action.id;
                  return (
                    <div
                      key={action.id}
                      className={`bg-white rounded-2xl border p-5 transition-all ${
                        action.status === 'REVERTED'
                          ? 'border-gray-300 opacity-70 bg-gray-50'
                          : 'border-[#e8e2d5] shadow-xs'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              action.status === 'REVERTED'
                                ? 'bg-gray-200 text-gray-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {action.status}
                          </span>
                          <span className="font-bold text-[#0f2d22] text-xs">{action.actionType}</span>
                          <span className="text-[11px] text-gray-500">
                            on {action.entityType}: {action.entityId}
                          </span>
                          <span className="text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded font-bold">
                            Confidence: {((action.confidenceScore || 0.8) * 100).toFixed(0)}%
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {action.isRollbackable && action.status !== 'REVERTED' && (
                            <button
                              onClick={() => handleRollback(action.id)}
                              className="bg-[#f5f1e8] hover:bg-rose-50 hover:text-rose-800 text-[#0f2d22] px-3 py-1 rounded-xl text-[11px] font-bold border border-[#e8e2d5] flex items-center gap-1 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3 text-rose-600" />
                              <span>Rollback</span>
                            </button>
                          )}
                          <button
                            onClick={() => setExpandedActionId(isExpanded ? null : action.id)}
                            className="p-1 text-gray-400 hover:text-gray-700"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-gray-700 mt-2 font-serif">{action.hypothesis}</p>

                      {isExpanded && (
                        <div className="mt-4 pt-3 border-t border-[#e8e2d5] grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                            <p className="font-bold text-gray-700 mb-1">Before Snapshot (Baseline):</p>
                            <pre className="text-gray-600 font-mono text-[10px] whitespace-pre-wrap">
                              {JSON.stringify(action.baseline, null, 2)}
                            </pre>
                          </div>
                          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200">
                            <p className="font-bold text-emerald-900 mb-1">Action Payload (Applied):</p>
                            <pre className="text-emerald-800 font-mono text-[10px] whitespace-pre-wrap">
                              {JSON.stringify(action.actionPayload, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LEARNING PATTERNS */}
        {activeTab === 'LEARNING' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-blue-900">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Autonomous Self-Improvement Heuristics</span>
              </p>
              <p>
                Every action records baseline performance and monitors subsequent 7d, 14d, and 30d real Google Search Console shifts. Winning strategies receive a positive weight modifier to prioritize similar catalog improvements.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patterns.map((p) => (
                <div key={p.id} className="bg-white p-5 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        p.patternType === 'WINNING'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {p.patternType} PATTERN
                    </span>
                    <span className="text-xs font-bold text-gray-500">
                      Sample: {p.sampleSize} actions
                    </span>
                  </div>

                  <p className="text-xs font-serif text-[#0f2d22] font-medium leading-relaxed">
                    {p.patternDescription}
                  </p>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-[#e8e2d5]/60 text-gray-600">
                    <span>
                      Success Rate: <strong>{(p.successRate * 100).toFixed(0)}%</strong>
                    </span>
                    <span>
                      Avg Impact: <strong>+{p.avgImpactPct}%</strong>
                    </span>
                    <span className="bg-[#f5f1e8] px-2 py-0.5 rounded text-[#0f2d22] font-bold">
                      Weight: {p.weightModifier}x
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOG */}
        {activeTab === 'AUDIT' && (
          <div className="bg-white rounded-2xl border border-[#e8e2d5] overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#e8e2d5] font-bold text-xs text-[#0f2d22]">
              Autopilot Execution & Governance Audit Log
            </div>
            <div className="divide-y divide-[#e8e2d5] text-xs">
              {auditLogs.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No autopilot audit events recorded yet.</div>
              ) : (
                auditLogs.map((log, idx) => (
                  <div key={idx} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0f2d22]">{log.action}</span>
                        <span className="text-[10px] text-gray-500">{log.resource}</span>
                      </div>
                      {log.details && (
                        <p className="text-[11px] text-gray-600 mt-0.5 font-mono">
                          {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {log.createdAt ? new Date(log.createdAt).toLocaleString() : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

