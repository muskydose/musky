'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  Users,
  Settings,
  CreditCard,
  LogOut,
  Leaf,
  ShieldAlert,
  CheckCircle,
  Menu,
  X,
  ExternalLink,
  Sliders,
  Percent,
  Building2,
  Image as ImageIcon,
  Tag,
  FileText,
  BookOpen,
  Award,
  Globe,
  TrendingUp,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paymentOnlineState, setPaymentOnlineState] = useState(false);

  useEffect(() => {
    let isMounted = true;
    // Fetch payment settings status
    fetch('/api/settings')
      .then((res) => (res.ok && res.headers.get('content-type')?.includes('application/json') ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.success && data.paymentSettings) {
          setPaymentOnlineState(data.paymentSettings.onlinePaymentEnabled);
        }
      })
      .catch(() => {
        // Silently handle component unmount or transient network error
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth', { method: 'DELETE' });
    } catch (err) {
      console.warn('Logout API error:', err);
    }
    router.push('/admin/login');
    router.refresh();
  };

  const menuItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Products', href: '/admin/products', icon: Package },
    { name: 'Categories', href: '/admin/categories', icon: FolderTree },
    { name: 'Offers & Festival', href: '/admin/offers', icon: Tag },
    { name: 'Bulk Pricing', href: '/admin/bulk-pricing', icon: Percent },
    { name: 'Media Library', href: '/admin/media', icon: ImageIcon },
    { name: 'Wholesale Enquiries', href: '/admin/wholesale', icon: Building2 },
    { name: 'Growth AI', href: '/admin/growth', icon: TrendingUp },
    { name: 'Orders Log', href: '/admin/orders', icon: ShoppingBag },
    { name: 'Customers', href: '/admin/customers', icon: Users },
    { name: 'Website Settings', href: '/admin/settings', icon: Settings },
    { name: 'Custom Pages', href: '/admin/pages', icon: FileText },
    { name: 'Business Content', href: '/admin/business-content', icon: Award },
    { name: 'Product Guides', href: '/admin/guides', icon: BookOpen },
    { name: 'SEO & Google', href: '/admin/seo', icon: Globe },
    { name: 'Payment Settings', href: '/admin/payments', icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#1f2421] flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-[#0f2d22] text-white p-4 flex items-center justify-between border-b border-[#2d6a4f]/40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1b4332] flex items-center justify-center text-[#c5a059]">
            <Leaf className="w-4 h-4" />
          </div>
          <span className="font-serif-heading font-bold text-lg text-white">Musky Dose Admin</span>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-[#c5a059]"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`w-full md:w-64 bg-[#0f2d22] text-[#e8f3ed] flex flex-col justify-between shrink-0 transition-all duration-300 border-r border-[#2d6a4f]/30 ${
          sidebarOpen ? 'block' : 'hidden md:flex'
        }`}
      >
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-[#2d6a4f]/40 hidden md:block">
            <Link href="/" target="_blank" className="flex items-center group">
              <BrandLogo size="md" className="bg-white/95 px-2.5 py-1 rounded-xl shadow-xs" />
            </Link>
          </div>

          {/* Payment Toggle Live Alert Badge */}
          <div className="p-4 mx-4 my-4 rounded-lg bg-[#1b4332]/60 border border-[#2d6a4f] text-xs space-y-1">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-[#c5a059]">Online Payment</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  paymentOnlineState
                    ? 'bg-emerald-500 text-white'
                    : 'bg-amber-600/90 text-white'
                }`}
              >
                {paymentOnlineState ? 'ACTIVE' : 'OFF (WhatsApp Active)'}
              </span>
            </div>
            <p className="text-[11px] text-[#b2c8be]">
              {paymentOnlineState
                ? 'Online Payment Gateway is turned ON.'
                : 'Primary active method: WhatsApp Orders.'}
            </p>
          </div>

          {/* Menu Items */}
          <nav className="px-3 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? 'bg-[#c5a059] text-[#0f2d22] shadow-sm'
                      : 'text-[#b2c8be] hover:bg-[#1b4332] hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-[#2d6a4f]/40 space-y-2">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-[#b2c8be] hover:text-white rounded hover:bg-[#1b4332]"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-[#c5a059]" /> View Public Website
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 rounded transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Admin</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Title Bar */}
        <header className="bg-white border-b border-[#e8e2d5] px-6 py-4 flex items-center justify-between shadow-xs">
          <div>
            <h1 className="font-serif-heading text-2xl font-bold text-[#0f2d22]">
              {title}
            </h1>
            <p className="text-xs text-[#626c66]">
              Musky Dose Store & Catalog Management System
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#e8f3ed] text-[#1b4332]">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Admin Verified
            </span>
          </div>
        </header>

        {/* Page Children Content */}
        <div className="p-6 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
