import type { JSX } from 'react'
import { cn } from '../../lib/cn'

export interface PulseIconProps {
  className?: string
  /**
   * `beat`  — línea de latido activa, laten al ritmo de marca (usada en el
   *           isotipo del header y como acento decorativo).
   * `flat`  — línea plana con un único blip, sin animación: "sin señal".
   *           Usada en estados vacíos (Table) y estados de error.
   */
  variant?: 'beat' | 'flat'
  'aria-hidden'?: boolean
}

/**
 * Isotipo de marca de PULSO: una traza de electrocardiograma.
 * Es el motivo que conecta el nombre del producto ("laten con el mercado")
 * con la UI: mismo trazo en el logo, el Spinner, y el flatline de "sin datos".
 */
export function PulseIcon({ className, variant = 'beat', ...rest }: PulseIconProps): JSX.Element {
  const isBeat = variant === 'beat'

  return (
    <svg
      viewBox="0 0 48 24"
      fill="none"
      className={cn(isBeat && 'animate-pulso-beat', className)}
      aria-hidden={rest['aria-hidden'] ?? true}
    >
      {isBeat ? (
        <path
          d="M1 12H13L17 3L22 21L26 6L29.5 12H47"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M1 12H18L21 9L24 15L27 12H47"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.55"
        />
      )}
    </svg>
  )
}
