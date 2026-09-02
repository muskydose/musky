'use client';

import React, { useState, useEffect } from 'react';
import {
  LeadRecord,
  LeadSummaryMetrics,
  LeadFunnelAnalytics,
  LeadFollowUpRecommendation,
  CentralLeadStatus,
  CentralLeadType,
} from '@/lib/growth/types';
import {
  Users,
  Sparkles,
  Phone,
  MessageCircle,
  Building2,
  TrendingUp,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  Copy,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react';

export default function AdminLeadsClient() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [summary, setSummary] = useState<LeadSummaryMetrics | null>(null);
  const [funnel, setFunnel] = useState<LeadFunnelAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Follow up modal
  const [activeFollowUpLead, setActiveFollowUpLead] = useState<LeadRecord | null>(null);
  const [followUpRec, setFollowUpRec] = useState<LeadFollowUpRecommendation | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);

  // Manual Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState('');
  const [addMobile, setAddMobile] = useState('');
  const [addType, setAddType] = useState<CentralLeadType>('WHOLESALE');
  const [addProduct, setAddProduct] = useState('Pure Sojat Henna Powder');
  const [addRequirement, setAddRequirement] = useState('');
  const [addQuantity, setAddQuantity] = useState('50kg');

  const fetchLeads = React.useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (filterType !== 'ALL') params.append('leadType', filterType);
      if (search) params.append('search', search);

      const res = await fetch(`/api/admin/growth/leads?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLeads(data.leads || []);
          setSummary(data.summaryMetrics || null);
          setFunnel(data.funnel || null);
        }
      }
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterType, search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleUpdateStatus = async (leadId: string, newStatus: CentralLeadStatus, noteText?: string) => {
    try {
      const res = await fetch('/api/admin/growth/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          leadId,
          status: newStatus,
          notes: noteText,
        }),
      });

      if (res.ok) {
        fetchLeads();
      }
    } catch (err) {
      console.error('Failed to update lead status:', err);
    }
  };

  const handleOpenFollowUp = async (lead: LeadRecord) => {
    setActiveFollowUpLead(lead);
    try {
      const res = await fetch('/api/admin/growth/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'GET_FOLLOW_UP',
          leadId: lead.leadId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFollowUpRec(data.recommendation || null);
      }
    } catch (err) {
      console.error('Failed to fetch follow-up recommendation:', err);
    }
  };

  const handleCreateManualLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addMobile) return;

    try {
      const res = await fetch('/api/admin/growth/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addName || 'Direct B2B Lead',
          mobile: addMobile,
          leadType: addType,
          productName: addProduct,
          requirement: addRequirement,
          quantity: addQuantity,
          source: 'MANUAL_ENTRY',
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setAddName('');
        setAddMobile('');
        setAddRequirement('');
        fetchLeads();
      }
    } catch (err) {
      console.error('Failed to create manual lead:', err);
    }
  };

  const filteredLeads = leads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.mobile.includes(q) ||
      (l.productName && l.productName.toLowerCase().includes(q)) ||
      (l.requirement && l.requirement.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif-heading font-bold text-2xl text-[#0f2d22]">
              Lead Center & Follow-Up Engine
            </h1>
            <span className="bg-[#e8f5e9] text-[#1b4332] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#c8e6c9]">
              Lead-First SEO
            </span>
          </div>
          <p className="text-xs text-[#626c66] mt-1">
            Deterministic First-Party Intent Scoring, Attribution, and One-Click WhatsApp Follow-Ups
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-[#1b4332] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-[#0f2d22] transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Add B2B / Wholesale Lead
        </button>
      </div>

      {/* Top KPI Summary Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[11px] font-bold text-[#626c66] uppercase tracking-wider block">Total Leads</span>
          <span className="text-xl font-bold text-[#0f2d22] mt-1 block">{summary?.totalLeads ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">New Leads</span>
          <span className="text-xl font-bold text-blue-900 mt-1 block">{summary?.newLeads ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">High Intent</span>
          <span className="text-xl font-bold text-amber-900 mt-1 block">{summary?.highIntentLeads ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">Wholesale</span>
          <span className="text-xl font-bold text-purple-900 mt-1 block">{summary?.wholesaleLeads ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">WhatsApp CTA</span>
          <span className="text-xl font-bold text-emerald-900 mt-1 block">{summary?.whatsappLeads ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">Qualified</span>
          <span className="text-xl font-bold text-indigo-900 mt-1 block">{summary?.qualifiedLeads ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[11px] font-bold text-teal-700 uppercase tracking-wider block">Conversion Rate</span>
          <span className="text-xl font-bold text-teal-900 mt-1 block">{summary?.conversionRate ?? 0}%</span>
        </div>
      </div>

      {/* Funnel Pipeline Strip */}
      {funnel && (
        <div className="bg-[#fcfbf9] p-4 rounded-2xl border border-[#e8e2d5] shadow-xs">
          <span className="text-xs font-bold text-[#0f2d22] uppercase tracking-wider block mb-3">
            Lead Conversion Funnel Pipeline
          </span>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-xs">
            <div className="bg-white p-3 rounded-xl border border-[#e8e2d5]">
              <span className="text-[#626c66] block text-[10px] uppercase font-bold">Visitors</span>
              <span className="font-bold text-[#0f2d22] text-sm mt-0.5 block">{funnel.visitors}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#e8e2d5]">
              <span className="text-[#626c66] block text-[10px] uppercase font-bold">High Intent</span>
              <span className="font-bold text-amber-800 text-sm mt-0.5 block">{funnel.highIntentVisitors}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#e8e2d5]">
              <span className="text-[#626c66] block text-[10px] uppercase font-bold">Leads ({funnel.leadRate}%)</span>
              <span className="font-bold text-blue-800 text-sm mt-0.5 block">{funnel.leads}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#e8e2d5]">
              <span className="text-[#626c66] block text-[10px] uppercase font-bold">Qualified</span>
              <span className="font-bold text-indigo-800 text-sm mt-0.5 block">{funnel.qualifiedLeads}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#e8e2d5]">
              <span className="text-[#626c66] block text-[10px] uppercase font-bold">Quotes Sent</span>
              <span className="font-bold text-purple-800 text-sm mt-0.5 block">{funnel.quotes}</span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-[#e8e2d5]">
              <span className="text-[#626c66] block text-[10px] uppercase font-bold">Orders Closed</span>
              <span className="font-bold text-emerald-800 text-sm mt-0.5 block">{funnel.orders}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-[#e8e2d5] shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {[
            { id: 'ALL', label: 'All Leads' },
            { id: 'NEW', label: 'New' },
            { id: 'QUALIFIED', label: 'Qualified' },
            { id: 'QUOTE_SENT', label: 'Quote Sent' },
            { id: 'WON', label: 'Won' },
            { id: 'LOST', label: 'Lost' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterStatus === tab.id
                  ? 'bg-[#1b4332] text-white'
                  : 'bg-[#f4efe6] text-[#626c66] hover:bg-[#e8e2d5]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-[#626c66] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search leads by name, phone, product..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#fdfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
          />
        </div>
      </div>

      {/* Leads List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-[#e8e2d5]">
            <p className="text-xs text-[#626c66]">Loading lead records & calculating intent scores...</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-[#e8e2d5] shadow-xs">
            <Users className="w-8 h-8 text-[#626c66] mx-auto mb-2 opacity-50" />
            <h4 className="font-bold text-sm text-[#0f2d22]">No Leads Recorded Yet</h4>
            <p className="text-xs text-[#626c66] max-w-md mx-auto mt-1">
              Leads will automatically appear here when visitors engage via WhatsApp CTA, product enquiries, wholesale forms, or custom quote requests.
            </p>
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const maskedPhone = `+91 ${lead.mobile.slice(0, 3)}****${lead.mobile.slice(-3)}`;
            const waLink = `https://wa.me/91${lead.mobile}?text=${encodeURIComponent(
              `Namaste ${lead.name}, regarding your inquiry for ${lead.productName || 'Pure Sojat Henna'} on Musky Dose.`
            )}`;

            return (
              <div
                key={lead.leadId}
                className="bg-white p-5 rounded-2xl border border-[#e8e2d5] shadow-xs hover:border-[#c8d1ca] transition-all space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#e8f5e9] text-[#1b4332] flex items-center justify-center font-bold text-sm shrink-0 border border-[#c8e6c9]">
                      {lead.leadScore}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#0f2d22]">{lead.name}</h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f4efe6] text-[#626c66]">
                          {lead.leadType}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            lead.intentLevel === 'VERY_HIGH'
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : lead.intentLevel === 'HIGH'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          }`}
                        >
                          {lead.intentLevel} INTENT
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#626c66] mt-1">
                        <span>{maskedPhone}</span>
                        <span>•</span>
                        <span>Source: {lead.source}</span>
                        <span>•</span>
                        <span>Seen: {new Date(lead.lastActivityAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={waLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-[#25D366] text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[#1EBE5D] transition-colors shadow-xs"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </a>
                    <button
                      onClick={() => handleOpenFollowUp(lead)}
                      className="inline-flex items-center gap-1.5 bg-[#1b4332] text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[#0f2d22] transition-colors shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Follow-Up Draft
                    </button>
                  </div>
                </div>

                {/* Requirement & Product */}
                <div className="bg-[#fcfbf9] p-3 rounded-xl border border-[#e8e2d5] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0f2d22]">
                      Target Product: {lead.productName || 'Pure Sojat Henna Powder'}
                    </span>
                    {lead.quantity && (
                      <span className="text-[#626c66] font-bold">Qty: {lead.quantity}</span>
                    )}
                  </div>
                  {lead.requirement && (
                    <p className="text-[#626c66] italic">&ldquo;{lead.requirement}&rdquo;</p>
                  )}
                  {lead.scoreReasons?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2 pt-1 border-t border-[#e8e2d5]">
                      {lead.scoreReasons.map((r, i) => (
                        <span
                          key={i}
                          className="text-[10px] bg-white px-2 py-0.5 rounded-md border border-[#e8e2d5] text-[#626c66]"
                        >
                          ✓ {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#f4efe6]">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-[#626c66] font-bold mr-1">Status:</span>
                    {(['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTE_SENT', 'WON', 'LOST'] as CentralLeadStatus[]).map(
                      (st) => (
                        <button
                          key={st}
                          onClick={() => handleUpdateStatus(lead.leadId, st)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            lead.status === st
                              ? 'bg-[#1b4332] text-white shadow-xs'
                              : 'bg-[#f4efe6] text-[#626c66] hover:bg-[#e8e2d5]'
                          }`}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Follow-Up Recommendation Modal */}
      {activeFollowUpLead && followUpRec && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl border border-[#e8e2d5] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-3">
              <div>
                <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
                  Intelligent Follow-Up Recommendation
                </h3>
                <p className="text-xs text-[#626c66]">
                  For {activeFollowUpLead.name} ({activeFollowUpLead.leadType})
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveFollowUpLead(null);
                  setFollowUpRec(null);
                }}
                className="text-[#626c66] hover:text-[#0f2d22]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-[#fcfbf9] p-3 rounded-xl border border-[#e8e2d5] text-xs">
                <span className="font-bold text-[#0f2d22] block">Recommended Action:</span>
                <span className="text-indigo-900 font-bold mt-0.5 block">{followUpRec.action}</span>
                <span className="text-[11px] text-[#626c66] mt-1 block">Reason: {followUpRec.reason}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0f2d22] mb-1">
                  Suggested WhatsApp / SMS Message Draft:
                </label>
                <div className="bg-[#f9f8f6] p-3 rounded-xl border border-[#e8e2d5] text-xs text-[#0f2d22] font-mono leading-relaxed whitespace-pre-wrap">
                  {followUpRec.suggestedMessage}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#e8e2d5]">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(followUpRec.suggestedMessage);
                  setCopiedDraft(true);
                  setTimeout(() => setCopiedDraft(false), 2000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#f4efe6] text-[#1b4332] rounded-xl text-xs font-bold hover:bg-[#e8e2d5] transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedDraft ? 'Copied to Clipboard!' : 'Copy Draft'}
              </button>

              <a
                href={`https://wa.me/91${activeFollowUpLead.mobile}?text=${encodeURIComponent(
                  followUpRec.suggestedMessage
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  handleUpdateStatus(activeFollowUpLead.leadId, 'CONTACTED', 'Follow-up message sent via WhatsApp');
                  setActiveFollowUpLead(null);
                }}
                className="inline-flex items-center gap-1.5 bg-[#25D366] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#1EBE5D] transition-colors shadow-xs"
              >
                <MessageCircle className="w-4 h-4" />
                Send via WhatsApp & Mark Contacted
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Manual Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateManualLead}
            className="bg-white w-full max-w-lg rounded-2xl border border-[#e8e2d5] shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-3">
              <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
                Add B2B / Wholesale Lead
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#626c66] hover:text-[#0f2d22]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">Business / Contact Name *</label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. Royal Bridal Mehendi Studio"
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">Mobile / WhatsApp Number *</label>
                <input
                  type="tel"
                  required
                  value={addMobile}
                  onChange={(e) => setAddMobile(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Lead Type</label>
                  <select
                    value={addType}
                    onChange={(e) => setAddType(e.target.value as CentralLeadType)}
                    className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
                  >
                    <option value="WHOLESALE">Wholesale Buyer</option>
                    <option value="MEHNDI_ARTIST">Mehndi Artist</option>
                    <option value="SALON">Salon / Beauty Spa</option>
                    <option value="RESELLER">Reseller</option>
                    <option value="MANUFACTURER">B2B / Manufacturer</option>
                    <option value="RETAIL">Retail Consumer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Quantity</label>
                  <input
                    type="text"
                    value={addQuantity}
                    onChange={(e) => setAddQuantity(e.target.value)}
                    placeholder="e.g. 50kg / 500 units"
                    className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">Specific Requirement / Notes</label>
                <textarea
                  rows={3}
                  value={addRequirement}
                  onChange={(e) => setAddRequirement(e.target.value)}
                  placeholder="e.g. Looking for pure 5-sieve Sojat henna for bridal season dispatch..."
                  className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e8e2d5]">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-[#f4efe6] text-[#626c66] rounded-xl text-xs font-bold hover:bg-[#e8e2d5]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#1b4332] text-white rounded-xl text-xs font-bold hover:bg-[#0f2d22] shadow-xs"
              >
                Save Lead Record
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
