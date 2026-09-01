'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '@/lib/types';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  isLoaded: boolean;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'muskydose_cart_v1';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from localStorage after mount (prevents SSR hydration mismatch)
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem(CART_STORAGE_KEY);
        if (saved) {
          setCart(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load cart from storage:', e);
      } finally {
        setIsLoaded(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Save cart to localStorage on changes after initial load
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Failed to save cart to storage:', e);
    }
  }, [cart, isLoaded]);

  const addToCart = (product: Product, quantity: number = 1) => {
    if (quantity <= 0) return;
    if (product.stockStatus === 'out_of_stock' || product.isActive === false) {
      return;
    }
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      } else {
        return [...prev, { product, quantity }];
      }
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = cart.reduce(
    (acc, item) => acc + (item.product.price || 0) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        isLoaded,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalAmount,
        isCartOpen,
        setIsCartOpen,
        openCart: () => setIsCartOpen(true),
        closeCart: () => setIsCartOpen(false),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

const defaultCartContext: CartContextType = {
  cart: [],
  isLoaded: false,
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  totalItems: 0,
  totalAmount: 0,
  isCartOpen: false,
  setIsCartOpen: () => {},
  openCart: () => {},
  closeCart: () => {},
};

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    return defaultCartContext;
  }
  return context;
}
