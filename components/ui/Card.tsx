'use client';

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { universalCardHoverMotion } from '@/lib/design-system/motion';

export type CardVariant = 'surface' | 'canvas' | 'forest' | 'sandstone' | 'default' | 'elevated';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hoverLift?: boolean;
  bordered?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  surface: 'bg-white text-[#22231F]',
  default: 'bg-white text-[#22231F]',
  elevated: 'bg-white text-[#22231F] shadow-md',
  canvas: 'bg-[#fcfbf7] text-[#22231F]',
  forest: 'bg-[#0f2d22] text-white',
  sandstone: 'bg-[#faf5e8] text-[#1b4332]',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'surface',
      hoverLift = true,
      bordered = true,
      className = '',
      children,
      ...rest
    },
    ref
  ) => {
    const shouldReduceMotion = useReducedMotion();

    const MotionComponent = hoverLift && !shouldReduceMotion ? motion.div : 'div';
    const motionProps = hoverLift && !shouldReduceMotion ? { whileHover: universalCardHoverMotion.hover } : {};

    return (
      <MotionComponent
        ref={ref as any}
        {...motionProps}
        className={`rounded-2xl overflow-hidden ${
          bordered ? 'border border-[#e8e2d5]' : ''
        } shadow-xs hover:shadow-md transition-shadow duration-300 ${variantStyles[variant]} ${className}`}
        {...(rest as any)}
      >
        {children}
      </MotionComponent>
    );
  }
);

Card.displayName = 'Card';
export default Card;
