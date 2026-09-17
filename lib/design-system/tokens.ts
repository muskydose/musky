/**
 * CANONICAL CENTRALIZED DESIGN SYSTEM TOKENS
 * 
 * Single source of truth for all spacing, typography scales, colors,
 * sizing, elevation, radius, borders, layout widths, breakpoints,
 * and transition timings across Musky Dose.
 * 
 * Concept: "From Earth to Ritual"
 * Fonts:
 *   - Headings/Accents: Momo Trust Display
 *   - Body/UI: Karla
 *   - Technical/SKU: System Monospace
 */

export const DESIGN_TOKENS = {
  // 1. BRAND COLORS (Rajasthani Botanical Palette)
  colors: {
    forest: '#0f2d22',       // Darkest green — headers, footer, primary contrast
    green: '#1b4332',        // Primary botanical green — primary buttons, active states
    leaf: '#2d6a4f',         // Mid green — accents, hover states
    henna: '#9A4F32',        // Warm terracotta — henna accents, active badges
    gold: '#c5a059',         // Rajasthani desert gold — badges, seals, borders, stars
    goldHover: '#b38e46',    // Darker gold hover state
    goldLight: '#faf5e8',    // Warm tinted gold cream
    canvas: '#fcfbf7',       // Primary warm canvas background
    canvasAlt: '#f5f1e8',    // Alternate warm background for cards & inputs
    surface: '#ffffff',      // Pure white card / dialog surface
    greenLight: '#e8f3ed',   // Light herbal green tint
    border: '#e8e2d5',       // Standard sandstone border
    borderDark: '#d4cfc4',   // Emphasized border
    text: '#22231F',         // Primary body text
    textBody: '#2b302c',     // Reading text
    muted: '#626c66',        // Secondary muted text
    mutedLight: '#8c9891',   // Tertiary subtle text
    success: '#1b4332',      // Brand success state
    error: '#b91c1c',        // Error state
    errorBg: '#fef2f2',      // Error background tint
    warning: '#c5a059',      // Warning state
    whatsapp: '#25D366',     // WhatsApp brand green
    whatsappBg: '#f0fdf4',   // WhatsApp action background
  },

  // 2. TYPOGRAPHY SCALES
  typography: {
    // Font Families
    fonts: {
      heading: 'var(--font-momo-trust), "Momo Trust Display", Georgia, serif',
      body: 'var(--font-karla), "Karla", system-ui, sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    },
    // Display / Heading Scale (Momo Trust Display)
    headingScale: {
      hero: 'clamp(2.25rem, 5vw, 3.5rem)',    // 36px - 56px
      h1: 'clamp(1.75rem, 4vw, 2.5rem)',      // 28px - 40px
      h2: 'clamp(1.35rem, 3vw, 1.85rem)',     // 22px - 30px
      h3: 'clamp(1.15rem, 2.2vw, 1.35rem)',   // 18px - 22px
      h4: '1.125rem',                         // 18px
      h5: '1rem',                             // 16px
    },
    // Body & UI Scale (Karla)
    bodyScale: {
      lead: '1.125rem',       // 18px
      body: '1rem',           // 16px (base)
      bodySm: '0.875rem',     // 14px
      caption: '0.75rem',     // 12px
      micro: '0.6875rem',     // 11px
    },
    // Monospace Technical Scale
    monoScale: {
      base: '0.875rem',       // 14px
      sm: '0.8125rem',        // 13px
      xs: '0.6875rem',        // 11px
    },
    // Line Heights
    lineHeights: {
      tight: 1.15,
      snug: 1.25,
      normal: 1.5,
      relaxed: 1.65,
    },
  },

  // 3. SPACING SCALE (4px baseline grid)
  spacing: {
    none: '0px',
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px',
    '4xl': '40px',
    '5xl': '48px',
    '6xl': '64px',
    '7xl': '80px',
    '8xl': '96px',
  },

  // 4. LAYOUT WIDTHS & BREAKPOINTS
  layout: {
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1440px',
    },
    containers: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1440px',
    },
    gutters: {
      mobile: '1rem',         // 16px
      tablet: '1.5rem',       // 24px
      desktop: '2rem',        // 32px
    },
  },

  // 5. SHAPE & ELEVATION
  shapes: {
    radii: {
      none: '0px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '20px',
      full: '9999px',
    },
    shadows: {
      xs: '0 1px 2px 0 rgb(15 45 34 / 0.05)',
      sm: '0 2px 8px 0 rgb(15 45 34 / 0.08)',
      md: '0 4px 16px 0 rgb(15 45 34 / 0.10)',
      lg: '0 8px 24px 0 rgb(15 45 34 / 0.14)',
      xl: '0 16px 36px 0 rgb(15 45 34 / 0.18)',
    },
    focusRing: '0 0 0 3px rgb(27 67 50 / 0.30)',
  },

  // 6. MOTION & TRANSITIONS
  motion: {
    durations: {
      micro: 0.14,    // Tap, toggle, icon micro-interactions
      fast: 0.22,     // Buttons, hover states, badges
      normal: 0.32,   // Drawers, cards, modals
      smooth: 0.45,   // Section reveals, category cards
      slow: 0.65,     // Hero image fades, ambient ambient reveals
    },
    easings: {
      naturalOut: [0.22, 1, 0.36, 1] as const,
      crispOut: [0.16, 1, 0.3, 1] as const,
      smoothInOut: [0.4, 0, 0.2, 1] as const,
      softOut: [0.25, 0.1, 0.25, 1] as const,
    },
    springs: {
      card: { type: 'spring' as const, stiffness: 300, damping: 24 },
      drawer: { type: 'spring' as const, stiffness: 340, damping: 34, mass: 0.9 },
      micro: { type: 'spring' as const, stiffness: 480, damping: 32 },
      modal: { type: 'spring' as const, stiffness: 380, damping: 30 },
    },
  },

  // 7. ASPECT RATIOS
  aspectRatios: {
    square: '1:1',
    portrait: '4:5',
    video: '16:9',
    story: '9:16',
    meta: '1.91:1',
    classic: '4:3',
  },
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;

export const UNIVERSAL_COLORS = DESIGN_TOKENS.colors;
export const UNIVERSAL_TYPOGRAPHY = DESIGN_TOKENS.typography;
export const UNIVERSAL_SPACING = DESIGN_TOKENS.spacing;
export const UNIVERSAL_LAYOUT = DESIGN_TOKENS.layout;
export const UNIVERSAL_SHAPES = DESIGN_TOKENS.shapes;
export const UNIVERSAL_MOTION = DESIGN_TOKENS.motion;
export const UNIVERSAL_ASPECT_RATIOS = Object.values(DESIGN_TOKENS.aspectRatios);
export type UniversalAspectRatio = '1:1' | '4:5' | '16:9' | '9:16' | '1.91:1' | '4:3';
