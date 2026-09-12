'use client';

import React, { useState, useEffect } from 'react';
import { SiteSettings, WholesaleEnquiry } from '@/lib/types';
import { formatPrice } from '@/lib/utils';
import { trackWholesaleInquirySubmitted } from '@/lib/analytics';
import { generateWholesaleWhatsAppMessage, getConfiguredWhatsAppNumber, getWhatsAppDirectUrl } from '@/lib/whatsapp';
import { BuyerPersona, PERSONA_CONFIGS } from './PersonaSwitcher';
import InquirySuccessModal from './InquirySuccessModal';
import { Send, MessageCircle, AlertCircle, Loader2, ChevronRight, ChevronLeft, Building, MapPin, FileText } from 'lucide-react';

interface FormDataState {
  customerName: string;
  businessName: string;
  businessType: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  state: string;
  pincode: string;
  gstin: string;
  productsRequired: string;
  approxQuantity: string;
  notes: string;
}

interface WholesaleInquiryFormProps {
  siteSettings?: SiteSettings | null;
  activePersona: BuyerPersona;
  externalQuoteData?: {
    productName: string;
    quantity: number;
    quantityUnit: string;
    estimatedTotal: number;
    effectivePricePerUnit: number;
    pricingUnit: string;
    tierName: string;
    savingsAmount?: number;
    savingsPercent?: number;
  } | null;
}

export default function WholesaleInquiryForm({
  siteSettings,
  activePersona,
  externalQuoteData,
}: WholesaleInquiryFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTaxDetails, setShowTaxDetails] = useState(false);
  const [submittedEnquiry, setSubmittedEnquiry] = useState<WholesaleEnquiry | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState('');

  const [formData, setFormData] = useState<FormDataState>({
    customerName: '',
    businessName: '',
    businessType: PERSONA_CONFIGS[activePersona]?.defaultBusinessType || 'SALON',
    phone: '',
    whatsapp: '',
    email: '',
    city: '',
    state: '',
    pincode: '',
    gstin: '',
    productsRequired: '',
    approxQuantity: '',
    notes: '',
  });

  // Sync business type with active persona if user hasn't explicitly set it differently
  useEffect(() => {
    const defaultType = PERSONA_CONFIGS[activePersona]?.defaultBusinessType;
    if (defaultType) {
      setFormData((prev) => ({
        ...prev,
        businessType: defaultType,
      }));
    }
  }, [activePersona]);

  // Sync external quote data from calculator
  useEffect(() => {
    if (externalQuoteData) {
      setFormData((prev) => {
        if (prev.customerName && prev.phone.replace(/\D/g, '').length >= 10) {
          setStep(2);
        }
        const savingsText = externalQuoteData.savingsAmount && externalQuoteData.savingsAmount > 0
          ? ` (You Save: ₹${Math.round(externalQuoteData.savingsAmount)} / ${Math.round(externalQuoteData.savingsPercent || 0)}% OFF)`
          : '';
        const quoteNote = `Quote: ₹${Math.round(externalQuoteData.effectivePricePerUnit)}/${externalQuoteData.quantityUnit || externalQuoteData.pricingUnit} (Est. Total: ~₹${Math.round(externalQuoteData.estimatedTotal)})${savingsText}`;
        const finalNotes = prev.notes
          ? (prev.notes.includes('Quote:') ? prev.notes : `${quoteNote} | ${prev.notes}`)
          : quoteNote;
        return {
          ...prev,
          productsRequired: `${externalQuoteData.productName} (${externalQuoteData.tierName})`,
          approxQuantity: `${externalQuoteData.quantity} ${externalQuoteData.quantityUnit}`,
          notes: finalNotes,
        };
      });
    }
  }, [externalQuoteData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const validateStep1 = (): boolean => {
    if (!formData.customerName.trim()) {
      setError('Please enter your full name.');
      return false;
    }
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit mobile or WhatsApp number.');
      return false;
    }
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      setError('Please enter a valid email address or leave blank.');
      return false;
    }
    setError('');
    return true;
  };

  const validateFullForm = (): boolean => {
    if (!validateStep1()) {
      setStep(1);
      return false;
    }
    if (!formData.productsRequired.trim()) {
      setError('Please specify the products or grades required.');
      setStep(2);
      return false;
    }
    if (!formData.approxQuantity.trim()) {
      setError('Please specify approximate volume / quantity.');
      setStep(2);
      return false;
    }
    if (formData.pincode.trim() && !/^\d{6}$/.test(formData.pincode.trim())) {
      setError('Please enter a valid 6-digit Indian PIN code or leave blank.');
      setStep(2);
      setShowTaxDetails(true);
      return false;
    }
    if (formData.gstin.trim() && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(formData.gstin.trim())) {
      setError('Please enter a valid 15-character GSTIN or leave blank.');
      setStep(2);
      setShowTaxDetails(true);
      return false;
    }
    return true;
  };

  const prepareEnquiryPayload = () => {
    const cleanPhone = formData.phone.replace(/\D/g, '');
    const cleanWhatsapp = formData.whatsapp ? formData.whatsapp.replace(/\D/g, '') : cleanPhone;

    // Compile optional tax & pincode into notes safely
    const extraDetails = [
      formData.pincode ? `[Delivery Pincode: ${formData.pincode.trim()}]` : '',
      formData.gstin ? `[GSTIN: ${formData.gstin.trim().toUpperCase()}]` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const compiledNotes = [extraDetails, formData.notes.trim()].filter(Boolean).join(' | ');

    return {
      customerName: formData.customerName.trim(),
      businessName: formData.businessName.trim(),
      businessType: formData.businessType || undefined,
      phone: cleanPhone,
      whatsapp: cleanWhatsapp,
      email: formData.email.trim(),
      city: formData.city.trim(),
      state: formData.state.trim(),
      productsRequired: formData.productsRequired.trim(),
      approxQuantity: formData.approxQuantity.trim(),
      notes: compiledNotes,
      enquiryType: 'wholesale',
    };
  };

  const submitEnquiryToBackend = async (payload: ReturnType<typeof prepareEnquiryPayload>) => {
    const res = await fetch('/api/wholesale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || 'Failed to register wholesale enquiry. Please check your connection.');
    }
    return data.enquiry as WholesaleEnquiry;
  };

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateFullForm()) return;

    setLoading(true);
    setError('');

    try {
      const payload = prepareEnquiryPayload();
      const savedEnquiry = await submitEnquiryToBackend(payload);

      // Track telemetry
      trackWholesaleInquirySubmitted({
        productsRequired: payload.productsRequired,
        approxQuantity: payload.approxQuantity,
      });

      // Build WhatsApp URL with registered reference ID
      const msg = generateWholesaleWhatsAppMessage(
        {
          customerName: payload.customerName,
          businessName: payload.businessName || 'Wholesale Partner',
          businessType: payload.businessType,
          phone: payload.phone,
          whatsapp: payload.whatsapp,
          email: payload.email,
          city: payload.city,
          state: payload.state,
          productsRequired: payload.productsRequired,
          approxQuantity: payload.approxQuantity,
          notes: payload.notes,
          referenceId: savedEnquiry.id,
        },
        siteSettings?.whatsappWholesaleMessageTemplate
      );

      const destNum = getConfiguredWhatsAppNumber(siteSettings);
      const url = getWhatsAppDirectUrl(destNum, msg);

      setWhatsappUrl(url);
      setSubmittedEnquiry(savedEnquiry);
    } catch (err: any) {
      setError(err.message || 'Unable to submit your requirement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppSubmit = async () => {
    if (!validateFullForm()) return;

    setLoading(true);
    setError('');

    try {
      const payload = prepareEnquiryPayload();
      const savedEnquiry = await submitEnquiryToBackend(payload);

      // Track telemetry
      trackWholesaleInquirySubmitted({
        productsRequired: payload.productsRequired,
        approxQuantity: payload.approxQuantity,
      });

      // Build WhatsApp URL with registered reference ID
      const msg = generateWholesaleWhatsAppMessage(
        {
          customerName: payload.customerName,
          businessName: payload.businessName || 'Wholesale Partner',
          businessType: payload.businessType,
          phone: payload.phone,
          whatsapp: payload.whatsapp,
          email: payload.email,
          city: payload.city,
          state: payload.state,
          productsRequired: payload.productsRequired,
          approxQuantity: payload.approxQuantity,
          notes: payload.notes,
          referenceId: savedEnquiry.id,
        },
        siteSettings?.whatsappWholesaleMessageTemplate
      );

      const destNum = getConfiguredWhatsAppNumber(siteSettings);
      const url = getWhatsAppDirectUrl(destNum, msg);

      setWhatsappUrl(url);
      setSubmittedEnquiry(savedEnquiry);

      // Open WhatsApp in new tab non-destructively
      if (typeof window !== 'undefined') {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to submit your requirement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSubmittedEnquiry(null);
    setWhatsappUrl('');
    setStep(1);
  };

  // If successfully submitted, display non-destructive success modal
  if (submittedEnquiry) {
    return (
      <InquirySuccessModal
        enquiry={submittedEnquiry}
        whatsappUrl={whatsappUrl}
        onReset={handleReset}
      />
    );
  }

  return (
    <div className="bg-white border border-[#e8e2d5] rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
      {/* Form Header */}
      <div className="border-b border-[#e8e2d5] pb-3.5 flex items-center justify-between">
        <div>
          <h3 className="font-momo-display text-xl sm:text-2xl font-normal text-[#0f2d22]">
            Get Your Factory Quote
          </h3>
          <p className="text-xs text-[#626c66] mt-0.5">
            Tell us what you need and we’ll prepare your commercial enquiry.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-1 text-[11px] font-bold text-[#88908a]">
          <span className={`px-2.5 py-0.5 rounded-full ${step === 1 ? 'bg-[#1b4332] text-[#c5a059]' : 'bg-[#FAF8F5]'}`}>
            Step 1
          </span>
          <span>/</span>
          <span className={`px-2.5 py-0.5 rounded-full ${step === 2 ? 'bg-[#1b4332] text-[#c5a059]' : 'bg-[#FAF8F5]'}`}>
            Step 2
          </span>
        </div>
      </div>

      {/* Calculator-Selected Quotation Capsule */}
      {externalQuoteData && (
        <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#e8e2d5] flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1b4332] text-[#c5a059] flex items-center justify-center font-bold text-xs shrink-0">
              ✓
            </div>
            <div>
              <div className="font-bold text-[#0f2d22]">{externalQuoteData.productName}</div>
              <div className="text-[11px] text-[#626c66]">
                Volume: <strong>{externalQuoteData.quantity} {externalQuoteData.quantityUnit}</strong> • Rate: <strong>₹{Math.round(externalQuoteData.effectivePricePerUnit)}/{externalQuoteData.quantityUnit || externalQuoteData.pricingUnit}</strong>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#88908a] uppercase font-bold tracking-wider">Estimated Total</div>
            <div className="font-mono text-sm font-extrabold text-[#1b4332]">
              ~{formatPrice(externalQuoteData.estimatedTotal)}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleStandardSubmit} className="space-y-4">
        {/* STEP 1: Contact & Business Profile */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="customerName" className="block text-xs font-bold text-[#0f2d22] mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  id="customerName"
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  placeholder="e.g. Rajesh Sharma"
                  required
                  aria-required="true"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] text-[#1f2421] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332] min-h-[40px]"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-bold text-[#0f2d22] mb-1">
                  Mobile / WhatsApp Number <span className="text-rose-600">*</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  required
                  aria-required="true"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] text-[#1f2421] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332] min-h-[40px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="businessType" className="block text-xs font-bold text-[#0f2d22] mb-1">
                  Business / Buyer Profile
                </label>
                <select
                  id="businessType"
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] text-[#1f2421] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332] min-h-[40px]"
                >
                  <option value="SALON">Beauty Salon / Parlour / Spa</option>
                  <option value="MEHNDI_ARTIST">Bridal Mehndi Artist / Studio</option>
                  <option value="COSMETICS_SHOP">Cosmetics Shop / Herbal Retailer</option>
                  <option value="RESELLER">Wholesale Distributor / Reseller</option>
                  <option value="WHOLESALE">Bulk Commercial Sourcing (Mandi / 25kg+ Sacks)</option>
                  <option value="MANUFACTURER">Contract Manufacturing / OEM</option>
                  <option value="OTHER">Other Commercial Entity</option>
                </select>
              </div>

              <div>
                <label htmlFor="businessName" className="block text-xs font-bold text-[#0f2d22] mb-1">
                  Business / Brand Name <span className="text-[#88908a] font-normal">(Optional)</span>
                </label>
                <input
                  id="businessName"
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  placeholder="e.g. Elegance Salon & Spa"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] text-[#1f2421] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332] min-h-[40px]"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (validateStep1()) setStep(2);
                }}
                className="py-2.5 px-5 rounded-xl bg-[#0f2d22] hover:bg-[#1b4332] text-[#c5a059] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer min-h-[42px]"
              >
                <span>Continue to Order Details</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Products, Destination & Logistics */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label htmlFor="productsRequired" className="block text-xs font-bold text-[#0f2d22] mb-1">
                  Products Required <span className="text-rose-600">*</span>
                </label>
                <input
                  id="productsRequired"
                  type="text"
                  name="productsRequired"
                  value={formData.productsRequired}
                  onChange={handleChange}
                  placeholder="e.g. Ultra-Fine Sifted Henna Powder, Indigo Powder"
                  required
                  aria-required="true"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] text-[#1f2421] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332] min-h-[40px]"
                />
              </div>

              <div>
                <label htmlFor="approxQuantity" className="block text-xs font-bold text-[#0f2d22] mb-1">
                  Approx. Volume <span className="text-rose-600">*</span>
                </label>
                <input
                  id="approxQuantity"
                  type="text"
                  name="approxQuantity"
                  value={formData.approxQuantity}
                  onChange={handleChange}
                  placeholder="e.g. 25 kg / 100 units"
                  required
                  aria-required="true"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] text-[#1f2421] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332] min-h-[40px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="city" className="block text-xs font-bold text-[#0f2d22] mb-1">
                  Delivery City
                </label>
                <input
                  id="city"
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="e.g. Jaipur / Mumbai"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] text-[#1f2421] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332] min-h-[40px]"
                />
              </div>

              <div>
                <label htmlFor="state" className="block text-xs font-bold text-[#0f2d22] mb-1">
                  Delivery State
                </label>
                <input
                  id="state"
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="e.g. Rajasthan / Maharashtra"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] text-[#1f2421] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332] min-h-[40px]"
                />
              </div>
            </div>

            {/* Optional Tax & Pincode Disclosure */}
            <div className="border border-[#e8e2d5] rounded-xl p-3 bg-[#FAF8F5]">
              <button
                type="button"
                onClick={() => setShowTaxDetails((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs font-semibold text-[#1b4332] hover:text-[#0f2d22] cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#c5a059]" />
                  <span>Business GSTIN & Delivery Pincode (Optional)</span>
                </span>
                <span className="text-xs font-mono">{showTaxDetails ? '− Hide' : '+ Add'}</span>
              </button>

              {showTaxDetails && (
                <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in duration-150">
                  <div>
                    <label htmlFor="pincode" className="block text-[11px] font-medium text-[#0f2d22] mb-1">
                      Delivery Pincode (for freight estimate)
                    </label>
                    <input
                      id="pincode"
                      type="text"
                      name="pincode"
                      maxLength={6}
                      value={formData.pincode}
                      onChange={handleChange}
                      placeholder="e.g. 302001"
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[#e8e2d5] bg-white text-[#1f2421] focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                    />
                  </div>

                  <div>
                    <label htmlFor="gstin" className="block text-[11px] font-medium text-[#0f2d22] mb-1">
                      GSTIN (for B2B Tax Invoice & ITC)
                    </label>
                    <input
                      id="gstin"
                      type="text"
                      name="gstin"
                      maxLength={15}
                      value={formData.gstin}
                      onChange={handleChange}
                      placeholder="15-character GSTIN"
                      className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-[#e8e2d5] bg-white text-[#1f2421] uppercase focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="notes" className="block text-xs font-bold text-[#0f2d22] mb-1">
                Packaging Instructions / Special Requirements
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={2}
                value={formData.notes}
                onChange={handleChange}
                placeholder="Specific packaging sizes, sifting requirements, or target delivery dates..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] text-[#1f2421] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch gap-2.5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-2.5 px-3 rounded-xl border border-[#e8e2d5] bg-white hover:bg-[#FAF8F5] text-[#626c66] font-semibold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer min-h-[44px]"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl bg-[#0f2d22] hover:bg-[#1b4332] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50 cursor-pointer min-h-[44px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registering Inquiry...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Quotation Request</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleWhatsAppSubmit}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-50 cursor-pointer min-h-[44px]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enquire via WhatsApp</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
