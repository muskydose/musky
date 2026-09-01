'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Grid, ShoppingCart, Menu } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useUI } from '@/context/UIContext';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import { SPRINGS } from '@/lib/motion';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  isActive: boolean;
  onClick?: (e: React.MouseEvent) => void;
  badge?: number;
}

export default function MobileBottomNav() {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const { totalItems, isCartOpen, openCart } = useCart();
  const { isCategoryOpen, openCategory, isMobileMenuOpen, openMobileMenu } = useUI();

  // Admin pages exclusion - never show on admin
  if (pathname.startsWith('/admin')) {
    return null;
  }

  const isHomeActive = pathname === '/';
  const isShopActive = pathname === '/products' || (pathname.startsWith('/products/') && pathname !== '/products');
  const isCategoryActive = isCategoryOpen || pathname === '/categories' || pathname.startsWith('/categories/');
  const isCartActive = isCartOpen || pathname === '/cart';
  const isMenuActive = isMobileMenuOpen;

  const navItems: NavItem[] = [
    {
      label: 'Home',
      href: '/',
      icon: Home,
      isActive: isHomeActive,
    },
    {
      label: 'Shop',
      href: '/products',
      icon: ShoppingBag,
      isActive: isShopActive,
    },
    {
      label: 'Category',
      href: '#category',
      icon: Grid,
      isActive: isCategoryActive,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        openCategory();
      },
    },
    {
      label: 'Cart',
      href: '#cart',
      icon: ShoppingCart,
      isActive: isCartActive,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        openCart();
      },
      badge: totalItems,
    },
    {
      label: 'Menu',
      href: '#menu',
      icon: Menu,
      isActive: isMenuActive,
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        openMobileMenu();
      },
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#fcfbf7]/98 backdrop-blur-md border-t border-[#e8e2d5] shadow-2xl px-1 pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+4px)]"
    >
      <div className="grid grid-cols-5 items-center justify-items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isCurrent = item.isActive;

          const content = (
            <>
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isCurrent ? 'text-[#1b4332] stroke-[2.5px] scale-105' : 'text-gray-600'
                  }`}
                />
                {item.badge !== undefined && item.badge > 0 && (
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={item.badge}
                      initial={shouldReduceMotion ? false : { scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={SPRINGS.badgePulse}
                      className="absolute -top-1.5 -right-2.5 bg-[#c5a059] text-[#0f2d22] text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border border-white shadow-2xs"
                    >
                      {item.badge}
                    </motion.span>
                  </AnimatePresence>
                )}
              </div>
              <span
                className={`text-[10px] mt-0.5 whitespace-nowrap tracking-tight transition-colors duration-150 ${
                  isCurrent ? 'font-extrabold text-[#1b4332]' : 'font-medium text-gray-600'
                }`}
              >
                {item.label}
              </span>
              {isCurrent && (
                <motion.div
                  layoutId="activeBottomTabIndicator"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  className="absolute bottom-0.5 w-6 h-0.5 bg-[#c5a059] rounded-full"
                />
              )}
            </>
          );

          if (item.onClick) {
            return (
              <motion.button
                key={item.label}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.93 }}
                onClick={item.onClick}
                className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors min-h-[46px] w-full text-center cursor-pointer touch-manipulation ${
                  isCurrent ? 'bg-[#e8f3ed]/80 text-[#1b4332]' : 'text-gray-600 hover:text-[#0f2d22]'
                }`}
                aria-label={item.label}
              >
                {content}
              </motion.button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors min-h-[46px] w-full text-center cursor-pointer touch-manipulation ${
                isCurrent ? 'bg-[#e8f3ed]/80 text-[#1b4332]' : 'text-gray-600 hover:text-[#0f2d22]'
              }`}
              aria-label={item.label}
            >
              <motion.div
                whileTap={shouldReduceMotion ? undefined : { scale: 0.93 }}
                className="w-full flex flex-col items-center justify-center"
              >
                {content}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
