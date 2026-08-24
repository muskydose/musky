'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { GrowthRecommendation } from '@/lib/growth/types';
import EvidenceModal from '@/components/growth/EvidenceModal';
import FreshnessBadge from '@/components/growth/FreshnessBadge';
import { ShieldCheck, ArrowRight, CheckCircle2, HelpCircle } from 'lucide-react';

export default function GrowthRecommendationsPage() {
  const [recommendations, setRecommendations] = useState<GrowthRecommendation[]>([]);
  const [selectedRec, setSelectedRec] = useState<GrowthRecommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    try {
      const res = await fetch('/api/admin/growth/recommendations');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setRecommendations(data.recommendations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/admin/growth/recommendations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) fetchRecommendations();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminLayout title="Growth AI — Evidence-Based Growth Advice">
      <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-6">
        <div className="border-b border-[#e8e2d5] pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#1b4332]" />
            <h3 className="font-serif-heading font-bold text-xl text-[#0f2d22]">
              Transparent Evidence-Backed Recommendations
            </h3>
          </div>
          <p className="text-xs text-[#626c66] mt-0.5">
            Every AI advice item explains exact mathematical evidence and source attribution before execution
          </p>
        </div>

        {recommendations.length === 0 ? (
          <div className="p-12 text-center bg-[#faf8f5] rounded-xl border border-dashed border-[#e8e2d5]">
            <p className="font-bold text-gray-700 text-sm">No verified recommendation records available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendations.map((rec) => (
              <div key={rec.id} className="bg-[#fdfbf7] p-5 rounded-2xl border border-[#e8e2d5] shadow-2xs space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-serif-heading font-bold text-[#0f2d22] text-base">{rec.title}</h4>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-amber-100 text-amber-900">
                      {rec.priority} Priority
                    </span>
                  </div>

                  <p className="text-xs text-[#333] leading-relaxed">{rec.reason}</p>

                  <div className="bg-white p-3 rounded-xl border border-[#e8e2d5] space-y-1">
                    <p className="text-[11px] font-bold text-gray-500 uppercase">Supporting Verified Data</p>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {rec.supportingMetrics.map((sm, i) => (
                        <div key={i} className="text-xs">
                          <span className="text-gray-500">{sm.label}: </span>
                          <span className="font-bold text-[#0f2d22]">{sm.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#e8e2d5] flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedRec(rec)}
                    className="text-xs font-bold text-[#1b4332] hover:underline flex items-center gap-1"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Inspect Evidence Proof</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {rec.status !== 'Accepted' && (
                      <button
                        onClick={() => handleUpdateStatus(rec.id, 'Accepted')}
                        className="px-3 py-1 bg-[#1b4332] text-white font-bold text-xs rounded-lg hover:bg-[#0f2d22]"
                      >
                        Accept Advice
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <EvidenceModal recommendation={selectedRec} onClose={() => setSelectedRec(null)} />
    </AdminLayout>
  );
}
