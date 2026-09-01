'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import { SPRINGS, DURATION, EASING } from '@/lib/motion';

export interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  headerAction?: React.ReactNode;
  headerClassName?: string;
  bodyClassName?: string;
  footer?: React.ReactNode;
  widthClassName?: string;
  showCloseButton?: boolean;
  closeAriaLabel?: string;
  children: React.ReactNode;
}

export default function SideDrawer({
  isOpen,
  onClose,
  side = 'right',
  title,
  subtitle,
  icon,
  badge,
  headerAction,
  headerClassName,
  bodyClassName,
  footer,
  widthClassName = 'w-full max-w-md sm:max-w-md',
  showCloseButton = true,
  closeAriaLabel = 'Close drawer',
  children,
}: SideDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll & handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  const isLeft = side === 'left';
  const slideInitial = shouldReduceMotion
    ? { opacity: 0 }
    : isLeft
    ? { x: '-100%' }
    : { x: '100%' };

  const slideAnimate = shouldReduceMotion
    ? { opacity: 1 }
    : { x: 0 };

  const slideExit = shouldReduceMotion
    ? { opacity: 0 }
    : isLeft
    ? { x: '-100%' }
    : { x: '100%' };

  const slideTransition = shouldReduceMotion
    ? { duration: DURATION.micro }
    : SPRINGS.drawer;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div
          className={`fixed inset-0 z-50 flex ${isLeft ? 'justify-start' : 'justify-end'}`}
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop Overlay with smooth blur fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DURATION.fast, ease: 'easeOut' }}
            onClick={onClose}
            className="fixed inset-0 bg-[#0f2d22]/60 backdrop-blur-xs cursor-pointer touch-none"
            aria-hidden="true"
          />

          {/* Slide-in Spring Panel */}
          <motion.div
            initial={slideInitial}
            animate={slideAnimate}
            exit={slideExit}
            transition={slideTransition}
            className={`relative z-10 ${widthClassName} max-h-[100dvh] h-full bg-[#fcfbf7] ${
              isLeft ? 'border-r' : 'border-l'
            } border-[#e8e2d5] shadow-2xl flex flex-col overflow-hidden will-change-transform`}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <div
                className={`shrink-0 px-4 py-3.5 bg-[#0f2d22] text-white flex items-center justify-between border-b border-[#2d6a4f] sticky top-0 z-20 ${
                  headerClassName || ''
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  {icon && (
                    <div className="p-1.5 bg-[#1b4332] text-[#c5a059] rounded-lg shrink-0 flex items-center justify-center">
                      {icon}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {typeof title === 'string' ? (
                        <h2 className="font-serif-heading font-extrabold text-sm sm:text-base text-white tracking-tight truncate">
                          {title}
                        </h2>
                      ) : (
                        title
                      )}
                      {badge}
                    </div>
                    {subtitle && (
                      <p className="text-[11px] text-[#c5a059] font-medium leading-tight truncate">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {headerAction}
                  {showCloseButton && (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={onClose}
                      className="p-1.5 text-gray-300 hover:text-white rounded-lg bg-[#1b4332] hover:bg-[#2d6a4f] transition-colors cursor-pointer touch-manipulation"
                      aria-label={closeAriaLabel}
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  )}
                </div>
              </div>
            )}

            {/* Scrollable Content Body */}
            <div
              className={`flex-1 overflow-y-auto overscroll-contain flex flex-col ${
                bodyClassName || 'p-4'
              }`}
              style={{
                paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
              }}
            >
              {children}
            </div>

            {/* Sticky Footer */}
            {footer && (
              <div className="shrink-0 p-4 bg-white border-t border-[#e8e2d5] shadow-lg sticky bottom-0 z-20">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
