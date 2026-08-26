'use client';

import React, { useState, useEffect, Suspense } from 'react';
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
import { getClientSiteSettings } from '@/lib/api-client';

interface NavbarProps {
  siteSettings?: SiteSettings;
}

function NavbarContent({ siteSettings: initialSettings }: NavbarProps) {
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

  // Handle scroll shadow
  useEffect(() => {
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
  const announcementText = settings?.announcementText || 'Pure Natural & Triple-Shifted Henna Direct from Sojat, Rajasthan';
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

  // Search handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) {
      router.push(`/products?search=${encodeURIComponent(query)}`);
    } else {
      router.push('/products');
    }
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

      {/* 1. TOP ANNOUNCEMENT BANNER */}
      {announcementEnabled && (
        <div
          className="bg-[#0f2d22] text-[#e8f3ed] border-b border-[#2d6a4f]/30"
          style={{
            paddingTop: 'var(--m-ann-py, clamp(2px, 0.8vw, 4px))',
            paddingBottom: 'var(--m-ann-py, clamp(2px, 0.8vw, 4px))',
            paddingLeft: 'var(--m-head-px, clamp(8px, 2.2vw, 12px))',
            paddingRight: 'var(--m-head-px, clamp(8px, 2.2vw, 12px))',
          }}
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-1 sm:gap-2 text-center sm:text-left">
            <Link
              href={announcementLink}
              className="flex items-center justify-center sm:justify-start gap-1.5 hover:text-[#c5a059] transition-colors leading-[1.15]"
            >
              <span
                className="inline-flex items-center justify-center font-extrabold bg-[#c5a059] text-[#0f2d22] shrink-0 uppercase tracking-wider rounded-md w-fit whitespace-nowrap"
                style={{
                  height: 'auto',
                  minHeight: '20px',
                  fontSize: 'var(--m-badge-fs, 11px)',
                  paddingTop: '2px',
                  paddingBottom: '2px',
                  paddingLeft: '8px',
                  paddingRight: '8px',
                  lineHeight: '1.1',
                }}
              >
                {cms.sojatBadgeText || 'SOJAT ORIGIN'}
              </span>
              <span
                className="font-semibold leading-[1.15] truncate max-w-[210px] min-[360px]:max-w-[260px] min-[390px]:max-w-none"
                style={{ fontSize: 'var(--m-ann-fs, clamp(11px, 2.8vw, 12px))' }}
              >
                {announcementText}
              </span>
            </Link>
            <div className="flex items-center justify-center gap-3 font-medium shrink-0">
              <a
                href={`tel:${displayPhone}`}
                className="flex items-center gap-1 hover:text-[#c5a059] transition-colors"
                style={{ fontSize: 'var(--m-phone-fs, clamp(10.5px, 2.6vw, 11.5px))' }}
              >
                <Phone className="text-[#c5a059]" style={{ width: 'var(--m-phone-icon, clamp(11.5px, 3vw, 13.5px))', height: 'var(--m-phone-icon, clamp(11.5px, 3vw, 13.5px))' }} />
                <span>{displayPhone}</span>
              </a>
              <span className="hidden sm:inline text-[#2d6a4f]">|</span>
              <Link href="/wholesale" className="hidden sm:inline-flex items-center gap-1 text-[#c5a059] font-bold hover:underline text-xs">
                <Sparkles className="w-3 h-3" />
                <span>Bulk / Wholesale Enquiries</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN HEADER */}
      <header
        className={`sticky top-0 z-40 site-header-dynamic transition-all duration-300 ${
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
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-lg relative flex items-center">
              <div className="relative w-full">
                <input
                  id="desktop-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={cms.navSearchPlaceholder || 'Search products, Sojat henna, hair care...'}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-[#e8e2d5] rounded-xl text-xs sm:text-sm text-[#0f2d22] placeholder-gray-400 focus:outline-none focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/10 transition-all shadow-2xs"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="ml-2 px-3.5 py-2 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] font-bold text-xs rounded-xl transition-colors shrink-0 shadow-2xs"
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

            {/* MOBILE ROW 4: Compact Shipping / Trust Info Banner Strip */}
            <div
              className="bg-[#f5f1e8] text-[#1b4332] font-bold rounded-lg border border-[#e8e2d5] flex items-center justify-center whitespace-nowrap max-w-full overflow-hidden"
              style={{
                height: 'var(--m-trust-h, clamp(22px, 5.5vw, 25px))',
                fontSize: '11px',
                paddingLeft: '8px',
                paddingRight: '8px',
                gap: 'var(--m-col-gap, clamp(4px, 1.2vw, 6px))',
              }}
            >
              <span className="flex items-center gap-1 shrink-0">
                <ShieldCheck className="text-[#c5a059]" style={{ width: 'var(--m-trust-icon, clamp(13px, 3.5vw, 15px))', height: 'var(--m-trust-icon, clamp(13px, 3.5vw, 15px))' }} /> Pure Sojat Henna
              </span>
              <span className="text-gray-300">•</span>
              <span className="flex items-center gap-1 shrink-0">
                <Truck className="text-[#1b4332]" style={{ width: 'var(--m-trust-icon, clamp(13px, 3.5vw, 15px))', height: 'var(--m-trust-icon, clamp(13px, 3.5vw, 15px))' }} /> Fast All-India Dispatch
              </span>
              <span className="hidden md:inline text-gray-300">•</span>
              <span className="hidden md:inline-flex items-center gap-1 shrink-0 text-[#25D366]">
                <MessageCircle className="fill-[#25D366] text-[#25D366]" style={{ width: 'var(--m-trust-icon, clamp(13px, 3.5vw, 15px))', height: 'var(--m-trust-icon, clamp(13px, 3.5vw, 15px))' }} /> WhatsApp Support
              </span>
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

        {/* MOBILE SLIDE-OVER MENU DRAWER */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex justify-end">
              {/* Full-Screen Backdrop Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-[#0f2d22]/60 backdrop-blur-xs"
                aria-hidden="true"
              />

              {/* Drawer Container Panel */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-[85vw] max-w-sm h-[100dvh] max-h-[100dvh] bg-[#fcfbf7] border-l border-[#e8e2d5] shadow-2xl flex flex-col overflow-hidden"
              >
                {/* 1. Fixed / Sticky Drawer Header */}
                <div className="shrink-0 p-4 bg-[#0f2d22] text-white flex items-center justify-between border-b border-[#2d6a4f] sticky top-0 z-20">
                  <Link
                    href="/"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Musky Dose Homepage"
                    className="inline-flex items-center"
                  >
                    <BrandLogo logoUrl={logoUrl} size="md" className="bg-white/95 px-2.5 py-1 rounded-xl shadow-xs" />
                  </Link>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-gray-300 hover:text-white rounded-lg bg-[#1b4332] active:scale-95 transition-transform cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 2. Scrollable Content Area */}
                <div
                  className="flex-1 overflow-y-auto overscroll-contain flex flex-col justify-between"
                  style={{
                    paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))',
                  }}
                >
                  {/* Menu Items List */}
                  <div className="p-4 space-y-1">
                    {navItems.map((item) => {
                      const isSelected = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                      const icon = getNavIcon(item.href, item.label);
                      return (
                        <Link
                          key={item.id || item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between p-3 rounded-xl text-sm font-bold transition-colors ${
                            isSelected
                              ? 'bg-[#1b4332] text-[#c5a059]'
                              : 'text-[#0f2d22] hover:bg-[#f5f1e8] active:bg-[#ede8dc]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {icon}
                            <span>{item.label}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 opacity-50" />
                        </Link>
                      );
                    })}
                  </div>

                  {/* Bottom Elements in Normal Flow */}
                  <div className="p-4 pt-2 space-y-3 bg-white border-t border-[#e8e2d5] mt-auto shrink-0">
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs font-bold text-[#0f2d22]">Musky Dose App:</span>
                      <PwaInstallCTA />
                    </div>
                    <Link
                      href="/products"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] font-extrabold text-xs rounded-xl shadow-md active:scale-[0.99] transition-all"
                    >
                      <ShoppingBag className="w-4 h-4 text-[#c5a059]" />
                      <span>EXPLORE PRODUCTS</span>
                    </Link>
                    <p className="text-[10px] text-center text-gray-500 font-medium pt-1">
                      Sojat, Rajasthan, India | +91 {whatsappNumber}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </header>

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
