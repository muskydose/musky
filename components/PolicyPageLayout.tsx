'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { SiteSettings, PolicyContent } from '@/lib/types';
import { getCmsText } from '@/lib/cms';
import { ArrowLeft, FileText, AlertCircle, MessageCircle } from 'lucide-react';

import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import { renderDynamicContent } from '@/lib/utils';

interface PolicyPageLayoutProps {
  settings: SiteSettings | null;
  policyKey: 'shippingPolicy' | 'returnRefundPolicy' | 'privacyPolicy' | 'termsConditions' | 'cancellationPolicy';
  defaultTitle: string;
}

export default function PolicyPageLayout({
  settings,
  policyKey,
  defaultTitle,
}: PolicyPageLayoutProps) {
  const policy: PolicyContent | undefined = settings?.[policyKey];
  const cms = getCmsText(settings);
  const isEnabled = policy?.enabled === true;
  const whatsappNumber = getConfiguredWhatsAppNumber(settings);

  const title = policy?.title || defaultTitle;
  const summary = policy?.summary || '';
  const content = policy?.content || '';
  const updatedAt = policy?.updatedAt || new Date().toISOString().split('T')[0];

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenModal = () => {
    setErrorMsg('');
    setFullName('');
    setPhone('');
    setQuestionText('');
    setShowQuestionModal(true);
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedName = fullName.trim();
    if (trimmedName.length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile / WhatsApp number.');
      return;
    }

    const cleanText = questionText.trim();
    if (cleanText.length < 3) {
      setErrorMsg('Please enter your specific question (at least 3 characters).');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/wholesale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: trimmedName,
          phone: cleanPhone,
          whatsapp: cleanPhone,
          enquiryType: 'policy_question',
          productsRequired: `Policy Question (${title})`,
          notes: cleanText,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to record question in database. Please check your connection and try again.');
      }

      // ONLY AFTER database success, open WhatsApp and close modal
      const text = encodeURIComponent(
        `Policy Question regarding ${title}:\nName: ${trimmedName}\nPhone: ${cleanPhone}\nQuestion: ${cleanText}\n\nSource: Policy Page (${title})`
      );

      setShowQuestionModal(false);
      setFullName('');
      setPhone('');
      setQuestionText('');
      window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit question. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfbf7] flex flex-col text-[#0f2d22]">
      <Navbar siteSettings={settings || undefined} />

      <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-[#1b4332] hover:text-[#c5a059] transition-colors bg-white px-3.5 py-2 rounded-xl border border-[#e8e2d5] shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Hero Header */}
        <div className="bg-[#0f2d22] text-[#f5f1e8] p-8 sm:p-12 rounded-3xl mb-10 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#1b4332] rounded-full blur-3xl opacity-30 pointer-events-none" />
          <div className="relative z-10 space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#2d6a4f]/40 border border-[#2d6a4f] rounded-full text-xs font-bold text-[#c5a059] uppercase tracking-wider">
              <FileText className="w-4 h-4" />
              <span>{cms.policyHeroBadge}</span>
            </div>
            <h1 className="font-serif-heading text-3xl sm:text-4xl font-bold tracking-tight">
              {title}
            </h1>
            {summary && <p className="text-[#b2c8be] text-sm sm:text-base leading-relaxed">{summary}</p>}
            <p className="text-[11px] text-[#2d6a4f] font-mono pt-2">Last Updated: {updatedAt}</p>
          </div>
        </div>

        {/* Content Body or Unpublished Notice */}
        {isEnabled ? (
          <div className="bg-white border border-[#e8e2d5] p-6 sm:p-10 rounded-3xl shadow-xs mb-12 space-y-6">
            <div className="prose prose-emerald max-w-none text-sm text-[#0f2d22] leading-relaxed whitespace-pre-line font-sans">
              {renderDynamicContent(content, settings)}
            </div>
          </div>
        ) : (
          <div className="bg-amber-50/80 border border-amber-200/80 p-8 sm:p-12 rounded-3xl text-center space-y-4 mb-12 shadow-xs">
            <AlertCircle className="w-12 h-12 text-amber-600 mx-auto shrink-0" />
            <h3 className="font-serif-heading text-xl font-bold text-amber-950">
              {cms.policyNotPublishedTitle}
            </h3>
            <p className="text-xs sm:text-sm text-amber-900 leading-relaxed max-w-lg mx-auto">
              {cms.policyNotPublishedMessage}
            </p>
          </div>
        )}

        {/* WhatsApp Contact Helper Banner */}
        <div className="bg-[#e8f3ed] border border-[#2d6a4f]/30 p-8 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="space-y-1.5 text-center sm:text-left">
            <h3 className="font-serif-heading text-lg font-bold text-[#0f2d22]">{cms.policyNeedSupportTitle}</h3>
            <p className="text-xs text-[#1b4332] leading-relaxed">
              {cms.policyNeedSupportMessage}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-xs rounded-xl transition-all shadow-md shrink-0 hover:scale-102 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-white text-[#25D366]" />
            <span>{cms.policyContactWhatsappText}</span>
          </button>
        </div>
      </main>

      {/* Policy Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e8e2d5] space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
                Ask Question — {title}
              </h3>
              <button
                type="button"
                onClick={() => setShowQuestionModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmitQuestion} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0f2d22] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f2d22] mb-1">
                  Mobile / WhatsApp Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f2d22] mb-1">
                  Your Question <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder={`Type your question regarding ${title}...`}
                  className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>{isSubmitting ? 'Recording Question...' : 'Send Question on WhatsApp'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer siteSettings={settings || undefined} />
    </div>
  );
}
