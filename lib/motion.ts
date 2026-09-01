/**
 * Global Motion Design System & Tokens for Musky Dose
 * Provides cohesive, GPU-accelerated, natural herbal-luxury motion tokens.
 * Strictly respects prefers-reduced-motion and avoids excessive bounce.
 */

import { Transition, Variants } from 'motion/react';

// ============================================================================
// 1. DURATION TOKENS (seconds)
// ============================================================================
export const DURATION = {
  micro: 0.14,    // Tap, toggle, icon micro-animations
  fast: 0.22,     // Buttons, hover states, badges, tooltips
  normal: 0.32,   // Drawers, modals, card transitions
  smooth: 0.45,   // Section reveals, category cards, page transitions
  slow: 0.65,     // Hero image fades, ambient ambient reveals
} as const;

// ============================================================================
// 2. EASING CURVES
// ============================================================================
export const EASING = {
  // Luxurious natural deceleration (best for entrances & reveals)
  naturalOut: [0.22, 1, 0.36, 1] as const,
  
  // Crisp swift finish (best for buttons & quick feedback)
  crispOut: [0.16, 1, 0.3, 1] as const,
  
  // Smooth symmetric curve (best for dual-state toggles)
  smoothInOut: [0.4, 0, 0.2, 1] as const,
  
  // Subtle soft ease
  softOut: [0.25, 0.1, 0.25, 1] as const,
} as const;

// ============================================================================
// 3. SPRING CONFIGURATIONS
// ============================================================================
export const SPRINGS = {
  // Drawer slide-in spring (smooth, high damping, zero harsh bounce)
  drawer: {
    type: 'spring' as const,
    stiffness: 340,
    damping: 34,
    mass: 0.9,
  },
  
  // Micro-interaction spring (button press, heart pop, tab switch)
  micro: {
    type: 'spring' as const,
    stiffness: 480,
    damping: 32,
  },
  
  // Card hover lift spring
  card: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 24,
  },

  // Modal scale-in spring
  modal: {
    type: 'spring' as const,
    stiffness: 380,
    damping: 30,
  },

  // Badge count update pulse spring
  badgePulse: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 25,
  },
} as const;

// ============================================================================
// 4. STANDARDIZED MOTION VARIANTS
// ============================================================================

// Fade In
export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: DURATION.fast,
      ease: EASING.naturalOut,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: DURATION.micro,
      ease: 'easeOut',
    },
  },
};

// Fade Up (Common for cards, section headings, list items)
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.smooth,
      ease: EASING.naturalOut,
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: DURATION.fast,
      ease: 'easeIn',
    },
  },
};

// Scale In (Modals, badges, search bars)
export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: DURATION.normal,
      ease: EASING.naturalOut,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: {
      duration: DURATION.fast,
      ease: 'easeIn',
    },
  },
};

// Stagger Container
export const createStaggerContainer = (staggerMs = 0.06, delayChildren = 0): Variants => ({
  hidden: {},
  visible: {
    transition: {
      staggerChildren: staggerMs,
      delayChildren,
    },
  },
});

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.smooth,
      ease: EASING.naturalOut,
    },
  },
};

// Right Side Drawer Slide
export const drawerRightVariants: Variants = {
  closed: { x: '100%' },
  open: {
    x: 0,
    transition: SPRINGS.drawer,
  },
  exit: {
    x: '100%',
    transition: {
      duration: DURATION.fast,
      ease: [0.32, 0, 0.67, 0],
    },
  },
};

// Left Side Drawer Slide
export const drawerLeftVariants: Variants = {
  closed: { x: '-100%' },
  open: {
    x: 0,
    transition: SPRINGS.drawer,
  },
  exit: {
    x: '-100%',
    transition: {
      duration: DURATION.fast,
      ease: [0.32, 0, 0.67, 0],
    },
  },
};

// Backdrop Fade
export const backdropVariants: Variants = {
  closed: { opacity: 0 },
  open: {
    opacity: 1,
    transition: { duration: DURATION.fast, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: DURATION.micro, ease: 'easeIn' },
  },
};

// Button Press Feedback
export const tapScale = {
  scale: 0.97,
  transition: { duration: DURATION.micro, ease: EASING.crispOut },
};

export const hoverLift = {
  y: -3,
  transition: { duration: DURATION.fast, ease: EASING.naturalOut },
};
