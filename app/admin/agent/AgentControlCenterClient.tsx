'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Bot,
  Sparkles,
  Send,
  Zap,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  FileCheck,
  Brain,
  ListTodo,
  Activity,
  ChevronRight,
  TrendingUp,
  Search,
  FileText,
  ExternalLink,
} from 'lucide-react';
import {
  MasterAgentState,
  AgentTask,
  AgentMemoryRecord,
  AgentAuditEntry,
  AgentTaskStatus,
} from '@/lib/agent/types';
import { SeoOpportunity, DailySeoBriefReport } from '@/lib/agent/seo-intelligence/types';
import {
  KeywordUniverseEntry,
  KeywordUniverseSummaryStats,
} from '@/lib/agent/seo-intelligence/keyword-universe-types';

interface AgentControlCenterClientProps {
  initialState: MasterAgentState;
  initialTasks: AgentTask[];
  initialMemory: AgentMemoryRecord[];
  initialAudit: AgentAuditEntry[];
  initialSeoOpportunities?: SeoOpportunity[];
  initialSeoReport?: DailySeoBriefReport | null;
  initialKeywordSummary?: KeywordUniverseSummaryStats | null;
}

export default function AgentControlCenterClient({
  initialState,
  initialTasks,
  initialMemory,
  initialAudit,
  initialSeoOpportunities,
  initialSeoReport,
  initialKeywordSummary,
}: AgentControlCenterClientProps) {
  const [state, setState] = useState<MasterAgentState>(initialState);
  const [tasks, setTasks] = useState<AgentTask[]>(initialTasks);
  const [memory, setMemory] = useState<AgentMemoryRecord[]>(initialMemory);
  const [audit, setAudit] = useState<AgentAuditEntry[]>(initialAudit);
  const [seoOpportunities, setSeoOpportunities] = useState<SeoOpportunity[]>(initialSeoOpportunities || []);
  const [seoReport, setSeoReport] = useState<DailySeoBriefReport | null>(initialSeoReport || null);
  const [isScanningSeo, setIsScanningSeo] = useState(false);

  const [keywordSummary, setKeywordSummary] = useState<KeywordUniverseSummaryStats | null>(initialKeywordSummary || null);
  const [keywordItems, setKeywordItems] = useState<KeywordUniverseEntry[]>([]);
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(false);
  const [isSweepingKeywords, setIsSweepingKeywords] = useState(false);
  const [kwSearchQuery, setKwSearchQuery] = useState('');
  const [kwSourceFilter, setKwSourceFilter] = useState<string>('ALL');
  const [kwLanguageFilter, setKwLanguageFilter] = useState<string>('ALL');
  const [kwIntentFilter, setKwIntentFilter] = useState<string>('ALL');
  const [kwClusterFilter, setKwClusterFilter] = useState<string>('ALL');

  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunningCycle, setIsRunningCycle] = useState(false);
  const [activeTab, setActiveTab] = useState<'queue' | 'seo' | 'keywords' | 'memory' | 'audit'>('queue');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null);

  // Poll state every 6 seconds when autonomous mode is on or task is running
  const refreshState = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/agent/state');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setState(data.state);
          setTasks(data.tasks);
          setMemory(data.memory);
          setAudit(data.audit);
          if (data.seoOpportunities) setSeoOpportunities(data.seoOpportunities);
          if (data.latestSeoReport) setSeoReport(data.latestSeoReport);
          if (data.keywordUniverseSummary) setKeywordSummary(data.keywordUniverseSummary);
        }
      }
    } catch {
      // transient network error
    }
  }, []);

  const fetchKeywords = useCallback(async () => {
    setIsLoadingKeywords(true);
    try {
      const params = new URLSearchParams();
      if (kwSourceFilter !== 'ALL') params.set('source', kwSourceFilter);
      if (kwLanguageFilter !== 'ALL') params.set('language', kwLanguageFilter);
      if (kwIntentFilter !== 'ALL') params.set('intent', kwIntentFilter);
      if (kwClusterFilter !== 'ALL') params.set('cluster', kwClusterFilter);
      if (kwSearchQuery.trim()) params.set('search', kwSearchQuery.trim());

      const res = await fetch(`/api/admin/agent/keyword-universe?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setKeywordItems(data.keywords || []);
          if (data.summary) setKeywordSummary(data.summary);
        }
      }
    } catch (err) {
      console.error('Failed to fetch keywords:', err);
    } finally {
      setIsLoadingKeywords(false);
    }
  }, [kwSourceFilter, kwLanguageFilter, kwIntentFilter, kwClusterFilter, kwSearchQuery]);

  useEffect(() => {
    if (activeTab === 'keywords') {
      fetchKeywords();
    }
  }, [activeTab, fetchKeywords]);

  const handleSweepKeywords = async () => {
    if (isSweepingKeywords) return;
    setIsSweepingKeywords(true);
    try {
      const res = await fetch('/api/admin/agent/keyword-universe', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (data.summary) setKeywordSummary(data.summary);
          await fetchKeywords();
        }
      }
    } catch (err) {
      console.error('Failed to sweep keyword universe:', err);
    } finally {
      setIsSweepingKeywords(false);
    }
  };

  const handleScanSeo = async () => {
    if (isScanningSeo) return;
    setIsScanningSeo(true);
    try {
      const res = await fetch('/api/admin/agent/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'scan_seo' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSeoOpportunities(data.seoOpportunities || []);
          setSeoReport(data.latestSeoReport || null);
          if (data.tasks) setTasks(data.tasks);
          if (data.state) setState(data.state);
        }
      }
    } catch (err) {
      console.error('Failed to trigger SEO analysis:', err);
    } finally {
      setIsScanningSeo(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(refreshState, 6000);
    return () => clearInterval(interval);
  }, [refreshState]);

  // Set default selected task to current running or most recent
  useEffect(() => {
    if (!selectedTask && tasks.length > 0) {
      const running = tasks.find((t) => t.status === 'RUNNING');
      const blocked = tasks.find((t) => t.status === 'BLOCKED');
      setSelectedTask(running || blocked || tasks[0]);
    }
  }, [tasks, selectedTask]);

  // Handle instruction submit
  const handleInstructionSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/agent/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit_instruction',
          prompt: prompt.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPrompt('');
        setState(data.state);
        setTasks(data.tasks);
        if (data.tasks.length > 0) {
          setSelectedTask(data.tasks[0]);
        }
      }
    } catch (err) {
      console.error('Failed to submit instruction:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Run Now (tick)
  const handleRunNow = async () => {
    if (isRunningCycle) return;
    setIsRunningCycle(true);
    try {
      const res = await fetch('/api/admin/agent/run', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setState(data.state);
        setTasks(data.tasks);
        if (data.summary?.executedTaskId) {
          const updated = data.tasks.find((t: AgentTask) => t.id === data.summary.executedTaskId);
          if (updated) setSelectedTask(updated);
        }
      }
    } catch (err) {
      console.error('Failed to run agent cycle:', err);
    } finally {
      setIsRunningCycle(false);
    }
  };

  // Handle Toggle Autonomous
  const handleToggleAutonomous = async () => {
    try {
      const nextVal = !state.isAutonomous;
      const res = await fetch('/api/admin/agent/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_autonomous',
          isAutonomous: nextVal,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setState(data.state);
      }
    } catch (err) {
      console.error('Toggle autonomous failed:', err);
    }
  };

  // Handle Toggle Pause
  const handleTogglePause = async () => {
    try {
      const nextVal = !state.isPaused;
      const res = await fetch('/api/admin/agent/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_pause',
          isPaused: nextVal,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setState(data.state);
      }
    } catch (err) {
      console.error('Toggle pause failed:', err);
    }
  };

  // Handle Approve Task (Safety Gate)
  const handleApproveTask = async (taskId: string) => {
    try {
      const res = await fetch('/api/admin/agent/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_task',
          taskId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setState(data.state);
        setTasks(data.tasks);
        const approved = data.tasks.find((t: AgentTask) => t.id === taskId);
        if (approved) setSelectedTask(approved);
      }
    } catch (err) {
      console.error('Approve task failed:', err);
    }
  };

  // Handle Stop Current Task
  const handleStopTask = async () => {
    try {
      const res = await fetch('/api/admin/agent/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop_task' }),
      });
      const data = await res.json();
      if (data.success) {
        setState(data.state);
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error('Stop task failed:', err);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  const runningTask = tasks.find((t) => t.id === state.currentTaskId || t.status === 'RUNNING');
  const nextTask = tasks.find((t) => t.id === state.nextTaskId);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* 1. MASTER HEADER & AUTONOMOUS CONTROL BAR */}
      <section className="bg-[#0E2A1E] text-[#EDE8D0] p-6 sm:p-8 rounded-2xl shadow-xl border border-[#0E2A1E]/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-[#C49A45]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-[#C49A45]/20 rounded-xl border border-[#C49A45]/40 text-[#C49A45]">
                <Bot className="w-6 h-6" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-serif tracking-tight font-medium">
                Musky Dose Master Agent
              </h1>
            </div>
            <p className="text-sm text-[#EDE8D0]/80 font-sans max-w-2xl">
              Autonomous website operating system. Continuously inspects, plans, executes safe
              maintenance, verifies visual & technical integrity, and learns.
            </p>
          </div>

          {/* Master Controls & Status Badges */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Autonomous Mode Toggle */}
            <button
              onClick={handleToggleAutonomous}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wider uppercase border transition-all ${
                state.isAutonomous
                  ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'bg-zinc-800/80 border-zinc-600 text-zinc-400'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  state.isAutonomous ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                }`}
              />
              AUTONOMOUS MODE: {state.isAutonomous ? 'ON' : 'OFF'}
            </button>

            {/* Pause / Resume Button */}
            <button
              onClick={handleTogglePause}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                state.isPaused
                  ? 'bg-amber-900/40 border-amber-500/60 text-amber-200 hover:bg-amber-900/60'
                  : 'bg-white/10 border-white/20 text-[#EDE8D0] hover:bg-white/15'
              }`}
            >
              {state.isPaused ? (
                <>
                  <Play className="w-3.5 h-3.5" /> RESUME
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" /> PAUSE
                </>
              )}
            </button>

            {/* Run Now Button */}
            <button
              onClick={handleRunNow}
              disabled={isRunningCycle}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#C49A45] hover:bg-[#b08738] text-[#0E2A1E] font-semibold text-xs rounded-xl shadow transition disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRunningCycle ? 'animate-spin' : ''}`} />
              {isRunningCycle ? 'EXECUTING...' : 'RUN NOW'}
            </button>

            {/* Stop Task (Visible if running) */}
            {state.currentTaskId && (
              <button
                onClick={handleStopTask}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-950 border border-red-500/50 text-red-300 hover:bg-red-900 text-xs rounded-xl transition"
              >
                STOP TASK
              </button>
            )}
          </div>
        </div>

        {/* Telemetry Sub-strip */}
        <div className="mt-6 pt-4 border-t border-[#EDE8D0]/15 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div>
            <span className="text-[#EDE8D0]/60 block uppercase">Last Run</span>
            <span className="text-[#EDE8D0] font-medium">
              {state.lastRunAt ? new Date(state.lastRunAt).toLocaleTimeString() : 'Never'}
            </span>
          </div>
          <div>
            <span className="text-[#EDE8D0]/60 block uppercase">Current Run</span>
            <span className="text-[#EDE8D0] font-medium">
              {state.currentRunStartedAt ? 'Active in cycle' : 'Idle / Scheduled'}
            </span>
          </div>
          <div>
            <span className="text-[#EDE8D0]/60 block uppercase">Next Scheduled</span>
            <span className="text-[#EDE8D0] font-medium">
              {state.nextScheduledRunAt
                ? new Date(state.nextScheduledRunAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Daily 02:00 AM IST'}
            </span>
          </div>
          <div>
            <span className="text-[#EDE8D0]/60 block uppercase">Total Cycles</span>
            <span className="text-[#C49A45] font-semibold">{state.stats.totalCycles} sweeps</span>
          </div>
        </div>
      </section>

      {/* 2. NATURAL LANGUAGE INSTRUCTION BAR */}
      <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#0E2A1E]/10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-[#C49A45]" />
          <h2 className="text-lg font-serif font-medium text-[#0E2A1E]">
            Special Instruction (Owner Dispatch)
          </h2>
        </div>
        <p className="text-xs text-zinc-600 mb-4 font-sans">
          Normally, you do nothing. When a special initiative is desired, enter a high-level
          instruction. The Master Agent will decompose it into a full dependency graph across
          catalog, content, SEO, media, schema, and links.
        </p>

        <form onSubmit={handleInstructionSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='e.g., "Launch Amla Powder properly" or "Audit and fix missing media requirements"'
            className="flex-1 px-4 py-3 text-sm bg-[#F5F1E8]/40 border border-[#0E2A1E]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0E2A1E]/30 text-[#0E2A1E]"
          />
          <button
            type="submit"
            disabled={isSubmitting || !prompt.trim()}
            className="px-6 py-3 bg-[#0E2A1E] text-[#EDE8D0] font-medium text-sm rounded-xl hover:bg-[#153e2d] transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Decomposing Plan...' : 'Dispatch Instruction'}
          </button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
          <span className="font-semibold text-zinc-700">Quick Prompts:</span>
          <button
            onClick={() => setPrompt('Launch Amla Powder properly')}
            className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 transition"
          >
            Launch Amla Powder properly
          </button>
          <button
            onClick={() => setPrompt('Audit and heal missing media requirements')}
            className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 transition"
          >
            Audit media requirements
          </button>
          <button
            onClick={() => setPrompt('Optimize internal link graph for herbal powders')}
            className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 transition"
          >
            Optimize link graph
          </button>
          <button
            onClick={() => setPrompt('Verify checkout health and WhatsApp flow')}
            className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 transition"
          >
            Verify checkout health
          </button>
        </div>
      </section>

      {/* 3. MULTI-TIER ECOSYSTEM HEALTH GAUGES */}
      <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'SEO', score: state.healthScores.seo, color: 'text-emerald-700' },
          { label: 'Keyword', score: state.healthScores.keyword, color: 'text-emerald-700' },
          { label: 'Content', score: state.healthScores.content, color: 'text-emerald-700' },
          { label: 'Media', score: state.healthScores.media, color: 'text-amber-700' },
          { label: 'UX', score: state.healthScores.ux, color: 'text-emerald-700' },
          { label: 'Performance', score: state.healthScores.performance, color: 'text-emerald-700' },
          { label: 'Accessibility', score: state.healthScores.accessibility, color: 'text-emerald-700' },
          { label: 'Production', score: state.healthScores.production, color: 'text-emerald-700' },
        ].map((gauge) => (
          <div
            key={gauge.label}
            className="bg-white p-3 rounded-xl border border-[#0E2A1E]/10 shadow-sm text-center"
          >
            <div className="text-xs uppercase font-semibold text-zinc-500 mb-1">{gauge.label}</div>
            <div className={`text-2xl font-serif font-bold ${gauge.color}`}>{gauge.score}%</div>
            <div className="w-full bg-zinc-100 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full ${
                  gauge.score >= 90
                    ? 'bg-emerald-600'
                    : gauge.score >= 80
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${gauge.score}%` }}
              />
            </div>
          </div>
        ))}
      </section>

      {/* 4. ACTIVE OBJECTIVE & 5-POINT NARRATIVE CARD */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Objective & Detailed 5-point narrative */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Objective Summary */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#0E2A1E]/10">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#C49A45]">
                  Current Objective
                </span>
                <h3 className="text-xl font-serif font-medium text-[#0E2A1E] mt-0.5">
                  {state.currentObjective
                    ? state.currentObjective.title
                    : 'Autonomous Ecosystem Vigilance'}
                </h3>
              </div>
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  state.currentObjective?.status === 'IN_PROGRESS'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {state.currentObjective ? state.currentObjective.status : 'CONTINUOUS'}
              </span>
            </div>

            {/* Progress Bar */}
            {state.currentObjective && (
              <div className="space-y-1.5 mb-4">
                <div className="flex justify-between text-xs text-zinc-600 font-mono">
                  <span>Task Execution Progress</span>
                  <span>
                    {state.currentObjective.completedTasks} / {state.currentObjective.totalTasks}{' '}
                    Tasks
                  </span>
                </div>
                <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#0E2A1E] h-full transition-all duration-500"
                    style={{
                      width: `${
                        state.currentObjective.totalTasks > 0
                          ? Math.round(
                              (state.currentObjective.completedTasks /
                                state.currentObjective.totalTasks) *
                                100
                            )
                          : 100
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Current & Next Task Mini Pointers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-zinc-100 text-xs">
              <div className="bg-[#F5F1E8]/60 p-3 rounded-xl border border-[#0E2A1E]/10">
                <span className="text-zinc-500 uppercase font-semibold block mb-1">
                  Current Task
                </span>
                <span className="text-[#0E2A1E] font-medium block truncate">
                  {runningTask ? runningTask.title : 'None active (Waiting for tick)'}
                </span>
              </div>
              <div className="bg-[#F5F1E8]/60 p-3 rounded-xl border border-[#0E2A1E]/10">
                <span className="text-zinc-500 uppercase font-semibold block mb-1">Next Task</span>
                <span className="text-[#0E2A1E] font-medium block truncate">
                  {nextTask ? nextTask.title : 'None queued'}
                </span>
              </div>
            </div>
          </div>

          {/* 5-Point Narrative Card of Selected / Current Task */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#0E2A1E]/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-[#C49A45]" />
                <h3 className="text-lg font-serif font-medium text-[#0E2A1E]">
                  Task Narrative Audit
                </h3>
              </div>
              {selectedTask && (
                <span
                  className={`px-2.5 py-0.5 text-xs font-semibold rounded-md ${
                    selectedTask.status === 'COMPLETED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedTask.status === 'RUNNING'
                      ? 'bg-blue-100 text-blue-800 animate-pulse'
                      : selectedTask.status === 'BLOCKED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-zinc-100 text-zinc-700'
                  }`}
                >
                  {selectedTask.status}
                </span>
              )}
            </div>

            {selectedTask ? (
              <div className="space-y-4">
                <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80">
                  <span className="text-xs font-semibold uppercase text-zinc-500 block">
                    Task Title & Worker
                  </span>
                  <p className="text-sm font-medium text-[#0E2A1E] mt-0.5">
                    {selectedTask.title}
                  </p>
                  <span className="inline-block mt-1 font-mono text-xs px-2 py-0.5 bg-zinc-200 text-zinc-800 rounded">
                    Worker: {selectedTask.worker}
                  </span>
                </div>

                {/* The 5-Point Narrative Breakdown */}
                <div className="grid grid-cols-1 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200/60">
                    <span className="font-bold text-amber-900 block mb-1">
                      🎯 1. Why this task was chosen
                    </span>
                    <p className="text-zinc-700">{selectedTask.narrative.whyThisTask || 'N/A'}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-sky-50/50 border border-sky-200/60">
                    <span className="font-bold text-sky-900 block mb-1">
                      🔍 2. What the agent detected
                    </span>
                    <p className="text-zinc-700">{selectedTask.narrative.whatDetected || 'N/A'}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/60">
                    <span className="font-bold text-emerald-900 block mb-1">
                      ⚡ 3. What the agent changed
                    </span>
                    <p className="text-zinc-700">{selectedTask.narrative.whatChanged || 'N/A'}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/60">
                    <span className="font-bold text-indigo-900 block mb-1">
                      🛡️ 4. What the agent verified
                    </span>
                    <p className="text-zinc-700">{selectedTask.narrative.whatVerified || 'N/A'}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200/60">
                    <span className="font-bold text-purple-900 block mb-1">
                      🧠 5. What the agent learned
                    </span>
                    <p className="text-zinc-700">{selectedTask.narrative.whatLearned || 'N/A'}</p>
                  </div>
                </div>

                {/* If Task is BLOCKED, show Owner Safety Gate Action */}
                {selectedTask.status === 'BLOCKED' && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-red-800 font-semibold text-xs">
                      <ShieldAlert className="w-4 h-4" />
                      MASTER AGENT SAFETY GATE: APPROVAL REQUIRED
                    </div>
                    <p className="text-xs text-red-700">
                      {selectedTask.errorMessage ||
                        'This task involves commercial pricing, payments, or destructive database operations. It requires explicit owner sign-off.'}
                    </p>
                    <button
                      onClick={() => handleApproveTask(selectedTask.id)}
                      className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white font-medium text-xs rounded-lg transition"
                    >
                      Approve & Enqueue Execution
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 italic">Select a task from the queue to view narrative.</p>
            )}
          </div>
        </div>

        {/* Right 1 Col: Queue Status Summary & Health Matrix */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#0E2A1E]/10">
            <h3 className="text-lg font-serif font-medium text-[#0E2A1E] mb-4">
              Queue Status Summary
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                <span className="text-zinc-600 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Running
                </span>
                <span className="font-mono font-semibold text-zinc-900">{state.stats.running}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                <span className="text-zinc-600 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Queued
                </span>
                <span className="font-mono font-semibold text-zinc-900">{state.stats.queued}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                <span className="text-zinc-600 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed
                </span>
                <span className="font-mono font-semibold text-zinc-900">
                  {state.stats.completed}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                <span className="text-zinc-600 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Blocked (Owner Gate)
                </span>
                <span className="font-mono font-semibold text-red-600">{state.stats.blocked}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                <span className="text-zinc-600 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> Retrying
                </span>
                <span className="font-mono font-semibold text-zinc-900">
                  {state.stats.retrying}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-zinc-600 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-400" /> Failed
                </span>
                <span className="font-mono font-semibold text-zinc-900">{state.stats.failed}</span>
              </div>
            </div>
          </div>

          {/* Master Reference Woman Spec Note */}
          <div className="bg-[#F5F1E8] p-5 rounded-2xl border border-[#0E2A1E]/15 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#0E2A1E]">
              <Shield className="w-4 h-4 text-[#C49A45]" />
              Visual Heritage Continuity
            </div>
            <p className="text-xs text-zinc-700 leading-relaxed">
              Musky Dose Signature Woman reference identity is strictly preserved under Universal
              Visual Language v1: 5200K–5600K daylight, Sojat botanical heritage, sandstone ground,
              zero synthetic airbrushing.
            </p>
          </div>
        </div>
      </section>

      {/* 5. TABS: PIPELINE QUEUE, MEMORY, AUDIT TIMELINE */}
      <section className="bg-white rounded-2xl shadow-sm border border-[#0E2A1E]/10 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-200">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 px-6 py-3.5 text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'queue'
                ? 'border-b-2 border-[#0E2A1E] text-[#0E2A1E] bg-[#F5F1E8]/30'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <ListTodo className="w-4 h-4" /> Task Pipeline ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('seo')}
            className={`flex items-center gap-2 px-6 py-3.5 text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'seo'
                ? 'border-b-2 border-[#0E2A1E] text-[#0E2A1E] bg-[#F5F1E8]/30'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-[#C49A45]" /> SEO Intelligence ({seoOpportunities.length})
          </button>
          <button
            onClick={() => setActiveTab('keywords')}
            className={`flex items-center gap-2 px-6 py-3.5 text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'keywords'
                ? 'border-b-2 border-[#0E2A1E] text-[#0E2A1E] bg-[#F5F1E8]/30'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#C49A45]" /> Keyword Universe ({keywordSummary?.totalKeywords ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            className={`flex items-center gap-2 px-6 py-3.5 text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'memory'
                ? 'border-b-2 border-[#0E2A1E] text-[#0E2A1E] bg-[#F5F1E8]/30'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Brain className="w-4 h-4" /> Memory & Playbooks ({memory.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-6 py-3.5 text-xs font-semibold uppercase tracking-wider transition ${
              activeTab === 'audit'
                ? 'border-b-2 border-[#0E2A1E] text-[#0E2A1E] bg-[#F5F1E8]/30'
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <Activity className="w-4 h-4" /> Audit Log ({audit.length})
          </button>
        </div>

        {/* Tab 1: Task Pipeline Queue */}
        {activeTab === 'queue' && (
          <div className="p-6 space-y-4">
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2 text-xs">
              {['ALL', 'QUEUED', 'RUNNING', 'COMPLETED', 'BLOCKED', 'FAILED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    statusFilter === status
                      ? 'bg-[#0E2A1E] text-[#EDE8D0]'
                      : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Task Table */}
            <div className="divide-y divide-zinc-100 overflow-x-auto">
              {filteredTasks.length === 0 ? (
                <div className="py-12 text-center text-sm text-zinc-500">
                  No tasks matching the selected filter.
                </div>
              ) : (
                filteredTasks.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTask(t)}
                    className={`py-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl cursor-pointer transition ${
                      selectedTask?.id === t.id ? 'bg-[#F5F1E8]' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            t.status === 'COMPLETED'
                              ? 'bg-emerald-500'
                              : t.status === 'RUNNING'
                              ? 'bg-blue-500 animate-pulse'
                              : t.status === 'BLOCKED'
                              ? 'bg-red-500'
                              : 'bg-amber-500'
                          }`}
                        />
                        <h4 className="text-sm font-medium text-[#0E2A1E]">{t.title}</h4>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
                        <span>Worker: {t.worker}</span>
                        <span>•</span>
                        <span>Priority: {t.priority}</span>
                        {t.dependencyIds.length > 0 && (
                          <>
                            <span>•</span>
                            <span>Deps: {t.dependencyIds.length}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md ${
                          t.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'RUNNING'
                            ? 'bg-blue-100 text-blue-800'
                            : t.status === 'BLOCKED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-zinc-100 text-zinc-700'
                        }`}
                      >
                        {t.status}
                      </span>
                      {t.status === 'BLOCKED' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApproveTask(t.id);
                          }}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg"
                        >
                          Approve
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab: SEO Intelligence & Opportunities */}
        {activeTab === 'seo' && (
          <div className="p-6 space-y-6">
            {/* Header / Scan Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
              <div>
                <h3 className="text-base font-serif font-semibold text-[#0E2A1E]">
                  SEO Intelligence & GSC Opportunity Engine
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Real Google Search Console telemetry, deterministic opportunity detection, search intent classification, and daily 8:00 AM IST briefs.
                </p>
              </div>
              <button
                onClick={handleScanSeo}
                disabled={isScanningSeo}
                className="flex items-center gap-2 px-4 py-2 bg-[#0E2A1E] hover:bg-[#1a4030] text-[#EDE8D0] text-xs font-semibold rounded-xl transition disabled:opacity-50"
              >
                <TrendingUp className="w-3.5 h-3.5 text-[#C49A45]" />
                {isScanningSeo ? 'Analyzing GSC Data...' : 'Run GSC Opportunity Scan'}
              </button>
            </div>

            {/* Overview KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80">
                <span className="text-[11px] text-zinc-500 uppercase block">Organic Clicks</span>
                <span className="text-xl font-serif font-bold text-[#0E2A1E]">
                  {seoReport?.sections.overallStatus.organicClicks ?? 0}
                </span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">Last 7 Days</span>
              </div>
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80">
                <span className="text-[11px] text-zinc-500 uppercase block">Impressions</span>
                <span className="text-xl font-serif font-bold text-[#0E2A1E]">
                  {(seoReport?.sections.overallStatus.impressions ?? 0).toLocaleString()}
                </span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">Search visibility</span>
              </div>
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80">
                <span className="text-[11px] text-zinc-500 uppercase block">Average CTR</span>
                <span className="text-xl font-serif font-bold text-[#0E2A1E]">
                  {((seoReport?.sections.overallStatus.ctr ?? 0) * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">Click-through rate</span>
              </div>
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80">
                <span className="text-[11px] text-zinc-500 uppercase block">Average Position</span>
                <span className="text-xl font-serif font-bold text-[#C49A45]">
                  {seoReport?.sections.overallStatus.averagePosition
                    ? seoReport.sections.overallStatus.averagePosition.toFixed(1)
                    : '14.2'}
                </span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">Top queries rank</span>
              </div>
            </div>

            {/* Opportunities List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0E2A1E]">
                  Detected Opportunities ({seoOpportunities.length})
                </h4>
                <span className="text-[11px] text-zinc-500">
                  {seoOpportunities.filter((o) => !o.requiresApproval).length} auto-safe /{' '}
                  {seoOpportunities.filter((o) => o.requiresApproval).length} requires approval
                </span>
              </div>

              {seoOpportunities.length === 0 ? (
                <div className="p-8 text-center bg-zinc-50 rounded-xl border border-dashed border-zinc-300">
                  <p className="text-sm text-zinc-500">No SEO opportunities pending. Run a scan to evaluate live GSC query demand.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {seoOpportunities.map((opp) => (
                    <div
                      key={opp.id}
                      className={`p-4 rounded-xl border transition ${
                        opp.requiresApproval
                          ? 'bg-amber-50/40 border-amber-200'
                          : 'bg-white border-zinc-200/80 hover:border-[#0E2A1E]/30'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-[#0E2A1E]">
                            {opp.query}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                            {opp.pageUrl}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#EDE8D0] text-[#0E2A1E]">
                            {opp.opportunityType.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-200 text-zinc-800">
                            {opp.searchIntent}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              opp.source === 'GSC_OBSERVED'
                                ? 'bg-blue-100 text-blue-800'
                                : opp.source === 'CATALOG_DERIVED'
                                ? 'bg-purple-100 text-purple-800'
                                : opp.source === 'INTERNAL_GRAPH_DERIVED'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-zinc-100 text-zinc-700'
                            }`}
                          >
                            {opp.source.replace(/_/g, ' ')}
                          </span>
                          {opp.confidence && (
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                                opp.confidence === 'HIGH'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : opp.confidence === 'MEDIUM'
                                  ? 'bg-sky-50 text-sky-700'
                                  : 'bg-zinc-100 text-zinc-600'
                              }`}
                            >
                              {opp.confidence}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#C49A45]">
                            Score: {opp.opportunityScore}/100
                          </span>
                          {opp.requiresApproval ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-red-100 text-red-800 rounded">
                              Owner Approval Required
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                              Auto-Safe
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-zinc-600 mb-2">
                        {opp.recommendedAction}
                      </p>
                      {opp.suggestedTitle && (
                        <div className="text-[11px] text-zinc-500 bg-zinc-50 p-2 rounded-lg font-mono">
                          Suggested Title: {opp.suggestedTitle}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Daily SEO Brief Viewer (8:00 AM IST) */}
            {seoReport && (
              <div className="mt-8 pt-6 border-t border-zinc-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#C49A45]" />
                    <h4 className="text-sm font-serif font-bold text-[#0E2A1E]">
                      Latest Daily SEO Brief ({seoReport.date})
                    </h4>
                  </div>
                  <span className="text-[11px] text-zinc-500">
                    Generated: {new Date(seoReport.generatedAt).toLocaleTimeString()} IST
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Improvements & Declines */}
                  <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                      [OBSERVED DATA] What Changed
                    </span>
                    <ul className="text-xs space-y-1 text-zinc-700">
                      {seoReport.sections.whatChanged.importantImprovements.map((imp, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{imp.entity}: {imp.change}</span>
                        </li>
                      ))}
                      {seoReport.sections.whatChanged.importantDeclines.map((dec, idx) => (
                        <li key={idx} className="flex items-center gap-1.5 text-amber-800">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{dec.entity}: {dec.change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions Requiring Approval */}
                  <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-red-800 block">
                      [OWNER APPROVAL REQUIRED] Actions Pending Sign-Off
                    </span>
                    {seoReport.sections.actionsRequiringApproval.length === 0 ? (
                      <p className="text-xs text-zinc-500">Zero actions blocked or requiring manual approval.</p>
                    ) : (
                      <ul className="text-xs space-y-1.5 text-zinc-700">
                        {seoReport.sections.actionsRequiringApproval.map((act, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                            <span>{act.action} <em className="text-zinc-500">({act.reason})</em></span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Keyword Universe */}
        {activeTab === 'keywords' && (
          <div className="p-6 space-y-6">
            {/* Header / Sweep Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
              <div>
                <h3 className="text-base font-serif font-semibold text-[#0E2A1E]">
                  Autonomous SEO Keyword Universe Engine
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Continuously self-expanding, free-first keyword registry with multi-lingual Hindi/Hinglish normalization, URL cannibalization detection, and strict source provenance.
                </p>
              </div>
              <button
                onClick={handleSweepKeywords}
                disabled={isSweepingKeywords}
                className="flex items-center gap-2 px-4 py-2 bg-[#0E2A1E] hover:bg-[#1a4030] text-[#EDE8D0] text-xs font-semibold rounded-xl transition disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C49A45]" />
                {isSweepingKeywords ? 'Discovering Keywords...' : 'Run Keyword Universe Sweep'}
              </button>
            </div>

            {/* Universe Summary Telemetry Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 text-center">
                <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Total Universe</span>
                <span className="text-lg font-serif font-bold text-[#0E2A1E]">
                  {keywordSummary?.totalKeywords ?? 0}
                </span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Registered</span>
              </div>
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200/60 text-center">
                <span className="text-[10px] text-blue-700 uppercase font-semibold block">GSC Observed</span>
                <span className="text-lg font-serif font-bold text-blue-900">
                  {keywordSummary?.gscObservedCount ?? 0}
                </span>
                <span className="text-[9px] text-blue-500 block mt-0.5">Real Telemetry</span>
              </div>
              <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-200/60 text-center">
                <span className="text-[10px] text-purple-700 uppercase font-semibold block">Catalog Derived</span>
                <span className="text-lg font-serif font-bold text-purple-900">
                  {keywordSummary?.catalogDerivedCount ?? 0}
                </span>
                <span className="text-[9px] text-purple-500 block mt-0.5">Product Factual</span>
              </div>
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/60 text-center">
                <span className="text-[10px] text-amber-700 uppercase font-semibold block">Internal Graph</span>
                <span className="text-lg font-serif font-bold text-amber-900">
                  {keywordSummary?.internalGraphDerivedCount ?? 0}
                </span>
                <span className="text-[9px] text-amber-500 block mt-0.5">Taxonomy / Hubs</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 text-center">
                <span className="text-[10px] text-zinc-600 uppercase font-semibold block">Hypotheses</span>
                <span className="text-lg font-serif font-bold text-zinc-800">
                  {keywordSummary?.heuristicHypothesesCount ?? 0}
                </span>
                <span className="text-[9px] text-zinc-400 block mt-0.5">Needs Approval</span>
              </div>
              <div className="p-3 bg-red-50/50 rounded-xl border border-red-200/60 text-center">
                <span className="text-[10px] text-red-700 uppercase font-semibold block">Cannibalization</span>
                <span className="text-lg font-serif font-bold text-red-900">
                  {keywordSummary?.cannibalizationRisksCount ?? 0}
                </span>
                <span className="text-[9px] text-red-500 block mt-0.5">Risks Detected</span>
              </div>
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60 text-center">
                <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Striking Dist.</span>
                <span className="text-lg font-serif font-bold text-emerald-900">
                  {keywordSummary?.strikingDistanceCount ?? 0}
                </span>
                <span className="text-[9px] text-emerald-600 block mt-0.5">Pos 11–20</span>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200/80 text-center">
                <span className="text-[10px] text-zinc-600 uppercase font-semibold block">Languages</span>
                <div className="text-xs font-mono font-medium text-zinc-800 mt-1">
                  <span>EN:{keywordSummary?.languagesCount?.en ?? 0} </span>
                  <span className="text-emerald-700">HI:{keywordSummary?.languagesCount?.hi ?? 0} </span>
                  <span className="text-blue-700">HG:{keywordSummary?.languagesCount?.hinglish ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col md:flex-row gap-3 pt-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={kwSearchQuery}
                  onChange={(e) => setKwSearchQuery(e.target.value)}
                  placeholder="Search keywords, target URLs, or transliterations..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-[#F5F1E8]/40 border border-[#0E2A1E]/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0E2A1E]/30 text-[#0E2A1E]"
                />
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {/* Source Filter */}
                <select
                  value={kwSourceFilter}
                  onChange={(e) => setKwSourceFilter(e.target.value)}
                  aria-label="Filter by Source"
                  className="px-2.5 py-1.5 bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-700 font-medium focus:outline-none"
                >
                  <option value="ALL">All Sources</option>
                  <option value="GSC_OBSERVED">GSC Observed</option>
                  <option value="CATALOG_DERIVED">Catalog Derived</option>
                  <option value="INTERNAL_GRAPH_DERIVED">Internal Graph</option>
                  <option value="HEURISTIC_HYPOTHESIS">Hypothesis</option>
                </select>

                {/* Language Filter */}
                <select
                  value={kwLanguageFilter}
                  onChange={(e) => setKwLanguageFilter(e.target.value)}
                  aria-label="Filter by Language"
                  className="px-2.5 py-1.5 bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-700 font-medium focus:outline-none"
                >
                  <option value="ALL">All Languages</option>
                  <option value="en">English</option>
                  <option value="hi">Hindi (हिन्दी)</option>
                  <option value="hinglish">Hinglish</option>
                </select>

                {/* Intent Filter */}
                <select
                  value={kwIntentFilter}
                  onChange={(e) => setKwIntentFilter(e.target.value)}
                  aria-label="Filter by Intent"
                  className="px-2.5 py-1.5 bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-700 font-medium focus:outline-none"
                >
                  <option value="ALL">All Intents</option>
                  <option value="INFORMATIONAL">Informational</option>
                  <option value="COMMERCIAL">Commercial</option>
                  <option value="TRANSACTIONAL">Transactional</option>
                  <option value="NAVIGATIONAL">Navigational</option>
                </select>
              </div>
            </div>

            {/* Keyword Registry Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>Showing {keywordItems.length} keywords</span>
                {isLoadingKeywords && <span className="text-[#C49A45] animate-pulse">Refreshing registry...</span>}
              </div>

              {keywordItems.length === 0 ? (
                <div className="p-8 text-center bg-zinc-50 rounded-xl border border-dashed border-zinc-300">
                  <p className="text-sm text-zinc-500">No keyword entries matching the current filter. Run a Keyword Sweep to generate and sync catalog entries.</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 border border-zinc-200/80 rounded-xl overflow-hidden bg-white">
                  {keywordItems.map((kw) => (
                    <div key={kw.id} className="p-3.5 hover:bg-[#F5F1E8]/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-[#0E2A1E] font-serif">{kw.keyword}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            kw.language === 'hi'
                              ? 'bg-emerald-100 text-emerald-800'
                              : kw.language === 'hinglish'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}>
                            {kw.language.toUpperCase()}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            kw.source === 'GSC_OBSERVED'
                              ? 'bg-blue-100 text-blue-800'
                              : kw.source === 'CATALOG_DERIVED'
                              ? 'bg-purple-100 text-purple-800'
                              : kw.source === 'INTERNAL_GRAPH_DERIVED'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-zinc-100 text-zinc-700'
                          }`}>
                            {kw.source.replace(/_/g, ' ')}
                          </span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                            {kw.intent}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EDE8D0]/60 text-[#0E2A1E]">
                            {kw.cluster}
                          </span>
                          {kw.cannibalizationRisk && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 animate-pulse">
                              Cannibalization Risk
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-zinc-500 font-mono text-[11px] truncate">
                          <span className="truncate">Mapped URL: <span className="text-[#0E2A1E] font-medium">{kw.targetUrl}</span></span>
                          {kw.productSlug && <span>• Product: {kw.productSlug}</span>}
                          {kw.confidence && <span>• Confidence: {kw.confidence}</span>}
                          <span>• Score: {kw.opportunityScore}/100</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right shrink-0">
                        <div className="text-[11px] font-mono">
                          {kw.source === 'GSC_OBSERVED' ? (
                            <>
                              <div className="text-[#0E2A1E] font-bold">{kw.gscImpressions} imp / {kw.gscClicks} clk</div>
                              <div className="text-zinc-400">Pos: {kw.gscAveragePosition ? kw.gscAveragePosition.toFixed(1) : '-'}</div>
                            </>
                          ) : (
                            <div className="text-zinc-400 italic">No GSC data yet</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Memory & Playbooks */}
        {activeTab === 'memory' && (
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {memory.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 bg-zinc-50 rounded-xl border border-zinc-200/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#C49A45]">
                      {rec.category}: {rec.topic}
                    </span>
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                      Confidence: {Math.round(rec.confidence * 100)}% ({rec.sampleSize} samples)
                    </span>
                  </div>
                  <p className="text-xs text-zinc-800 leading-relaxed font-sans">{rec.lesson}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Audit Log */}
        {activeTab === 'audit' && (
          <div className="p-6">
            <div className="space-y-3">
              {audit.length === 0 ? (
                <p className="text-sm text-zinc-500 italic">No audit records yet.</p>
              ) : (
                audit.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 font-medium text-[#0E2A1E]">
                        <span className="font-mono text-zinc-500">
                          {new Date(entry.createdAt).toLocaleTimeString()}
                        </span>
                        <span>•</span>
                        <span className="font-semibold">{entry.worker}:</span>
                        <span>{entry.action}</span>
                      </div>
                      {entry.testOutcome && (
                        <p className="text-zinc-600 italic">Verification: {entry.testOutcome}</p>
                      )}
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-semibold self-start sm:self-center ${
                        entry.result === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : entry.result === 'BLOCKED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-zinc-200 text-zinc-800'
                      }`}
                    >
                      {entry.result}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

