'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Activity,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  ShoppingCart,
  Globe,
  Server,
  ExternalLink,
} from 'lucide-react';
import { GuardianSystemSummary, GuardianCheckResult, GuardianIncident } from '@/lib/guardian/types';

export default function GuardianDashboardClient() {
  const [summary, setSummary] = useState<GuardianSystemSummary | null>(null);
  const [recentChecks, setRecentChecks] = useState<GuardianCheckResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRunningAudit, setIsRunningAudit] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'OVERVIEW' | 'CHECKS' | 'INCIDENTS'>('OVERVIEW');

  const fetchStatus = useCallback(async () => {
    try {
      setErrorMsg(null);
      const res = await fetch('/api/admin/guardian/status');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.summary) {
        setSummary(data.summary);
        setRecentChecks(data.recentChecks || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load Guardian telemetry');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Poll every 30s when viewing
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleRunAuditNow = async () => {
    setIsRunningAudit(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/admin/guardian/run', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.success && data.summary) {
        setSummary(data.summary);
        setRecentChecks(data.recentChecks || []);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to execute on-demand audit');
    } finally {
      setIsRunningAudit(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <RefreshCw className="w-8 h-8 text-[#1b4332] animate-spin" />
        <p className="text-sm font-medium text-[#1f2421]/70">Initializing Website Guardian Telemetry...</p>
      </div>
    );
  }

  const isHealthy = summary?.overallStatus === 'HEALTHY';
  const isDegraded = summary?.overallStatus === 'DEGRADED';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Header */}
      <div className="bg-white rounded-2xl p-6 border border-[#2d6a4f]/20 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              isHealthy
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : isDegraded
                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                : 'bg-rose-50 text-rose-600 border border-rose-200'
            }`}
          >
            {isHealthy ? <ShieldCheck className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#0f2d22]">Musky Dose Website Guardian</h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isHealthy
                    ? 'bg-emerald-100 text-emerald-800'
                    : isDegraded
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {summary?.overallStatus || 'UNKNOWN'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Continuous failure detection, business flow simulation, and verified auto-recovery.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStatus}
            disabled={isRunningAudit}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={handleRunAuditNow}
            disabled={isRunningAudit}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1b4332] hover:bg-[#0f2d22] flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <Activity className={`w-3.5 h-3.5 ${isRunningAudit ? 'animate-spin' : ''}`} />
            {isRunningAudit ? 'Auditing Platform...' : 'Run Full Audit Now'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Layered Health Architecture Matrix */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0f2d22]">
            <Activity className="w-4 h-4 text-[#1b4332]" />
            5-Layer Reliability Architecture (L0–L4)
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-500 font-medium">Storage:</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  summary?.durableStorageStatus === 'DURABLE_STORAGE_ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {summary?.durableStorageStatus === 'DURABLE_STORAGE_ACTIVE'
                  ? 'Supabase Durable Active'
                  : 'Durable Storage Not Activated'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-gray-500 font-medium">Heartbeat:</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  summary?.heartbeatStatus === 'GUARDIAN_ALIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : summary?.heartbeatStatus === 'GUARDIAN_STALE'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {summary?.heartbeatStatus || 'GUARDIAN_ALIVE'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          {[
            { id: 'L0', name: 'L0: Connectivity', status: summary?.layeredHealth?.l0Connectivity || 'PASS', desc: 'Root & sitemap ping' },
            { id: 'L1', name: 'L1: API & Search', status: summary?.layeredHealth?.l1Api || 'PASS', desc: 'Internal endpoints' },
            { id: 'L2', name: 'L2: Database', status: summary?.layeredHealth?.l2Database || 'PASS', desc: 'Supabase Postgres read' },
            { id: 'L3', name: 'L3: Commerce', status: summary?.layeredHealth?.l3Commerce || 'PASS', desc: 'Cart & WhatsApp flow' },
            { id: 'L4', name: 'L4: Systems', status: summary?.layeredHealth?.l4BusinessIntegrity || 'PASS', desc: 'Auto-Guide & pricing rules' },
          ].map((layer) => {
            const isPass = layer.status === 'PASS';
            const isWarn = layer.status === 'WARN';
            return (
              <div
                key={layer.id}
                className={`p-3 rounded-xl border ${
                  isPass
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : isWarn
                    ? 'bg-amber-50/50 border-amber-200'
                    : 'bg-rose-50/50 border-rose-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-900">{layer.name}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isPass ? 'bg-emerald-100 text-emerald-800' : isWarn ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {layer.status}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">{layer.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span>Uptime Ratio</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {summary?.metrics.uptimePercent24h ?? 100}%
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Pass rate across recent probes</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span>Average Probe Latency</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {summary?.averageLatencyMs ?? 0}ms
          </div>
          <p className="text-[11px] text-gray-400 mt-1">HTTP and DB response time</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span>Database Status</span>
            <Database className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-lg font-bold text-gray-900 mt-2">
            {summary?.databaseStatus === 'CONNECTED' ? (
              <span className="text-emerald-700">Postgres Live</span>
            ) : summary?.databaseStatus === 'FALLBACK_LOCAL' ? (
              <span className="text-amber-700">Static Fallback</span>
            ) : (
              <span className="text-rose-700">Offline</span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Read-only connection check</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs">
            <span>Active Incidents</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {summary?.activeIncidents.length ?? 0}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {summary?.metrics.totalRecoveries24h ?? 0} auto-recovered
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setSelectedTab('OVERVIEW')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            selectedTab === 'OVERVIEW'
              ? 'bg-[#1b4332] text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Sub-System Overview
        </button>
        <button
          onClick={() => setSelectedTab('CHECKS')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            selectedTab === 'CHECKS'
              ? 'bg-[#1b4332] text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Recent Probes ({recentChecks.length})
        </button>
        <button
          onClick={() => setSelectedTab('INCIDENTS')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            selectedTab === 'INCIDENTS'
              ? 'bg-[#1b4332] text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Incidents & Recovery History ({summary?.recentIncidents.length ?? 0})
        </button>
      </div>

      {/* Tab: OVERVIEW */}
      {selectedTab === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Storefront & APIs */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-gray-900 border-b border-gray-100 pb-3">
              <Globe className="w-4 h-4 text-[#1b4332]" />
              Storefront & Route Availability
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'Storefront Homepage (/)', path: '/' },
                { label: 'Products Catalog (/products)', path: '/products' },
                { label: 'B2B Wholesale Portal (/wholesale)', path: '/wholesale' },
                { label: 'Terroir Hub (/sojat-henna)', path: '/sojat-henna' },
                { label: 'Cart & Checkout (/cart, /checkout)', path: '/checkout' },
                { label: 'Search Engine Sitemap (/sitemap.xml)', path: '/sitemap.xml' },
              ].map((item) => {
                const match = recentChecks.find((c) => c.target === item.path);
                const isPass = match ? match.status === 'PASS' : true;
                return (
                  <div key={item.path} className="flex items-center justify-between text-xs py-1">
                    <span className="text-gray-700">{item.label}</span>
                    <div className="flex items-center gap-2">
                      {match && <span className="text-gray-400 font-mono text-[11px]">{match.durationMs}ms</span>}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isPass ? 'OPERATIONAL' : 'DEGRADED'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Business Journey & Reliability Engine */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 font-bold text-sm text-gray-900 border-b border-gray-100 pb-3">
              <ShoppingCart className="w-4 h-4 text-[#1b4332]" />
              Customer Journey Simulation
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'Cart Arithmetic & Unit Pricing', target: 'CART_ENGINE' },
                { label: 'Checkout Payload Validation', target: 'CHECKOUT_ENGINE' },
                { label: 'WhatsApp CTA Generator', target: 'WHATSAPP_ENGINE' },
                { label: 'Universal Auto-Guide V3', target: 'AUTO_GUIDE_ENGINE' },
                { label: 'Multi-Herb Blend Taxonomy', target: 'TAXONOMY_ENGINE' },
                { label: 'GSC Zero-Fabrication Rule', target: 'GSC_KEYWORD_ENGINE' },
              ].map((item) => {
                const match = recentChecks.find((c) => c.target === item.target);
                const isPass = match ? match.status === 'PASS' : true;
                return (
                  <div key={item.target} className="flex items-center justify-between text-xs py-1">
                    <span className="text-gray-700">{item.label}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isPass ? 'VERIFIED' : 'FAILED'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* External Monitor Integration Contract */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
              <Server className="w-4 h-4 text-[#1b4332]" />
              External Monitor Continuous Heartbeat Contract (Layer A)
            </div>
            <span className="text-[10px] font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
              Every 5–15 mins
            </span>
          </div>
          <p className="text-xs text-gray-600">
            For non-stop 24/7 reliability beyond Vercel Hobby daily limits, configure an external monitor (UptimeRobot, GitHub Action, or BetterStack) to ping this endpoint:
          </p>
          <div className="bg-gray-900 text-emerald-400 p-3 rounded-xl font-mono text-xs overflow-x-auto select-all">
            curl -X GET &quot;https://muskydose.in/api/cron/guardian&quot; -H &quot;Authorization: Bearer YOUR_CRON_SECRET&quot;
          </div>
          <p className="text-[11px] text-gray-400">
            Accepts <code className="text-gray-600 font-bold">Authorization: Bearer &lt;CRON_SECRET&gt;</code> with constant-time comparison. Query string secrets are rejected for security.
          </p>
        </div>
      </div>
      )}

      {/* Tab: CHECKS */}
      {selectedTab === 'CHECKS' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 font-bold text-xs text-gray-700 flex justify-between items-center">
            <span>Recent Diagnostic Probes</span>
            <span className="text-gray-400 font-normal">Last cycle: {summary?.lastRunAt ? new Date(summary.lastRunAt).toLocaleTimeString() : 'N/A'}</span>
          </div>
          <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
            {recentChecks.map((chk, i) => (
              <div key={chk.checkId + i} className="p-3 text-xs flex items-center justify-between hover:bg-gray-50">
                <div className="space-y-0.5">
                  <div className="font-semibold text-gray-900 flex items-center gap-2">
                    <span>{chk.name}</span>
                    <span className="text-gray-400 font-mono text-[10px]">[{chk.target}]</span>
                  </div>
                  {chk.error && <p className="text-rose-600 text-[11px]">{chk.error}</p>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-mono text-gray-400 text-[11px]">{chk.durationMs}ms</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      chk.status === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : chk.status === 'WARN'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {chk.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: INCIDENTS */}
      {selectedTab === 'INCIDENTS' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 font-bold text-xs text-gray-700">
            Incident Log & Automated Safe Recovery History
          </div>
          {(!summary?.recentIncidents || summary.recentIncidents.length === 0) ? (
            <div className="p-12 text-center text-xs text-gray-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              Zero active or historical incidents recorded. Website Guardian reports all systems healthy.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {summary.recentIncidents.map((inc) => (
                <div key={inc.id} className="p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{inc.target}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
                        {inc.severity}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inc.status === 'RECOVERED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : inc.status === 'OPEN'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {inc.status}
                    </span>
                  </div>
                  <p className="text-gray-600">{inc.errorSummary}</p>
                  {inc.attemptedRecoveryAction && (
                    <div className="bg-gray-50 p-2 rounded text-[11px] font-mono text-gray-700">
                      Recovery Action: {inc.attemptedRecoveryAction} → Result: {inc.recoveryResult}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

