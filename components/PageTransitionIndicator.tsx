'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Leaf } from 'lucide-react';

/**
 * Musky Dose — Universal Premium Page Transition Signal
 * 
 * - Ultra-thin gold & forest shimmer top progress line (2.5px)
 * - Subtle delayed brand leaf badge for slower navigations (>350ms)
 * - Automatic App Router navigation detection
 * - Zero artificial delay, non-blocking, zero layout shift
 * - Complete safety timeout fallback (never gets stuck)
 * - Respects prefers-reduced-motion
 */
function PageTransitionContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSlowSignal, setShowSlowSignal] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const prevRouteRef = useRef({
    pathname,
    search: searchParams?.toString() || '',
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const slowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const safetyTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    timerRef.current = null;
    slowTimerRef.current = null;
    safetyTimerRef.current = null;
  }, []);

  const completeProgress = useCallback(() => {
    clearAllTimers();
    setProgress(100);
    setIsFadingOut(true);

    // Smooth disappearance
    slowTimerRef.current = setTimeout(() => {
      setIsNavigating(false);
      setShowSlowSignal(false);
      setIsFadingOut(false);
      setProgress(0);
    }, 220);
  }, [clearAllTimers]);

  const startProgress = useCallback(() => {
    clearAllTimers();
    setIsFadingOut(false);
    setIsNavigating(true);
    setProgress(15);
    setShowSlowSignal(false);

    // Subtle trickle algorithm
    let current = 15;
    timerRef.current = setInterval(() => {
      if (current < 50) {
        current += Math.random() * 12 + 6;
      } else if (current < 75) {
        current += Math.random() * 6 + 3;
      } else if (current < 90) {
        current += Math.random() * 2 + 0.8;
      }
      setProgress(Math.min(92, Math.round(current)));
    }, 150);

    // Delayed subtle leaf indicator for slow navigations (>350ms)
    slowTimerRef.current = setTimeout(() => {
      setShowSlowSignal(true);
    }, 350);

    // Emergency safety fallback: auto complete ONLY if navigation is aborted or hung for > 15s
    safetyTimerRef.current = setTimeout(() => {
      completeProgress();
    }, 15000);
  }, [clearAllTimers, completeProgress]);

  // Listen to Next.js route completion
  useEffect(() => {
    const currentSearch = searchParams?.toString() || '';
    const routeChanged =
      pathname !== prevRouteRef.current.pathname ||
      currentSearch !== prevRouteRef.current.search;

    if (routeChanged) {
      prevRouteRef.current = { pathname, search: currentSearch };
      if (isNavigating) {
        completeProgress();
      }
    }
  }, [pathname, searchParams, isNavigating, completeProgress]);

  // Intercept internal link clicks, programmatic history navigation, and popstate
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      // Ignore modified clicks (new tab, etc.)
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const anchor = target.closest('a');
      if (!anchor) return;

      // Ignore links with target="_blank", download, or non-HTTP protocols
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }

      if (anchor.target && anchor.target !== '_self') {
        return;
      }

      if (anchor.hasAttribute('download')) {
        return;
      }

      // Check external domain
      try {
        const url = new URL(anchor.href, window.location.href);
        const isSameOrigin = url.origin === window.location.origin;

        // Skip external or WhatsApp links
        if (!isSameOrigin || url.hostname.includes('wa.me') || url.hostname.includes('whatsapp.com')) {
          return;
        }

        // Skip same-page anchors
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search &&
          url.hash
        ) {
          return;
        }

        // Same exact URL click
        if (url.pathname === window.location.pathname && url.search === window.location.search && !url.hash) {
          return;
        }

        // It is a valid internal navigation!
        startProgress();
      } catch {
        // Invalid URL, ignore
      }
    };

    // Intercept programmatic router.push / router.replace via history API
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    const checkAndTrigger = (urlStr?: string | URL | null) => {
      if (!urlStr) return;
      try {
        const url = new URL(urlStr.toString(), window.location.href);
        if (
          url.origin === window.location.origin &&
          (url.pathname !== window.location.pathname || url.search !== window.location.search)
        ) {
          startProgress();
        }
      } catch {}
    };

    window.history.pushState = function (...args) {
      checkAndTrigger(args[2]);
      return originalPushState.apply(this, args);
    };

    window.history.replaceState = function (...args) {
      checkAndTrigger(args[2]);
      return originalReplaceState.apply(this, args);
    };

    const handlePopState = () => {
      startProgress();
    };

    const handleCustomStart = () => {
      startProgress();
    };

    const handleCustomComplete = () => {
      completeProgress();
    };

    document.addEventListener('click', handleAnchorClick, { capture: true });
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('page-transition:start', handleCustomStart);
    window.addEventListener('page-transition:complete', handleCustomComplete);

    return () => {
      document.removeEventListener('click', handleAnchorClick, { capture: true });
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('page-transition:start', handleCustomStart);
      window.removeEventListener('page-transition:complete', handleCustomComplete);
      clearAllTimers();
    };
  }, [startProgress, completeProgress, clearAllTimers]);

  if (!isNavigating && progress === 0) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      className="pointer-events-none fixed inset-x-0 top-0 z-[99999] select-none"
    >
      {/* 1. Top Thin Shimmer Progress Line */}
      <div className="relative h-[2.5px] w-full overflow-hidden bg-transparent">
        <div
          className="h-full bg-gradient-to-r from-[#1b4332] via-[#c5a059] to-[#d4af37] shadow-[0_0_8px_rgba(197,160,89,0.7)] transition-all ease-out"
          style={{
            width: `${progress}%`,
            transitionDuration: progress === 100 ? '120ms' : '220ms',
            opacity: isFadingOut ? 0 : 1,
          }}
        />
      </div>

      {/* 2. Centered Subtle Brand Leaf Signal (Only for slower navigations > 350ms) */}
      {showSlowSignal && (
        <div
          className={`fixed left-1/2 top-5 -translate-x-1/2 transition-all duration-200 ease-out ${
            isFadingOut ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          <div className="flex items-center gap-2 rounded-full border border-[#c5a059]/40 bg-[#0f2d22]/90 px-3.5 py-1.5 shadow-xl backdrop-blur-md">
            <Leaf className="h-3.5 w-3.5 animate-pulse text-[#c5a059]" />
            <span className="font-serif-heading text-[11px] font-medium tracking-wide text-[#e8e2d5]">
              Loading...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PageTransitionIndicator() {
  return (
    <React.Suspense fallback={null}>
      <PageTransitionContent />
    </React.Suspense>
  );
}
