'use client';

import React from 'react';
import { SiteSettings, FAQItem } from '@/lib/types';
import { INITIAL_FAQ_ITEMS } from '@/lib/data-store';
import { HelpCircle, Plus, Trash2, ArrowUp, ArrowDown, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface FaqBuilderTabProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
}

export default function FaqBuilderTab({ settings, setSettings }: FaqBuilderTabProps) {
  const faqs = settings.faqItems && settings.faqItems.length > 0 ? settings.faqItems : INITIAL_FAQ_ITEMS;

  const handleAddFaq = () => {
    const newFaq: FAQItem = {
      id: `faq-${Date.now()}`,
      question: 'New Frequently Asked Question',
      answer: 'Detailed and informative answer for customers.',
      enabled: true,
      sortOrder: faqs.length + 1,
    };
    setSettings((prev) => ({ ...prev, faqItems: [...(prev.faqItems || INITIAL_FAQ_ITEMS), newFaq] }));
  };

  const handleUpdateFaq = (id: string, field: keyof FAQItem, value: any) => {
    const updated = faqs.map((faq) => (faq.id === id ? { ...faq, [field]: value } : faq));
    setSettings((prev) => ({ ...prev, faqItems: updated }));
  };

  const handleDeleteFaq = (id: string) => {
    const updated = faqs.filter((faq) => faq.id !== id);
    setSettings((prev) => ({ ...prev, faqItems: updated }));
  };

  const handleMoveFaq = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= faqs.length) return;
    const updated = [...faqs];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setSettings((prev) => ({ ...prev, faqItems: updated }));
  };

  const handleResetFaqs = () => {
    if (window.confirm('Reset all FAQs to default list?')) {
      setSettings((prev) => ({ ...prev, faqItems: INITIAL_FAQ_ITEMS }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#e8e2d5] p-6 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#e8f3ed] text-[#183F2B] rounded-xl">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0f2d22]">Store FAQ Builder</h2>
              <p className="text-xs text-[#626c66]">
                Manage questions and answers displayed across the FAQ page and product inquiries.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetFaqs}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-[#f5f1e8] text-[#0f2d22] rounded-xl hover:bg-[#e8e2d5] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Defaults</span>
            </button>
            <button
              type="button"
              onClick={handleAddFaq}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-[#183F2B] text-white rounded-xl hover:bg-[#123021] transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add FAQ</span>
            </button>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {faqs.map((faq, idx) => (
            <div key={faq.id} className="p-4 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#183F2B] bg-[#e8f3ed] px-2.5 py-0.5 rounded-full">
                  FAQ #{idx + 1}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleUpdateFaq(faq.id, 'enabled', !faq.enabled)}
                    className={`p-1.5 rounded-lg cursor-pointer ${
                      faq.enabled ? 'text-[#183F2B] hover:bg-[#e8f3ed]' : 'text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {faq.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveFaq(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 text-gray-500 hover:bg-white rounded-lg disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveFaq(idx, 'down')}
                    disabled={idx === faqs.length - 1}
                    className="p-1.5 text-gray-500 hover:bg-white rounded-lg disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteFaq(faq.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#626c66] mb-1">Question</label>
                <input
                  type="text"
                  value={faq.question}
                  onChange={(e) => handleUpdateFaq(faq.id, 'question', e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-sm text-[#0f2d22]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#626c66] mb-1">Answer</label>
                <textarea
                  rows={2}
                  value={faq.answer}
                  onChange={(e) => handleUpdateFaq(faq.id, 'answer', e.target.value)}
                  className="w-full p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-sm text-[#0f2d22]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
