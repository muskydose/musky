'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Grid, Heart } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { motion } from 'motion/react';

interface MobileBottomNavProps {
  onFocusSearch?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick?: (e: React.MouseEvent) => void;
  badge?: number;
}

export default function MobileBottomNav({}: MobileBottomNavProps) {
  const pathname = usePathname();
  const { totalItems, openCart } = useCart();
  const { totalWishlistItems, openWishlist } = useWishlist();

  // Hide on product detail & checkout pages where specialized sticky CTAs exist
  if (
    (pathname.startsWith('/products/') && pathname !== '/products') ||
    pathname.startsWith('/checkout')
  ) {
    return null;
  }

  const navItems: NavItem[] = [
    {
      label: 'Home',
      href: '/',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      label: 'Shop',
      href: '/products',
      icon: ShoppingBag,
      isActive: pathname === '/products',
    },
    {
      label: 'Categories',
      href: '/categories',
      icon: Grid,
      isActive: pathname.startsWith('/categories'),
    },
    {
      label: 'Wishlist',
      href: '#wishlist',
      icon: Heart,
      isActive: false,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        openWishlist();
      },
      badge: totalWishlistItems,
    },
    {
      label: 'Cart',
      href: '#cart',
      icon: ShoppingBag,
      isActive: false,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        openCart();
      },
      badge: totalItems,
    },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#fcfbf7]/95 backdrop-blur-md border-t border-[#e8e2d5] shadow-2xl py-1 px-1">
      <div className="grid grid-cols-5 items-center justify-items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isCurrent = item.isActive;

          if (item.onClick) {
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className={`relative flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-all min-h-[44px] w-full text-center ${
                  isCurrent ? 'text-[#1b4332]' : 'text-gray-500 hover:text-[#0f2d22]'
                }`}
                aria-label={item.label}
              >
                <div className="relative">
                  <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isCurrent ? 'text-[#1b4332]' : 'text-gray-600'}`} />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-[#c5a059] text-[#0f2d22] text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[9.5px] font-semibold mt-0.5 whitespace-nowrap tracking-tight ${isCurrent ? 'font-bold text-[#1b4332]' : 'text-gray-600'}`}>
                  {item.label}
                </span>
                {isCurrent && (
                  <motion.div
                    layoutId="mobileBottomTab"
                    className="absolute bottom-0 w-6 h-0.5 bg-[#c5a059] rounded-full"
                  />
                )}
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex flex-col items-center justify-center py-1 px-0.5 rounded-lg transition-all min-h-[44px] w-full text-center ${
                isCurrent ? 'text-[#1b4332]' : 'text-gray-500 hover:text-[#0f2d22]'
              }`}
              aria-label={item.label}
            >
              <div className="relative">
                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${isCurrent ? 'text-[#1b4332]' : 'text-gray-600'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[#c5a059] text-[#0f2d22] text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border border-white">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[9.5px] font-semibold mt-0.5 whitespace-nowrap tracking-tight ${isCurrent ? 'font-bold text-[#1b4332]' : 'text-gray-600'}`}>
                {item.label}
              </span>
              {isCurrent && (
                <motion.div
                  layoutId="mobileBottomTab"
                  className="absolute bottom-0 w-6 h-0.5 bg-[#c5a059] rounded-full"
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}


