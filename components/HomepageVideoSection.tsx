'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Volume2, VolumeX, ArrowRight, Sparkles, Film } from 'lucide-react';
import { SiteSettings, HomepageSectionConfig, HomepageVideoConfig } from '@/lib/types';
import { DEFAULT_HOMEPAGE_VIDEO } from '@/lib/data-store';
import { sanitizeImageUrl } from '@/lib/utils';

interface HomepageVideoSectionProps {
  section?: HomepageSectionConfig;
  siteSettings?: SiteSettings;
}

export default function HomepageVideoSection({
  section,
  siteSettings,
}: HomepageVideoSectionProps) {
  const videoConfig: HomepageVideoConfig =
    siteSettings?.homepageVideo || DEFAULT_HOMEPAGE_VIDEO;

  const [isPlaying, setIsPlaying] = useState<boolean>(Boolean(videoConfig.autoplay));
  const [isMuted, setIsMuted] = useState<boolean>(videoConfig.muted !== false);
  const [hasUserInteracted, setHasUserInteracted] = useState<boolean>(Boolean(videoConfig.autoplay));
  const [videoError, setVideoError] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Content priority: section override > videoConfig > fallback defaults
  const heading =
    section?.heading ||
    videoConfig.heading ||
    'Behind The Scenes: Pure Sojat Henna Processing';
  const subheading =
    section?.subheading ||
    videoConfig.subheading ||
    'SOJAT HERITAGE IN MOTION';
  const description =
    section?.description ||
    videoConfig.description ||
    'Experience the traditional harvest, solar drying, and fine micro-sifting of authentic Rajasthani Lawsonia Inermis henna in Sojat City.';
  const badgeText = videoConfig.badgeText || 'DIRECT FROM SOJAT FARMS';
  const ctaText = section?.ctaText || videoConfig.ctaText || 'Explore Henna Collection';
  const ctaUrl = section?.ctaLink || videoConfig.ctaUrl || '/categories/henna';

  const posterUrl = sanitizeImageUrl(
    videoConfig.posterUrl || section?.imageUrl || section?.image,
    '/images/hero-1.webp'
  );
  const videoUrl = videoConfig.videoUrl?.trim() || '';

  const handlePlayClick = () => {
    setHasUserInteracted(true);
    setIsPlaying(true);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Handle browser autoplay policy restrictions gracefully
        setIsMuted(true);
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch(() => {});
        }
      });
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const newMuted = !videoRef.current.muted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  return (
    <section className="py-8 sm:py-14 lg:py-16 bg-[#faf8f5] border-y border-[#e8e2d5] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-2 sm:space-y-3 mb-6 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e8f3ed] border border-[#2d6a4f]/20 text-[#1b4332] text-[11px] sm:text-xs font-bold tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" />
            <span>{subheading}</span>
          </div>
          <h2 className="font-serif-heading text-2xl sm:text-3xl lg:text-4xl font-normal text-[#0f2d22] leading-tight">
            {heading}
          </h2>
          <p className="text-xs sm:text-sm lg:text-base text-[#626c66] leading-relaxed max-w-2xl mx-auto">
            {description}
          </p>
        </div>

        {/* Video Player Container (16:9 Aspect Ratio with premium frame) */}
        <div className="max-w-5xl mx-auto">
          <div className="relative aspect-video rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0f2d22] shadow-xl border border-[#2d6a4f]/30 group">
            {/* Top Badge Overlay */}
            <div className="absolute top-3 left-3 sm:top-5 sm:left-5 z-20 pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg bg-[#0f2d22]/80 backdrop-blur-md text-[#c5a059] border border-[#c5a059]/40 text-[10px] sm:text-xs font-bold tracking-wider uppercase shadow-md">
                <Film className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#c5a059]" />
                <span>{badgeText}</span>
              </span>
            </div>

            {/* Video or Deferred Poster View */}
            {hasUserInteracted && videoUrl && !videoError ? (
              <div className="relative w-full h-full">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  poster={posterUrl}
                  autoPlay={isPlaying}
                  muted={isMuted}
                  loop={Boolean(videoConfig.loop)}
                  playsInline
                  preload="metadata"
                  controls
                  controlsList="nodownload"
                  onError={() => setVideoError(true)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  className="w-full h-full object-cover"
                />

                {/* Floating Quick Sound Toggle */}
                <button
                  type="button"
                  onClick={handleToggleMute}
                  aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                  className="absolute bottom-14 right-4 sm:bottom-16 sm:right-6 z-20 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#0f2d22]/80 hover:bg-[#0f2d22] text-[#c5a059] border border-[#c5a059]/40 flex items-center justify-center backdrop-blur-md shadow-lg transition-transform hover:scale-105 cursor-pointer"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
              </div>
            ) : (
              /* Lightweight Deferred Poster Layer (Zero Video Byte Transfer on Initial Page Load) */
              <div className="relative w-full h-full">
                <Image
                  src={posterUrl}
                  alt={heading}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1024px"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  priority={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1f17]/85 via-[#0a1f17]/40 to-transparent" />

                {/* Center Play Button Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-10">
                  <button
                    type="button"
                    onClick={videoUrl ? handlePlayClick : undefined}
                    aria-label="Play video showcase"
                    className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-[#c5a059] text-[#0f2d22] flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group-hover:shadow-[#c5a059]/40 cursor-pointer focus:outline-hidden focus:ring-4 focus:ring-[#c5a059]/50"
                  >
                    <span className="absolute inset-0 rounded-full bg-[#c5a059] animate-ping opacity-25 pointer-events-none" />
                    <Play className="w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11 translate-x-0.5 fill-[#0f2d22]" />
                  </button>

                  <span className="mt-3 sm:mt-4 text-white text-xs sm:text-sm font-bold tracking-wide drop-shadow-md">
                    {videoUrl ? 'Watch Sojat Heritage Video (1080p)' : 'Sojat Henna Botanical Processing'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Action Row */}
          {ctaText && ctaUrl && (
            <div className="mt-6 sm:mt-8 text-center">
              <Link
                href={ctaUrl}
                className="inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-3.5 rounded-xl bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] font-bold text-xs sm:text-sm tracking-wider uppercase shadow-md hover:shadow-lg transition-all hover:scale-105 border border-[#c5a059]/40"
              >
                <span>{ctaText}</span>
                <ArrowRight className="w-4 h-4 text-[#c5a059]" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

