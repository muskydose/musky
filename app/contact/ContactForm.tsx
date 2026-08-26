'use client';

import React, { useState } from 'react';
import { Send, MessageCircle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getWhatsAppDirectUrl, getConfiguredWhatsAppNumber } from '@/lib/whatsapp';

interface ContactFormProps {
  whatsappNumber: string;
}

export default function ContactForm({ whatsappNumber }: ContactFormProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    enquiryType: 'retail',
    message: '',
  });

  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState('');

  const enquiryTypeLabels: Record<string, string> = {
    retail: 'Retail Product Enquiry',
    wholesale: 'Bulk Wholesale / Export Enquiry',
    custom: 'Custom Henna Cone Supply',
    other: 'General Question',
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent duplicate submissions
    setError('');

    const cleanName = formData.fullName.trim();
    if (!cleanName || cleanName.length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile/WhatsApp number.');
      return;
    }
    const cleanMsg = formData.message.trim();
    if (!cleanMsg || cleanMsg.length < 3) {
      setError('Please enter your message or enquiry details (at least 3 characters).');
      return;
    }

    setIsSubmitting(true);

    const typeLabel = enquiryTypeLabels[formData.enquiryType] || formData.enquiryType;

    try {
      const res = await fetch('/api/wholesale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: cleanName,
          phone: cleanPhone,
          email: formData.email.trim(),
          productsRequired: `Contact Form: ${typeLabel}`,
          approxQuantity: 'N/A (Contact Form)',
          notes: cleanMsg,
          enquiryType: 'contact_form',
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to record your contact enquiry on the server. Please try again.');
      }

      // Format WhatsApp message with full user inputs
      const msgLines = [
        '👋 *Hello Musky Dose!*',
        'I am submitting a contact enquiry from your website:\n',
        `*Name:* ${cleanName}`,
        `*Phone:* ${cleanPhone}`,
        `*Email:* ${formData.email.trim() || 'Not provided'}`,
        `*Enquiry Type:* ${typeLabel}`,
        `*Message:*\n${cleanMsg}`,
      ];

      const messageText = msgLines.join('\n');
      const destNumber = getConfiguredWhatsAppNumber({ whatsappNumber });
      const waUrl = getWhatsAppDirectUrl(destNumber, messageText);

      setWhatsappUrl(waUrl);
      setSubmitted(true);

      if (typeof window !== 'undefined') {
        window.location.href = waUrl;
      }
    } catch (err: any) {
      setError(err.message || 'Unable to submit your contact inquiry. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-6">
      <div>
        <h3 className="font-serif-heading text-2xl font-bold text-[#0f2d22]">
          Send Us A Message
        </h3>
        <p className="text-xs text-[#626c66] mt-1">
          Fill out the form below to send your query directly to our Sojat team on WhatsApp.
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {submitted ? (
        <div className="p-6 rounded-2xl bg-[#e8f3ed] border border-[#2d6a4f]/30 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#1b4332] text-[#c5a059] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-serif-heading text-lg font-bold text-[#0f2d22]">
              Enquiry Submitted Successfully!
            </h4>
            <p className="text-xs text-[#2b302c] mt-1 leading-relaxed">
              Your message has been pre-formatted. If WhatsApp did not open automatically, click below to connect:
            </p>
          </div>
          <a
            href={whatsappUrl || '#'}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>Open WhatsApp Chat Now</span>
          </a>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setWhatsappUrl('');
              }}
              className="text-xs text-[#1b4332] underline font-semibold cursor-pointer"
            >
              Send another message
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#0f2d22] font-semibold mb-1">
                Your Full Name *
              </label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your name"
                className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
              />
            </div>

            <div>
              <label className="block text-[#0f2d22] font-semibold mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 82337 03080"
                className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#0f2d22] font-semibold mb-1">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your.email@example.com"
              className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
            />
          </div>

          <div>
            <label className="block text-[#0f2d22] font-semibold mb-1">
              Enquiry Type
            </label>
            <select
              name="enquiryType"
              value={formData.enquiryType}
              onChange={handleChange}
              className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332] font-medium text-[#0f2d22]"
            >
              <option value="retail">Retail Product Enquiry</option>
              <option value="wholesale">Bulk Wholesale / Export Enquiry</option>
              <option value="custom">Custom Henna Cone Supply</option>
              <option value="other">General Question</option>
            </select>
          </div>

          <div>
            <label className="block text-[#0f2d22] font-semibold mb-1">
              Your Message *
            </label>
            <textarea
              name="message"
              rows={4}
              required
              value={formData.message}
              onChange={handleChange}
              placeholder="Type your message or bulk quantity requirement here..."
              className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 bg-[#1b4332] text-white py-3.5 rounded-xl font-bold text-xs hover:bg-[#0f2d22] transition-colors shadow cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? 'Submitting Enquiry...' : 'Send Enquiry On WhatsApp'}</span>
          </button>
        </form>
      )}
    </div>
  );
}
