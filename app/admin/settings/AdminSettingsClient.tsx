'use client';

import React, { useState } from 'react';
import {
  SiteSettings,
  LayoutControls,
  CmsTextConfig,
} from '@/lib/types';
import { DEFAULT_BRAND_COLORS, DEFAULT_LAYOUT_CONTROLS } from '@/lib/data-store';
import { DEFAULT_CMS_TEXT, getCmsText } from '@/lib/cms';
import MediaSelectModal from '@/components/MediaSelectModal';
import {
  Building,
  Sparkles,
  Layout,
  Type,
  Phone,
  Menu,
  Link2,
  HelpCircle,
  FileText,
  MessageCircle,
  ShoppingCart,
  Truck,
  Search,
  CreditCard,
  Save,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

import BrandIdentityTab from '@/components/admin/settings/tabs/BrandIdentityTab';
import BrandColorsTab from '@/components/admin/settings/tabs/BrandColorsTab';
import LayoutControlsTab from '@/components/admin/settings/tabs/LayoutControlsTab';
import CmsTextTab from '@/components/admin/settings/tabs/CmsTextTab';
import ContactBusinessTab from '@/components/admin/settings/tabs/ContactBusinessTab';
import NavigationMenuTab from '@/components/admin/settings/tabs/NavigationMenuTab';
import FooterLinksTab from '@/components/admin/settings/tabs/FooterLinksTab';
import FaqBuilderTab from '@/components/admin/settings/tabs/FaqBuilderTab';
import PoliciesLegalTab from '@/components/admin/settings/tabs/PoliciesLegalTab';
import HomepageBuilderTab from '@/components/admin/settings/tabs/HomepageBuilderTab';
import WhatsAppTemplatesTab from '@/components/admin/settings/tabs/WhatsAppTemplatesTab';
import CheckoutConfigTab from '@/components/admin/settings/tabs/CheckoutConfigTab';
import DeliveryShippingTab from '@/components/admin/settings/tabs/DeliveryShippingTab';
import SeoMetaTab from '@/components/admin/settings/tabs/SeoMetaTab';
import PaymentStatusTab from '@/components/admin/settings/tabs/PaymentStatusTab';
import AboutFactoryTab from '@/components/admin/settings/tabs/AboutFactoryTab';

interface AdminSettingsClientProps {
  initialSettings: SiteSettings;
}

export default function AdminSettingsClient({ initialSettings }: AdminSettingsClientProps) {
  const [settings, setSettings] = useState<SiteSettings>(initialSettings);
  const [activeTab, setActiveTab] = useState<
    | 'brand'
    | 'appearance'
    | 'layout_controls'
    | 'cms_text'
    | 'contact'
    | 'navigation'
    | 'footer'
    | 'faq'
    | 'policies'
    | 'homepage'
    | 'whatsapp'
    | 'checkout'
    | 'delivery'
    | 'seo'
    | 'payment'
    | 'about_factory'
  >('brand');

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [checkoutWarning, setCheckoutWarning] = useState('');
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [mediaModalTarget, setMediaModalTarget] = useState<
    'logoUrl' | 'faviconUrl' | 'heroImageUrl' | 'factoryImageUrl' | 'ogImageUrl' | null
  >(null);

  const updateField = (key: keyof SiteSettings, value: any) => {
    setSettings((prev) => {
      const updated: SiteSettings = { ...prev, [key]: value };
      if (typeof value === 'string') {
        const cmsSyncMap: Partial<Record<keyof SiteSettings, keyof CmsTextConfig>> = {
          heroEyebrow: 'heroEyebrow',
          heroTitle: 'heroTitle',
          heroSubtitle: 'heroSubtitle',
          heroPrimaryCtaText: 'heroPrimaryCtaText',
          heroSecondaryCtaText: 'heroSecondaryCtaText',
          featuredSectionTitle: 'featuredSectionTitle',
          featuredSectionDescription: 'featuredSectionDescription',
          categorySectionTitle: 'categorySectionTitle',
          categorySectionDescription: 'categorySectionDescription',
          whyMuskyDoseTitle: 'whyMuskyDoseTitle',
          whyMuskyDoseDescription: 'whyMuskyDoseDescription',
          finalCtaHeading: 'finalCtaHeading',
          finalCtaDescription: 'finalCtaDescription',
          finalCtaButtonText: 'finalCtaButtonText',
          footerDescription: 'footerBrandDescription',
          copyrightText: 'footerCopyrightText',
        };
        const cmsKey = cmsSyncMap[key];
        if (cmsKey) {
          updated.cmsText = {
            ...(updated.cmsText || {}),
            [cmsKey]: value,
          };
        }
      }
      return updated;
    });

    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const updateLayoutControl = (field: keyof LayoutControls, value: any) => {
    setSettings((prev) => ({
      ...prev,
      layoutControls: {
        ...(prev.layoutControls || DEFAULT_LAYOUT_CONTROLS),
        [field]: value,
      },
    }));
  };

  const updateCmsField = (key: keyof CmsTextConfig, value: string) => {
    setSettings((prev) => {
      const updatedCms = {
        ...(prev.cmsText || {}),
        [key]: value,
      };
      const updated: SiteSettings = {
        ...prev,
        cmsText: updatedCms,
      };

      // Synchronize matching top-level fields
      if (key === 'heroEyebrow') updated.heroEyebrow = value;
      if (key === 'heroTitle') updated.heroTitle = value;
      if (key === 'heroSubtitle') updated.heroSubtitle = value;
      if (key === 'heroPrimaryCtaText') updated.heroPrimaryCtaText = value;
      if (key === 'heroSecondaryCtaText') updated.heroSecondaryCtaText = value;
      if (key === 'featuredSectionTitle') updated.featuredSectionTitle = value;
      if (key === 'featuredSectionDescription') updated.featuredSectionDescription = value;
      if (key === 'categorySectionTitle') updated.categorySectionTitle = value;
      if (key === 'categorySectionDescription') updated.categorySectionDescription = value;
      if (key === 'whyMuskyDoseTitle') updated.whyMuskyDoseTitle = value;
      if (key === 'whyMuskyDoseDescription') updated.whyMuskyDoseDescription = value;
      if (key === 'finalCtaHeading') updated.finalCtaHeading = value;
      if (key === 'finalCtaDescription') updated.finalCtaDescription = value;
      if (key === 'finalCtaButtonText') updated.finalCtaButtonText = value;
      if (key === 'footerBrandDescription') updated.footerDescription = value;
      if (key === 'footerCopyrightText') updated.copyrightText = value;

      return updated;
    });
  };

  const handleResetCmsDefaults = () => {
    if (window.confirm('Reset all customer-facing text fields to default values?')) {
      setSettings((prev) => ({
        ...prev,
        cmsText: DEFAULT_CMS_TEXT,
      }));
    }
  };

  const updateSocial = (network: 'instagram' | 'facebook' | 'youtube' | 'twitter', value: string) => {
    setSettings((prev) => ({
      ...prev,
      socials: { ...(prev.socials || { instagram: '', facebook: '', youtube: '', twitter: '' }),
        [network]: value,
      },
    }));
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!settings.brandName || !settings.brandName.trim()) {
      errors.storeName = 'Store name is required';
    }
    if (!settings.whatsappNumber || !settings.whatsappNumber.trim()) {
      errors.whatsappNumber = 'Primary WhatsApp number is required';
    } else {
      const cleanPhone = settings.whatsappNumber.replace(/[^0-9]/g, '');
      if (cleanPhone.length < 10) {
        errors.whatsappNumber = 'Please enter a valid 10+ digit WhatsApp number';
      }
    }
    if (settings.email && !settings.email.includes('@')) {
      errors.email = 'Please enter a valid email address';
    }
    if (settings.businessEmail && !settings.businessEmail.includes('@')) {
      errors.supportEmail = 'Please enter a valid support email address';
    }
    if (settings.websiteUrl && !settings.websiteUrl.startsWith('http://') && !settings.websiteUrl.startsWith('https://')) {
      errors.websiteUrl = 'Website URL must start with http:// or https://';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      setErrorMessage('Please correct the highlighted validation errors before saving.');
      return;
    }

    // Safety warning if mandatory checkout fields are disabled
    if (settings.checkoutFieldConfig && !settings.checkoutFieldConfig.pincode?.enabled) {
      setCheckoutWarning('Notice: PIN code field is disabled in checkout configuration.');
    } else {
      setCheckoutWarning('');
    }

    setSaving(true);
    setErrorMessage('');
    setSavedSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteSettings: settings }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save settings.');
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'brand', label: 'Brand & Identity', icon: Building },
    { id: 'appearance', label: 'Brand Colors', icon: Sparkles },
    { id: 'layout_controls', label: 'Layout & Display Controls', icon: Layout },
    { id: 'cms_text', label: 'Customer-Facing Text (CMS)', icon: Type },
    { id: 'contact', label: 'Contact & Business', icon: Phone },
    { id: 'navigation', label: 'Navigation Menu', icon: Menu },
    { id: 'footer', label: 'Footer Links', icon: Link2 },
    { id: 'faq', label: 'FAQ Builder', icon: HelpCircle },
    { id: 'policies', label: 'Policies & Legal', icon: FileText },
    { id: 'homepage', label: 'Homepage Builder', icon: Layout },
    { id: 'whatsapp', label: 'WhatsApp Templates', icon: MessageCircle },
    { id: 'checkout', label: 'Checkout Config', icon: ShoppingCart },
    { id: 'delivery', label: 'Delivery & Shipping', icon: Truck },
    { id: 'seo', label: 'SEO & Meta', icon: Search },
    { id: 'payment', label: 'Payment Status', icon: CreditCard },
    { id: 'about_factory', label: 'About & Factory Pages', icon: FileText },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e8e2d5] pb-5">
        <div>
          <h1 className="text-2xl font-serif font-bold text-[#183F2B]">Store & Site Settings</h1>
          <p className="text-sm text-[#626c66] mt-1">
            Configure brand identity, colors, dynamic navigation, policies, layout controls, and customer-facing text.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#183F2B] text-white font-medium hover:bg-[#123021] transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save All Settings</span>
            </>
          )}
        </button>
      </div>

      {/* Status Messages */}
      {savedSuccess && (
        <div className="flex items-center gap-3 p-4 bg-[#e8f3ed] border border-[#2d6a4f]/20 rounded-lg text-[#2d6a4f] text-sm animate-fade-in">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>Settings saved successfully! Changes are immediately live across the storefront.</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 bg-[#9A4F32]/10 border border-[#9A4F32]/20 rounded-lg text-[#9A4F32] text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {checkoutWarning && (
        <div className="flex items-center gap-3 p-4 bg-[#C49A55]/15 border border-[#C49A55]/30 rounded-lg text-[#855e1a] text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{checkoutWarning}</span>
        </div>
      )}

      {/* Tabs Navigation Bar */}
      <div className="flex overflow-x-auto no-scrollbar gap-1 border-b border-[#e8e2d5] bg-[#FAF8F5] p-1.5 rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-white text-[#183F2B] shadow-sm font-semibold'
                  : 'text-[#626c66] hover:text-[#183F2B] hover:bg-white/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#183F2B]' : 'text-[#626c66]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content Area */}
      <div className="mt-6">
        {activeTab === 'brand' && (
          <BrandIdentityTab
            settings={settings}
            updateField={updateField}
            validationErrors={validationErrors}
            setMediaModalTarget={setMediaModalTarget}
          />
        )}

        {activeTab === 'appearance' && (
          <BrandColorsTab settings={settings} setSettings={setSettings} />
        )}

        {activeTab === 'layout_controls' && (
          <LayoutControlsTab
            settings={settings}
            updateLayoutControl={updateLayoutControl}
            setSettings={setSettings}
          />
        )}

        {activeTab === 'cms_text' && (
          <CmsTextTab
            settings={settings}
            updateCmsField={updateCmsField}
            handleResetCmsDefaults={handleResetCmsDefaults}
          />
        )}

        {activeTab === 'contact' && (
          <ContactBusinessTab
            settings={settings}
            updateField={updateField}
            updateSocial={updateSocial}
            validationErrors={validationErrors}
          />
        )}

        {activeTab === 'navigation' && (
          <NavigationMenuTab settings={settings} setSettings={setSettings} />
        )}

        {activeTab === 'footer' && (
          <FooterLinksTab settings={settings} setSettings={setSettings} />
        )}

        {activeTab === 'faq' && (
          <FaqBuilderTab settings={settings} setSettings={setSettings} />
        )}

        {activeTab === 'policies' && (
          <PoliciesLegalTab settings={settings} updateField={updateField} />
        )}

        {activeTab === 'homepage' && (
          <HomepageBuilderTab
            settings={settings}
            updateField={updateField}
            setSettings={setSettings}
            setMediaModalTarget={setMediaModalTarget}
          />
        )}

        {activeTab === 'whatsapp' && (
          <WhatsAppTemplatesTab settings={settings} updateField={updateField} />
        )}

        {activeTab === 'checkout' && (
          <CheckoutConfigTab settings={settings} setSettings={setSettings} />
        )}

        {activeTab === 'delivery' && (
          <DeliveryShippingTab settings={settings} updateField={updateField} />
        )}

        {activeTab === 'seo' && (
          <SeoMetaTab
            settings={settings}
            updateField={updateField}
            setMediaModalTarget={setMediaModalTarget}
          />
        )}

        {activeTab === 'payment' && <PaymentStatusTab />}

        {activeTab === 'about_factory' && (
          <AboutFactoryTab
            settings={settings}
            updateField={updateField}
            setSettings={setSettings}
            setMediaModalTarget={setMediaModalTarget}
          />
        )}
      </div>

      {/* Floating Media Upload Modal */}
      {mediaModalTarget && (
        <MediaSelectModal
          isOpen={Boolean(mediaModalTarget)}
          onClose={() => setMediaModalTarget(null)}
          onSelect={(url: string) => {
            if (mediaModalTarget) {
              updateField(mediaModalTarget, url);
              setMediaModalTarget(null);
            }
          }}
          title={`Select Image for ${mediaModalTarget}`}
        />
      )}
    </div>
  );
}
