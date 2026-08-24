'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import {
  Building2,
  Package,
  CheckCircle2,
  Send,
  MessageCircle,
  Truck,
  ShieldCheck,
  Award,
  Sparkles,
  Loader2,
  AlertCircle,
  Leaf,
} from 'lucide-react';
import { generateWholesaleWhatsAppMessage, getWhatsAppDirectUrl, getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import { SiteSettings } from '@/lib/types';
import { DEFAULT_TRUST_STRIP_ITEMS } from '@/lib/data-store';
import { getClientSiteSettings } from '@/lib/api-client';

function WholesaleContent() {
  const searchParams = useSearchParams();
  const mode = searchParams ? searchParams.get('mode') : null;
  const isBulkMode = mode === 'bulk';

  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    getClientSiteSettings().then((data) => {
      if (data) {
        setSiteSettings(data);
      }
    });
  }, []);

  const [formData, setFormData] = useState({
    customerName: '',
    businessName: '',
    phone: '',
    whatsapp: '',
    email: '',
    city: '',
    state: '',
    productsRequired: '',
    approxQuantity: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submittedEnquiry, setSubmittedEnquiry] = useState<any | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.customerName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Please enter your phone number.');
      return;
    }
    if (!formData.productsRequired.trim()) {
      setError('Please specify the products required.');
      return;
    }
    if (!formData.approxQuantity.trim()) {
      setError('Please specify approximate quantity required.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/wholesale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          enquiryType: isBulkMode ? 'bulk_order' : 'wholesale',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit enquiry.');
      }

      setSubmittedEnquiry(data.enquiry);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openDirectWhatsApp = async () => {
    setError('');

    if (submittedEnquiry) {
      const msg = generateWholesaleWhatsAppMessage(
        {
          customerName: submittedEnquiry.customerName,
          businessName: submittedEnquiry.businessName || (isBulkMode ? 'Bulk Order Enquiry' : 'Wholesale Buyer'),
          phone: submittedEnquiry.phone,
          whatsapp: submittedEnquiry.whatsapp || submittedEnquiry.phone,
          email: submittedEnquiry.email,
          city: submittedEnquiry.city,
          state: submittedEnquiry.state,
          productsRequired: submittedEnquiry.productsRequired,
          approxQuantity: submittedEnquiry.approxQuantity,
          notes: submittedEnquiry.notes,
        },
        siteSettings?.whatsappWholesaleMessageTemplate
      );

      const destNum = getConfiguredWhatsAppNumber(siteSettings);
      const url = getWhatsAppDirectUrl(destNum, msg);
      window.open(url, '_blank');
      return;
    }

    if (!formData.customerName.trim()) {
      setError('Please enter your full name before launching WhatsApp.');
      return;
    }
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile/WhatsApp number.');
      return;
    }
    if (!formData.productsRequired.trim()) {
      setError('Please specify the products required before launching WhatsApp.');
      return;
    }
    if (!formData.approxQuantity.trim()) {
      setError('Please specify approximate quantity required before launching WhatsApp.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/wholesale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          enquiryType: isBulkMode ? 'bulk_order' : 'wholesale',
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Unable to save your enquiry. Please try again.');
      }

      setSubmittedEnquiry(data.enquiry);

      const msg = generateWholesaleWhatsAppMessage(
        {
          customerName: formData.customerName.trim(),
          businessName: formData.businessName.trim() || (isBulkMode ? 'Bulk Order Enquiry' : 'Wholesale Buyer'),
          phone: formData.phone.trim(),
          whatsapp: formData.whatsapp.trim() || formData.phone.trim(),
          email: formData.email.trim(),
          city: formData.city.trim(),
          state: formData.state.trim(),
          productsRequired: formData.productsRequired.trim(),
          approxQuantity: formData.approxQuantity.trim(),
          notes: formData.notes.trim(),
        },
        siteSettings?.whatsappWholesaleMessageTemplate
      );

      const destNum = getConfiguredWhatsAppNumber(siteSettings);
      const url = getWhatsAppDirectUrl(destNum, msg);
      window.open(url, '_blank');
    } catch (err: any) {
      setError(err.message || 'Unable to save your enquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1f2421] flex flex-col">
      <Navbar siteSettings={siteSettings || undefined} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-[#0f2d22] text-white py-14 px-4 relative overflow-hidden">
          <div className="max-w-6xl mx-auto relative z-10 text-center space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1b4332] text-[#c5a059] border border-[#2d6a4f] text-xs font-bold uppercase tracking-wider">
              {isBulkMode ? (
                <>
                  <Sparkles className="w-4 h-4" /> Bulk Quantity & Custom Packs (5kg–100kg+)
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4" /> B2B Trade & Wholesale Supply
                </>
              )}
            </div>
            <h1 className="font-momo-display text-3xl md:text-5xl font-normal tracking-tight text-white max-w-3xl mx-auto">
              {isBulkMode
                ? 'Bulk Henna & Botanical Powder Direct From Sojat Factory'
                : siteSettings?.wholesaleHeroTitle || 'Bulk Henna & Herbal Supply Direct From Sojat, Rajasthan'}
            </h1>
            <p className="text-sm md:text-base text-[#b2c8be] max-w-2xl mx-auto leading-relaxed">
              {isBulkMode
                ? 'Order custom weight packs (5kg, 10kg, 25kg, 50kg, 100kg+), raw triple-sifted henna, indigo, and specialized botanical powders with fast factory dispatch.'
                : siteSettings?.wholesaleHeroSubtitle || 'We partner with salons, distributors, retailers, and exporters worldwide to supply 100% natural, triple-shifted Henna and traditional herbal products.'}
            </p>
          </div>
        </section>

        {/* Value Proposition Highlights */}
        {(() => {
          const iconMap: Record<string, React.ReactNode> = {
            Leaf: <Leaf className="w-8 h-8 text-[#c5a059] mx-auto" />,
            ShieldCheck: <ShieldCheck className="w-8 h-8 text-[#c5a059] mx-auto" />,
            Sparkles: <Sparkles className="w-8 h-8 text-[#c5a059] mx-auto" />,
            Truck: <Truck className="w-8 h-8 text-[#c5a059] mx-auto" />,
            Award: <Award className="w-8 h-8 text-[#c5a059] mx-auto" />,
            Package: <Package className="w-8 h-8 text-[#c5a059] mx-auto" />,
            Building2: <Building2 className="w-8 h-8 text-[#c5a059] mx-auto" />,
          };

          const trustItems = (siteSettings?.trustStripItems && siteSettings.trustStripItems.length > 0
            ? siteSettings.trustStripItems
            : DEFAULT_TRUST_STRIP_ITEMS
          )
            .filter((item) => item.enabled !== false)
            .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

          if (trustItems.length === 0) return null;

          return (
            <section className="py-10 px-4 bg-white border-b border-[#e8e2d5]">
              <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
                {trustItems.slice(0, 4).map((item) => (
                  <div key={item.id} className="p-4 rounded-xl bg-[#FAF8F5] border border-[#e8e2d5] space-y-2">
                    {item.icon && iconMap[item.icon] ? iconMap[item.icon] : <Award className="w-8 h-8 text-[#c5a059] mx-auto" />}
                    <h3 className="font-serif-heading font-bold text-sm text-[#0f2d22]">{item.title}</h3>
                    <p className="text-xs text-[#626c66]">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* Main Content Area: Form & Contact Info */}
        <section className="py-12 px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Form or Success State */}
            <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-6">
              {submittedEnquiry ? (
                <div className="text-center py-8 space-y-5 animate-in fade-in duration-300">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-momo-display text-2xl font-normal text-[#0f2d22]">
                      Wholesale Enquiry Received!
                    </h3>
                    <p className="text-xs text-[#626c66] max-w-md mx-auto">
                      Thank you, <strong className="text-[#0f2d22]">{submittedEnquiry.customerName}</strong>. Your inquiry has been saved under Reference Ref: <span className="font-mono font-bold text-[#1b4332]">{submittedEnquiry.id}</span>.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#e8e2d5] text-left text-xs space-y-2 max-w-md mx-auto">
                    <div><strong className="text-[#0f2d22]">Products Required:</strong> {submittedEnquiry.productsRequired}</div>
                    <div><strong className="text-[#0f2d22]">Approx Quantity:</strong> {submittedEnquiry.approxQuantity}</div>
                    <div><strong className="text-[#0f2d22]">Phone / WhatsApp:</strong> {submittedEnquiry.phone}</div>
                  </div>

                  <div className="pt-4 space-y-3">
                    <button
                      onClick={openDirectWhatsApp}
                      className="inline-flex items-center justify-center gap-2 w-full max-w-md py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all shadow-md"
                    >
                      <MessageCircle className="w-4 h-4" /> Connect Directly on WhatsApp
                    </button>
                    <button
                      onClick={() => setSubmittedEnquiry(null)}
                      className="block text-xs text-[#1b4332] underline hover:text-[#0f2d22] mx-auto font-semibold"
                    >
                      Submit Another Wholesale Enquiry
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="border-b border-[#e8e2d5] pb-3 mb-2">
                    <h2 className="font-momo-display text-xl sm:text-2xl font-normal text-[#0f2d22]">
                      {isBulkMode ? 'Bulk Order Requirement Form' : 'Request B2B Wholesale Quotation'}
                    </h2>
                    <p className="text-xs text-[#626c66]">
                      Fill in your business requirement below to receive custom factory pricing.
                    </p>
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#0f2d22] mb-1">
                        Full Name <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleChange}
                        placeholder="e.g. Rajesh Kumar"
                        required
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0f2d22] mb-1">
                        Business / Brand Name
                      </label>
                      <input
                        type="text"
                        name="businessName"
                        value={formData.businessName}
                        onChange={handleChange}
                        placeholder="e.g. Organics Salon / Herbal Traders"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#0f2d22] mb-1">
                        Phone / Mobile <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="10-digit mobile number"
                        required
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0f2d22] mb-1">
                        WhatsApp Number
                      </label>
                      <input
                        type="tel"
                        name="whatsapp"
                        value={formData.whatsapp}
                        onChange={handleChange}
                        placeholder="Same as mobile if blank"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#0f2d22] mb-1">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your@email.com"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0f2d22] mb-1">City</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="e.g. Jaipur / Mumbai"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0f2d22] mb-1">State</label>
                      <input
                        type="text"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        placeholder="e.g. Rajasthan"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0f2d22] mb-1">
                      Products Required <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      name="productsRequired"
                      rows={2}
                      value={formData.productsRequired}
                      onChange={handleChange}
                      placeholder="e.g. Triple Shifted Henna Powder, Indigo Powder, Amla-Reetha Mix"
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0f2d22] mb-1">
                      Approximate Quantity <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      name="approxQuantity"
                      value={formData.approxQuantity}
                      onChange={handleChange}
                      placeholder="e.g. 50 kg / 100 kg / 500 units"
                      required
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0f2d22] mb-1">
                      Additional Notes / Custom Packaging Instructions
                    </label>
                    <textarea
                      name="notes"
                      rows={2}
                      value={formData.notes}
                      onChange={handleChange}
                      placeholder="Mention any specific sifting mesh grade, packaging preferences, or delivery target date..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                    />
                  </div>

                  <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 rounded-xl bg-[#0f2d22] hover:bg-[#1b4332] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> Submit Requirement
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={openDirectWhatsApp}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" /> Order/Enquire via WhatsApp
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Right Column: B2B Support & Factory Desk */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-[#0f2d22] text-white p-6 rounded-2xl border border-[#2d6a4f] space-y-4">
                <h3 className="font-serif-heading text-lg font-bold text-[#c5a059]">
                  Factory Direct Supply Desk
                </h3>
                <p className="text-xs text-[#b2c8be] leading-relaxed">
                  Musky Dose operates direct processing mills in Sojat City. We ensure batch-to-batch consistency and lab-grade purity for all wholesale shipments.
                </p>

                <div className="space-y-3 pt-2 text-xs">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#c5a059] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">Batch Testing:</strong> Lawsone content tested per batch before dispatch.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#c5a059] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">Minimum Order Quantity:</strong> Retail packs from 5kg+; Bulk bags from 25kg+.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-[#c5a059] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-white">Private Labeling:</strong> OEM contract manufacturing and white-label pouch filling available.
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#2d6a4f] text-xs space-y-1">
                  <div className="font-bold text-white">Need Urgent Wholesale Quotation?</div>
                  <div className="text-[#b2c8be]">Call our factory sales team directly at:</div>
                  <a
                    href={`tel:${siteSettings?.displayPhone || '+91 82337 03080'}`}
                    className="inline-flex items-center gap-2 text-sm font-mono font-bold text-[#c5a059] hover:underline"
                  >
                    {siteSettings?.displayPhone || '+91 82337 03080'}
                  </a>
                  <p className="text-[11px] text-[#b2c8be] pt-1">
                    To receive a quotation on WhatsApp, please complete the required form with your requirement details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer siteSettings={siteSettings || undefined} />
      <WhatsAppFloat />
    </div>
  );
}

export default function WholesaleClient() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0f2d22] flex items-center justify-center p-8 text-[#c5a059]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <WholesaleContent />
    </Suspense>
  );
}
