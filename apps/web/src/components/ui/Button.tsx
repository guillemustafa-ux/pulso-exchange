import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, JSX } from 'react'
import { cn } from '../../lib/cn'
import { Spinner } from './Spinner'

type ButtonVariant = 'primary' | 'secondary' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: cn(
    'bg-brand-gradient text-white',
    'hover:shadow-glow-magenta hover:brightness-110',
    'active:brightness-95',
  ),
  secondary: cn(
    'bg-transparent text-text-primary border border-border-default',
    'hover:border-border-emphasis hover:bg-surface-2/60',
    'active:bg-surface-2',
  ),
  danger: cn(
    'bg-negative text-white',
    'hover:shadow-glow-red hover:brightness-110',
    'active:brightness-95',
  ),
}

const SPINNER_COLOR: Record<ButtonVariant, 'violet' | 'white'> = {
  primary: 'white',
  secondary: 'violet',
  danger: 'white',
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
}

const SPINNER_SIZE: Record<ButtonSize, 'sm' | 'md'> = { sm: 'sm', md: 'sm', lg: 'md' }

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Muestra un Spinner y deshabilita el botón. El label queda visible. */
  loading?: boolean
}

/**
 * CTA de marca (primary = gradiente violeta→magenta), acción secundaria
 * "ghost" que no compite visualmente, y danger para acciones destructivas
 * (unstake, eliminar bot). El glow de hover es la única fuente de "brillo":
 * nunca sombra dura + glow al mismo tiempo.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading = false, disabled, children, ...rest },
  ref,
): JSX.Element {
  const isDisabled = disabled || loading

  return (
    <button
      ref={ref}
      type={rest.type ?? 'button'}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium font-sans',
        'transition-[box-shadow,border-color,background-color,filter] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
        'focus-visible:outline-none focus-visible:shadow-focus-ring',
        'disabled:pointer-events-none disabled:opacity-40',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        className,
      )}
      {...rest}
    >
      {loading && <Spinner size={SPINNER_SIZE[size]} color={SPINNER_COLOR[variant]} label="" />}
      {children}
    </button>
  )
})
