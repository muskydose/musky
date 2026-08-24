import React from 'react';
import { SourceTier, FreshnessStatus } from '@/lib/growth/types';
import { ShieldCheck, Database, Cpu, AlertCircle, Clock } from 'lucide-react';

interface FreshnessBadgeProps {
  tier?: SourceTier;
  status?: FreshnessStatus;
  sourceName?: string;
  showIcon?: boolean;
  className?: string;
}

export default function FreshnessBadge({
  tier,
  status,
  sourceName,
  showIcon = true,
  className = '',
}: FreshnessBadgeProps) {
  if (tier) {
    switch (tier) {
      case 'VERIFIED':
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 ${className}`}
            title={`Source: ${sourceName || 'First-Party Store Database'}`}
          >
            {showIcon && <ShieldCheck className="w-3 h-3 text-emerald-700" />}
            <span>VERIFIED FIRST-PARTY</span>
          </span>
        );
      case 'IMPORTED':
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 ${className}`}
            title={`Source: ${sourceName || 'CSV/Imported Dataset'}`}
          >
            {showIcon && <Database className="w-3 h-3 text-blue-700" />}
            <span>IMPORTED DATA</span>
          </span>
        );
      case 'DERIVED':
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 ${className}`}
            title="Derived from internal analytics"
          >
            {showIcon && <Cpu className="w-3 h-3 text-amber-700" />}
            <span>DERIVED METRIC</span>
          </span>
        );
      case 'ESTIMATED':
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 ${className}`}
            title="AI Estimate — Not verified"
          >
            {showIcon && <AlertCircle className="w-3 h-3 text-purple-700" />}
            <span>AI ESTIMATE — NOT VERIFIED</span>
          </span>
        );
    }
  }

  if (status) {
    switch (status) {
      case 'Fresh':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
            <Clock className="w-3 h-3" /> Fresh
          </span>
        );
      case 'Recent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3" /> Recent
          </span>
        );
      case 'Stale':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
            <AlertCircle className="w-3 h-3" /> Stale
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700">
            <AlertCircle className="w-3 h-3" /> Unavailable
          </span>
        );
    }
  }

  return null;
}
