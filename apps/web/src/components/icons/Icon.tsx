import type { JSX, SVGProps } from 'react'

/**
 * Set de iconos de PULSO: trazo geométrico fino y consistente (stroke 1.75,
 * cabos redondeados), a tono con el isotipo de PulseIcon. Un solo estilo en
 * toda la app — nada de mezclar outline con filled.
 */
type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps): IconProps => ({
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  ...props,
})

export function IconMarket(props: IconProps): JSX.Element {
  return (
    <svg {...base(props)}>
      <path d="M3 17L9 10L13 14L21 5" />
      <path d="M21 5H15" />
      <path d="M21 5V11" />
    </svg>
  )
}

export function IconDefi(props: IconProps): JSX.Element {
  return (
    <svg {...base(props)}>
      <path d="M12 3L21 8L12 13L3 8L12 3Z" />
      <path d="M3 12L12 17L21 12" />
      <path d="M3 16L12 21L21 16" />
    </svg>
  )
}

export function IconEarn(props: IconProps): JSX.Element {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 15V13.5C9 12.6716 9.67157 12 10.5 12H13.5C14.3284 12 15 11.3284 15 10.5C15 9.67157 14.3284 9 13.5 9H9.5" />
      <path d="M9 9V15" />
    </svg>
  )
}

export function IconStaking(props: IconProps): JSX.Element {
  return (
    <svg {...base(props)}>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7A4 4 0 0 1 16 7V10" />
    </svg>
  )
}

export function IconBots(props: IconProps): JSX.Element {
  return (
    <svg {...base(props)}>
      <rect x="4" y="8" width="16" height="12" rx="2.5" />
      <path d="M12 8V4" />
      <circle cx="12" cy="3" r="1" />
      <path d="M9 14V15" />
      <path d="M15 14V15" />
      <path d="M2 12H4" />
      <path d="M20 12H22" />
    </svg>
  )
}

export function IconTrending(props: IconProps): JSX.Element {
  return (
    <svg {...base(props)}>
      <path d="M4 5V19H20" />
      <path d="M7 15L11 10L14 13L19 7" />
    </svg>
  )
}

export function IconEducation(props: IconProps): JSX.Element {
  return (
    <svg {...base(props)}>
      <path d="M4 6.5C4 5.67157 4.67157 5 5.5 5H11V19H5.5C4.67157 19 4 18.3284 4 17.5V6.5Z" />
      <path d="M20 6.5C20 5.67157 19.3284 5 18.5 5H13V19H18.5C19.3284 19 20 18.3284 20 17.5V6.5Z" />
    </svg>
  )
}

export function IconShield(props: IconProps): JSX.Element {
  return (
    <svg {...base(props)}>
      <path d="M12 3L19 6V11C19 15.4183 16.0288 19.3 12 21C7.97116 19.3 5 15.4183 5 11V6L12 3Z" />
      <path d="M9 11.5L11 13.5L15 9" />
    </svg>
  )
}

export function IconMore(props: IconProps): JSX.Element {
  return (
    <svg {...base(props)}>
      <circle cx="5" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Ícono del AIAssistant: globo de chat con puntos de "escribiendo". */
export function IconChat(props: IconProps): JSX.Element {
  return (
    <svg {...base(props)}>
      <path d="M4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20C10.4407 20 8.98756 19.552 7.75977 18.7757L4 20L5.2 16.4C4.44 15.2 4 13.6 4 12Z" />
      <circle cx="8.5" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconWarning(props: IconProps): JSX.Element {
  return (
    <svg {...base(props)}>
      <path d="M12 3L21 19H3L12 3Z" />
      <path d="M12 9.5V13.5" />
      <path d="M12 16.25H12.01" />
    </svg>
  )
}

export function IconWallet(props: IconProps): JSX.Element {
  return (
    <svg {...base(props)}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10H21" />
      <path d="M16 14.5H16.01" />
    </svg>
  )
}

export function IconSearch(props: IconProps): JSX.Element {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21L16.65 16.65" />
    </svg>
  )
}

export function IconChevronLeft(props: IconProps): JSX.Element {
  return (
    <svg {...base(props)}>
      <path d="M15 6L9 12L15 18" />
    </svg>
  )
}

export function IconChevronRight(props: IconProps): JSX.Element {
  return (
    <svg {...base(props)}>
      <path d="M9 6L15 12L9 18" />
    </svg>
  )
}

export function IconClose(props: IconProps): JSX.Element {
  return (
    <svg {...base(props)}>
      <path d="M6 6L18 18" />
      <path d="M18 6L6 18" />
    </svg>
  )
}

export function IconBell(props: IconProps): JSX.Element {
  return (
    <svg {...base(props)}>
      <path d="M12 4C8.96243 4 6.5 6.46243 6.5 9.5V13.5L5 16.5H19L17.5 13.5V9.5C17.5 6.46243 15.0376 4 12 4Z" />
      <path d="M10 19.5C10.35 20.4 11.1 21 12 21C12.9 21 13.65 20.4 14 19.5" />
    </svg>
  )
}

interface StarProps extends IconProps {
  /** Relleno cuando la moneda está en la watchlist; contorno cuando no. */
  filled?: boolean
}

/** Estrella de favorito — misma silueta llena o vacía según `filled`. */
export function IconStar({ filled = false, ...props }: StarProps): JSX.Element {
  return (
    <svg {...base(props)} fill={filled ? 'currentColor' : 'none'}>
      <path d="M12 3.5L14.6 8.77L20.4 9.61L16.2 13.7L17.19 19.48L12 16.75L6.81 19.48L7.8 13.7L3.6 9.61L9.4 8.77L12 3.5Z" />
    </svg>
  )
}

export interface SortIconProps extends IconProps {
  state: 'asc' | 'desc' | 'none'
}

/** Un solo chevron que rota/atenúa según el estado — evita 3 iconos distintos. */
export function IconSort({ state, className, ...rest }: SortIconProps): JSX.Element {
  return (
    <svg
      {...base(rest)}
      className={className}
      style={{
        transform: state === 'desc' ? 'rotate(180deg)' : 'rotate(0deg)',
        opacity: state === 'none' ? 0.4 : 1,
        transition: 'transform 200ms cubic-bezier(0.16,1,0.3,1), opacity 200ms',
      }}
    >
      <path d="M6 9L12 15L18 9" />
    </svg>
  )
}
