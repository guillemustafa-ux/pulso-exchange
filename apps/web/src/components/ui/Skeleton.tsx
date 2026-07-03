import type { CSSProperties, HTMLAttributes, JSX } from 'react'
import { cn } from '../../lib/cn'

type SkeletonVariant = 'text' | 'block' | 'circle'

const VARIANT_CLASS: Record<SkeletonVariant, string> = {
  text: 'h-3.5 rounded-sm',
  block: 'h-24 rounded-lg',
  circle: 'rounded-full aspect-square',
}

const SHIMMER_STYLE: CSSProperties = {
  backgroundImage:
    'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.16) 42%, rgba(236,72,153,0.22) 50%, rgba(139,92,246,0.16) 58%, transparent 100%)',
  backgroundSize: '200% 100%',
}

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant
  /** Renderiza N líneas apiladas; la última queda más corta (look de párrafo). */
  lines?: number
}

/**
 * Placeholder de carga con shimmer violeta→magenta — late al mismo ritmo
 * que el resto del motivo de marca, en vez de un shimmer gris genérico.
 */
export function Skeleton({ variant = 'text', lines, className, style, ...rest }: SkeletonProps): JSX.Element {
  if (lines && lines > 1) {
    return (
      <div className="flex flex-col gap-2" {...rest}>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(
              'animate-pulso-shimmer motion-reduce:animate-none bg-surface-2',
              VARIANT_CLASS.text,
              i === lines - 1 && 'w-2/3',
            )}
            style={SHIMMER_STYLE}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn('animate-pulso-shimmer motion-reduce:animate-none bg-surface-2', VARIANT_CLASS[variant], className)}
      style={{ ...SHIMMER_STYLE, ...style }}
      {...rest}
    />
  )
}
