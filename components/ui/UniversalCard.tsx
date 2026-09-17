'use client';

import React from 'react';
import Link from 'next/link';
import Card, { CardProps } from './Card';
import ImageFrame from './ImageFrame';
import Heading from './Heading';
import Text from './Text';
import Badge, { BadgeProps } from './Badge';
import { UniversalAspectRatio } from '@/lib/design-system/tokens';
import { cn } from '@/lib/utils';

export interface UniversalCardBadge {
  label: string;
  variant?: BadgeProps['variant'];
  icon?: React.ReactNode;
}

export interface UniversalCardProps extends Omit<CardProps, 'title'> {
  entityType?: 'product' | 'category' | 'guide' | 'knowledge' | 'brand' | 'custom' | string;
  title: string;
  subtitle?: string;
  description?: string;
  href?: string;
  imageSrc?: string;
  imageAlt?: string;
  aspectRatio?: UniversalAspectRatio;
  badges?: UniversalCardBadge[];
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  featured?: boolean;
  imageOverlay?: React.ReactNode;
}

export default function UniversalCard({
  entityType = 'custom',
  title,
  subtitle,
  description,
  href,
  imageSrc,
  imageAlt = '',
  aspectRatio = '1:1',
  badges,
  meta,
  actions,
  footer,
  featured = false,
  imageOverlay,
  hoverLift = true,
  className,
  children,
  ...props
}: UniversalCardProps) {
  const CardWrapper = href ? Link : 'div';

  return (
    <Card
      hoverLift={hoverLift}
      variant={featured ? 'elevated' : 'default'}
      className={cn(
        'group flex flex-col h-full overflow-hidden transition-all duration-300',
        featured && 'ring-1 ring-gold/40 border-gold/40 bg-surface',
        className
      )}
      {...props}
    >
      {/* Media / Image container */}
      {imageSrc !== undefined && (
        <div className="relative w-full overflow-hidden bg-canvas">
          <CardWrapper href={href as any} className="block relative w-full">
            <ImageFrame
              src={imageSrc}
              alt={imageAlt || title}
              aspectRatio={aspectRatio}
              zoomOnHover={true}
              priority={featured}
            />

            {/* Badges overlay on image */}
            {badges && badges.length > 0 && (
              <div className="absolute top-2.5 left-2.5 flex flex-wrap items-center gap-1.5 z-10 max-w-[80%]">
                {badges.map((b, i) => (
                  <Badge key={i} variant={b.variant || 'neutral'} size="sm">
                    {b.icon && <span className="shrink-0">{b.icon}</span>}
                    <span>{b.label}</span>
                  </Badge>
                ))}
              </div>
            )}

            {/* Custom image overlay if any */}
            {imageOverlay && (
              <div className="absolute inset-0 z-10 pointer-events-none">
                {imageOverlay}
              </div>
            )}
          </CardWrapper>
        </div>
      )}

      {/* Content body */}
      <div className="p-3 sm:p-4 flex flex-col flex-1 justify-between bg-surface">
        <div className="flex-1 flex flex-col">
          {/* Subtitle / category tag */}
          {subtitle && (
            <div className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-neutral-500 mb-1">
              {subtitle}
            </div>
          )}

          {/* Title */}
          {href ? (
            <Link href={href} className="block group/title">
              <Heading
                level="h4"
                className="text-forest group-hover/title:text-leaf transition-colors line-clamp-2 leading-snug mb-1"
              >
                {title}
              </Heading>
            </Link>
          ) : (
            <Heading
              level="h4"
              className="text-forest line-clamp-2 leading-snug mb-1"
            >
              {title}
            </Heading>
          )}

          {/* Description */}
          {description && (
            <Text
              variant="bodySm"
              className="text-neutral-600 line-clamp-2 leading-relaxed mb-2 font-sans"
            >
              {description}
            </Text>
          )}

          {/* Custom children inside content */}
          {children}
        </div>

        {/* Footer / Meta / Actions */}
        {(meta || actions || footer) && (
          <div className="mt-auto pt-2.5 border-t border-border-neutral/60 flex flex-col gap-2">
            {(meta || actions) && (
              <div className="flex items-center justify-between gap-2">
                {meta && <div className="text-sm font-bold text-forest">{meta}</div>}
                {actions && <div className="flex items-center gap-2">{actions}</div>}
              </div>
            )}
            {footer && <div>{footer}</div>}
          </div>
        )}
      </div>
    </Card>
  );
}

