'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { ImageOff, Maximize2, Minimize2, ExternalLink } from 'lucide-react';

interface MediaThumbnailProps {
  src: string;
  alt: string;
  className?: string;
  defaultFit?: 'cover' | 'contain';
  allowToggleFit?: boolean;
  priority?: boolean;
  role?: string;
}

export default function MediaThumbnail({
  src,
  alt,
  className = '',
  defaultFit = 'cover',
  allowToggleFit = true,
  priority = false,
  role,
}: MediaThumbnailProps) {
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [fit, setFit] = useState<'cover' | 'contain'>(defaultFit);

  // Reset state when src changes
  useEffect(() => {
    if (!src || src.trim().length === 0) {
      setLoadState('error');
    } else {
      setLoadState('loading');
    }
  }, [src]);

  const cleanSrc = src ? src.trim() : '';
  const isInvalidUrl = !cleanSrc || cleanSrc === 'undefined' || cleanSrc === 'null';

  // Parse hostname for helpful diagnostic display if error
  let hostDisplay = 'Remote Host';
  try {
    if (cleanSrc.startsWith('http')) {
      const parsed = new URL(cleanSrc);
      hostDisplay = parsed.hostname;
    } else if (cleanSrc.startsWith('/')) {
      hostDisplay = 'Local Asset';
    } else if (cleanSrc.startsWith('data:')) {
      hostDisplay = 'Inline Data';
    }
  } catch {
    hostDisplay = 'Invalid URL';
  }

  if (isInvalidUrl || loadState === 'error') {
    return (
      <div
        className={`relative w-full h-full bg-[#f5f1e8] border border-dashed border-[#e8e2d5] flex flex-col items-center justify-center p-3 text-center select-none overflow-hidden ${className}`}
      >
        <div className="w-9 h-9 rounded-xl bg-amber-100/80 text-amber-800 flex items-center justify-center mb-1.5 shadow-2xs">
          <ImageOff className="w-4 h-4" />
        </div>
        <p className="text-[11px] font-bold text-[#0f2d22] leading-tight">Asset Unavailable</p>
        <span className="text-[9px] text-gray-500 font-mono mt-0.5 truncate max-w-[90%] px-1 py-0.5 bg-white/70 rounded border border-gray-200">
          {hostDisplay}
        </span>
        {role && (
          <span className="text-[8px] font-bold text-gray-400 uppercase mt-1">
            Slot: {role}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-[#fcfbf7] overflow-hidden group/thumb ${className}`}>
      {/* Loading Skeleton */}
      {loadState === 'loading' && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center z-10">
          <div className="w-5 h-5 border-2 border-emerald-700/20 border-t-emerald-700 rounded-full animate-spin" />
        </div>
      )}

      {/* Actual Image */}
      <Image
        src={cleanSrc}
        alt={alt || 'Media asset'}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={priority}
        className={`transition-opacity duration-300 ${
          fit === 'cover' ? 'object-cover' : 'object-contain p-1.5'
        } ${loadState === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoadState('loaded')}
        onError={() => setLoadState('error')}
        unoptimized
      />

      {/* Object-Fit Toggle Button */}
      {allowToggleFit && loadState === 'loaded' && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setFit((prev) => (prev === 'cover' ? 'contain' : 'cover'));
          }}
          className="absolute bottom-2 right-2 z-20 p-1.5 bg-[#0f2d22]/80 hover:bg-[#0f2d22] text-[#c5a059] rounded-lg shadow-sm backdrop-blur-xs opacity-0 group-hover/thumb:opacity-100 transition-opacity"
          title={fit === 'cover' ? 'Switch to Contain (Full View)' : 'Switch to Cover (Fill Crop)'}
        >
          {fit === 'cover' ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
}

