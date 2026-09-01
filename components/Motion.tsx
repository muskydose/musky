'use client';

import React from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import {
  DURATION,
  EASING,
  SPRINGS,
  fadeInVariants,
  fadeUpVariants,
  scaleInVariants,
  createStaggerContainer,
  staggerItemVariants,
} from '@/lib/motion';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  duration?: number;
  distance?: number;
  className?: string;
  viewportOnce?: boolean;
}

export function FadeIn({
  children,
  delay = 0,
  direction = 'up',
  duration = DURATION.smooth,
  distance = 16,
  className = '',
  viewportOnce = true,
}: FadeInProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const directions = {
    up: { y: distance, x: 0 },
    down: { y: -distance, x: 0 },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
    none: { x: 0, y: 0 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: viewportOnce, margin: '-30px' }}
      transition={{
        duration,
        delay,
        ease: EASING.naturalOut,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({
  children,
  className = '',
  staggerChildren = 0.06,
  staggerDelay,
  delayChildren = 0,
  viewportOnce = true,
}: {
  children: React.ReactNode;
  className?: string;
  staggerChildren?: number;
  staggerDelay?: number;
  delayChildren?: number;
  viewportOnce?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  const step = staggerDelay ?? staggerChildren;

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: viewportOnce, margin: '-30px' }}
      variants={createStaggerContainer(step, delayChildren)}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div variants={staggerItemVariants} className={className}>
      {children}
    </motion.div>
  );
}

export function ScaleOnTap({
  children,
  className = '',
  scale = 0.96,
  disabled = false,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  scale?: number;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion || disabled) {
    return (
      <div className={className} onClick={onClick}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      whileTap={{ scale }}
      transition={{ duration: DURATION.micro, ease: EASING.crispOut }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedBadge({
  count,
  className = '',
  showZero = false,
}: {
  count?: number;
  className?: string;
  showZero?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (count === undefined || (count === 0 && !showZero)) {
    return null;
  }

  if (shouldReduceMotion) {
    return <span className={className}>{count}</span>;
  }

  return (
    <AnimatePresence mode="popLayout">
      <motion.span
        key={count}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.5, opacity: 0 }}
        transition={SPRINGS.badgePulse}
        className={className}
      >
        {count}
      </motion.span>
    </AnimatePresence>
  );
}

export function FloatingElement({
  children,
  className = '',
  duration = 4,
  distance = 5,
}: {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  distance?: number;
}) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      animate={{
        y: [0, -distance, 0],
      }}
      transition={{
        duration,
        repeat: Infinity,
        repeatType: 'reverse',
        ease: 'easeInOut',
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
