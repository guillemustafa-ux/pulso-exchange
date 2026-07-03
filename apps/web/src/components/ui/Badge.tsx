import type { HTMLAttributes, JSX } from 'react'
import { cn } from '../../lib/cn'

type BadgeVariant = 'success' | 'danger' | 'neutral' | 'info'
type BadgeSize = 'sm' | 'md'

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  success: 'bg-positive/10 text-positive border-positive/25',
  danger: 'bg-negative/10 text-negative border-negative/25',
  neutral: 'bg-text-tertiary/10 text-text-tertiary border-border-subtle',
  info: 'bg-violet/10 text-violet border-violet/25',
}

const DOT_CLASS: Record<BadgeVariant, string> = {
  success: 'bg-positive',
  danger: 'bg-negative',
  neutral: 'bg-text-tertiary',
  info: 'bg-violet',
}

const SIZE_CLASS: Record<BadgeSize, string> = {
  sm: 'h-5 px-2 text-[11px] gap-1',
  md: 'h-6 px-2.5 text-xs gap-1.5',
}

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  size?: BadgeSize
  /**
   * Punto que late (motivo de marca) — para estados "en vivo": precio
   * actualizándose, bot corriendo, tx pendiente. No usar en badges estáticos
   * (categoría, rank) para no sobre-señalizar.
   */
  live?: boolean
}

export function Badge({
  variant = 'neutral',
  size = 'sm',
  live = false,
  className,
  children,
  ...rest
}: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium font-sans tabular-nums',
        'whitespace-nowrap',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className,
      )}
      {...rest}
    >
      {live && (
        <span className="relative inline-flex h-1.5 w-1.5 shrink-0 items-center justify-center">
          <span
            className={cn('absolute inline-flex h-full w-full rounded-full motion-reduce:hidden animate-pulso-ping', DOT_CLASS[variant])}
          />
          <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', DOT_CLASS[variant])} />
        </span>
      )}
      {children}
    </span>
  )
}
