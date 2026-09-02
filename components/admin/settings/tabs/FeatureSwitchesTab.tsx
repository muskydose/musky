'use client';

import React from 'react';
import { SiteSettings, FeatureFlags, PaymentConfig, ShippingConfig, InvoiceConfig } from '@/lib/types';
import {
  Sparkles,
  CreditCard,
  Package,
  Boxes,
  Users,
  Tag,
  Truck,
  FileText,
  Bell,
  Layers,
  BarChart3,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface FeatureSwitchesTabProps {
  settings: SiteSettings;
  updateField: (key: keyof SiteSettings, value: any) => void;
}

export default function FeatureSwitchesTab({ settings, updateField }: FeatureSwitchesTabProps) {
  const flags: FeatureFlags = settings.featureFlags || {
    onlinePaymentsEnabled: false,
    wholesaleEnabled: true,
    inventoryEnabled: false,
    customerAccountsEnabled: false,
    couponsEnabled: true,
    shippingIntegrationEnabled: false,
    invoiceEnabled: true,
    notificationsEnabled: false,
    recommendationsEnabled: true,
    analyticsEnabled: true,
    multilingualEnabled: false,
    exportModeEnabled: false,
  };

  const paymentCfg: PaymentConfig = settings.paymentConfig || {
    provider: 'razorpay',
    enabled: false,
    mode: 'test',
    keyId: '',
    merchantName: 'Musky Dose',
  };

  const invoiceCfg: InvoiceConfig = settings.invoiceConfig || {
    enabled: true,
    companyLegalName: 'Musky Dose Enterprise',
    registeredAddress: 'Musky Dose Products, Village: Dholiwadi Ka Bas, Post: Sojat City, District: Pali, Rajasthan – 306104, India',
    invoicePrefix: 'MD-INV-',
  };

  const toggleFlag = (key: keyof FeatureFlags) => {
    const updated = { ...flags, [key]: !flags[key] };
    updateField('featureFlags', updated);
  };

  const updatePaymentConfig = (field: keyof PaymentConfig, value: any) => {
    const updated = { ...paymentCfg, [field]: value };
    updateField('paymentConfig', updated);
  };

  const updateInvoiceConfig = (field: keyof InvoiceConfig, value: any) => {
    const updated = { ...invoiceCfg, [field]: value };
    updateField('invoiceConfig', updated);
  };

  const modules = [
    {
      id: 'onlinePaymentsEnabled' as keyof FeatureFlags,
      name: 'Online Payments (Razorpay)',
      description: 'Enables direct online card/UPI/netbanking payments during checkout alongside COD and WhatsApp ordering.',
      icon: <CreditCard className="w-5 h-5 text-indigo-600" />,
      active: !!flags.onlinePaymentsEnabled,
      badge: flags.onlinePaymentsEnabled ? (paymentCfg.keyId ? 'ACTIVE' : 'NOT CONFIGURED') : 'DISABLED',
      badgeColor: flags.onlinePaymentsEnabled
        ? paymentCfg.keyId
          ? 'bg-emerald-100 text-emerald-800'
          : 'bg-amber-100 text-amber-900'
        : 'bg-gray-100 text-gray-600',
    },
    {
      id: 'wholesaleEnabled' as keyof FeatureFlags,
      name: 'B2B Wholesale & Volume Calculator',
      description: 'Activates the /wholesale page, volume tier estimator (5kg–10,000kg), and bulk quotation dispatch.',
      icon: <Package className="w-5 h-5 text-emerald-700" />,
      active: !!flags.wholesaleEnabled,
      badge: flags.wholesaleEnabled ? 'ACTIVE' : 'DISABLED',
      badgeColor: flags.wholesaleEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600',
    },
    {
      id: 'inventoryEnabled' as keyof FeatureFlags,
      name: 'Real-Time Inventory Tracking',
      description: 'Enables SKU-level stock counts, low-stock warnings, and reservation guards instead of binary stock status.',
      icon: <Boxes className="w-5 h-5 text-amber-600" />,
      active: !!flags.inventoryEnabled,
      badge: flags.inventoryEnabled ? 'ACTIVE' : 'BINARY MODE',
      badgeColor: flags.inventoryEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600',
    },
    {
      id: 'couponsEnabled' as keyof FeatureFlags,
      name: 'Coupons & Promotional Offers',
      description: 'Enables coupon input box on Cart & Checkout with real-time minimum order value validations.',
      icon: <Tag className="w-5 h-5 text-purple-600" />,
      active: !!flags.couponsEnabled,
      badge: flags.couponsEnabled ? 'ACTIVE' : 'DISABLED',
      badgeColor: flags.couponsEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600',
    },
    {
      id: 'invoiceEnabled' as keyof FeatureFlags,
      name: 'Automated GST Invoice Generator',
      description: 'Generates professional downloadable GST invoices from order records with tax breakdowns and HSN codes.',
      icon: <FileText className="w-5 h-5 text-blue-600" />,
      active: !!flags.invoiceEnabled,
      badge: flags.invoiceEnabled ? 'ACTIVE' : 'DISABLED',
      badgeColor: flags.invoiceEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600',
    },
    {
      id: 'recommendationsEnabled' as keyof FeatureFlags,
      name: 'Rule-Based Product Cross-Sells',
      description: 'Automatically pairs matching botanical products (Henna + Indigo, Face Cleays + Rose Water) on product pages.',
      icon: <Layers className="w-5 h-5 text-teal-600" />,
      active: !!flags.recommendationsEnabled,
      badge: flags.recommendationsEnabled ? 'ACTIVE' : 'DISABLED',
      badgeColor: flags.recommendationsEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600',
    },
    {
      id: 'analyticsEnabled' as keyof FeatureFlags,
      name: 'First-Party Demand Signal Analytics',
      description: 'Aggregates storefront views, search terms, and regional orders into growth intelligence graphs.',
      icon: <BarChart3 className="w-5 h-5 text-cyan-600" />,
      active: !!flags.analyticsEnabled,
      badge: flags.analyticsEnabled ? 'ACTIVE' : 'DISABLED',
      badgeColor: flags.analyticsEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600',
    },
    {
      id: 'customerAccountsEnabled' as keyof FeatureFlags,
      name: 'Customer CRM & Accounts',
      description: 'Enables customer order histories, saved addresses, and repeat buyer segmentation (Guest checkout remains always active).',
      icon: <Users className="w-5 h-5 text-rose-600" />,
      active: !!flags.customerAccountsEnabled,
      badge: flags.customerAccountsEnabled ? 'ACTIVE' : 'GUEST ONLY',
      badgeColor: flags.customerAccountsEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600',
    },
    {
      id: 'shippingIntegrationEnabled' as keyof FeatureFlags,
      name: 'Logistics Provider (Shiprocket)',
      description: 'Enables automatic waybill generation and live courier tracking events.',
      icon: <Truck className="w-5 h-5 text-orange-600" />,
      active: !!flags.shippingIntegrationEnabled,
      badge: flags.shippingIntegrationEnabled ? 'NOT CONFIGURED' : 'FLAT/FREE RATE',
      badgeColor: flags.shippingIntegrationEnabled ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-600',
    },
    {
      id: 'notificationsEnabled' as keyof FeatureFlags,
      name: 'Automated Status Notifications',
      description: 'Sends automated WhatsApp/SMS/Email triggers upon order confirmation, dispatch, and delivery.',
      icon: <Bell className="w-5 h-5 text-yellow-600" />,
      active: !!flags.notificationsEnabled,
      badge: flags.notificationsEnabled ? 'ACTIVE' : 'DISABLED',
      badgeColor: flags.notificationsEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600',
    },
    {
      id: 'exportModeEnabled' as keyof FeatureFlags,
      name: 'Global Export & Multi-Currency Mode',
      description: 'Displays international export inquiry options and currency conversions for global buyers.',
      icon: <Globe className="w-5 h-5 text-indigo-700" />,
      active: !!flags.exportModeEnabled,
      badge: flags.exportModeEnabled ? 'ACTIVE' : 'DOMESTIC (INR)',
      badgeColor: flags.exportModeEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="p-4 bg-gradient-to-r from-[#0f2d22] to-[#1b4332] text-white rounded-2xl flex items-center justify-between shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1b4332] text-[#c5a059] border border-[#c5a059]/30 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Master Switchboard</span>
          </div>
          <h3 className="font-serif-heading text-lg font-bold text-white">
            Platform Capabilities & Feature Activation
          </h3>
          <p className="text-xs text-[#b2c8be]">
            Enable or disable major business capabilities instantly. Storefront gracefully adapts with zero code changes.
          </p>
        </div>
      </div>

      {/* Grid of Feature Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((mod) => (
          <div
            key={mod.id}
            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              mod.active ? 'bg-white border-[#1b4332]/30 shadow-xs' : 'bg-[#faf8f5] border-[#e8e2d5] opacity-85'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#f5f1e8] border border-[#e8e2d5]/60 shrink-0">
                    {mod.icon}
                  </div>
                  <h4 className="font-bold text-xs text-[#0f2d22]">{mod.name}</h4>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${mod.badgeColor}`}>
                  {mod.badge}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed pl-1">{mod.description}</p>
            </div>

            <div className="pt-3 mt-3 border-t border-[#f0ebe0] flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-500">
                Status: <strong className={mod.active ? 'text-emerald-700' : 'text-gray-700'}>{mod.active ? 'Enabled' : 'Disabled'}</strong>
              </span>
              <button
                type="button"
                onClick={() => toggleFlag(mod.id)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1b4332]/20 ${
                  mod.active ? 'bg-[#1b4332]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    mod.active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Extended Configuration for Razorpay Payment Gateway */}
      {flags.onlinePaymentsEnabled && (
        <div className="p-5 bg-white rounded-2xl border border-[#e8e2d5] space-y-4">
          <div className="flex items-center gap-2 border-b border-[#e8e2d5] pb-3">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <div>
              <h4 className="font-bold text-xs text-[#0f2d22]">Razorpay Online Payment Configuration</h4>
              <p className="text-[11px] text-gray-500">Enter your Razorpay Key ID. Secret Key must remain in server environment variables (.env.local).</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700">Environment Mode</label>
              <select
                value={paymentCfg.mode}
                onChange={(e) => updatePaymentConfig('mode', e.target.value)}
                className="w-full px-3 py-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
              >
                <option value="test">Test Mode (Sandbox)</option>
                <option value="live">Live Mode (Production)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700">Razorpay Key ID (rzp_...)</label>
              <input
                type="text"
                value={paymentCfg.keyId || ''}
                onChange={(e) => updatePaymentConfig('keyId', e.target.value)}
                placeholder="rzp_test_... or rzp_live_..."
                className="w-full px-3 py-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
              />
            </div>
          </div>

          {!paymentCfg.keyId && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Key ID is not set. Online payments will fall back to Cash on Delivery and WhatsApp ordering.</span>
            </div>
          )}
        </div>
      )}

      {/* Extended Configuration for GST Invoices */}
      {flags.invoiceEnabled && (
        <div className="p-5 bg-white rounded-2xl border border-[#e8e2d5] space-y-4">
          <div className="flex items-center gap-2 border-b border-[#e8e2d5] pb-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h4 className="font-bold text-xs text-[#0f2d22]">GST Invoice & Legal Entity Settings</h4>
              <p className="text-[11px] text-gray-500">Printed on official order invoices and tax receipts.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700">Company Legal Name</label>
              <input
                type="text"
                value={invoiceCfg.companyLegalName || ''}
                onChange={(e) => updateInvoiceConfig('companyLegalName', e.target.value)}
                placeholder="Musky Dose Enterprise"
                className="w-full px-3 py-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700">GSTIN / Tax ID (Optional)</label>
              <input
                type="text"
                value={invoiceCfg.gstin || ''}
                onChange={(e) => updateInvoiceConfig('gstin', e.target.value)}
                placeholder="08XXXXX0000X1Z0"
                className="w-full px-3 py-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-gray-700">Invoice Number Prefix</label>
              <input
                type="text"
                value={invoiceCfg.invoicePrefix || 'MD-INV-'}
                onChange={(e) => updateInvoiceConfig('invoicePrefix', e.target.value)}
                placeholder="MD-INV-"
                className="w-full px-3 py-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

