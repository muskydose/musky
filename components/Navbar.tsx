'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, ShoppingBag, Heart, MessageCircle, Menu } from 'lucide-react';
import { SiteSettings } from '@/lib/types';
import { getCmsText } from '@/lib/cms';
import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import { DEFAULT_NAV_ITEMS } from '@/lib/data-store';
import { useUI } from '@/context/UIContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
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
  const { totalItems, openCart } = useCart();
  const { totalWishlistItems, openWishlist } = useWishlist();
  const {
    openSearch,
    isMobileMenuOpen,
    closeMobileMenu,
    openMobileMenu,
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

  // Desktop primary navigation links (Home, Shop, Categories, Wholesale, Guides, About, Contact)
  const desktopNavLinks = useMemo(() => {
    const customItems = settings?.navItems && settings.navItems.length > 0
      ? settings.navItems.filter((i) => i.enabled !== false)
      : null;

    if (customItems && customItems.length > 0) {
      return customItems.map((item) => ({
        id: item.id,
        label: item.label,
        href: item.href,
        badge: item.href === '/wholesale' ? 'B2B' : undefined,
      }));
    }

    return [
      { id: 'nav-home', label: 'Home', href: '/' },
      { id: 'nav-shop', label: 'Shop', href: '/products' },
      { id: 'nav-categories', label: 'Categories', href: '/categories' },
      { id: 'nav-wholesale', label: 'Wholesale', href: '/wholesale', badge: 'B2B' },
      { id: 'nav-guides', label: 'Guides', href: '/guides' },
      { id: 'nav-about', label: 'About', href: '/about' },
      { id: 'nav-contact', label: 'Contact', href: '/contact' },
    ];
  }, [settings?.navItems]);

  const isNavActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || (href !== '/' && pathname.startsWith(href));
  };

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

      {/* ROW 2 — SITE HEADER: DESKTOP NAVIGATION & ACTIONS */}
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
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center justify-between gap-2.5 sm:gap-4 lg:gap-6">
          {/* 1. BRAND LOGO */}
          <Link href="/" aria-label="Musky Dose Homepage" className="flex items-center shrink-0">
            <BrandLogo logoUrl={logoUrl} size="md" priority />
          </Link>

          {/* 2. DESKTOP PRIMARY NAVIGATION (Large Desktop: >= 1024px) */}
          <nav aria-label="Desktop Navigation" className="hidden lg:flex items-center gap-1 xl:gap-1.5 shrink-0">
            {desktopNavLinks.map((item) => {
              const active = isNavActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-xs xl:text-[13px] px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 shrink-0 ${
                    active
                      ? 'text-[#1b4332] font-bold bg-[#e8f3ed] shadow-2xs border border-[#b7dfcb]/50'
                      : 'text-[#2b302c] hover:text-[#1b4332] hover:bg-[#faf7f0] font-medium'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] font-extrabold bg-[#c5a059] text-[#0f2d22] px-1.5 py-0.2 rounded font-mono uppercase tracking-wider">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* 3. SEARCH TRIGGER (Desktop & Tablet: Wide Search Bar Trigger) */}
          <div className="hidden sm:flex flex-1 max-w-[200px] md:max-w-xs xl:max-w-sm items-center">
            <button
              type="button"
              onClick={openSearch}
              className="w-full flex items-center justify-between pl-3 pr-2.5 py-2 bg-white hover:bg-[#faf7f0] border border-[#e8e2d5] hover:border-[#1b4332]/40 rounded-xl text-xs text-gray-500 shadow-2xs transition-all cursor-pointer group text-left focus:outline-none focus:ring-2 focus:ring-[#1b4332]/20"
              aria-label="Search products, Sojat henna, hair care"
              title="Search products (Click to open)"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search className="w-3.5 h-3.5 text-[#1b4332] group-hover:scale-110 transition-transform shrink-0" />
                <span className="truncate text-gray-500 font-sans text-xs">
                  {cms.navSearchPlaceholder || 'Search products...'}
                </span>
              </div>
              <span className="hidden xl:inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold text-[#1b4332] bg-[#f5f1e8] rounded-md border border-[#e8e2d5] shrink-0">
                Search
              </span>
            </button>
          </div>

          {/* 4. DESKTOP & TABLET UTILITY ACTIONS (Hidden on Mobile < 768px) */}
          <div className="hidden md:flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Mid-Desktop Menu Button (768px - 1023px, hidden on lg+) */}
            <button
              type="button"
              onClick={openMobileMenu}
              className="lg:hidden flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-[#faf7f0] border border-[#e8e2d5] rounded-xl text-xs font-bold text-[#0f2d22] shadow-2xs transition-all cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-[#1b4332]/20"
              aria-label="Open Navigation Menu"
              title="Navigation Menu"
            >
              <Menu className="w-4 h-4 text-[#1b4332]" />
              <span>Menu</span>
            </button>

            {/* Wishlist Button with Badge */}
            <button
              type="button"
              onClick={openWishlist}
              className="relative p-2 bg-white hover:bg-[#faf7f0] border border-[#e8e2d5] hover:border-[#c5a059] rounded-xl text-[#0f2d22] shadow-2xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1b4332]/20"
              aria-label={`Open Wishlist (${totalWishlistItems} items)`}
              title="Wishlist"
            >
              <Heart className="w-4 h-4 text-[#1b4332]" />
              {totalWishlistItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-[#c5a059] text-[#0f2d22] text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-2xs">
                  {totalWishlistItems}
                </span>
              )}
            </button>

            {/* Shopping Cart Button with Badge */}
            <button
              type="button"
              onClick={openCart}
              className="relative flex items-center gap-1.5 px-3 py-2 bg-[#1b4332] hover:bg-[#0f2d22] text-[#faf5e8] hover:text-[#c5a059] border border-[#1b4332] rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1b4332]/20"
              aria-label={`Open Shopping Cart (${totalItems} items)`}
              title="Shopping Cart"
            >
              <ShoppingBag className="w-4 h-4 text-[#c5a059]" />
              <span className="hidden xl:inline text-[11px] font-bold uppercase tracking-wider">Cart</span>
              <span className="bg-[#c5a059] text-[#0f2d22] text-[10px] font-extrabold px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow-2xs">
                {totalItems}
              </span>
            </button>

            {/* WhatsApp Quick Action (Desktop >= 1280px) */}
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hello Musky Dose! I am visiting your website and have an inquiry.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden xl:inline-flex items-center gap-1.5 px-3 py-2 bg-[#f4faf6] hover:bg-[#e6f4ec] text-[#1b4332] border border-[#25D366]/40 rounded-xl text-xs font-bold shadow-2xs transition-all hover:scale-102 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30"
              aria-label="Contact Musky Dose on WhatsApp"
              title="WhatsApp Support & Direct Order"
            >
              <MessageCircle className="w-3.5 h-3.5 fill-[#25D366] text-[#25D366]" />
              <span>WhatsApp</span>
            </a>
          </div>

          {/* 5. SEARCH TRIGGER (Mobile: Compact Responsive Trigger, < sm - UNTOUCHED) */}
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
