/**
 * Posiciones manuales del Portfolio — lógica PURA + persistencia defensiva en
 * localStorage (mismo patrón que lib/watchlist y lib/alerts). Cada posición es
 * un "lote" independiente (misma moneda comprada dos veces = dos lotes, sin
 * promediar): el PnL de cada lote se calcula contra SU precio de compra.
 */
import type { CoinMarketItem } from '../services/api'
import { liveUsdtPrice } from './livePrices'

export const HOLDINGS_STORAGE_KEY = 'pulso-holdings'

export interface Holding {
  id: string
  coinId: string
  symbol: string
  /** Cantidad comprada (unidades de la moneda). Siempre > 0. */
  amount: number
  /** Precio de compra en USD por unidad. Siempre > 0. */
  buyPrice: number
}

export interface Position extends Holding {
  name: string
  image: string | null
  /** Precio actual (vivo del SSE si está, si no el del top100); null si la moneda no cotiza. */
  currentPrice: number | null
  /** amount * currentPrice; null sin precio. */
  value: number | null
  costBasis: number
  pnlUsd: number | null
  pnlPct: number | null
  /** % del valor total del portfolio; null sin precio. */
  allocationPct: number | null
}

export interface PortfolioSummary {
  positions: Position[]
  totalValue: number
  totalCost: number
  totalPnlUsd: number
  /** null si no hay ninguna posición con precio. */
  totalPnlPct: number | null
}

function isHolding(value: unknown): value is Holding {
  if (typeof value !== 'object' || value === null) return false
  const h = value as Record<string, unknown>
  return (
    typeof h.id === 'string' &&
    typeof h.coinId === 'string' &&
    typeof h.symbol === 'string' &&
    typeof h.amount === 'number' &&
    Number.isFinite(h.amount) &&
    h.amount > 0 &&
    typeof h.buyPrice === 'number' &&
    Number.isFinite(h.buyPrice) &&
    h.buyPrice > 0
  )
}

function defaultStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null // localStorage bloqueado (modo privado estricto, iframe)
  }
}

/** Carga defensiva: JSON roto o entradas con shape inválida degradan sin romper. */
export function loadHoldings(storage: Storage | null = defaultStorage()): Holding[] {
  if (!storage) return []
  try {
    const parsed: unknown = JSON.parse(storage.getItem(HOLDINGS_STORAGE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isHolding)
  } catch {
    return []
  }
}

export function saveHoldings(holdings: Holding[], storage: Storage | null = defaultStorage()): void {
  storage?.setItem(HOLDINGS_STORAGE_KEY, JSON.stringify(holdings))
}

/** Alta de un lote. No muta: devuelve el array nuevo con el lote al frente. */
export function addHolding(
  holdings: Holding[],
  lot: Omit<Holding, 'id'>,
  id: string = globalThis.crypto?.randomUUID?.() ?? `${lot.coinId}-${holdings.length}-${lot.amount}`,
): Holding[] {
  return [{ ...lot, id }, ...holdings]
}

export function removeHolding(holdings: Holding[], id: string): Holding[] {
  return holdings.filter((h) => h.id !== id)
}

/**
 * Valúa el portfolio completo: precio vivo del SSE cuando está (pisa al del
 * top100, igual que en Mercado/Favoritos), PnL por lote y agregados. Los lotes
 * cuyo símbolo no cotiza en el top100 ni en el stream quedan con value null y
 * NO suman al total (se muestran igual, marcados sin precio).
 */
export function computePortfolio(
  holdings: Holding[],
  coins: CoinMarketItem[],
  livePrices: Record<string, number> = {},
): PortfolioSummary {
  const bySymbol = new Map(coins.map((c) => [c.symbol.toLowerCase(), c]))

  const priced = holdings.map((h) => {
    const coin = bySymbol.get(h.symbol.toLowerCase())
    const currentPrice = liveUsdtPrice(livePrices, h.symbol) ?? coin?.current_price ?? null
    const value = currentPrice !== null ? h.amount * currentPrice : null
    const costBasis = h.amount * h.buyPrice
    return {
      ...h,
      name: coin?.name ?? h.symbol.toUpperCase(),
      image: coin?.image ?? null,
      currentPrice,
      value,
      costBasis,
      pnlUsd: value !== null ? value - costBasis : null,
      pnlPct: value !== null ? ((value - costBasis) / costBasis) * 100 : null,
    }
  })

  const totalValue = priced.reduce((sum, p) => sum + (p.value ?? 0), 0)
  const totalCost = priced.reduce((sum, p) => sum + (p.value !== null ? p.costBasis : 0), 0)
  const totalPnlUsd = totalValue - totalCost

  const positions: Position[] = priced.map((p) => ({
    ...p,
    allocationPct: p.value !== null && totalValue > 0 ? (p.value / totalValue) * 100 : null,
  }))

  return {
    positions,
    totalValue,
    totalCost,
    totalPnlUsd,
    totalPnlPct: totalCost > 0 ? (totalPnlUsd / totalCost) * 100 : null,
  }
}
