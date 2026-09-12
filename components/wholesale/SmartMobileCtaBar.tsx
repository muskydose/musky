'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, ArrowDownCircle } from 'lucide-react';

interface SmartMobileCtaBarProps {
  onScrollToForm: () => void;
  whatsappUrl?: string;
  onDirectWhatsApp?: () => void;
}

export default function SmartMobileCtaBar({
  onScrollToForm,
  whatsappUrl,
  onDirectWhatsApp,
}: SmartMobileCtaBarProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const target = document.getElementById('wholesale-inquiry-form');
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When form is in view, hide the sticky bar so it never covers form fields or submit buttons
        if (entry.isIntersecting) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
      },
      {
        root: null,
        threshold: 0.1, // Trigger when 10% of the form enters the viewport
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      role="complementary"
      aria-label="Mobile quick quotation actions"
      className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 p-2.5 bg-[#0f2d22]/95 backdrop-blur-md border-t border-[#2d6a4f] shadow-lg md:hidden transition-transform duration-300"
    >
      <div className="flex items-center gap-2 max-w-md mx-auto">
        <button
          type="button"
          onClick={onScrollToForm}
          className="flex-1 py-2.5 px-3 rounded-xl bg-[#c5a059] text-[#0f2d22] font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition-transform cursor-pointer min-h-[44px]"
        >
          <ArrowDownCircle className="w-4 h-4 text-[#0f2d22]" />
          <span>Get Factory Quote</span>
        </button>

        {onDirectWhatsApp && (
          <button
            type="button"
            onClick={onDirectWhatsApp}
            aria-label="Connect with Sojat Factory Desk on WhatsApp"
            className="w-12 h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-sm active:scale-[0.98] transition-transform cursor-pointer shrink-0 min-h-[44px]"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}

