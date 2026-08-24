'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application Runtime Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#fcfbf7] flex items-center justify-center p-6 text-[#0f2d22]">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[#e8e2d5] p-8 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif-heading text-2xl font-bold text-[#0f2d22]">
            Something went wrong
          </h2>
          <p className="text-xs text-[#626c66] leading-relaxed">
            We encountered an unexpected issue while loading this page. Please try again or return to the main catalog.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-[#1b4332] text-white px-4 py-3 rounded-xl font-bold text-xs shadow hover:bg-[#0f2d22]"
          >
            <RefreshCw className="w-4 h-4 text-[#c5a059]" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-[#f5f1e8] text-[#0f2d22] px-4 py-3 rounded-xl font-bold text-xs border border-[#e8e2d5] hover:bg-[#e8e2d5]"
          >
            <Home className="w-4 h-4" />
            <span>Go Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
