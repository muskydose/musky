'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, Sparkles, X, ChevronRight, Check } from 'lucide-react';
import { CentralLeadType } from '@/lib/growth/types';

interface SmartLeadCaptureProps {
  productId?: string;
  productName?: string;
  categoryId?: string;
  defaultIntent?: 'RETAIL' | 'ARTIST' | 'BULK' | 'WHOLESALE' | 'GENERAL';
}

export default function SmartLeadCapture({
  productId,
  productName,
  categoryId,
  defaultIntent = 'GENERAL',
}: SmartLeadCaptureProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [leadType, setLeadType] = useState<CentralLeadType>('RETAIL');
  const [requirement, setRequirement] = useState('');
  const [quantity, setQuantity] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check dismissal cooldown (dismissed within 24h)
    const dismissedAt = localStorage.getItem('musky_lead_cta_dismissed');
    if (dismissedAt) {
      const diffHours = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60);
      if (diffHours < 24) {
        setIsDismissed(true);
      }
    }

    // Set default lead type based on prop
    if (defaultIntent === 'ARTIST') setLeadType('MEHNDI_ARTIST');
    else if (defaultIntent === 'BULK') setLeadType('WHOLESALE');
    else if (defaultIntent === 'WHOLESALE') setLeadType('WHOLESALE');
    else setLeadType('RETAIL');
  }, [defaultIntent]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('musky_lead_cta_dismissed', Date.now().toString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile || mobile.replace(/\D/g, '').length < 10) return;

    try {
      setLoading(true);
      const res = await fetch('/api/leads/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name || 'Valued Visitor',
          mobile,
          leadType,
          productId,
          productName: productName || 'Pure Sojat Henna Powder',
          categoryId,
          requirement,
          quantity,
          source: leadType === 'WHOLESALE' ? 'WHOLESALE_ENQUIRY' : 'PRODUCT_ENQUIRY',
          landingPage: typeof window !== 'undefined' ? window.location.pathname : '/',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSubmitted(true);
        if (data.whatsappUrl) {
          window.open(data.whatsappUrl, '_blank');
        }
        setTimeout(() => {
          setIsOpen(false);
          setIsDismissed(true);
        }, 2000);
      }
    } catch (err) {
      console.error('Lead capture error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (isDismissed) return null;

  const getCtaText = () => {
    if (defaultIntent === 'ARTIST') return 'Get Artist Price (Sojat Direct)';
    if (defaultIntent === 'BULK') return 'Get Bulk Price (25kg+)';
    if (defaultIntent === 'WHOLESALE') return 'Get Wholesale Quote';
    if (productName) return `Ask About ${productName.slice(0, 24)}...`;
    return 'Need Help? Ask on WhatsApp';
  };

  return (
    <>
      {/* Non-intrusive floating trigger chip */}
      <div className="fixed bottom-20 right-4 z-40">
        <div className="bg-[#0f2d22] text-white pl-4 pr-3 py-2 rounded-full shadow-lg border border-[#2d5a47] flex items-center gap-2 text-xs font-bold hover:bg-[#1b4332] transition-all">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 text-white hover:text-[#d4af37]"
          >
            <MessageCircle className="w-4 h-4 text-[#25D366]" />
            <span>{getCtaText()}</span>
          </button>
          <button
            onClick={handleDismiss}
            className="text-white/60 hover:text-white p-0.5 ml-1 rounded-full"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Enquiry Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-[#e8e2d5] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-3">
              <div>
                <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
                  {productName ? `Inquire: ${productName}` : 'Musky Dose Direct Support'}
                </h3>
                <p className="text-xs text-[#626c66]">
                  Direct from Sojat, Rajasthan • 100% Pure Chemical-Free
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#626c66] hover:text-[#0f2d22]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {submitted ? (
              <div className="text-center py-6 space-y-2">
                <Check className="w-10 h-10 text-[#25D366] mx-auto" />
                <h4 className="font-bold text-sm text-[#0f2d22]">Thank You! Opening WhatsApp...</h4>
                <p className="text-xs text-[#626c66]">
                  Our Sojat dispatch team is connecting with your requirement details.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">WhatsApp / Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#0f2d22] mb-1">Buyer Type</label>
                    <select
                      value={leadType}
                      onChange={(e) => setLeadType(e.target.value as CentralLeadType)}
                      className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
                    >
                      <option value="RETAIL">Personal Use</option>
                      <option value="MEHNDI_ARTIST">Bridal Artist</option>
                      <option value="SALON">Salon / Spa</option>
                      <option value="WHOLESALE">Wholesale / Bulk</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-[#0f2d22] mb-1">Quantity</label>
                    <input
                      type="text"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="e.g. 1kg / 25kg"
                      className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Requirement / Question</label>
                  <textarea
                    rows={2}
                    value={requirement}
                    onChange={(e) => setRequirement(e.target.value)}
                    placeholder="e.g. Inquiring about freshness, batch specifications, or delivery timeline..."
                    className="w-full px-3 py-2 bg-[#fdfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-[#25D366] text-white py-2.5 rounded-xl font-bold hover:bg-[#1EBE5D] transition-colors shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  {loading ? 'Submitting...' : 'Connect on WhatsApp'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

