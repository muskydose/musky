'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

type TransitionState = 'idle' | 'loading' | 'finishing';

const FINISH_MS = 320;
const SLOW_SIGNAL_MS = 180;
const MAX_TRANSITION_MS = 12000;

function isModifiedClick(event: MouseEvent) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function isNavigableAnchor(anchor: HTMLAnchorElement) {
  if (!anchor.href || anchor.target === '_blank' || anchor.hasAttribute('download')) return false;
  if (anchor.dataset.noPageTransition === 'true') return false;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  if (url.pathname === window.location.pathname && url.search === window.location.search) return false;
  return true;
}

export default function GlobalPageTransition() {
  const pathname = usePathname();
  const [state, setState] = useState<TransitionState>('idle');
  const [showBrandSignal, setShowBrandSignal] = useState(false);
  const previousPathRef = useRef(pathname);
  const activeRef = useRef(false);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slowSignalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    if (slowSignalTimerRef.current) clearTimeout(slowSignalTimerRef.current);
    if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    finishTimerRef.current = null;
    slowSignalTimerRef.current = null;
    safetyTimerRef.current = null;
  }, []);

  const startTransition = useCallback(() => {
    if (activeRef.current) return;

    activeRef.current = true;
    clearTimers();
    setState('loading');
    setShowBrandSignal(false);

    slowSignalTimerRef.current = setTimeout(() => {
      if (activeRef.current) setShowBrandSignal(true);
    }, SLOW_SIGNAL_MS);

    // Hard safety net: navigation must never leave the signal stuck.
    safetyTimerRef.current = setTimeout(() => {
      activeRef.current = false;
      setShowBrandSignal(false);
      setState('idle');
    }, MAX_TRANSITION_MS);
  }, [clearTimers]);

  const finishTransition = useCallback(() => {
    if (!activeRef.current) return;

    clearTimers();
    setShowBrandSignal(false);
    setState('finishing');
    finishTimerRef.current = setTimeout(() => {
      activeRef.current = false;
      setState('idle');
      finishTimerRef.current = null;
    }, FINISH_MS);
  }, [clearTimers]);

  // A pathname change is the authoritative completion signal for App Router navigation.
  useEffect(() => {
    if (previousPathRef.current !== pathname) {
      previousPathRef.current = pathname;
      finishTransition();
    }
  }, [pathname, finishTransition]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (isModifiedClick(event)) return;

      const target = event.target as Element | null;
      const anchor = target?.closest('a');
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) return;
      if (!isNavigableAnchor(anchor)) return;

      startTransition();
    };

    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function (...args) {
      startTransition();
      return originalPushState.apply(this, args);
    };

    window.history.replaceState = function (...args) {
      // Next.js uses replaceState for some internal URL synchronization. Only show the
      // transition when the URL actually changes; the pathname effect completes it.
      const nextUrl = args[2];
      if (nextUrl) {
        const next = new URL(String(nextUrl), window.location.href);
        if (next.origin === window.location.origin && next.pathname !== window.location.pathname) {
          startTransition();
        }
      }
      return originalReplaceState.apply(this, args);
    };

    const handlePopState = () => startTransition();

    document.addEventListener('click', handleDocumentClick, true);
    window.addEventListener('popstate', handlePopState);

    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
      window.removeEventListener('popstate', handlePopState);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      clearTimers();
    };
  }, [clearTimers, startTransition]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  if (state === 'idle') return null;

  return (
    <div
      className={`global-page-transition ${state === 'finishing' ? 'is-finishing' : ''}`}
      aria-live="polite"
      aria-busy={state === 'loading'}
    >
      <div className="global-page-transition__line" aria-hidden="true">
        <span />
      </div>

      {showBrandSignal && state === 'loading' && (
        <div className="global-page-transition__signal" aria-hidden="true">
          <div className="global-page-transition__leaf">
            <svg viewBox="0 0 48 48" role="presentation">
              <path d="M36.5 8.5C23.2 9.1 12.1 14.2 9.2 25.3c-1.4 5.4 1.3 10.6 6.9 11.5 8.2 1.3 14.5-5.2 14.8-12.5-3.1 3.3-7 5.2-11.8 5.6 4.6-2.4 8.1-5.7 10.8-10.1-1.2 6.2-3.7 11.1-7.6 14.7 6.7-1.8 11.2-6.5 12.8-13.4 1-4.3 1.4-8.4 1.4-12.6Z" fill="currentColor" />
              <path d="M11.5 39.5c5.1-7.5 10.2-12.6 16.2-16.2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          <span>Preparing something natural...</span>
        </div>
      )}
    </div>
  );
}
