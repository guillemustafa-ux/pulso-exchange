import type { CSSProperties, JSX } from 'react'
import { cn } from '../../lib/cn'
import { color } from '../../tokens'

type SpinnerSize = 'sm' | 'md' | 'lg'
type SpinnerColor = 'violet' | 'magenta' | 'cyan' | 'white'

const SIZE_PX: Record<SpinnerSize, number> = { sm: 16, md: 24, lg: 40 }
const RING_PX: Record<SpinnerSize, number> = { sm: 2, md: 3, lg: 4 }

const RING_COLOR: Record<SpinnerColor, string> = {
  violet: color.brand.violet,
  magenta: color.brand.magenta,
  cyan: color.semantic.positive,
  white: '#FFFFFF',
}

export interface SpinnerProps {
  size?: SpinnerSize
  color?: SpinnerColor
  className?: string
  /** Texto para lectores de pantalla (el spinner en sí es aria-hidden). */
  label?: string
}

/**
 * Ring neón animado — no es un spinner genérico: el arco se desvanece en
 * vez de tener un corte duro, como el barrido de un radar/monitor.
 * Respeta `prefers-reduced-motion` (ver globals.css).
 */
export function Spinner({ size = 'md', color: accent = 'violet', className, label = 'Cargando' }: SpinnerProps): JSX.Element {
  const px = SIZE_PX[size]
  const ring = RING_PX[size]
  const hex = RING_COLOR[accent]

  const style: CSSProperties = {
    width: px,
    height: px,
    background: `conic-gradient(from 0deg, transparent 0deg, ${hex}66 180deg, ${hex} 360deg)`,
    WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${ring}px), #000 calc(100% - ${ring}px))`,
    mask: `radial-gradient(farthest-side, transparent calc(100% - ${ring}px), #000 calc(100% - ${ring}px))`,
  }

  return (
    <span
      role="status"
      className={cn('inline-flex motion-reduce:animate-none animate-pulso-spin rounded-full', className)}
      style={style}
    >
      <span className="sr-only">{label}</span>
    </span>
  )
}
