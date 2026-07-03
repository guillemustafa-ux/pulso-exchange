import type { ComponentType, SVGProps } from 'react'
import {
  IconMarket,
  IconDefi,
  IconEarn,
  IconStaking,
  IconBots,
  IconTrending,
  IconEducation,
  IconShield,
} from '../icons/Icon'

export type IconType = ComponentType<SVGProps<SVGSVGElement>>

export interface NavItem {
  id: string
  label: string
  icon: IconType
  /** Ruta del router para este módulo. Sin `path` = todavía no tiene página (placeholder en Home). */
  path?: string
}

/**
 * Los 8 módulos de PULSO (PROMPT.md). El asistente de IA no está acá: es un
 * widget flotante presente en toda la app, no una sección de nav.
 */
export const NAV_ITEMS: NavItem[] = [
  { id: 'mercado', label: 'Mercado', icon: IconMarket, path: '/market' },
  { id: 'defi', label: 'DeFi', icon: IconDefi, path: '/defi' },
  { id: 'earn', label: 'Earn AR', icon: IconEarn, path: '/earn' },
  { id: 'staking', label: 'Staking', icon: IconStaking, path: '/staking' },
  { id: 'bots', label: 'Bots', icon: IconBots },
  { id: 'tendencias', label: 'Tendencias', icon: IconTrending },
  { id: 'educacion', label: 'Educación', icon: IconEducation },
  { id: 'seguridad', label: 'Seguridad', icon: IconShield },
]

/** Slots del bottom nav mobile: los 4 módulos de mayor uso + "Más". */
export const MOBILE_PRIMARY_IDS = ['mercado', 'staking', 'bots', 'tendencias']
