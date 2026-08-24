'use client';

import React from 'react';
import { SiteSettings } from '@/lib/types';
import { Truck, DollarSign, Package } from 'lucide-react';

interface DeliveryShippingTabProps {
  settings: SiteSettings;
  updateField: (key: keyof SiteSettings, value: any) => void;
}

export default function DeliveryShippingTab({ settings, updateField }: DeliveryShippingTabProps) {
  return (
    <div className="space-y-6">
          <div className="space-y-6">
            <div className="border-b border-[#e8e2d5] pb-3">
              <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22]">Delivery Rules & Shipping Fees</h3>
              <p className="text-gray-500 mt-1">Configure minimum order requirements, shipping charges, and delivery notes.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">Standard Shipping Fee (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={settings.shippingFee ?? 0}
                  onChange={(e) => updateField('shippingFee', parseFloat(e.target.value) || 0)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-bold text-[#0f2d22]"
                  placeholder="0 (Shipping Charges Extra)"
                />
                <p className="text-gray-500 text-[10px] mt-1">Set to 0 if shipping charges are extra or calculated separately on order confirmation.</p>
              </div>

              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">Free Shipping Order Threshold (Optional ₹)</label>
                <input
                  type="number"
                  min={0}
                  value={settings.freeShippingThreshold ?? 0}
                  onChange={(e) => updateField('freeShippingThreshold', parseFloat(e.target.value) || 0)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-bold text-[#0f2d22]"
                  placeholder="0 (Disabled / Extra)"
                />
              </div>

              <div>
                <label className="block font-bold text-[#0f2d22] mb-1">Minimum Order Subtotal (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={settings.minOrderAmount ?? 0}
                  onChange={(e) => updateField('minOrderAmount', parseFloat(e.target.value) || 0)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-bold text-[#0f2d22]"
                  placeholder="0 (No minimum)"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-[#0f2d22] mb-1">Public Delivery & Dispatch Message</label>
                <input
                  type="text"
                  value={settings.deliveryMessage || ''}
                  onChange={(e) => updateField('deliveryMessage', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-[#0f2d22]"
                  placeholder="Direct dispatch from Sojat City, Rajasthan via Express Courier within 24-48 hours."
                />
              </div>
            </div>
          </div>
    </div>
  );
}
