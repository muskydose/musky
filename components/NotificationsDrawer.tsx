'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useUI } from '@/context/UIContext';
import SideDrawer from '@/components/ui/SideDrawer';
import {
  Bell,
  Sparkles,
  Tag,
  Truck,
  Leaf,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  category: 'offer' | 'harvest' | 'shipping' | 'announcement';
  couponCode?: string;
  link?: string;
  isRead: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    title: 'Fresh Sojat 2026 Harvest Batch In Stock',
    description: 'Ultra-fine 5-stage filtered Rajasthani Lawsonia Inermis leaves with intense dye release. Available in 100g, 250g, 500g & 1kg packs.',
    time: 'Today',
    category: 'harvest',
    link: '/products',
    isRead: false,
  },
  {
    id: 'notif-2',
    title: 'Special First Order Discount — 10% OFF',
    description: 'Use coupon code MUSKY10 during checkout to get 10% instant discount on retail henna and herbal hair care packs.',
    time: 'Active Now',
    category: 'offer',
    couponCode: 'MUSKY10',
    link: '/checkout',
    isRead: false,
  },
  {
    id: 'notif-3',
    title: 'FREE Pan-India Shipping on Orders ₹999+',
    description: 'Enjoy free express shipping on orders over ₹999 with consolidated WhatsApp updates and tracking.',
    time: 'Store Wide',
    category: 'shipping',
    link: '/products',
    isRead: false,
  },
  {
    id: 'notif-4',
    title: 'Wholesale Bulk Tier Rates Live',
    description: 'Salons, bridal artists & distributors can now request direct factory pricing for 5kg to 1000kg+ bulks.',
    time: '2 days ago',
    category: 'announcement',
    link: '/wholesale',
    isRead: true,
  },
];

export default function NotificationsDrawer() {
  const { isNotificationsOpen, closeNotifications } = useUI();
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [copiedCoupon, setCopiedCoupon] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCoupon(code);
    setTimeout(() => setCopiedCoupon(null), 2000);
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'offer':
        return <Tag className="w-4 h-4 text-emerald-600" />;
      case 'harvest':
        return <Leaf className="w-4 h-4 text-[#1b4332]" />;
      case 'shipping':
        return <Truck className="w-4 h-4 text-sky-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-[#c5a059]" />;
    }
  };

  return (
    <SideDrawer
      isOpen={isNotificationsOpen}
      onClose={closeNotifications}
      side="right"
      widthClassName="w-full sm:w-[420px] max-w-full"
      icon={<Bell className="w-4 h-4 text-[#c5a059]" />}
      title={
        <div className="flex items-center gap-2">
          <span className="font-serif-heading font-extrabold text-sm sm:text-base text-white tracking-tight">
            Updates & Offers
          </span>
          {unreadCount > 0 && (
            <span className="bg-[#c5a059] text-[#0f2d22] text-[10px] font-black px-2 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
      }
      subtitle="Latest announcements, harvest batches & coupons"
      headerAction={
        unreadCount > 0 ? (
          <button
            type="button"
            onClick={markAllAsRead}
            className="text-[10px] text-[#c5a059] hover:underline font-bold px-1.5 py-1 rounded cursor-pointer"
          >
            Mark all read
          </button>
        ) : null
      }
      footer={
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Fresh updates direct from Sojat, Pali</span>
          <Link
            href="/products"
            onClick={closeNotifications}
            className="font-bold text-[#1b4332] hover:text-[#0f2d22] flex items-center gap-1"
          >
            <span>Shop Now</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      }
    >
      <div className="space-y-3">
        {notifications.map((item) => (
          <div
            key={item.id}
            className={`p-3.5 rounded-xl border transition-all ${
              item.isRead
                ? 'bg-white border-[#e8e2d5] opacity-90'
                : 'bg-white border-[#b7dfcb] shadow-2xs'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-[#fcfbf7] rounded-lg border border-[#e8e2d5] shrink-0 mt-0.5">
                {getCategoryIcon(item.category)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="font-bold text-xs text-[#0f2d22] leading-tight">
                    {item.title}
                  </h4>
                  <span className="text-[9px] text-gray-400 font-medium shrink-0">
                    {item.time}
                  </span>
                </div>

                <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                  {item.description}
                </p>

                {/* Coupon Copy Pill (if present) */}
                {item.couponCode && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyCoupon(item.couponCode!)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold font-mono transition-colors cursor-pointer"
                    >
                      {copiedCoupon === item.couponCode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>COPIED!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{item.couponCode}</span>
                        </>
                      )}
                    </button>
                    <span className="text-[10px] text-gray-400">Click to copy code</span>
                  </div>
                )}

                {item.link && (
                  <div className="mt-2">
                    <Link
                      href={item.link}
                      onClick={closeNotifications}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1b4332] hover:text-[#0f2d22]"
                    >
                      <span>View details</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </SideDrawer>
  );
}

