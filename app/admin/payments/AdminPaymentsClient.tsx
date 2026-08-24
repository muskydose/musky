'use client';

import React, { useState } from 'react';
import { PaymentSettings } from '@/lib/types';
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Save,
  ShieldCheck,
  Smartphone,
  Lock,
  MessageCircle,
} from 'lucide-react';

interface AdminPaymentsClientProps {
  initialPaymentSettings: PaymentSettings;
}

export default function AdminPaymentsClient({
  initialPaymentSettings,
}: AdminPaymentsClientProps) {
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(initialPaymentSettings);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentSettings }),
      });

      const data = await res.json();
      if (data.success) {
        setPaymentSettings(data.paymentSettings);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (e) {
      console.error('Failed to update payment settings:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {savedSuccess && (
        <div className="bg-emerald-100 border border-emerald-400 text-emerald-800 text-xs p-4 rounded-xl font-bold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <span>Payment Toggle Settings Updated Successfully!</span>
        </div>
      )}

      {/* Main Mode Toggle Warning Banner */}
      <div
        className={`p-6 rounded-2xl border-2 shadow-xs transition-colors ${
          paymentSettings.onlinePaymentEnabled
            ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
            : 'bg-amber-50 border-amber-500 text-amber-950'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-xl shrink-0 ${
              paymentSettings.onlinePaymentEnabled
                ? 'bg-emerald-600 text-white'
                : 'bg-amber-600 text-white'
            }`}
          >
            {paymentSettings.onlinePaymentEnabled ? (
              <CreditCard className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-serif-heading font-extrabold text-xl">
                Online Payment Status:{' '}
                {paymentSettings.onlinePaymentEnabled ? 'ACTIVE / ON' : 'DISABLED / OFF (DEFAULT)'}
              </h3>
            </div>
            <p className="text-xs leading-relaxed font-medium">
              {paymentSettings.onlinePaymentEnabled
                ? 'Online payment checkout forms and payment gateways are active for customers.'
                : 'Online payment is strictly OFF by default. Customers order directly via WhatsApp. Payment gateways remain dormant until toggled ON.'}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-6 text-xs">
        
        {/* Toggle Controls */}
        <div className="space-y-4">
          <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22] border-b border-[#e8e2d5] pb-2">
            Payment Method Architecture Toggles
          </h3>

          <div className="p-4 rounded-xl bg-[#fcfbf7] border border-[#e8e2d5] space-y-4">
            {/* Primary WhatsApp Ordering Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-[#25D366] fill-[#25D366]" />
                <div>
                  <div className="font-bold text-[#0f2d22]">WhatsApp Direct Ordering (Primary)</div>
                  <div className="text-[11px] text-gray-600">Customers send pre-filled item enquiries directly to business WhatsApp</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentSettings.whatsappOrderEnabled}
                  onChange={(e) =>
                    setPaymentSettings({ ...paymentSettings, whatsappOrderEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#25D366]"></div>
              </label>
            </div>

            {/* Online Payment Master Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-amber-700" />
                <div>
                  <div className="font-bold text-[#0f2d22]">Online Payment Gateway Master Toggle</div>
                  <div className="text-[11px] text-amber-800">Must remain OFF until live gateway credentials are verified</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentSettings.onlinePaymentEnabled}
                  onChange={(e) =>
                    setPaymentSettings({ ...paymentSettings, onlinePaymentEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1b4332]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Prepared Gateway Configurations */}
        <div className="space-y-4 pt-4 border-t border-[#f5f1e8]">
          <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22] border-b border-[#e8e2d5] pb-2">
            Prepared Future Gateway Configurations
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#0f2d22] font-bold mb-1">Business UPI VPA / ID</label>
              <input
                type="text"
                value={paymentSettings.upiId || ''}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, upiId: e.target.value })}
                placeholder="muskydose@upi"
                className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block text-[#0f2d22] font-bold mb-1">UPI Registered Merchant Name</label>
              <input
                type="text"
                value={paymentSettings.upiMerchantName || ''}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, upiMerchantName: e.target.value })}
                placeholder="Musky Dose Enterprise"
                className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl"
              />
            </div>

            <div>
              <label className="block text-[#0f2d22] font-bold mb-1">Gateway Environment</label>
              <select
                value={paymentSettings.gatewayMode}
                onChange={(e: any) => setPaymentSettings({ ...paymentSettings, gatewayMode: e.target.value })}
                className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-bold text-[#0f2d22]"
              >
                <option value="sandbox">Sandbox / Test Mode</option>
                <option value="live">Live Production Mode</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-4 rounded-xl bg-[#f5f1e8] text-xs text-[#626c66] flex items-center gap-3 border border-[#e8e2d5]">
          <Lock className="w-5 h-5 text-[#1b4332] shrink-0" />
          <span>
            Sensitive payment keys and secrets stay in environment variables on the server-side only. Frontend code never exposes API secrets.
          </span>
        </div>

        {/* Submit Button */}
        <div className="pt-6 border-t border-[#e8e2d5] flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-[#1b4332] text-white px-7 py-3.5 rounded-xl font-bold text-xs shadow hover:bg-[#0f2d22] transition-colors"
          >
            <Save className="w-4 h-4 text-[#c5a059]" />
            <span>{saving ? 'Saving...' : 'Save Payment Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
