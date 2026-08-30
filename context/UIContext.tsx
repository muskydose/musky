'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

interface UIContextType {
  isSearchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  toggleSearch: () => void;

  isCategoryOpen: boolean;
  openCategory: () => void;
  closeCategory: () => void;
  toggleCategory: () => void;

  isAccountOpen: boolean;
  openAccount: () => void;
  closeAccount: () => void;
  toggleAccount: () => void;

  isNotificationsOpen: boolean;
  openNotifications: () => void;
  closeNotifications: () => void;
  toggleNotifications: () => void;

  isMobileMenuOpen: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;

  closeAllDrawers: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const openSearch = useCallback(() => {
    setIsCategoryOpen(false);
    setIsAccountOpen(false);
    setIsNotificationsOpen(false);
    setIsMobileMenuOpen(false);
    setIsSearchOpen(true);
  }, []);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
  }, []);

  const toggleSearch = useCallback(() => {
    setIsSearchOpen((prev) => !prev);
  }, []);

  const openCategory = useCallback(() => {
    setIsSearchOpen(false);
    setIsAccountOpen(false);
    setIsNotificationsOpen(false);
    setIsMobileMenuOpen(false);
    setIsCategoryOpen(true);
  }, []);

  const closeCategory = useCallback(() => {
    setIsCategoryOpen(false);
  }, []);

  const toggleCategory = useCallback(() => {
    setIsCategoryOpen((prev) => !prev);
  }, []);

  const openAccount = useCallback(() => {
    setIsSearchOpen(false);
    setIsCategoryOpen(false);
    setIsNotificationsOpen(false);
    setIsMobileMenuOpen(false);
    setIsAccountOpen(true);
  }, []);

  const closeAccount = useCallback(() => {
    setIsAccountOpen(false);
  }, []);

  const toggleAccount = useCallback(() => {
    setIsAccountOpen((prev) => !prev);
  }, []);

  const openNotifications = useCallback(() => {
    setIsSearchOpen(false);
    setIsCategoryOpen(false);
    setIsAccountOpen(false);
    setIsMobileMenuOpen(false);
    setIsNotificationsOpen(true);
  }, []);

  const closeNotifications = useCallback(() => {
    setIsNotificationsOpen(false);
  }, []);

  const toggleNotifications = useCallback(() => {
    setIsNotificationsOpen((prev) => !prev);
  }, []);

  const openMobileMenu = useCallback(() => {
    setIsSearchOpen(false);
    setIsCategoryOpen(false);
    setIsAccountOpen(false);
    setIsNotificationsOpen(false);
    setIsMobileMenuOpen(true);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const closeAllDrawers = useCallback(() => {
    setIsSearchOpen(false);
    setIsCategoryOpen(false);
    setIsAccountOpen(false);
    setIsNotificationsOpen(false);
    setIsMobileMenuOpen(false);
  }, []);

  return (
    <UIContext.Provider
      value={{
        isSearchOpen,
        openSearch,
        closeSearch,
        toggleSearch,
        isCategoryOpen,
        openCategory,
        closeCategory,
        toggleCategory,
        isAccountOpen,
        openAccount,
        closeAccount,
        toggleAccount,
        isNotificationsOpen,
        openNotifications,
        closeNotifications,
        toggleNotifications,
        isMobileMenuOpen,
        openMobileMenu,
        closeMobileMenu,
        toggleMobileMenu,
        closeAllDrawers,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}

