'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  ShoppingBag,
  Heart,
  User,
  MessageCircle,
  Menu,
  X,
  Phone,
  Grid,
  ChevronRight,
  Sparkles,
  Home,
  BookOpen,
  Building2,
  Truck,
  ShieldCheck,
  Award,
  Leaf,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SiteSettings } from '@/lib/types';
import { getCmsText } from '@/lib/cms';
import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import { DEFAULT_NAV_ITEMS } from '@/lib/data-store';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import BrandLogo from '@/components/BrandLogo';
import MobileBottomNav from '@/components/MobileBottomNav';
import OfferBanner from '@/components/OfferBanner';
import PwaInstallCTA from '@/components/PwaInstallCTA';
import AnnouncementTicker from '@/components/AnnouncementTicker';
import { getClientSiteSettings } from '@/lib/api-client';

interface NavbarProps {
  siteSettings?: SiteSettings;
}

function NavbarContent({ siteSettings: initialSettings }: NavbarProps) {
  const [mounted, setMounted] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<Partial<SiteSettings> | undefined>(initialSettings);

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams ? searchParams.get('search') || '' : '';
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [prevUrlSearch, setPrevUrlSearch] = useState(urlSearch);

  if (urlSearch !== prevUrlSearch) {
    setPrevUrlSearch(urlSearch);
    setSearchQuery(urlSearch);
  }

  const { totalItems, openCart } = useCart();
  const { totalWishlistItems, openWishlist } = useWishlist();

  // Handle client mount & scroll shadow
  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle body scroll lock when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      const originalOverflow = document.body.style.overflow;
      const originalTouchAction = document.body.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.touchAction = originalTouchAction;
      };
    }
  }, [mobileMenuOpen]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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
  const displayPhone = settings?.displayPhone || '+91 82337 03080';
  const announcementEnabled = settings?.announcementEnabled ?? true;
  const announcementText = settings?.announcementText || 'Pure Natural & Ultra-Fine Sifted Henna Direct from Sojat, Rajasthan';
  const announcementLink = settings?.announcementLink || '/products';
  const logoUrl = settings?.logoUrl;

  const getNavIcon = (href: string, label: string) => {
    const h = href.toLowerCase();
    const l = label.toLowerCase();
    if (h === '/' || l.includes('home')) return <Home className="w-3.5 h-3.5 text-[#c5a059]" />;
    if (h.startsWith('/products') || l.includes('product') || l.includes('shop')) return <Grid className="w-3.5 h-3.5 text-[#c5a059]" />;
    if (h.startsWith('/categories') || l.includes('categor')) return <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" />;
    if (h.startsWith('/wholesale') || l.includes('wholesale') || l.includes('bulk')) return <Building2 className="w-3.5 h-3.5 text-[#c5a059]" />;
    if (h.startsWith('/about') || l.includes('about')) return <Leaf className="w-3.5 h-3.5 text-[#c5a059]" />;
    if (h.startsWith('/factory') || l.includes('factory')) return <ShieldCheck className="w-3.5 h-3.5 text-[#c5a059]" />;
    if (h.startsWith('/guides') || l.includes('guide')) return <BookOpen className="w-3.5 h-3.5 text-[#c5a059]" />;
    if (h.startsWith('/contact') || l.includes('contact')) return <Phone className="w-3.5 h-3.5 text-[#c5a059]" />;
    return null;
  };

  const navItems = (settings?.navItems && settings.navItems.length > 0
    ? settings.navItems
    : DEFAULT_NAV_ITEMS
  )
    .filter((item) => item.enabled !== false)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  // Search handler with Smart Keyword Routing
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      router.push('/products');
      return;
    }

    try {
      const res = await fetch(`/api/search/smart-route?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.destinationUrl) {
          router.push(data.destinationUrl);
          return;
        }
      }
    } catch {
      // Fallback seamlessly on any network error
    }

    router.push(`/products?search=${encodeURIComponent(query)}`);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    if (searchParams && searchParams.get('search')) {
      router.push('/products');
    }
  };

  return (
    <>
      {/* FESTIVAL CAMPAIGN BANNER */}
      <OfferBanner position="announcement_bar" />

      {/* ROW 1 — ALWAYS-VISIBLE RUNNING ANNOUNCEMENT (STICKY TOP-0) */}
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

      {/* ROW 2 & ROW 3 — MAIN HEADER (STICKY BELOW ROW 1) */}
      <header
        className={`sticky ${announcementEnabled ? 'top-[28px] sm:top-[32px]' : 'top-0'} z-40 site-header-dynamic transition-all duration-300 ${
          isScrolled
            ? 'bg-[#fcfbf7]/98 backdrop-blur-md shadow-md border-b border-[#e8e2d5]'
            : 'bg-[#fcfbf7] border-b border-[#e8e2d5]/80'
        } ${settings?.layoutControls?.headerStyle === 'compact' ? 'py-0.5' : ''}`}
        style={{
          paddingTop: 'var(--m-head-py, clamp(3px, 1vw, 5px))',
          paddingBottom: 'var(--m-head-py, clamp(3px, 1vw, 5px))',
        }}
      >
        <div className="max-w-7xl mx-auto" style={{ paddingLeft: 'var(--m-head-px, clamp(8px, 2.2vw, 12px))', paddingRight: 'var(--m-head-px, clamp(8px, 2.2vw, 12px))' }}>
          {/* =========================================
              DESKTOP HEADER VIEW (md:flex)
             ========================================= */}
          <div className="hidden md:flex items-center justify-between gap-4">
            {/* Left: Brand Logo & Actions */}
            <div className="flex items-center gap-3 shrink-0">
              <Link href="/" aria-label="Musky Dose Homepage" className="flex items-center">
                <BrandLogo logoUrl={logoUrl} size="md" priority />
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] text-xs font-bold rounded-lg transition-all shadow-xs shrink-0"
              >
                <ShoppingBag className="w-4 h-4 text-[#c5a059]" />
                <span>Shop Products</span>
              </Link>
              <PwaInstallCTA />
            </div>

            {/* Middle: Desktop Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg relative flex items-center h-10">
              <div className="relative w-full h-full">
                <input
                  id="desktop-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={cms.navSearchPlaceholder || 'Search products, Sojat henna, hair care...'}
                  className="w-full h-full pl-9 pr-8 bg-white border border-[#e8e2d5] rounded-xl text-xs sm:text-sm text-[#0f2d22] placeholder-gray-400 focus:outline-none focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/10 transition-all shadow-2xs"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="ml-2 h-full px-4 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] font-bold text-xs rounded-xl transition-colors shrink-0 shadow-2xs flex items-center justify-center cursor-pointer border border-[#1b4332]"
              >
                Search
              </button>
            </form>

            {/* Right: Desktop Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={openWishlist}
                className="relative p-2 bg-white hover:bg-[#f5f1e8] text-[#0f2d22] border border-[#e8e2d5] rounded-xl transition-all flex items-center justify-center shadow-2xs"
                title="View Wishlist"
                aria-label="View Wishlist"
              >
                <Heart className={`w-4 h-4 ${totalWishlistItems > 0 ? 'fill-rose-500 text-rose-500' : 'text-[#1b4332]'}`} />
                {totalWishlistItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {totalWishlistItems}
                  </span>
                )}
              </button>

              <button
                onClick={openCart}
                className="relative p-2 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] rounded-xl transition-all flex items-center justify-center shadow-2xs"
                title="View Order Cart"
                aria-label="View Order Cart"
              >
                <ShoppingBag className="w-4 h-4 text-[#c5a059]" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#c5a059] text-[#0f2d22] text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                    {totalItems}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* =========================================
              MOBILE HEADER VIEW (md:hidden)
              Fluid Responsive Scale System
             ========================================= */}
          <div className="md:hidden flex flex-col" style={{ gap: 'var(--m-row-gap, clamp(3px, 1vw, 5px))' }}>
            {/* MOBILE ROW 1: Logo | Install App | Wishlist | Cart | Menu */}
            <div
              className="flex items-center justify-between"
              style={{
                height: 'var(--m-ctrl-h, clamp(29px, 7.5vw, 32px))',
                gap: 'var(--m-col-gap, clamp(4px, 1.2vw, 6px))',
              }}
            >
              {/* Left Group: Logo + Install App */}
              <div className="flex items-center shrink-0 min-w-0" style={{ gap: 'var(--m-col-gap, clamp(4px, 1.2vw, 6px))' }}>
                <Link href="/" aria-label="Musky Dose Homepage" className="shrink-0 flex items-center">
                  <BrandLogo logoUrl={logoUrl} size="sm" priority />
                </Link>
                <PwaInstallCTA
                  className="bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] border border-[#c5a059]/40 font-bold rounded-lg transition-all shadow-2xs shrink-0 cursor-pointer inline-flex items-center justify-center gap-1"
                  style={{
                    height: 'var(--m-ctrl-h, clamp(29px, 7.5vw, 32px))',
                    fontSize: '12px',
                    paddingLeft: '8px',
                    paddingRight: '8px',
                  }}
                  showTextOnMobile
                />
              </div>

              {/* Right Group: Wishlist | Cart | Menu */}
              <div className="flex items-center shrink-0" style={{ gap: 'var(--m-col-gap, clamp(4px, 1.2vw, 6px))' }}>
                <button
                  onClick={openWishlist}
                  className="relative bg-white hover:bg-[#f5f1e8] text-[#0f2d22] border border-[#e8e2d5] rounded-lg transition-all flex items-center justify-center shadow-2xs shrink-0 cursor-pointer"
                  style={{
                    height: 'var(--m-ctrl-h, clamp(29px, 7.5vw, 32px))',
                    width: 'var(--m-ctrl-w, clamp(29px, 7.5vw, 32px))',
                    minWidth: 'var(--m-ctrl-w, clamp(29px, 7.5vw, 32px))',
                  }}
                  title="View Wishlist"
                  aria-label="View Wishlist"
                >
                  <Heart
                    className={`${totalWishlistItems > 0 ? 'fill-rose-500 text-rose-500' : 'text-[#1b4332]'}`}
                    style={{ width: '15px', height: '15px' }}
                  />
                  {totalWishlistItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-extrabold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                      {totalWishlistItems}
                    </span>
                  )}
                </button>

                <button
                  onClick={openCart}
                  className="relative bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] rounded-lg transition-all flex items-center justify-center shadow-2xs shrink-0 cursor-pointer"
                  style={{
                    height: 'var(--m-ctrl-h, clamp(29px, 7.5vw, 32px))',
                    width: 'var(--m-ctrl-w, clamp(29px, 7.5vw, 32px))',
                    minWidth: 'var(--m-ctrl-w, clamp(29px, 7.5vw, 32px))',
                  }}
                  title="View Order Cart"
                  aria-label="View Order Cart"
                >
                  <ShoppingBag
                    className="text-[#c5a059]"
                    style={{ width: '15px', height: '15px' }}
                  />
                  {totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 bg-[#c5a059] text-[#0f2d22] text-[9px] font-extrabold w-3.5 h-3.5 rounded-full flex items-center justify-center border border-white">
                      {totalItems}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="rounded-lg text-[#0f2d22] bg-white border border-[#e8e2d5] hover:bg-[#f5f1e8] focus:outline-none shrink-0 flex items-center justify-center cursor-pointer"
                  style={{
                    height: 'var(--m-ctrl-h, clamp(29px, 7.5vw, 32px))',
                    width: 'var(--m-ctrl-w, clamp(29px, 7.5vw, 32px))',
                    minWidth: 'var(--m-ctrl-w, clamp(29px, 7.5vw, 32px))',
                  }}
                  aria-label="Toggle Menu"
                >
                  {mobileMenuOpen ? (
                    <X style={{ width: '15px', height: '15px' }} />
                  ) : (
                    <Menu style={{ width: '15px', height: '15px' }} />
                  )}
                </button>
              </div>
            </div>

            {/* MOBILE ROW 2: Search Input + Search Action Button */}
            <div>
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center w-full min-w-0"
                style={{
                  height: 'var(--m-ctrl-h, clamp(29px, 7.5vw, 32px))',
                  gap: 'var(--m-col-gap, clamp(4px, 1.2vw, 6px))',
                }}
              >
                <div
                  className="relative flex-1 min-w-0"
                  style={{ height: 'var(--m-ctrl-h, clamp(29px, 7.5vw, 32px))' }}
                >
                  <input
                    id="mobile-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={cms.navSearchPlaceholder || "Search products, Sojat henna..."}
                    className="w-full pl-7 pr-7 bg-white border border-[#e8e2d5] rounded-lg text-[#0f2d22] placeholder-gray-400 focus:outline-none focus:border-[#1b4332] focus:ring-1 focus:ring-[#1b4332]/20 shadow-2xs truncate font-sans"
                    style={{
                      height: 'var(--m-ctrl-h, clamp(29px, 7.5vw, 32px))',
                      fontSize: '12.5px',
                    }}
                  />
                  <Search
                    className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    style={{ width: '14px', height: '14px' }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className="bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] font-bold rounded-lg transition-colors shrink-0 shadow-2xs flex items-center justify-center border border-[#1b4332] cursor-pointer"
                  style={{
                    height: 'var(--m-ctrl-h, clamp(29px, 7.5vw, 32px))',
                    width: 'auto',
                    paddingLeft: '12px',
                    paddingRight: '12px',
                    fontSize: '12px',
                  }}
                >
                  Search
                </button>
              </form>
            </div>
          </div>

          {/* DESKTOP SECOND ROW: CATEGORY / SITE NAVIGATION STRIP */}
          <div className="hidden md:block mt-2 pt-1.5 border-t border-[#e8e2d5]/60 overflow-x-auto scroll-smooth [scrollbar-width:none]">
            <div className="flex items-center gap-1.5 pb-0.5 whitespace-nowrap">
              {navItems.map((item) => {
                const isSelected = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                const icon = getNavIcon(item.href, item.label);
                return (
                  <Link
                    key={item.id || item.href}
                    href={item.href}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#1b4332] text-[#c5a059] shadow-2xs border border-[#1b4332]'
                        : 'bg-white text-[#0f2d22] hover:bg-[#f5f1e8] border border-[#e8e2d5]'
                    }`}
                  >
                    {icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* ROW 4 — TRUST / CONTACT STRIP (COLLAPSIBLE ON SCROLL) */}
      <div className="bg-[#f5f1e8] text-[#1b4332] border-b border-[#e8e2d5] py-1.5 sm:py-2 px-1.5 sm:px-4 lg:px-6 relative z-10 min-w-0">
        <div className="max-w-7xl mx-auto flex items-center justify-center sm:justify-between text-[10.5px] xs:text-[11.5px] sm:text-xs font-bold tracking-tight whitespace-nowrap min-w-0">
          <div className="flex items-center justify-center gap-1.5 xs:gap-2 sm:gap-4 md:gap-6 w-full sm:w-auto min-w-0">
            {/* Trust Point 1: Pure Sojat Henna */}
            <span className="inline-flex items-center gap-1 sm:gap-1.5 shrink-0 text-[#0f2d22] min-w-0">
              <Leaf className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#1b4332] shrink-0" />
              <span>Pure Sojat Henna</span>
            </span>

            <span className="text-[#c5a059]/60 font-normal select-none shrink-0">•</span>

            {/* Trust Point 2: Fast All-India Dispatch */}
            <span className="inline-flex items-center gap-1 sm:gap-1.5 shrink-0 text-[#0f2d22] min-w-0">
              <Truck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#1b4332] shrink-0" />
              <span><span className="hidden min-[360px]:inline">Fast </span>All-India Dispatch</span>
            </span>

            <span className="text-[#c5a059]/60 font-normal select-none shrink-0">•</span>

            {/* Trust Point 3: Clickable Phone Contact (FULL NUMBER, NEVER CLIPPED) */}
            <a
              href={`tel:${displayPhone.replace(/[\s-]/g, '')}`}
              className="inline-flex items-center gap-1 sm:gap-1.5 shrink-0 text-[#1b4332] hover:text-[#c5a059] transition-colors focus:outline-none focus:ring-1 focus:ring-[#1b4332] rounded-md px-0.5 sm:px-1 py-0.5 whitespace-nowrap"
              aria-label="Call Musky Dose"
            >
              <Phone className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#c5a059] shrink-0" />
              <span className="whitespace-nowrap font-bold">{displayPhone}</span>
            </a>
          </div>

          {/* Desktop Right Secondary: Wholesale Quick Link */}
          <div className="hidden lg:flex items-center gap-2 text-xs shrink-0">
            <Link
              href="/wholesale"
              className="inline-flex items-center gap-1 text-[#1b4332] hover:text-[#c5a059] font-bold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" />
              <span>Wholesale & Bulk Enquiries</span>
            </Link>
          </div>
        </div>
      </div>

      {/* MOBILE SLIDE-OVER MENU DRAWER (PORTALED TO BODY TO GUARANTEE TRUE VIEWPORT POSITIONING) */}
      {mounted && typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex justify-end">
                  {/* Full-Screen Backdrop Overlay */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setMobileMenuOpen(false)}
                    className="fixed inset-0 bg-[#0f2d22]/60 backdrop-blur-xs"
                    aria-hidden="true"
                  />

                  {/* Compact Drawer Container Panel (50-55vw responsive clamp) */}
                  <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'tween', duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="relative z-10 w-[55vw] min-w-[250px] max-w-[320px] max-h-[100dvh] h-full bg-[#fcfbf7] border-l border-[#e8e2d5] shadow-2xl flex flex-col overflow-hidden"
                  >
                    {/* 1. Fixed / Sticky Drawer Header */}
                    <div className="shrink-0 px-3 py-2.5 bg-[#0f2d22] text-white flex items-center justify-between border-b border-[#2d6a4f] sticky top-0 z-20">
                      <Link
                        href="/"
                        onClick={() => setMobileMenuOpen(false)}
                        aria-label="Musky Dose Homepage"
                        className="inline-flex items-center"
                      >
                        <BrandLogo logoUrl={logoUrl} size="sm" className="bg-white/95 px-2 py-0.5 rounded-lg shadow-xs" />
                      </Link>
                      <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="p-1.5 text-gray-300 hover:text-white rounded-lg bg-[#1b4332] active:scale-95 transition-transform cursor-pointer"
                        aria-label="Close menu"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* 2. Compact Scrollable Content Area (Natural Document Flow) */}
                    <div
                      className="flex-1 overflow-y-auto overscroll-contain flex flex-col p-3 space-y-3"
                      style={{
                        paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
                      }}
                    >
                      {/* Menu Items List */}
                      <div className="space-y-0.5">
                        {navItems.map((item) => {
                          const isSelected = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                          const icon = getNavIcon(item.href, item.label);
                          return (
                            <Link
                              key={item.id || item.href}
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                                isSelected
                                  ? 'bg-[#1b4332] text-[#c5a059] shadow-2xs'
                                  : 'text-[#0f2d22] hover:bg-[#f5f1e8] active:bg-[#ede8dc]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {icon}
                                <span className="truncate">{item.label}</span>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
                            </Link>
                          );
                        })}
                      </div>

                      {/* Divider & Utilities in Natural Document Flow */}
                      <div className="pt-2 border-t border-[#e8e2d5] space-y-2.5 shrink-0">
                        <div className="flex items-center justify-between py-0.5 bg-white px-2 py-1.5 rounded-lg border border-[#e8e2d5]">
                          <span className="text-[11px] font-bold text-[#0f2d22]">App:</span>
                          <PwaInstallCTA />
                        </div>
                        <Link
                          href="/products"
                          onClick={() => setMobileMenuOpen(false)}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] font-extrabold text-xs rounded-lg shadow-xs active:scale-[0.99] transition-all"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-[#c5a059]" />
                          <span>EXPLORE PRODUCTS</span>
                        </Link>
                        <p className="text-[9.5px] text-center text-gray-500 font-medium leading-tight">
                          Sojat, Rajasthan | +91 {whatsappNumber}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>,
            document.body
          )
        : null}

      {/* FIXED MOBILE BOTTOM NAVIGATION BAR */}
      <MobileBottomNav />
    </>
  );
}

function NavbarFallback({ siteSettings }: { siteSettings?: SiteSettings }) {
  const brandName = siteSettings?.brandName || 'MUSKY DOSE';
  const tagline = siteSettings?.tagline || 'HENNA & HERBAL CARE';

  return (
    <header className="bg-[#fcfbf7] py-2.5 sm:py-4 border-b border-[#e8e2d5]/80">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo logoUrl={siteSettings?.logoUrl} size="md" />
          <div>
            <div className="font-serif-heading text-lg sm:text-2xl font-extrabold text-[#0f2d22] uppercase">
              {brandName}
            </div>
            <div className="text-[9px] text-[#c5a059] uppercase font-semibold">
              {tagline}
            </div>
          </div>
        </div>
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
