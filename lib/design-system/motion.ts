/**
 * UNIVERSAL MOTION SYSTEM FOR MUSKY DOSE
 * 
 * Provides centralized, accessible, natural herbal-luxury motion presets.
 * Shared by every entity (Product, Category, Guide, Knowledge, Brand, Custom).
 * Zero entity-specific animation logic.
 * Strictly respects prefers-reduced-motion.
 */

import { Variants, Transition } from 'motion/react';
import { DESIGN_TOKENS } from './tokens';

const { durations, easings, springs } = DESIGN_TOKENS.motion;

// ============================================================================
// 1. REVEAL & FADE PRESETS
// ============================================================================

export const universalFadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: durations.normal,
      ease: easings.naturalOut,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: durations.fast,
      ease: easings.crispOut,
    },
  },
};

export const universalRevealUpVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.smooth,
      ease: easings.naturalOut,
    },
  },
};

export const universalRevealDownVariants: Variants = {
  hidden: { opacity: 0, y: -16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.smooth,
      ease: easings.naturalOut,
    },
  },
};

// ============================================================================
// 2. CARD ELEVATION & IMAGE HOVER PRESETS
// ============================================================================

export const universalCardHoverMotion = {
  hover: {
    y: -4,
    transition: springs.card,
  },
  tap: {
    y: -1,
    transition: springs.micro,
  },
};

export const universalImageHoverMotion = {
  initial: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.5,
      ease: easings.naturalOut,
    },
  },
};

// ============================================================================
// 3. BUTTON & INTERACTION PRESETS
// ============================================================================

export const universalButtonMotion = {
  tap: {
    scale: 0.97,
    transition: springs.micro,
  },
  hover: {
    scale: 1.01,
    transition: springs.micro,
  },
};

// ============================================================================
// 4. STAGGER CONTAINERS
// ============================================================================

export function createUniversalStagger(staggerDelay = 0.06, delayChildren = 0): Variants {
  return {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren,
      },
    },
  };
}

export const universalStaggerItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: durations.normal,
      ease: easings.naturalOut,
    },
  },
};

// ============================================================================
// 5. REDUCED MOTION SAFE FALLBACKS
// ============================================================================

export const reducedMotionVariants: Variants = {
  hidden: { opacity: 1, y: 0, x: 0, scale: 1 },
  visible: { opacity: 1, y: 0, x: 0, scale: 1, transition: { duration: 0.01 } },
  exit: { opacity: 1, transition: { duration: 0.01 } },
};
