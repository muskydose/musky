'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, MessageCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { FAQItem, SiteSettings } from '@/lib/types';
import { getCmsText } from '@/lib/cms';
import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';

interface FaqViewClientProps {
  settings: SiteSettings;
  faqItems: FAQItem[];
}

export default function FaqViewClient({ settings, faqItems }: FaqViewClientProps) {
  const cms = getCmsText(settings);
  const activeWhatsAppNumber = getConfiguredWhatsAppNumber(settings);

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenModal = () => {
    setErrorMsg('');
    setUserName('');
    setUserPhone('');
    setQuestionText('');
    setShowQuestionModal(true);
  };

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanName = userName.trim();
    if (!cleanName || cleanName.length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }

    const cleanPhone = userPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile / WhatsApp number.');
      return;
    }

    const cleanText = questionText.trim();
    if (!cleanText || cleanText.length < 3) {
      setErrorMsg('Please enter your actual question (at least 3 characters).');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/wholesale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: cleanName,
          phone: cleanPhone,
          productsRequired: `FAQ Inquiry: ${cleanText}`,
          approxQuantity: 'N/A (Question)',
          notes: `FAQ question asked by ${cleanName} (${cleanPhone}).`,
          enquiryType: 'faq_question',
        }),
      });

      const data = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data?.error || 'Failed to record your question. Please try again.');
      }

      const text = encodeURIComponent(
        `FAQ Inquiry:\nName: ${cleanName}\nMobile: ${cleanPhone}\nQuestion: ${cleanText}\n\nSource: https://muskydose.in/faq`
      );
      setShowQuestionModal(false);
      const waUrl = `https://wa.me/${activeWhatsAppNumber}?text=${text}`;
      if (typeof window !== 'undefined') {
        window.location.href = waUrl;
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to save your question. Please try again.');
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
          <div className="relative z-10 space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#2d6a4f]/40 border border-[#2d6a4f] rounded-full text-xs font-bold text-[#c5a059] uppercase tracking-wider">
              <HelpCircle className="w-4 h-4" />
              <span>{cms.faqHeroBadge}</span>
            </div>
            <h1 className="font-serif-heading text-3xl sm:text-4xl font-bold tracking-tight">
              {cms.faqPageTitle}
            </h1>
            <p className="text-[#b2c8be] text-sm sm:text-base leading-relaxed">
              {cms.faqPageSubtitle}
            </p>
          </div>
        </div>

        {/* FAQ Accordion List */}
        {faqItems.length > 0 ? (
          <div className="space-y-4 mb-12">
            {faqItems.map((faq, idx) => (
              <details
                key={faq.id || idx}
                className="group bg-white border border-[#e8e2d5] rounded-2xl p-5 shadow-xs transition-all [&[open]]:border-[#1b4332] [&[open]]:ring-1 [&[open]]:ring-[#1b4332]"
              >
                <summary className="font-serif-heading font-bold text-base sm:text-lg text-[#0f2d22] cursor-pointer flex items-center justify-between list-none">
                  <span className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#f5f1e8] text-[#1b4332] text-xs font-bold flex items-center justify-center shrink-0">
                      Q{idx + 1}
                    </span>
                    <span>{faq.question}</span>
                  </span>
                  <span className="text-[#1b4332] group-open:rotate-180 transition-transform duration-200 text-lg">
                    ↓
                  </span>
                </summary>
                <div className="mt-4 pt-4 border-t border-[#f5f1e8] text-sm text-[#2d6a4f] leading-relaxed whitespace-pre-line pl-10">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#e8e2d5] p-8 rounded-2xl text-center space-y-3 mb-12">
            <ShieldCheck className="w-10 h-10 text-[#c5a059] mx-auto" />
            <h3 className="font-serif-heading text-lg font-bold">{cms.faqEmptyTitle}</h3>
            <p className="text-xs text-gray-500">
              {cms.faqEmptyDescription}
            </p>
          </div>
        )}

        {/* Still Have Questions CTA */}
        <div className="bg-[#e8f3ed] border border-[#2d6a4f]/30 p-8 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22]">{cms.faqStillHaveQuestionsTitle}</h3>
            <p className="text-xs text-[#1b4332] leading-relaxed max-w-md">
              {cms.faqStillHaveQuestionsSubtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenModal}
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold text-sm rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 fill-white text-[#25D366]" />
            <span>{cms.faqWhatsappCtaText}</span>
          </button>
        </div>
      </main>

      {/* FAQ Question Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#e8e2d5] space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
                Ask Your Specific Question
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
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f2d22] mb-1">
                  10-Digit Mobile / WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={userPhone}
                  onChange={(e) => setUserPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f2d22] mb-1">
                  Type your question below <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="e.g., What is the delivery time to Delhi? How long does Sojat Henna stain last?"
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
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
                  className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>{isSubmitting ? 'Saving...' : 'Send Question on WhatsApp'}</span>
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
