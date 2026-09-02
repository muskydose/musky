'use client';

import React from 'react';
import { CartProvider } from '@/context/CartContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { UIProvider } from '@/context/UIContext';
import CartDrawer from '@/components/CartDrawer';
import WishlistDrawer from '@/components/WishlistDrawer';
import SearchDrawer from '@/components/SearchDrawer';
import CategoryDrawer from '@/components/CategoryDrawer';
import AccountDrawer from '@/components/AccountDrawer';
import NotificationsDrawer from '@/components/NotificationsDrawer';
import PageTransitionIndicator from '@/components/PageTransitionIndicator';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <CartProvider>
        <WishlistProvider>
          <PageTransitionIndicator />
          {children}
          <CartDrawer />
          <WishlistDrawer />
          <SearchDrawer />
          <CategoryDrawer />
          <AccountDrawer />
          <NotificationsDrawer />
        </WishlistProvider>
      </CartProvider>
    </UIProvider>
  );
}
