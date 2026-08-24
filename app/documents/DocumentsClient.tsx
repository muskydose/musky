'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import OfferBanner from '@/components/OfferBanner';
import {
  Award,
  ShieldCheck,
  FileCheck,
  Download,
  ExternalLink,
  Search,
  CheckCircle2,
  Calendar,
  Building,
  X,
  Copy,
  Check,
  MessageCircle,
  ArrowRight,
  FileText,
  BadgeAlert,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { BusinessContentItem, SiteSettings } from '@/lib/types';
import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';

interface DocumentsClientProps {
  initialItems: BusinessContentItem[];
  siteSettings: SiteSettings;
}

export default function DocumentsClient({ initialItems, siteSettings }: DocumentsClientProps) {
  const [items] = useState<BusinessContentItem[]>(initialItems || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'CERTIFICATE' | 'DOCUMENT' | 'BADGE'>('ALL');
  const [selectedItem, setSelectedItem] = useState<BusinessContentItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.shortDescription && item.shortDescription.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.certificateNumber && item.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.issuingAuthority && item.issuingAuthority.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTab = activeTab === 'ALL' || item.type.toUpperCase() === activeTab;

    return matchesSearch && matchesTab;
  });

  const [showCoaModal, setShowCoaModal] = useState(false);
  const [coaName, setCoaName] = useState('');
  const [coaPhone, setCoaPhone] = useState('');
  const [coaReq, setCoaReq] = useState('');
  const [coaError, setCoaError] = useState('');
  const [coaSubmitting, setCoaSubmitting] = useState(false);

  const handleOpenCoaModal = () => {
    setCoaError('');
    setShowCoaModal(true);
  };

  const handleSendCoaInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setCoaError('');

    const trimmedName = coaName.trim();
    if (trimmedName.length < 2) {
      setCoaError('Please enter your full name or company name (at least 2 characters).');
      return;
    }

    const cleanPhone = coaPhone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setCoaError('Please enter a valid 10-digit mobile / WhatsApp number.');
      return;
    }

    const trimmedReq = coaReq.trim();
    if (!trimmedReq) {
      setCoaError('Please describe the specific COA report or lab testing required.');
      return;
    }

    setCoaSubmitting(true);

    try {
      const response = await fetch('/api/wholesale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: trimmedName,
          phone: cleanPhone,
          whatsapp: cleanPhone,
          enquiryType: 'coa_inquiry',
          productsRequired: 'COA / Lab Testing Request',
          notes: trimmedReq,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to record COA request in database. Please check your connection and try again.');
      }

      // ONLY AFTER database success, open WhatsApp and close modal
      const num = getConfiguredWhatsAppNumber(siteSettings);
      const text = encodeURIComponent(
        `B2B COA / Testing Request:\nName: ${trimmedName}\nPhone: ${cleanPhone}\nRequired Test / COA: ${trimmedReq}\n\nSource: muskydose.in/documents`
      );

      setShowCoaModal(false);
      setCoaName('');
      setCoaPhone('');
      setCoaReq('');
      window.open(`https://wa.me/${num}?text=${text}`, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setCoaError(err.message || 'Failed to submit COA request. Please try again.');
    } finally {
      setCoaSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f6f0] text-[#1f2421] flex flex-col font-sans">
      <OfferBanner />
      <Navbar />

      {/* Hero Header */}
      <section className="bg-gradient-to-b from-[#0f2d22] to-[#1b4332] text-white pt-12 pb-16 px-4 border-b border-[#c5a059]/30">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#c5a059]/20 border border-[#c5a059]/40 rounded-full text-[#c5a059] text-xs font-semibold uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            Verified & Compliant Enterprise
          </div>

          <h1 className="text-3xl md:text-5xl font-momo-display font-normal text-white tracking-tight">
            Official Business Certificates & Lab Reports
          </h1>

          <p className="max-w-2xl mx-auto text-sm md:text-base text-[#e8f3ed]/90 leading-relaxed font-light">
            Review official GST registrations, FSSAI compliance licenses, ISO 9001 quality certificates, and NABL lab analysis COA reports for Musky Dose pure Sojat Henna.
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-6 text-xs text-[#c5a059] font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Government GST & MSME Registered
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> FSSAI Approved Process Facility
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 100% Zero PPD / Chemical Dyes
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-10 space-y-8">
        {/* Search & Tabs Controls */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-[#2d6a4f]/20">
          {/* Tab Filter Pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'ALL', label: 'All Content' },
              { id: 'CERTIFICATE', label: 'Certificates & Licenses' },
              { id: 'DOCUMENT', label: 'Lab Reports & COA' },
              { id: 'BADGE', label: 'Trust Badges' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#0f2d22] text-[#c5a059] shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, GST, ISO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/40"
            />
          </div>
        </div>

        {/* Documents Grid */}
        {filteredItems.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-[#2d6a4f]/20 my-8">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-[#0f2d22]">No documents found</h3>
            <p className="text-xs text-gray-500 mt-1">Try clearing your search term or switching tabs.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#2d6a4f]/20 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between group"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="text-[10px] font-bold tracking-widest uppercase bg-[#f5f1e8] text-[#0f2d22] px-2.5 py-1 rounded-md border border-[#c5a059]/30">
                      {item.type}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                    </span>
                  </div>

                  <h2 className="text-lg font-momo-display font-normal text-[#0f2d22] group-hover:text-[#2d6a4f] transition-colors line-clamp-2">
                    {item.title}
                  </h2>

                  {item.shortDescription && (
                    <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                      {item.shortDescription}
                    </p>
                  )}

                  {/* Cert details box */}
                  <div className="mt-4 p-3 bg-[#f8f6f0] rounded-xl border border-gray-200/80 space-y-1.5 text-xs text-gray-700">
                    {item.certificateNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-medium text-[11px]">Ref No:</span>
                        <div className="flex items-center gap-1 font-mono font-bold text-gray-800">
                          <span>{item.certificateNumber}</span>
                          <button
                            onClick={() => handleCopy(item.certificateNumber!, `num-${item.id}`)}
                            title="Copy Ref No"
                            className="p-1 text-gray-400 hover:text-[#0f2d22]"
                          >
                            {copiedId === `num-${item.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {item.issuingAuthority && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-medium text-[11px]">Authority:</span>
                        <span className="font-medium text-gray-800 line-clamp-1">{item.issuingAuthority}</span>
                      </div>
                    )}

                    {item.issueDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 font-medium text-[11px]">Issue Date:</span>
                        <span className="text-gray-700">{item.issueDate}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="inline-flex items-center gap-1 text-[#0f2d22] font-bold hover:text-[#2d6a4f] transition-colors"
                  >
                    View Details & PDF
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    {item.fileUrl && item.downloadEnabled ? (
                      <a
                        href={item.fileUrl}
                        download
                        className="p-2 text-[#2d6a4f] bg-white border border-[#2d6a4f]/20 hover:bg-[#e8f3ed] rounded-lg transition-colors"
                        title="Download Document"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                        Document on File — Available on Request
                      </span>
                    )}
                    {item.verificationUrl && (
                      <a
                        href={item.verificationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-[#c5a059] bg-white border border-[#c5a059]/30 hover:bg-[#f5f1e8] rounded-lg transition-colors"
                        title="Verify at Government Portal"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* B2B / Custom Lab Report CTA */}
        <section className="bg-gradient-to-r from-[#0f2d22] via-[#1b4332] to-[#0f2d22] text-white p-8 rounded-2xl shadow-md border border-[#c5a059]/40 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#c5a059]/20 text-[#c5a059] rounded-full text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Custom Wholesale COA & Export Testing
            </div>
            <h3 className="text-xl md:text-2xl font-momo-display font-normal text-white">
              Need Batch-Specific Lab Reports or Bulk COA Certificates?
            </h3>
            <p className="text-xs md:text-sm text-[#e8f3ed]/80 max-w-xl">
              We provide comprehensive heavy-metal testing, microbiological analysis, and lawsone percentage lab COAs for export shipments and wholesale distributors directly from Sojat.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCoaModal}
            className="shrink-0 inline-flex items-center gap-2 bg-[#25d366] text-white hover:bg-[#20ba5a] px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 fill-current" />
            <span>Request Custom COA / Lab Test</span>
          </button>
        </section>
      </main>

      {/* Modal Detail & PDF Viewer */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-[#2d6a4f]/30 max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-5 right-5 p-2 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#f5f1e8] text-[#c5a059] flex items-center justify-center shrink-0 border border-[#c5a059]/30">
                  <Award className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-[#2d6a4f] bg-[#e8f3ed] px-2.5 py-0.5 rounded-md">
                    {selectedItem.type}
                  </span>
                  <h2 className="text-xl md:text-2xl font-momo-display font-normal text-[#0f2d22] mt-1">
                    {selectedItem.title}
                  </h2>
                </div>
              </div>

              {selectedItem.shortDescription && (
                <p className="text-sm text-gray-600 leading-relaxed font-medium bg-[#f8f6f0] p-4 rounded-xl border border-gray-200">
                  {selectedItem.shortDescription}
                </p>
              )}

              {selectedItem.longDescription && (
                <div className="text-xs text-gray-700 leading-relaxed space-y-2">
                  <h4 className="font-bold text-[#0f2d22] uppercase tracking-wider text-[11px]">Detailed Scope & Compliance:</h4>
                  <p className="whitespace-pre-line">{selectedItem.longDescription}</p>
                </div>
              )}

              {/* Data Table */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200/80 space-y-2.5 text-xs text-gray-700">
                {selectedItem.certificateNumber && (
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <span className="text-gray-500 font-medium">Certificate / Reference No:</span>
                    <div className="flex items-center gap-2 font-mono font-bold text-gray-900">
                      <span>{selectedItem.certificateNumber}</span>
                      <button
                        onClick={() => handleCopy(selectedItem.certificateNumber!, 'modal-num')}
                        className="text-[#2d6a4f] hover:underline text-[11px]"
                      >
                        {copiedId === 'modal-num' ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                )}

                {selectedItem.issuingAuthority && (
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <span className="text-gray-500 font-medium">Issuing Authority:</span>
                    <span className="font-bold text-gray-900">{selectedItem.issuingAuthority}</span>
                  </div>
                )}

                {selectedItem.issueDate && (
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <span className="text-gray-500 font-medium">Date of Issue:</span>
                    <span className="font-medium text-gray-800">{selectedItem.issueDate}</span>
                  </div>
                )}

                {selectedItem.expiryDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Expiry / Renewal Date:</span>
                    <span className="font-medium text-gray-800">{selectedItem.expiryDate}</span>
                  </div>
                )}
              </div>

              {/* Actions Button Group */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                {selectedItem.fileUrl && (
                  <a
                    href={selectedItem.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-[#0f2d22] text-[#c5a059] hover:bg-[#1b4332] py-3 px-4 rounded-xl font-bold text-xs shadow-sm transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Open / Download Official Document PDF
                  </a>
                )}

                {selectedItem.verificationUrl && (
                  <a
                    href={selectedItem.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 border border-[#c5a059] text-[#0f2d22] hover:bg-[#f5f1e8] py-3 px-4 rounded-xl font-bold text-xs transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-[#c5a059]" />
                    Verify on Official Portal
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom COA Inquiry Modal */}
      {showCoaModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#2d6a4f]/30 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
                Custom Wholesale COA / Lab Testing Request
              </h3>
              <button
                type="button"
                onClick={() => setShowCoaModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {coaError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {coaError}
              </div>
            )}

            <form onSubmit={handleSendCoaInquiry} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#0f2d22] mb-1">
                  Name / Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={coaName}
                  onChange={(e) => setCoaName(e.target.value)}
                  placeholder="e.g. Ramesh Exports / Herbal Care Ltd"
                  className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0f2d22] mb-1">
                  Mobile / WhatsApp Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={coaPhone}
                  onChange={(e) => setCoaPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0f2d22] mb-1">
                  Required Lab Testing / COA Scope <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={coaReq}
                  onChange={(e) => setCoaReq(e.target.value)}
                  placeholder="e.g. Need Lawsone % assay report, Heavy Metal analysis, and Microbiological test for 500kg batch export..."
                  className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCoaModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={coaSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>{coaSubmitting ? 'Recording Request...' : 'Request COA on WhatsApp'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
