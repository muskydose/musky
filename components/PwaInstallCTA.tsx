'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Download, X, Share, PlusSquare, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PwaInstallCTAProps {
  className?: string;
  showTextOnMobile?: boolean;
  style?: React.CSSProperties;
}

export default function PwaInstallCTA({ className, showTextOnMobile, style }: PwaInstallCTAProps = {}) {
  const pathname = usePathname();

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [showIosModal, setShowIosModal] = useState<boolean>(false);
  const [installedSuccess, setInstalledSuccess] = useState<boolean>(false);

  useEffect(() => {
    // 1. Never show on /admin routes or admin login
    if (pathname && pathname.startsWith('/admin')) {
      return;
    }

    // 2. Register minimal Service Worker safely
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const registerSw = () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.error('ServiceWorker registration failed:', err);
        });
      };
      if (document.readyState === 'complete') {
        registerSw();
      } else {
        window.addEventListener('load', registerSw);
      }
    }

    // 3. Detect if app is already running in standalone / PWA mode
    const checkStandalone = () => {
      if (typeof window === 'undefined') return false;
      const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
      const isIosStandalone = (window.navigator as any).standalone === true;
      return isStandaloneMedia || isIosStandalone;
    };

    if (checkStandalone()) {
      setIsStandalone(true);
      return;
    }

    // 4. Detect iOS / Safari environment
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent;
      const isIosDevice = /iPhone|iPad|iPod/i.test(ua);
      const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS/i.test(ua);
      if (isIosDevice || (isIosDevice && isSafari)) {
        setIsIos(true);
      }
    }

    // 5. Listen for Chromium native beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setIsInstallable(false);
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [pathname]);

  // Hide ONLY on admin routes or when already installed / running in standalone mode
  if (pathname?.startsWith('/admin') || isStandalone) {
    return null;
  }

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsStandalone(true);
        }
        setDeferredPrompt(null);
        setIsInstallable(false);
      } catch (err) {
        console.error('Error triggering PWA install prompt:', err);
        setShowIosModal(true);
      }
    } else {
      setShowIosModal(true);
    }
  };

  return (
    <>
      {/* Header Compact Install Action Button */}
      <button
        type="button"
        onClick={handleInstallClick}
        style={style}
        className={className || "h-[36px] px-2 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] border border-[#c5a059]/40 text-[12px] font-bold rounded-lg transition-all shadow-2xs shrink-0 cursor-pointer inline-flex items-center justify-center gap-1"}
        title={isIos ? 'Add Musky Dose to Home Screen' : 'Install Musky Dose App'}
        aria-label={isIos ? 'Add to Home Screen' : 'Install App'}
      >
        <Download className="w-[15px] h-[15px] text-[#c5a059] shrink-0" />
        <span className={`text-[12px] tracking-tight whitespace-nowrap ${showTextOnMobile ? 'inline' : 'hidden min-[360px]:inline'}`}>
          {isIos ? 'Add App' : 'Install'}
        </span>
      </button>

      {/* Instructions Modal for Browsers without active beforeinstallprompt */}
      <AnimatePresence>
        {showIosModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-5 sm:p-6 max-w-[calc(100vw-32px)] sm:max-w-sm w-full border border-[#e8e2d5] shadow-2xl space-y-4 text-[#0f2d22]"
            >
              <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-3">
                <div className="font-serif-heading font-bold text-base text-[#0f2d22] flex items-center gap-2">
                  <Download className="w-5 h-5 text-emerald-800" />
                  <span>{isIos ? 'Add to Home Screen' : 'Install Musky Dose App'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIosModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed">
                To install <strong>Musky Dose</strong> on your device for instant access:
              </p>

              {isIos ? (
                <div className="space-y-3 bg-[#FAF8F5] p-4 rounded-2xl border border-[#e8e2d5] text-xs">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
                      <Share className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-[#0f2d22]">Step 1:</span>
                      <p className="text-gray-600 text-[11px]">Tap the <strong>Share</strong> button in Safari toolbar.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
                      <PlusSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-[#0f2d22]">Step 2:</span>
                      <p className="text-gray-600 text-[11px]">Scroll down & tap <strong>&quot;Add to Home Screen&quot;</strong>.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-[#FAF8F5] p-4 rounded-2xl border border-[#e8e2d5] text-xs">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-[#0f2d22]">Option A:</span>
                      <p className="text-gray-600 text-[11px]">Look for the <strong>Install</strong> icon (⊕) in your browser address bar.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg shrink-0 mt-0.5">
                      <PlusSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-[#0f2d22]">Option B:</span>
                      <p className="text-gray-600 text-[11px]">Open browser menu (⋮) and tap <strong>&quot;Install App&quot;</strong> or <strong>&quot;Add to Home Screen&quot;</strong>.</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                className="w-full py-2.5 bg-[#1b4332] hover:bg-[#0f2d22] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Installed Success Toast */}
      {installedSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-[#0f2d22] text-white px-4 py-3 rounded-2xl border border-[#c5a059] shadow-xl flex items-center gap-2 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-[#c5a059]" />
          <span>Musky Dose App installed successfully!</span>
        </div>
      )}
    </>
  );
}

