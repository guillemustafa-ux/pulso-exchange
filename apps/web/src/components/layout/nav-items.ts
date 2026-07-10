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
  IconWallet,
  IconBell,
  IconStar,
  IconCandles,
} from '../icons/Icon'

export type IconType = ComponentType<SVGProps<SVGSVGElement>>

export interface NavItem {
  id: string
  /** Key de traducción (namespace `nav.*`, ver `src/locales/{es,en}.json`) -- coincide con `id`. */
  labelKey: string
  icon: IconType
  /** Ruta del router para este módulo. Sin `path` = todavía no tiene página (placeholder en Home). */
  path?: string
}

/**
 * Los 13 módulos de PULSO (los 12 de PROMPT.md + el terminal de trading). El
 * asistente de IA no está acá: es un widget flotante presente en toda la app,
 * no una sección de nav.
 */
export const NAV_ITEMS: NavItem[] = [
  { id: 'mercado', labelKey: 'nav.mercado', icon: IconMarket, path: '/market' },
  { id: 'trading', labelKey: 'nav.trading', icon: IconCandles, path: '/trading' },
  { id: 'conversor', labelKey: 'nav.conversor', icon: IconEarn, path: '/converter' },
  { id: 'portfolio', labelKey: 'nav.portfolio', icon: IconWallet, path: '/portfolio' },
  { id: 'watchlist', labelKey: 'nav.watchlist', icon: IconStar, path: '/watchlist' },
  { id: 'alertas', labelKey: 'nav.alertas', icon: IconBell, path: '/alerts' },
  { id: 'defi', labelKey: 'nav.defi', icon: IconDefi, path: '/defi' },
  { id: 'earn', labelKey: 'nav.earn', icon: IconEarn, path: '/earn' },
  { id: 'staking', labelKey: 'nav.staking', icon: IconStaking, path: '/staking' },
  { id: 'bots', labelKey: 'nav.bots', icon: IconBots, path: '/bots' },
  { id: 'tendencias', labelKey: 'nav.tendencias', icon: IconTrending, path: '/trends' },
  { id: 'educacion', labelKey: 'nav.educacion', icon: IconEducation, path: '/education' },
  { id: 'seguridad', labelKey: 'nav.seguridad', icon: IconShield, path: '/security' },
]

/** Slots del bottom nav mobile: los 4 módulos de mayor uso + "Más". */
export const MOBILE_PRIMARY_IDS = ['mercado', 'staking', 'bots', 'tendencias']
