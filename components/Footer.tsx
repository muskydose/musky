import React from 'react';
import Link from 'next/link';
import { Leaf, MapPin, Phone, Mail, MessageCircle, ShieldCheck, Award, Heart, Instagram, Facebook, Youtube, Twitter, Truck } from 'lucide-react';
import { SiteSettings } from '@/lib/types';
import { getCmsText } from '@/lib/cms';
import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import { DEFAULT_FOOTER_SECTIONS } from '@/lib/data-store';
import BrandLogo from '@/components/BrandLogo';

interface FooterProps {
  siteSettings?: SiteSettings;
}

export default function Footer({ siteSettings: initialSettings }: FooterProps) {
  const settings = initialSettings;
  const currentYear = new Date().getFullYear();

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
    <footer className="bg-[#0f2d22] text-[#e8f3ed] pt-14 pb-10 border-t border-[#2d6a4f]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 pb-12 border-b border-[#2d6a4f]/40">
          
          {/* Column 1: Brand Info & Values */}
          <div className="space-y-4">
            <Link href="/" aria-label="Musky Dose Homepage" className="inline-flex items-center group">
              <BrandLogo logoUrl={settings?.logoUrl} size="lg" className="bg-white/95 px-3 py-1.5 rounded-xl shadow-xs" />
            </Link>
            <p className="text-xs sm:text-sm text-[#b2c8be] leading-relaxed">
              {footerDescription}
            </p>
            <div className="pt-1 flex items-center gap-2 text-xs text-[#c5a059] font-medium">
              <ShieldCheck className="w-4 h-4 shrink-0 text-[#c5a059]" />
              <span>100% Pure Lawsonia Inermis & Herbal Care</span>
            </div>

            {/* Social Links */}
            {settings?.socials && (
              <div className="pt-2 flex items-center gap-2 text-[#c5a059]">
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

          {/* Column 2: Quick Links & Heritage */}
          <div className="space-y-3">
            <h4 className="font-serif-heading text-base sm:text-lg font-bold text-white tracking-wide border-b border-[#2d6a4f]/50 pb-2 inline-block">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[#b2c8be]">
              <li>
                <Link href="/" className="hover:text-[#c5a059] transition-colors">Home</Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-[#c5a059] transition-colors">All Products</Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-[#c5a059] transition-colors">Categories</Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-[#c5a059] transition-colors">Our Brand Story</Link>
              </li>
              <li>
                <Link href="/factory" className="hover:text-[#c5a059] transition-colors">Sojat Factory & Sourcing</Link>
              </li>
              <li>
                <Link href="/documents" className="hover:text-[#c5a059] transition-colors">Certificates & Lab Reports</Link>
              </li>
              <li>
                <Link href="/wholesale" className="hover:text-[#c5a059] transition-colors">Wholesale & Bulk Supply</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Support & Policies */}
          <div className="space-y-3">
            <h4 className="font-serif-heading text-base sm:text-lg font-bold text-white tracking-wide border-b border-[#2d6a4f]/50 pb-2 inline-block">
              Support & Policies
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[#b2c8be]">
              {isPolicyLinkEnabled('/faq') && (
                <li>
                  <Link href="/faq" className="hover:text-[#c5a059] transition-colors">Frequently Asked Questions (FAQ)</Link>
                </li>
              )}
              {isPolicyLinkEnabled('/shipping-policy') && (
                <li>
                  <Link href="/shipping-policy" className="hover:text-[#c5a059] transition-colors">Shipping & Delivery Policy</Link>
                </li>
              )}
              {isPolicyLinkEnabled('/return-policy') && (
                <li>
                  <Link href="/return-policy" className="hover:text-[#c5a059] transition-colors">Return & Refund Policy</Link>
                </li>
              )}
              {isPolicyLinkEnabled('/cancellation-policy') && (
                <li>
                  <Link href="/cancellation-policy" className="hover:text-[#c5a059] transition-colors">Cancellation Policy</Link>
                </li>
              )}
              {isPolicyLinkEnabled('/privacy-policy') && (
                <li>
                  <Link href="/privacy-policy" className="hover:text-[#c5a059] transition-colors">Privacy Policy</Link>
                </li>
              )}
              {isPolicyLinkEnabled('/terms') && (
                <li>
                  <Link href="/terms" className="hover:text-[#c5a059] transition-colors">Terms & Conditions</Link>
                </li>
              )}
            </ul>

            <div className="pt-2">
              <div className="p-2.5 bg-[#1b4332]/60 border border-[#2d6a4f]/40 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-white text-xs font-semibold">
                  <Truck className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                  <span>Direct Sojat Dispatch</span>
                </div>
                <p className="text-[11px] text-[#a1b8ac] leading-relaxed">
                  {settings?.deliveryDisclaimer || 'All orders are dispatched directly from our Sojat facility across India.'}
                </p>
              </div>
            </div>
          </div>

          {/* Column 4: Contact & Location */}
          <div className="space-y-3">
            <h4 className="font-serif-heading text-base sm:text-lg font-bold text-white tracking-wide border-b border-[#2d6a4f]/50 pb-2 inline-block">
              Get In Touch
            </h4>
            <div className="space-y-2.5 text-xs sm:text-sm text-[#b2c8be]">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#c5a059] shrink-0 mt-1" />
                <span className="leading-snug">{address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#c5a059] shrink-0" />
                <a href={`tel:${displayPhone}`} className="hover:text-white transition-colors">{displayPhone}</a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#c5a059] shrink-0" />
                <a href={`mailto:${businessEmail}`} className="hover:text-white transition-colors">{businessEmail}</a>
              </div>
              <div className="pt-3">
                <a
                  href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hello Musky Dose Support Team! I have a general customer support question.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#25D366] text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-[#20bd5a] transition-all shadow-sm hover:scale-102"
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

