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
  if (url.pathname === window.location.pathname) return false;
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

  // The App Router pathname is the authoritative completion signal for real route changes.
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
      const nextUrl = args[2];
      if (nextUrl) {
        const next = new URL(String(nextUrl), window.location.href);
        if (next.origin === window.location.origin && next.pathname !== window.location.pathname) {
          startTransition();
        }
      }
      return originalPushState.apply(this, args);
    };

    window.history.replaceState = function (...args) {
      const nextUrl = args[2];
      if (nextUrl) {
        const next = new URL(String(nextUrl), window.location.href);
        if (next.origin === window.location.origin && next.pathname !== window.location.pathname) {
          startTransition();
        }
      }
      return originalReplaceState.apply(this, args);
    };

    const handlePopState = () => {
      const nextPath = window.location.pathname;
      if (nextPath !== previousPathRef.current) startTransition();
    };

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
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .global-page-transition {
          position: fixed;
          inset: 0;
          z-index: 2147483000;
          pointer-events: none;
        }
        .global-page-transition__line {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          overflow: hidden;
          opacity: 1;
          background: transparent;
        }
        .global-page-transition__line::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(196,154,85,.13);
        }
        .global-page-transition__line span {
          display: block;
          height: 100%;
          width: 68%;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent 0%, var(--brand-gold, #C49A55) 35%, #ead8ad 72%, var(--brand-gold, #C49A55) 100%);
          box-shadow: 0 0 9px rgba(196,154,85,.42);
          animation: global-page-transition-progress 1.35s cubic-bezier(.22,1,.36,1) infinite;
          transform-origin: left center;
        }
        .global-page-transition.is-finishing .global-page-transition__line span {
          width: 100%;
          animation: global-page-transition-complete .32s cubic-bezier(.22,1,.36,1) forwards;
        }
        .global-page-transition__signal {
          position: fixed;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          color: var(--brand-gold, #C49A55);
          font-family: var(--font-body, Karla, system-ui, sans-serif);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .02em;
          text-shadow: 0 1px 12px rgba(0,0,0,.16);
          animation: global-page-transition-signal-in .34s cubic-bezier(.22,1,.36,1) both;
        }
        .global-page-transition__leaf {
          width: 62px;
          height: 62px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(196,154,85,.72);
          border-radius: 50%;
          background: rgba(15,45,34,.94);
          box-shadow: 0 10px 35px rgba(15,45,34,.18), inset 0 0 0 5px rgba(196,154,85,.06);
          animation: global-page-transition-leaf 1.35s ease-in-out infinite;
        }
        .global-page-transition__leaf svg {
          width: 31px;
          height: 31px;
        }
        @keyframes global-page-transition-progress {
          0% { transform: translateX(-115%) scaleX(.35); opacity: .55; }
          50% { transform: translateX(45%) scaleX(.9); opacity: 1; }
          100% { transform: translateX(160%) scaleX(.55); opacity: .62; }
        }
        @keyframes global-page-transition-complete {
          from { transform: translateX(0) scaleX(.88); opacity: .9; }
          to { transform: translateX(0) scaleX(1); opacity: 0; }
        }
        @keyframes global-page-transition-signal-in {
          from { opacity: 0; transform: translate(-50%, -46%) scale(.96); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes global-page-transition-leaf {
          0%, 100% { transform: scale(1) rotate(-2deg); }
          50% { transform: scale(1.045) rotate(2deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .global-page-transition__line span,
          .global-page-transition__leaf,
          .global-page-transition__signal {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      ` }} />
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
    </>
  );
}
