/**
 * PULSO — Design tokens
 * Fuente única de verdad para color, spacing, radios, sombras, z-index,
 * tipografía y timing de animación. `tailwind.config.ts` extiende el theme
 * de Tailwind con estos mismos valores: no declarar hex/px sueltos en
 * componentes, siempre referenciar un token (directo o vía clase Tailwind).
 *
 * Identidad: exchange non-custodial futurista-neón. Fondo violeta-negro
 * profundo (#0A0118 → #0D0221), superficies en glassmorphism, acentos neón
 * violeta→magenta, cian solo para variaciones positivas y rojo para negativas.
 *
 * Motivo de marca ("pulso"): todo indicador de estado vivo de la UI —
 * Spinner, dot de Badge "live", shimmer de Skeleton, glow de hover de Card —
 * respira con el mismo ritmo (`motion.pulse`, curva `motion.easeOut`),
 * como un latido. Ver `src/components/icons/PulseIcon.tsx`.
 */

export const color = {
  bg: {
    /** Fondo base de la app (page background, extremo del gradiente). */
    void: '#0A0118',
    /** Extremo profundo del gradiente de fondo. */
    deep: '#0D0221',
  },
  /**
   * Escala de elevación. Mismo tono violeta en las tres, solo sube la
   * luminosidad — evita fragmentar la UI en "zonas" de color distinto.
   */
  surface: {
    1: '#120B27',
    2: '#1A1035',
    3: '#241748',
    overlay: 'rgba(10, 1, 24, 0.72)',
  },
  border: {
    subtle: 'rgba(139, 92, 246, 0.12)',
    default: 'rgba(139, 92, 246, 0.22)',
    emphasis: 'rgba(168, 85, 247, 0.45)',
    focus: '#A855F7',
  },
  text: {
    primary: '#F5F3FF',
    secondary: '#C4B5FD',
    tertiary: '#8B7FAE',
    muted: '#5B5478',
    inverse: '#0A0118',
  },
  brand: {
    violet: '#8B5CF6',
    purple: '#A855F7',
    magenta: '#EC4899',
    fuchsia: '#FF2E9F',
  },
  /** Cian solo para variaciones positivas, rojo solo para negativas. */
  semantic: {
    positive: '#22D3EE',
    negative: '#F43F5E',
    neutral: '#8B7FAE',
    info: '#8B5CF6',
  },
} as const

export const gradient = {
  brand: 'linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%)',
  brandVertical: 'linear-gradient(180deg, #8B5CF6 0%, #EC4899 100%)',
  brandRadial:
    'radial-gradient(circle, rgba(139,92,246,0.28) 0%, rgba(139,92,246,0) 70%)',
  page: 'linear-gradient(160deg, #0A0118 0%, #0D0221 60%, #120B27 100%)',
} as const

/** Escala de 4px. Coincide con la escala default de Tailwind a propósito. */
export const spacing = {
  0: '0px',
  px: '1px',
  0.5: '2px',
  1: '4px',
  1.5: '6px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const

/** sm = inputs/badges, md = botones, lg = cards, xl = paneles/modales. */
export const radius = {
  none: '0px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
} as const

export const shadow = {
  card: '0 4px 24px rgba(0, 0, 0, 0.45)',
  raised: '0 8px 32px rgba(0, 0, 0, 0.55)',
  glowViolet: '0 0 20px rgba(139, 92, 246, 0.35), 0 0 44px rgba(139, 92, 246, 0.15)',
  glowMagenta: '0 0 20px rgba(236, 72, 153, 0.35), 0 0 44px rgba(236, 72, 153, 0.15)',
  glowCyan: '0 0 16px rgba(34, 211, 238, 0.4)',
  glowRed: '0 0 16px rgba(244, 63, 94, 0.4)',
  focusRing: '0 0 0 3px rgba(168, 85, 247, 0.45)',
} as const

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  overlay: 1200,
  modal: 1300,
  popover: 1400,
  toast: 1500,
  tooltip: 1600,
} as const

export const font = {
  display: '"Space Grotesk", "Inter", system-ui, sans-serif',
  text: '"Inter", system-ui, sans-serif',
} as const

/** Timing de animación. `pulse` es el ritmo del motivo de marca (latido). */
export const motion = {
  fast: '120ms',
  base: '200ms',
  slow: '360ms',
  pulse: '1800ms',
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const

export const tokens = { color, gradient, spacing, radius, shadow, zIndex, font, motion } as const

export type Tokens = typeof tokens

export default tokens
