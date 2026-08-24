'use client';

import React from 'react';
import { GrowthRecommendation, ScoreBreakdown } from '@/lib/growth/types';
import FreshnessBadge from './FreshnessBadge';
import { X, ShieldCheck, CheckCircle2, ArrowUpRight, HelpCircle } from 'lucide-react';

interface EvidenceModalProps {
  recommendation?: GrowthRecommendation | null;
  scoreBreakdown?: ScoreBreakdown | null;
  marketName?: string;
  onClose: () => void;
}

export default function EvidenceModal({
  recommendation,
  scoreBreakdown,
  marketName,
  onClose,
}: EvidenceModalProps) {
  if (!recommendation && !scoreBreakdown) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-[#e8e2d5] shadow-xl overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="bg-[#0f2d22] text-white p-5 flex items-center justify-between border-b border-[#2d6a4f]/40">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#c5a059]" />
              <h3 className="font-serif-heading font-bold text-lg">
                {recommendation ? 'Evidence & Data Proof' : `Opportunity Breakdown: ${marketName || 'Market'}`}
              </h3>
            </div>
            <p className="text-xs text-[#b2c8be] mt-0.5">
              Transparent source attribution and algorithmic reasoning
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {recommendation && (
            <>
              <div>
                <h4 className="font-bold text-[#0f2d22] text-base">{recommendation.title}</h4>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                    Priority: {recommendation.priority}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                    Confidence: {recommendation.confidence}
                  </span>
                </div>
              </div>

              <div className="bg-[#fdfbf7] p-4 rounded-xl border border-[#e8e2d5] space-y-2">
                <h5 className="text-xs font-bold text-[#1b4332] uppercase tracking-wider">
                  Algorithmic Explanation (WHY)
                </h5>
                <p className="text-xs text-[#333] leading-relaxed">{recommendation.reason}</p>
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-bold text-[#626c66] uppercase tracking-wider">
                  Supporting Verified Metrics
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {recommendation.supportingMetrics.map((metric, i) => (
                    <div key={i} className="bg-white p-3 rounded-lg border border-gray-200 shadow-2xs">
                      <p className="text-[11px] text-gray-500">{metric.label}</p>
                      <p className="font-bold text-[#0f2d22] text-sm mt-0.5">{metric.value}</p>
                      <FreshnessBadge tier={metric.sourceTier} className="mt-1" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h5 className="text-xs font-bold text-[#626c66] uppercase tracking-wider">
                  Data Sources Used
                </h5>
                <div className="flex flex-wrap gap-2">
                  {recommendation.dataSources.map((src, i) => (
                    <span key={i} className="text-xs font-medium px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {src}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {scoreBreakdown && (
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-[#626c66] uppercase tracking-wider">
                Score Components (Max 100 Points)
              </h5>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                  <span className="font-medium text-gray-700">Sales Performance</span>
                  <span className="font-bold text-[#0f2d22]">{scoreBreakdown.salesScore} / 30</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                  <span className="font-medium text-gray-700">Customer Growth & Repeat</span>
                  <span className="font-bold text-[#0f2d22]">{scoreBreakdown.growthScore} / 20</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                  <span className="font-medium text-gray-700">CRM Lead Volume</span>
                  <span className="font-bold text-[#0f2d22]">{scoreBreakdown.leadsScore} / 15</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                  <span className="font-medium text-gray-700">Wholesale Activity</span>
                  <span className="font-bold text-[#0f2d22]">{scoreBreakdown.wholesaleScore} / 15</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                  <span className="font-medium text-gray-700">Product Fit & AOV</span>
                  <span className="font-bold text-[#0f2d22]">{scoreBreakdown.productFitScore} / 10</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                  <span className="font-medium text-gray-700">Campaign Response</span>
                  <span className="font-bold text-[#0f2d22]">{scoreBreakdown.campaignResponseScore} / 10</span>
                </div>
                {scoreBreakdown.insufficientDataPenalty > 0 && (
                  <div className="flex justify-between items-center p-2 rounded bg-rose-50 text-rose-800 font-semibold border border-rose-200">
                    <span>Insufficient Data Penalty</span>
                    <span>-{scoreBreakdown.insufficientDataPenalty} pts</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1b4332] text-white font-bold text-xs rounded-xl hover:bg-[#0f2d22]"
          >
            Close Proof View
          </button>
        </div>
      </div>
    </div>
  );
}
