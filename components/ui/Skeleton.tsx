'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { UniversalAspectRatio } from '@/lib/design-system/tokens';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'rounded' | 'text';
  aspectRatio?: UniversalAspectRatio;
  width?: string | number;
  height?: string | number;
  pulse?: boolean;
}

export default function Skeleton({
  variant = 'rounded',
  aspectRatio,
  width,
  height,
  pulse = true,
  className,
  style,
  ...props
}: SkeletonProps) {
  const variantClasses = {
    rectangular: 'rounded-none',
    circular: 'rounded-full',
    rounded: 'rounded-2xl',
    text: 'rounded-sm h-4 my-1 w-full',
  };

  const ratioClasses: Record<UniversalAspectRatio, string> = {
    '1:1': 'aspect-square',
    '4:5': 'aspect-[4/5]',
    '16:9': 'aspect-video',
    '9:16': 'aspect-[9/16]',
    '1.91:1': 'aspect-[1.91/1]',
    '4:3': 'aspect-[4/3]',
  };

  const customStyle: React.CSSProperties = {
    ...style,
    ...(width !== undefined ? { width: typeof width === 'number' ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === 'number' ? `${height}px` : height } : {}),
  };

  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-[#e8e2d5]/60 border border-[#e8e2d5]/40',
        pulse && 'animate-pulse motion-reduce:animate-none',
        variantClasses[variant],
        aspectRatio && ratioClasses[aspectRatio],
        className
      )}
      style={customStyle}
      {...props}
    />
  );
}

export function CardSkeleton({
  aspectRatio = '1:1',
  className,
}: {
  aspectRatio?: UniversalAspectRatio;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border-neutral bg-surface p-3 flex flex-col gap-3',
        className
      )}
      aria-hidden="true"
    >
      <Skeleton variant="rounded" aspectRatio={aspectRatio} className="w-full" />
      <div className="space-y-2 py-1">
        <Skeleton variant="text" className="w-1/3 h-3" />
        <Skeleton variant="text" className="w-3/4 h-5" />
        <Skeleton variant="text" className="w-1/2 h-3" />
      </div>
      <div className="pt-2 border-t border-border-neutral/60 flex items-center justify-between">
        <Skeleton variant="text" className="w-1/4 h-5" />
        <Skeleton variant="rounded" className="w-20 h-8 rounded-lg" />
      </div>
    </div>
  );
}

