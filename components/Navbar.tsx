'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { SiteSettings } from '@/lib/types';
import { getCmsText } from '@/lib/cms';
import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import { DEFAULT_NAV_ITEMS } from '@/lib/data-store';
import { useUI } from '@/context/UIContext';
import BrandLogo from '@/components/BrandLogo';
import MobileBottomNav from '@/components/MobileBottomNav';
import OfferBanner from '@/components/OfferBanner';
import AnnouncementTicker from '@/components/AnnouncementTicker';
import MenuDrawer from '@/components/MenuDrawer';
import { getClientSiteSettings } from '@/lib/api-client';

interface NavbarProps {
  siteSettings?: SiteSettings;
}

function NavbarContent({ siteSettings: initialSettings }: NavbarProps) {
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [settings, setSettings] = useState<Partial<SiteSettings> | undefined>(initialSettings);

  const pathname = usePathname();
  const {
    openSearch,
    isMobileMenuOpen,
    closeMobileMenu,
  } = useUI();

  // Handle client mount & scroll shadow
  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    closeMobileMenu();
  }, [pathname, closeMobileMenu]);

  // Fetch site settings if not provided
  useEffect(() => {
    if (!initialSettings && typeof window !== 'undefined') {
      getClientSiteSettings().then((siteSettings) => {
        if (siteSettings) {
          setSettings(siteSettings);
        }
      });
    }
  }, [initialSettings]);

  // Settings & CMS values
  const cms = getCmsText(settings);
  const whatsappNumber = getConfiguredWhatsAppNumber(settings);
  const announcementEnabled = settings?.announcementEnabled ?? true;
  const announcementText = settings?.announcementText || 'Pure Natural & Ultra-Fine Sifted Henna Direct from Sojat, Rajasthan';
  const announcementLink = settings?.announcementLink || '/products';
  const logoUrl = settings?.logoUrl;

  const navItems = (settings?.navItems && settings.navItems.length > 0
    ? settings.navItems
    : DEFAULT_NAV_ITEMS
  )
    .filter((item) => item.enabled !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <>
      {/* FESTIVAL CAMPAIGN BANNER */}
      <OfferBanner position="announcement_bar" />

      {/* ROW 1 — RUNNING ANNOUNCEMENT (STICKY TOP-0) */}
      {announcementEnabled && (
        <div className="sticky top-0 z-50 bg-[#0f2d22] text-[#e8f3ed] border-b border-[#2d6a4f]/30 h-[28px] sm:h-[32px] flex items-center px-3 sm:px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto w-full">
            <AnnouncementTicker
              announcements={settings?.announcements}
              fallbackText={announcementText}
              fallbackLink={announcementLink}
              fallbackBadge={cms.sojatBadgeText || 'SOJAT ORIGIN'}
              speed={settings?.announcementTickerSpeed || 'normal'}
              enabled={settings?.announcementTickerEnabled !== false}
            />
          </div>
        </div>
      )}

      {/* ROW 2 — MINIMAL SITE HEADER: [ LOGO ] [ SEARCH ] ONLY */}
      <header
        className={`sticky ${announcementEnabled ? 'top-[28px] sm:top-[32px]' : 'top-0'} z-40 site-header-dynamic transition-all duration-200 ${
          isScrolled
            ? 'bg-[#fcfbf7]/98 backdrop-blur-md shadow-xs border-b border-[#e8e2d5]'
            : 'bg-[#fcfbf7] border-b border-[#e8e2d5]/80'
        }`}
        style={{
          paddingTop: 'var(--m-head-py, clamp(6px, 1.2vw, 10px))',
          paddingBottom: 'var(--m-head-py, clamp(6px, 1.2vw, 10px))',
        }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-3 sm:gap-6">
          {/* 1. BRAND LOGO */}
          <Link href="/" aria-label="Musky Dose Homepage" className="flex items-center shrink-0">
            <BrandLogo logoUrl={logoUrl} size="md" priority />
          </Link>

          {/* 2. SEARCH TRIGGER (Desktop & Tablet: Wide Search Bar Trigger) */}
          <div className="hidden sm:flex flex-1 max-w-md items-center">
            <button
              type="button"
              onClick={openSearch}
              className="w-full flex items-center justify-between pl-3.5 pr-3 py-2 bg-white hover:bg-[#faf7f0] border border-[#e8e2d5] hover:border-[#1b4332]/40 rounded-xl text-xs text-gray-500 shadow-2xs transition-all cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-[#1b4332]/20"
              aria-label="Search products, Sojat henna, hair care"
              title="Search products (Click to open)"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Search className="w-4 h-4 text-[#1b4332] group-hover:scale-110 transition-transform shrink-0" />
                <span className="truncate text-gray-500 font-sans">
                  {cms.navSearchPlaceholder || 'Search products, Sojat henna, hair care...'}
                </span>
              </div>
              <span className="hidden lg:inline-flex items-center px-2 py-0.5 text-[10.5px] font-semibold text-[#1b4332] bg-[#f5f1e8] rounded-md border border-[#e8e2d5] shrink-0">
                Search
              </span>
            </button>
          </div>

          {/* 2. SEARCH TRIGGER (Mobile: Compact Responsive Trigger) */}
          <div className="sm:hidden flex-1 max-w-[210px] flex items-center justify-end">
            <button
              type="button"
              onClick={openSearch}
              className="w-full flex items-center justify-between px-2.5 py-1.5 bg-white hover:bg-[#faf7f0] active:scale-95 text-[#0f2d22] border border-[#e8e2d5] rounded-lg text-xs shadow-2xs transition-all cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-[#1b4332]/20"
              aria-label="Search products"
              title="Search products"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Search className="w-3.5 h-3.5 text-[#1b4332] shrink-0" />
                <span className="truncate text-[12px] text-gray-500 font-medium">Search...</span>
              </div>
              <span className="text-[10px] font-bold text-[#1b4332] bg-[#f5f1e8] px-1.5 py-0.5 rounded">
                Find
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* REUSABLE SIDE MENU DRAWER (Controlled via Bottom Nav or other triggers) */}
      <MenuDrawer
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
        logoUrl={logoUrl}
        whatsappNumber={whatsappNumber}
        navItems={navItems}
      />

      {/* FIXED 5-ITEM BOTTOM NAVIGATION BAR: [ Home | Shop | Category | Cart | Menu ] */}
      <MobileBottomNav />
    </>
  );
}

function NavbarFallback({ siteSettings }: { siteSettings?: SiteSettings }) {
  return (
    <header className="bg-[#fcfbf7] py-2.5 sm:py-3.5 border-b border-[#e8e2d5]/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between">
        <BrandLogo logoUrl={siteSettings?.logoUrl} size="md" />
        <div className="w-32 h-8 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    </header>
  );
}

export default function Navbar(props: NavbarProps) {
  return (
    <Suspense fallback={<NavbarFallback siteSettings={props.siteSettings} />}>
      <NavbarContent {...props} />
    </Suspense>
  );
}
