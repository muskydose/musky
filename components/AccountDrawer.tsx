'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUI } from '@/context/UIContext';
import SideDrawer from '@/components/ui/SideDrawer';
import {
  User,
  Package,
  MessageCircle,
  Truck,
  ShieldCheck,
  HelpCircle,
  FileText,
  Lock,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Phone,
  Search,
} from 'lucide-react';

export default function AccountDrawer() {
  const { isAccountOpen, closeAccount } = useUI();
  const router = useRouter();
  const [orderQuery, setOrderQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const handleTrackOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderQuery.trim()) return;

    setSearching(true);
    closeAccount();

    const clean = orderQuery.trim();
    // Navigate or open whatsapp with order query
    const message = encodeURIComponent(`Hi Musky Dose, I want to track my order. My Phone/Order Number is: ${clean}`);
    window.open(`https://wa.me/918233703080?text=${message}`, '_blank');
    setSearching(false);
  };

  return (
    <SideDrawer
      isOpen={isAccountOpen}
      onClose={closeAccount}
      side="right"
      widthClassName="w-full sm:w-[420px] max-w-full"
      icon={<User className="w-4 h-4 text-[#c5a059]" />}
      title="My Account & Orders"
      subtitle="Track orders, customer support & policies"
      footer={
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1b4332]" /> Verified Musky Dose Store
          </span>
          <Link
            href="/admin/login"
            onClick={closeAccount}
            className="text-[11px] text-gray-400 hover:text-[#0f2d22] flex items-center gap-1"
          >
            <Lock className="w-3 h-3" />
            <span>Admin Login</span>
          </Link>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Track Order Card */}
        <div className="bg-white p-3.5 rounded-xl border border-[#e8e2d5] shadow-2xs">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-[#e8f3ed] text-[#1b4332] rounded-lg">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-[#0f2d22]">Track Your Order</h4>
              <p className="text-[10px] text-gray-500">Enter mobile number or order ID</p>
            </div>
          </div>

          <form onSubmit={handleTrackOrder} className="flex gap-1.5 mt-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderQuery}
                onChange={(e) => setOrderQuery(e.target.value)}
                placeholder="Mobile number or MD-..."
                className="w-full pl-8 pr-3 py-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs text-[#0f2d22] placeholder-gray-400 focus:outline-none focus:border-[#1b4332]"
              />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="px-3 py-2 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] text-xs font-bold rounded-lg shadow-2xs transition-all shrink-0 cursor-pointer active:scale-95"
            >
              Track
            </button>
          </form>
        </div>

        {/* WhatsApp Direct Concierge */}
        <div className="bg-[#0f2d22] p-3.5 rounded-xl text-white shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#1b4332] text-[#c5a059] rounded-lg">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-[#c5a059]">Direct WhatsApp Support</h4>
                <p className="text-[10px] text-gray-300">Fast help with orders, bulk & custom packs</p>
              </div>
            </div>
          </div>
          <a
            href="https://wa.me/918233703080?text=Hi%20Musky%20Dose,%20I%20need%20help%20with%20my%20order."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-extrabold text-xs rounded-lg transition-all shadow-xs"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Chat on WhatsApp (+91 82337 03080)</span>
          </a>
        </div>

        {/* Quick Account Navigation Links */}
        <div className="space-y-1 bg-white p-2 rounded-xl border border-[#e8e2d5] shadow-2xs">
          <Link
            href="/wholesale"
            onClick={closeAccount}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-[#0f2d22] hover:bg-[#f5f1e8] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#c5a059]" />
              <span>Wholesale & Bulk Enquiries</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
          </Link>

          <Link
            href="/shipping-policy"
            onClick={closeAccount}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-[#0f2d22] hover:bg-[#f5f1e8] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-[#1b4332]" />
              <span>Shipping & Delivery Policy</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
          </Link>

          <Link
            href="/return-policy"
            onClick={closeAccount}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-[#0f2d22] hover:bg-[#f5f1e8] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#1b4332]" />
              <span>Returns & Refunds Policy</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
          </Link>

          <Link
            href="/faq"
            onClick={closeAccount}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-[#0f2d22] hover:bg-[#f5f1e8] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-4 h-4 text-[#1b4332]" />
              <span>Frequently Asked Questions</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
          </Link>

          <Link
            href="/about"
            onClick={closeAccount}
            className="flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-[#0f2d22] hover:bg-[#f5f1e8] transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-[#1b4332]" />
              <span>About Musky Dose & Sojat Heritage</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
          </Link>
        </div>

        {/* Origin info badge */}
        <div className="p-3 bg-[#f5f1e8] border border-[#e8e2d5] rounded-xl text-center">
          <p className="text-[11px] font-bold text-[#0f2d22]">
            Musky Dose — Pure Sojat Mehandi
          </p>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Sojat City, Pali District, Rajasthan, India
          </p>
        </div>
      </div>
    </SideDrawer>
  );
}

