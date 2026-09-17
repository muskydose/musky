'use client';

import React from 'react';
import { motion, useReducedMotion, MotionProps } from 'motion/react';
import {
  universalFadeVariants,
  universalRevealUpVariants,
  universalRevealDownVariants,
  createUniversalStagger,
  reducedMotionVariants,
  universalCardHoverMotion,
} from '@/lib/design-system/motion';
import { cn } from '@/lib/utils';

export interface MotionRevealProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'fade' | 'revealUp' | 'revealDown';
  delay?: number;
  duration?: number;
  once?: boolean;
  amount?: number;
  children: React.ReactNode;
}

export function MotionReveal({
  variant = 'revealUp',
  delay = 0,
  duration,
  once = true,
  amount = 0.2,
  className,
  children,
  ...props
}: MotionRevealProps) {
  const shouldReduce = useReducedMotion();

  const variantMap = {
    fade: universalFadeVariants,
    revealUp: universalRevealUpVariants,
    revealDown: universalRevealDownVariants,
  };

  const selectedVariant = shouldReduce ? reducedMotionVariants : variantMap[variant];

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={selectedVariant}
      transition={{
        delay,
        duration: duration || (shouldReduce ? 0 : 0.4),
      }}
      className={className}
      {...(props as any)}
    >
      {children}
    </motion.div>
  );
}

export interface MotionStaggerProps extends React.HTMLAttributes<HTMLDivElement> {
  staggerDelay?: number;
  delayChildren?: number;
  once?: boolean;
  amount?: number;
  children: React.ReactNode;
}

export function MotionStagger({
  staggerDelay = 0.08,
  delayChildren = 0.05,
  once = true,
  amount = 0.1,
  className,
  children,
  ...props
}: MotionStaggerProps) {
  const shouldReduce = useReducedMotion();
  const containerVariants = createUniversalStagger(staggerDelay, delayChildren);

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={shouldReduce ? reducedMotionVariants : containerVariants}
      className={className}
      {...(props as any)}
    >
      {children}
    </motion.div>
  );
}

export interface MotionItemProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'fade' | 'revealUp';
  children: React.ReactNode;
}

export function MotionItem({
  variant = 'revealUp',
  className,
  children,
  ...props
}: MotionItemProps) {
  const shouldReduce = useReducedMotion();
  const itemVariants = variant === 'fade' ? universalFadeVariants : universalRevealUpVariants;

  return (
    <motion.div
      variants={shouldReduce ? reducedMotionVariants : itemVariants}
      className={className}
      {...(props as any)}
    >
      {children}
    </motion.div>
  );
}

export interface MotionLiftProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function MotionLift({
  className,
  children,
  ...props
}: MotionLiftProps) {
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      whileHover={shouldReduce ? undefined : universalCardHoverMotion.hover}
      className={cn('transition-all duration-300', className)}
      {...(props as any)}
    >
      {children}
    </motion.div>
  );
}
