'use client';

import React, { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

export default function GrowthImportsPage() {
  const [importType, setImportType] = useState<'MARKETS' | 'KEYWORDS' | 'LEADS' | 'COMPETITORS'>('LEADS');
  const [csvContent, setCsvContent] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvContent(event.target?.result as string || '');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvContent) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/growth/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importType, csvContent }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setResult(data.importSummary);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Growth AI — Import Center">
      <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-6">
        <div className="border-b border-[#e8e2d5] pb-4">
          <h3 className="font-serif-heading font-bold text-xl text-[#0f2d22]">
            CSV Dataset Import Portal
          </h3>
          <p className="text-xs text-[#626c66] mt-0.5">
            Import verified markets, B2B lead datasets, search keywords, or regional competitor price logs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block font-bold text-xs text-gray-700 mb-1">Select Import Entity Type</label>
              <select
                value={importType}
                onChange={(e) => setImportType(e.target.value as any)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none"
              >
                <option value="LEADS">B2B Leads & Wholesale CRM (CSV)</option>
                <option value="KEYWORDS">Search Query Demand (CSV)</option>
                <option value="MARKETS">Regional Markets & Cities (CSV)</option>
                <option value="COMPETITORS">Competitor Intelligence (CSV)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-xs text-gray-700 mb-1">Upload CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#e8f3ed] file:text-[#1b4332] hover:file:bg-[#d4e7dc]"
              />
            </div>

            <button
              onClick={handleImport}
              disabled={!csvContent || loading}
              className="w-full py-2.5 bg-[#1b4332] text-white font-bold text-xs rounded-xl hover:bg-[#0f2d22] disabled:opacity-50"
            >
              {loading ? 'Processing Import...' : 'Run Dataset Import'}
            </button>
          </div>

          <div className="md:col-span-2 space-y-4">
            <div>
              <label className="block font-bold text-xs text-gray-700 mb-1">CSV Content Preview</label>
              <textarea
                rows={8}
                value={csvContent}
                onChange={(e) => setCsvContent(e.target.value)}
                placeholder="Paste CSV text here or upload file..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-mono text-xs focus:bg-white focus:outline-none"
              />
            </div>

            {result && (
              <div className="bg-[#fdfbf7] p-5 rounded-xl border border-[#e8e2d5] space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Import Execution Finished</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs pt-2 border-t">
                  <div>
                    <span className="text-gray-500 block">Total Rows</span>
                    <span className="font-bold text-[#0f2d22]">{result.totalRows}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Imported</span>
                    <span className="font-bold text-emerald-700">{result.importedRows}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Skipped</span>
                    <span className="font-bold text-amber-700">{result.skippedRows}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Errors</span>
                    <span className="font-bold text-rose-700">{result.errorCount}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
