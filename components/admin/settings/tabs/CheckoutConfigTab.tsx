'use client';

import React from 'react';
import { SiteSettings, CheckoutFieldConfig, CheckoutFieldSetting } from '@/lib/types';
import { DEFAULT_CHECKOUT_FIELD_CONFIG } from '@/lib/data-store';
import { ShoppingCart, CheckSquare, Square, AlertCircle, Eye, EyeOff, Check } from 'lucide-react';

interface CheckoutConfigTabProps {
  settings: SiteSettings;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
}

export default function CheckoutConfigTab({ settings, setSettings }: CheckoutConfigTabProps) {
  const currentConfig: CheckoutFieldConfig = settings.checkoutFieldConfig || DEFAULT_CHECKOUT_FIELD_CONFIG;

  const toggleCheckoutField = (field: keyof CheckoutFieldConfig, prop: 'enabled' | 'required') => {
    const fieldSetting = currentConfig[field] || { enabled: true, required: false };
    const currentVal = fieldSetting[prop];
    const updatedSetting: CheckoutFieldSetting = {
      ...fieldSetting,
      [prop]: !currentVal,
      ...(prop === 'required' && !currentVal ? { enabled: true } : {}),
    };

    const updatedConfig: CheckoutFieldConfig = {
      ...currentConfig,
      [field]: updatedSetting,
    };

    setSettings((prev) => ({
      ...prev,
      checkoutFieldConfig: updatedConfig,
    }));
  };

  const FIELD_LABELS: Record<keyof CheckoutFieldConfig, string> = {
    fullName: 'Customer Full Name',
    mobile: 'Mobile Phone Number',
    whatsapp: 'WhatsApp Contact Number',
    email: 'Email Address',
    houseShop: 'Flat / House / Shop No.',
    address: 'Full Street Address',
    area: 'Area / Landmark Colony',
    landmark: 'Nearest Landmark',
    city: 'City / Town',
    state: 'State / Province',
    pincode: 'PIN / Postal Code',
    notes: 'Order Delivery Notes',
  };

  const ESSENTIAL_FIELDS: (keyof CheckoutFieldConfig)[] = ['fullName', 'mobile', 'address', 'city', 'state', 'pincode'];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#e8e2d5] p-6 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#e8f3ed] text-[#183F2B] rounded-xl">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#0f2d22]">Checkout Fields Configuration</h2>
            <p className="text-xs text-[#626c66]">
              Enable or require customer address fields during web cart and WhatsApp checkout.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {(Object.keys(FIELD_LABELS) as (keyof CheckoutFieldConfig)[]).map((field) => {
            const label = FIELD_LABELS[field];
            const cfg = currentConfig[field] || { enabled: true, required: false };
            const isEssential = ESSENTIAL_FIELDS.includes(field);

            return (
              <div
                key={field}
                className="flex items-center justify-between p-3.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl"
              >
                <div>
                  <div className="text-sm font-semibold text-[#0f2d22]">{label}</div>
                  <div className="text-[11px] text-[#626c66] mt-0.5">
                    {cfg.required ? 'Mandatory' : cfg.enabled ? 'Optional' : 'Disabled'}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCheckoutField(field, 'enabled')}
                    disabled={isEssential}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                      cfg.enabled
                        ? 'bg-[#183F2B] text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    } ${isEssential ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {cfg.enabled ? 'Enabled' : 'Disabled'}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleCheckoutField(field, 'required')}
                    disabled={!cfg.enabled || isEssential}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer ${
                      cfg.required
                        ? 'bg-[#9A4F32] text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    } ${!cfg.enabled || isEssential ? 'opacity-70 cursor-not-allowed' : ''}`}
                  >
                    {cfg.required ? 'Required' : 'Optional'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
