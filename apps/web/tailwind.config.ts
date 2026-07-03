import type { Config } from 'tailwindcss'
import { color, gradient, radius, shadow, spacing, zIndex } from './src/tokens/index.ts'

/**
 * PULSO — Tailwind config.
 * Tailwind v4 configura mayormente vía CSS (`@theme` en globals.css), pero
 * este archivo se carga con `@config` para reusar los mismos tokens
 * tipados de `src/tokens` en vez de duplicar valores. No agregar hex/px
 * sueltos acá: todo pasa por `src/tokens/index.ts`.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'bg-void': color.bg.void,
        'bg-deep': color.bg.deep,
        'surface-1': color.surface[1],
        'surface-2': color.surface[2],
        'surface-3': color.surface[3],
        'surface-overlay': color.surface.overlay,
        'border-subtle': color.border.subtle,
        'border-default': color.border.default,
        'border-emphasis': color.border.emphasis,
        'border-focus': color.border.focus,
        'text-primary': color.text.primary,
        'text-secondary': color.text.secondary,
        'text-tertiary': color.text.tertiary,
        'text-muted': color.text.muted,
        violet: color.brand.violet,
        purple: color.brand.purple,
        magenta: color.brand.magenta,
        fuchsia: color.brand.fuchsia,
        positive: color.semantic.positive,
        negative: color.semantic.negative,
        neutral: color.semantic.neutral,
        info: color.semantic.info,
      },
      spacing: Object.fromEntries(
        Object.entries(spacing).map(([key, value]) => [key, value]),
      ),
      borderRadius: radius,
      boxShadow: {
        card: shadow.card,
        raised: shadow.raised,
        'glow-violet': shadow.glowViolet,
        'glow-magenta': shadow.glowMagenta,
        'glow-cyan': shadow.glowCyan,
        'glow-red': shadow.glowRed,
        'focus-ring': shadow.focusRing,
      },
      backgroundImage: {
        'brand-gradient': gradient.brand,
        'brand-gradient-v': gradient.brandVertical,
        'brand-radial': gradient.brandRadial,
        'page-gradient': gradient.page,
      },
      zIndex: Object.fromEntries(
        Object.entries(zIndex).map(([key, value]) => [key, String(value)]),
      ),
      fontFamily: {
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'pulso-beat': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.55', transform: 'scale(0.82)' },
        },
        'pulso-ping': {
          '0%': { transform: 'scale(0.9)', opacity: '0.9' },
          '70%': { transform: 'scale(2.2)', opacity: '0' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        'pulso-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'pulso-shimmer': {
          '0%': { backgroundPosition: '150% 0' },
          '100%': { backgroundPosition: '-150% 0' },
        },
        'pulso-rise': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulso-beat': 'pulso-beat 1.8s cubic-bezier(0.16,1,0.3,1) infinite',
        'pulso-ping': 'pulso-ping 1.8s cubic-bezier(0.16,1,0.3,1) infinite',
        'pulso-spin': 'pulso-spin 0.9s linear infinite',
        'pulso-shimmer': 'pulso-shimmer 2.2s ease-in-out infinite',
        'pulso-rise': 'pulso-rise 0.32s cubic-bezier(0.16,1,0.3,1) both',
      },
    },
  },
} satisfies Config
