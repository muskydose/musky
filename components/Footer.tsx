'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Leaf, MapPin, Phone, Mail, MessageCircle, ShieldCheck, Award, Heart, Instagram, Facebook, Youtube, Twitter, Truck } from 'lucide-react';
import { SiteSettings } from '@/lib/types';
import { getCmsText } from '@/lib/cms';
import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import { DEFAULT_FOOTER_SECTIONS } from '@/lib/data-store';
import BrandLogo from '@/components/BrandLogo';
import { getClientSiteSettings } from '@/lib/api-client';

interface FooterProps {
  siteSettings?: SiteSettings;
}

export default function Footer({ siteSettings: initialSettings }: FooterProps) {
  const [settings, setSettings] = useState<Partial<SiteSettings> | undefined>(initialSettings);
  const [currentYear] = useState<number>(() => (typeof window !== 'undefined' ? new Date().getFullYear() : 2026));

  useEffect(() => {
    if (!initialSettings && typeof window !== 'undefined') {
      getClientSiteSettings().then((siteSettings) => {
        if (siteSettings) {
          setSettings(siteSettings);
        }
      });
    }
  }, [initialSettings]);

  const cms = getCmsText(settings);
  const brandName = settings?.businessName || settings?.brandName || 'MUSKY DOSE';
  const tagline = settings?.tagline || 'Sojat, Rajasthan';
  const footerDescription = settings?.footerDescription || cms.footerBrandDescription;
  const address =
    settings?.address || 'Musky Dose Herbal Complex, Station Road, Sojat City, Pali District, Rajasthan - 306104, India';
  const whatsappNumber = getConfiguredWhatsAppNumber(settings);
  const displayPhone = settings?.displayPhone || '+91 82337 03080';
  const businessEmail = settings?.businessEmail || 'info@muskydose.in';
  const copyrightText = settings?.copyrightText || cms.footerCopyrightText;

  const isPolicyLinkEnabled = (href: string) => {
    if (href === '/faq') {
      return settings?.faqItems ? settings.faqItems.some((f) => f.enabled !== false) : true;
    }
    if (href === '/shipping-policy') {
      return settings?.shippingPolicy ? settings.shippingPolicy.enabled !== false : true;
    }
    if (href === '/return-policy') {
      return settings?.returnRefundPolicy ? settings.returnRefundPolicy.enabled === true : false;
    }
    if (href === '/privacy-policy') {
      return settings?.privacyPolicy ? settings.privacyPolicy.enabled === true : false;
    }
    if (href === '/terms') {
      return settings?.termsConditions ? settings.termsConditions.enabled === true : false;
    }
    if (href === '/cancellation-policy') {
      return settings?.cancellationPolicy ? settings.cancellationPolicy.enabled === true : false;
    }
    return true;
  };

  const rawFooterSections = settings?.footerSections && settings.footerSections.length > 0 ? settings.footerSections : DEFAULT_FOOTER_SECTIONS;
  const activeFooterSections = rawFooterSections
    .filter((sec) => sec.enabled !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <footer className="bg-[#0f2d22] text-[#e8f3ed] pt-16 pb-10 border-t border-[#2d6a4f]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#2d6a4f]/40">
          
          {/* Brand Info */}
          <div className="space-y-4">
            <Link href="/" aria-label="Musky Dose Homepage" className="inline-flex items-center group">
              <BrandLogo logoUrl={settings?.logoUrl} size="lg" className="bg-white/95 px-3 py-1.5 rounded-xl shadow-xs" />
            </Link>
            <p className="text-sm text-[#b2c8be] leading-relaxed">
              {footerDescription}
            </p>
            <div className="pt-2 flex items-center gap-2 text-xs text-[#c5a059] font-medium">
              <ShieldCheck className="w-4 h-4 shrink-0" /> 100% Pure Lawsonia Inermis & Herbal Care
            </div>

            {/* Social Links */}
            {settings?.socials && (
              <div className="pt-2 flex items-center gap-3 text-[#c5a059]">
                {settings.socials.instagram && (
                  <a href={settings.socials.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-white transition-colors p-2 bg-[#1b4332] rounded-lg">
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {settings.socials.facebook && (
                  <a href={settings.socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="hover:text-white transition-colors p-2 bg-[#1b4332] rounded-lg">
                    <Facebook className="w-4 h-4" />
                  </a>
                )}
                {settings.socials.youtube && (
                  <a href={settings.socials.youtube} target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="hover:text-white transition-colors p-2 bg-[#1b4332] rounded-lg">
                    <Youtube className="w-4 h-4" />
                  </a>
                )}
                {settings.socials.twitter && (
                  <a href={settings.socials.twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="hover:text-white transition-colors p-2 bg-[#1b4332] rounded-lg">
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Dynamic Navigation Sections */}
          {activeFooterSections.map((sec) => {
            const activeLinks = (sec.links || [])
              .filter((l) => l.enabled !== false && isPolicyLinkEnabled(l.href))
              .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

            if (activeLinks.length === 0) return null;

            return (
              <div key={sec.id || sec.title} className="space-y-3">
                <h4 className="font-serif-heading text-lg font-bold text-white tracking-wide border-b border-[#2d6a4f]/50 pb-2 inline-block">
                  {sec.title}
                </h4>
                <ul className="space-y-2 text-sm text-[#b2c8be]">
                  {activeLinks.map((link) => {
                    const isExt = link.isExternal || link.href.startsWith('http://') || link.href.startsWith('https://');
                    return (
                      <li key={link.id || link.label}>
                        <Link
                          href={link.href}
                          target={isExt ? '_blank' : undefined}
                          rel={isExt ? 'noopener noreferrer' : undefined}
                          className="hover:text-[#c5a059] transition-colors"
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {/* Dispatch & Order Information */}
          <div className="space-y-3">
            <h4 className="font-serif-heading text-lg font-bold text-white tracking-wide border-b border-[#2d6a4f]/50 pb-2 inline-block">
              Order & Shipping Policy
            </h4>
            <div className="space-y-2.5 text-xs text-[#b2c8be]">
              <div className="p-3 bg-[#1b4332]/60 border border-[#2d6a4f]/40 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-white font-semibold">
                  <Truck className="w-3.5 h-3.5 text-[#c5a059]" />
                  <span>Direct Sojat Dispatch</span>
                </div>
                <p className="text-[#a1b8ac] leading-relaxed">
                  {settings?.deliveryDisclaimer || 'All orders are packaged and dispatched directly from our Sojat facility via express courier.'}
                </p>
              </div>
              <div className="p-3 bg-[#1b4332]/60 border border-[#2d6a4f]/40 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-[#c5a059] font-semibold">
                  <span>Shipping Fee Policy</span>
                </div>
                <p className="text-[#a1b8ac] leading-relaxed">
                  {settings?.shippingDisclaimer || 'Shipping Charges Extra / Calculated on Order Confirmation based on destination pincode and package weight.'}
                </p>
              </div>
            </div>
          </div>

          {/* Contact & Location */}
          <div className="space-y-3">
            <h4 className="font-serif-heading text-lg font-bold text-white tracking-wide border-b border-[#2d6a4f]/50 pb-2 inline-block">
              Get In Touch
            </h4>
            <div className="space-y-3 text-sm text-[#b2c8be]">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#c5a059] shrink-0 mt-0.5" />
                <span>{address}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-[#c5a059] shrink-0" />
                <a href={`tel:${displayPhone}`} className="hover:text-white transition-colors">{displayPhone}</a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-[#c5a059] shrink-0" />
                <a href={`mailto:${businessEmail}`} className="hover:text-white transition-colors">{businessEmail}</a>
              </div>
              <div className="pt-2">
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hello Musky Dose Support Team! I have a general customer support question.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] text-white px-4 py-2.5 rounded-lg font-semibold text-xs hover:bg-[#20bd5a] transition-all shadow-sm hover:scale-102"
                >
                  <MessageCircle className="w-4 h-4 fill-white shrink-0" />
                  <span>WhatsApp Support</span>
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom copyright & status indicators */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#8ca398]">
          <p>{copyrightText}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-[#c5a059]" /> Sojat Quality Assured</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-[#c5a059]" /> Direct Farm Sourced</span>
            <span>•</span>
            <Link href="/admin/login" className="hover:text-white underline transition-colors">Admin Panel</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

