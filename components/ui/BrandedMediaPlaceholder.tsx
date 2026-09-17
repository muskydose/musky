import React from 'react';

interface BrandedMediaPlaceholderProps {
  role?: string;
  slotName?: string;
  entityName?: string;
  aspectRatio?: string;
  className?: string;
}

/**
 * Clean, premium branded placeholder component when an asset is missing or pending manual upload.
 * Based on the approved "From Earth to Ritual" aesthetic.
 * Replaces generic broken image placeholders with an elegant, truthful "MEDIA REQUIRED" state.
 */
export const BrandedMediaPlaceholder: React.FC<BrandedMediaPlaceholderProps> = ({
  role = 'PRIMARY',
  slotName,
  entityName,
  aspectRatio = '1:1',
  className = '',
}) => {
  return (
    <div
      className={`relative flex flex-col items-center justify-center bg-[#faf5e8] border border-[#e0d6c3] p-6 text-center select-none overflow-hidden ${className}`}
      style={{
        aspectRatio: aspectRatio === '16:9' ? '16/9' : aspectRatio === '4:5' ? '4/5' : aspectRatio === '9:16' ? '9/16' : '1/1',
      }}
    >
      {/* Background subtle botanical pattern */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none flex items-center justify-center">
        <svg width="100%" height="100%" viewBox="0 0 100 100" fill="currentColor">
          <circle cx="50" cy="50" r="40" stroke="#1b4332" strokeWidth="2" fill="none" strokeDasharray="4 4" />
        </svg>
      </div>

      {/* Inner framing */}
      <div className="relative z-10 flex flex-col items-center max-w-[85%]">
        {/* Botanical Icon Seal */}
        <div className="w-12 h-12 rounded-2xl bg-[#1b4332] border border-[#d4af37]/40 flex items-center justify-center shadow-sm mb-3">
          <svg className="w-6 h-6 text-[#d4af37]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z" />
            <path d="M12 6v6l4 2" />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c2.5 0 4.8-.9 6.5-2.4" />
          </svg>
        </div>

        {/* Brand Name */}
        <span className="text-[10px] font-bold tracking-[0.2em] text-[#1b4332] uppercase mb-1">
          MUSKY DOSE
        </span>

        {/* Action Status */}
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1b4332]/10 border border-[#1b4332]/20 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] animate-pulse" />
          <span className="text-[9px] font-semibold tracking-wider text-[#1b4332] uppercase">
            MEDIA REQUIRED
          </span>
        </div>

        {/* Slot / Role Badge */}
        <span className="text-xs font-serif text-[#2d3748] line-clamp-1 max-w-full font-medium">
          {slotName || `${role} Slot`}
        </span>

        {entityName && (
          <span className="text-[10px] text-[#718096] truncate max-w-full mt-0.5">
            {entityName}
          </span>
        )}
      </div>

      {/* Corner accents */}
      <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-[#d4af37]/40" />
      <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-[#d4af37]/40" />
      <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-[#d4af37]/40" />
      <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-[#d4af37]/40" />
    </div>
  );
};
export default BrandedMediaPlaceholder;

