'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SideDrawer from '@/components/ui/SideDrawer';
import BrandLogo from '@/components/BrandLogo';
import PwaInstallCTA from '@/components/PwaInstallCTA';
import {
  Menu,
  ChevronRight,
  ShoppingBag,
  Home,
  Grid,
  Sparkles,
  BookOpen,
  Building2,
  HelpCircle,
  Phone,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { NavItem } from '@/lib/types';
import { DEFAULT_NAV_ITEMS } from '@/lib/data-store';

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logoUrl?: string;
  whatsappNumber?: string;
  navItems?: NavItem[];
}

export default function MenuDrawer({
  isOpen,
  onClose,
  logoUrl,
  whatsappNumber = '82337 03080',
  navItems = DEFAULT_NAV_ITEMS,
}: MenuDrawerProps) {
  const pathname = usePathname();

  const getNavIcon = (href: string, label: string) => {
    const h = href.toLowerCase();
    const l = label.toLowerCase();
    if (h === '/' || l.includes('home')) return <Home className="w-4 h-4 text-[#c5a059]" />;
    if (h.includes('categor') || l.includes('categor')) return <Grid className="w-4 h-4 text-[#c5a059]" />;
    if (h.includes('product') || l.includes('shop') || l.includes('product'))
      return <ShoppingBag className="w-4 h-4 text-[#c5a059]" />;
    if (h.includes('wholesale') || l.includes('wholesale') || l.includes('bulk'))
      return <Sparkles className="w-4 h-4 text-[#c5a059]" />;
    if (h.includes('guide') || l.includes('guide')) return <BookOpen className="w-4 h-4 text-[#c5a059]" />;
    if (h.includes('factory') || l.includes('factory') || h.includes('about') || l.includes('about'))
      return <Building2 className="w-4 h-4 text-[#c5a059]" />;
    if (h.includes('faq') || l.includes('faq')) return <HelpCircle className="w-4 h-4 text-[#c5a059]" />;
    if (h.includes('contact') || l.includes('contact')) return <Phone className="w-4 h-4 text-[#c5a059]" />;
    return <FileText className="w-4 h-4 text-[#c5a059]" />;
  };

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      side="right"
      widthClassName="w-[60vw] min-w-[270px] max-w-[340px]"
      title={
        <Link
          href="/"
          onClick={onClose}
          aria-label="Musky Dose Homepage"
          className="inline-flex items-center"
        >
          <BrandLogo logoUrl={logoUrl} size="sm" className="bg-white/95 px-2 py-0.5 rounded-lg shadow-xs" />
        </Link>
      }
      subtitle="Pure Sojat Henna & Herbal Care"
      bodyClassName="p-3 space-y-3"
      footer={
        <div className="space-y-2">
          <Link
            href="/products"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] font-extrabold text-xs rounded-xl shadow-xs active:scale-[0.99] transition-all"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#c5a059]" />
            <span>EXPLORE CATALOG</span>
          </Link>
          <p className="text-[9.5px] text-center text-gray-500 font-medium leading-tight">
            Sojat, Rajasthan | +91 {whatsappNumber}
          </p>
        </div>
      }
    >
      {/* Menu Items List */}
      <div className="space-y-1">
        {navItems.map((item) => {
          const isSelected = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const icon = getNavIcon(item.href, item.label);
          return (
            <Link
              key={item.id || item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isSelected
                  ? 'bg-[#1b4332] text-[#c5a059] shadow-2xs border border-[#1b4332]'
                  : 'text-[#0f2d22] hover:bg-[#f5f1e8] active:bg-[#ede8dc]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {icon}
                <span className="truncate">{item.label}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
            </Link>
          );
        })}
      </div>

      {/* PWA App Install CTA */}
      <div className="pt-2 border-t border-[#e8e2d5]">
        <div className="flex items-center justify-between bg-white px-2.5 py-2 rounded-xl border border-[#e8e2d5]">
          <span className="text-[11px] font-bold text-[#0f2d22]">App:</span>
          <PwaInstallCTA />
        </div>
      </div>
    </SideDrawer>
  );
}

