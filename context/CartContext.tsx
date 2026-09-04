'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, ProductVariant } from '@/lib/types';
import { getCartItemId, getEffectiveVariantPrice } from '@/lib/product-variants';

export interface CartItem {
  id: string; // Collision-free identity: `${product.id}::${variantId || 'default'}`
  product: Product;
  selectedVariant?: ProductVariant;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  isLoaded: boolean;
  addToCart: (product: Product, quantity?: number, selectedVariant?: ProductVariant | null) => void;
  removeFromCart: (identifier: string) => void;
  updateQuantity: (identifier: string, quantity: number) => void;
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
  // Safely normalizes legacy cart items lacking an 'id' or 'selectedVariant'
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem(CART_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            const normalized: CartItem[] = parsed
              .filter((item: any) => item && item.product && item.product.id)
              .map((item: any) => ({
                id: item.id || getCartItemId(item.product.id, item.selectedVariant?.id),
                product: item.product,
                selectedVariant: item.selectedVariant || undefined,
                quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
              }));
            setCart(normalized);
          }
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

  const addToCart = (
    product: Product,
    quantity: number = 1,
    selectedVariant?: ProductVariant | null
  ) => {
    if (quantity <= 0) return;
    if (product.stockStatus === 'out_of_stock' || product.isActive === false) {
      return;
    }

    const cartItemId = getCartItemId(product.id, selectedVariant?.id);

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => {
        const itemKey = item.id || getCartItemId(item.product.id, item.selectedVariant?.id);
        return itemKey === cartItemId;
      });

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            id: cartItemId,
            product,
            selectedVariant: selectedVariant || undefined,
            quantity,
          },
        ];
      }
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (identifier: string) => {
    setCart((prev) =>
      prev.filter((item) => {
        const itemKey = item.id || getCartItemId(item.product.id, item.selectedVariant?.id);
        if (identifier.includes('::')) {
          return itemKey !== identifier;
        }
        return itemKey !== identifier && item.product.id !== identifier;
      })
    );
  };

  const updateQuantity = (identifier: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(identifier);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        const itemKey = item.id || getCartItemId(item.product.id, item.selectedVariant?.id);
        const matches = identifier.includes('::')
          ? itemKey === identifier
          : itemKey === identifier || item.product.id === identifier;
        return matches ? { ...item, quantity } : item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const totalAmount = cart.reduce((acc, item) => {
    const linePrice = getEffectiveVariantPrice(item.product, item.selectedVariant);
    return acc + linePrice * item.quantity;
  }, 0);

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
