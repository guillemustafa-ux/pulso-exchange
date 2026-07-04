import { forwardRef } from 'react'
import type { HTMLAttributes, JSX, KeyboardEvent, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type GlowColor = 'violet' | 'magenta' | 'cyan' | 'none'

const GLOW_CLASS: Record<GlowColor, string> = {
  violet: 'hover:shadow-glow-violet hover:border-border-emphasis',
  magenta: 'hover:shadow-glow-magenta hover:border-[rgba(236,72,153,0.45)]',
  cyan: 'hover:shadow-glow-cyan hover:border-[rgba(34,211,238,0.45)]',
  none: '',
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Color del glow en hover. `'none'` desactiva el efecto por completo
   * (para cards no interactivas, ej. dentro de una tabla).
   * @default 'violet'
   */
  glow?: GlowColor
  /** Quita blur + padding para usar la Card como contenedor "crudo" (ej. Table). */
  bare?: boolean
}

/**
 * Superficie base de PULSO: glassmorphism (blur + borde translúcito 1px)
 * sobre el fondo violeta-negro, con un glow de marca que aparece al pasar
 * el mouse — nunca decorativo por defecto, solo responde a interacción.
 *
 * Si se pasa `onClick`, la card se vuelve operable por teclado (Home,
 * Education, Bots la usan como card clickeable): `role="button"`,
 * `tabIndex=0` y Enter/Espacio disparan el mismo handler que el click de
 * mouse. Sin esto, una card con `onClick` era invisible para teclado/lector
 * de pantalla -- un div no es focuseable ni anuncia que es interactivo.
 *
 * `min-w-0` es obligatorio acá: como grid item (ej. la grilla de protocolos
 * de DeFi en mobile, 1 columna), el `min-width: auto` por defecto hace que
 * el track del grid crezca al ancho mínimo del contenido no-shrinkable más
 * ancho de CUALQUIER card de la lista (ej. una fila de badges de cadena),
 * desbordando la página entera de costado en vez de solo esa card. Sin
 * costo en contextos no-grid: `min-width: 0` ya es el default de un bloque.
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, glow = 'violet', bare = false, children, onClick, onKeyDown, tabIndex, role, ...rest },
  ref,
): JSX.Element {
  const interactive = typeof onClick === 'function'

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    onKeyDown?.(event)
    if (!interactive || event.defaultPrevented) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      ;(onClick as unknown as (e: KeyboardEvent<HTMLDivElement>) => void)(event)
    }
  }

  return (
    <div
      ref={ref}
      onClick={onClick}
      onKeyDown={interactive ? handleKeyDown : onKeyDown}
      role={interactive ? (role ?? 'button') : role}
      tabIndex={interactive ? (tabIndex ?? 0) : tabIndex}
      className={cn(
        'relative min-w-0 rounded-lg border border-border-subtle bg-surface-1/70 backdrop-blur-xl',
        'shadow-card transition-[box-shadow,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
        !bare && 'p-5',
        GLOW_CLASS[glow],
        interactive && 'focus-visible:outline-none focus-visible:shadow-focus-ring',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
})

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div className={cn('mb-4 flex items-start justify-between gap-3', className)} {...rest}>
      {children}
    </div>
  )
}

export function CardTitle({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLHeadingElement> & { children?: ReactNode }): JSX.Element {
  return (
    <h3 className={cn('font-display text-base font-medium tracking-tight text-text-primary', className)} {...rest}>
      {children}
    </h3>
  )
}

export function CardDescription({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>): JSX.Element {
  return (
    <p className={cn('mt-1 text-sm text-text-tertiary', className)} {...rest}>
      {children}
    </p>
  )
}

export function CardContent({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div className={cn(className)} {...rest}>
      {children}
    </div>
  )
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return (
    <div className={cn('mt-4 flex items-center gap-3 border-t border-border-subtle pt-4', className)} {...rest}>
      {children}
    </div>
  )
}
