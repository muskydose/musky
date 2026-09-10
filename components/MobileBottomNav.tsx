'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, Building2, ShoppingCart, Menu } from 'lucide-react';
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
  const { isMobileMenuOpen, openMobileMenu } = useUI();

  // Admin pages exclusion - never show on admin
  if (pathname.startsWith('/admin')) {
    return null;
  }

  const isHomeActive = pathname === '/';
  const isShopActive = pathname === '/products' || (pathname.startsWith('/products/') && pathname !== '/products');
  const isWholesaleActive = pathname === '/wholesale';
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
      label: 'Wholesale',
      href: '/wholesale',
      icon: Building2,
      isActive: isWholesaleActive,
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
      data-mobile-nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#fcfbf7]/98 backdrop-blur-md border-t border-[#e8e2d5] shadow-2xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-5 items-stretch max-w-md mx-auto h-14">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isCurrent = item.isActive;

          const content = (
            <>
              {/* Gold top-border active indicator */}
              {isCurrent && (
                <motion.div
                  layoutId="activeBottomTabIndicator"
                  transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 38 }}
                  className="absolute top-0 left-0 right-0 h-[2.5px] bg-[#c5a059] rounded-b-full"
                />
              )}

              <div className="relative mt-1.5">
                <Icon
                  className={`transition-all duration-200 ${
                    isCurrent
                      ? 'w-[22px] h-[22px] text-[#1b4332] stroke-[2.5px]'
                      : 'w-5 h-5 text-[#626c66]'
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
                className={`text-[10px] mt-0.5 mb-1.5 whitespace-nowrap tracking-tight transition-colors duration-150 ${
                  isCurrent ? 'font-extrabold text-[#1b4332]' : 'font-medium text-[#626c66]'
                }`}
              >
                {item.label}
              </span>
            </>
          );

          const sharedClass = `relative flex flex-col items-center justify-center min-h-[44px] w-full text-center cursor-pointer touch-manipulation transition-colors duration-150 ${
            isCurrent ? 'bg-[#f0faf5] text-[#1b4332]' : 'text-[#626c66] hover:text-[#0f2d22] hover:bg-[#f5f1e8]'
          }`;

          if (item.onClick) {
            return (
              <motion.button
                key={item.label}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.93 }}
                onClick={item.onClick}
                className={sharedClass}
                aria-label={item.label}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {content}
              </motion.button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={sharedClass}
              aria-label={item.label}
              aria-current={isCurrent ? 'page' : undefined}
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
