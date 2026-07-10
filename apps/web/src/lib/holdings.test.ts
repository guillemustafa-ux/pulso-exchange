import { describe, expect, it } from 'vitest'
import type { CoinMarketItem } from '../services/api'
import {
  HOLDINGS_STORAGE_KEY,
  addHolding,
  computePortfolio,
  loadHoldings,
  removeHolding,
  saveHoldings,
} from './holdings'
import type { Holding } from './holdings'

function mkCoin(overrides: Partial<CoinMarketItem>): CoinMarketItem {
  return {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    image: 'btc.png',
    current_price: 50_000,
    ...overrides,
  } as CoinMarketItem
}

const BTC = mkCoin({})
const ETH = mkCoin({ id: 'ethereum', symbol: 'eth', name: 'Ethereum', image: null, current_price: 2_000 })

function mkHolding(overrides: Partial<Holding> = {}): Holding {
  return { id: 'h1', coinId: 'bitcoin', symbol: 'btc', amount: 0.5, buyPrice: 40_000, ...overrides }
}

/** Storage fake mínimo para los tests de persistencia. */
function mkStorage(initial: Record<string, string> = {}): Storage {
  const data: Record<string, string> = { ...initial }
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => {
      data[k] = v
    },
  } as Storage
}

describe('add/removeHolding', () => {
  it('agrega al frente sin mutar y borra por id', () => {
    const base = [mkHolding()]
    const withEth = addHolding(base, { coinId: 'ethereum', symbol: 'eth', amount: 2, buyPrice: 1_800 }, 'h2')
    expect(withEth).toHaveLength(2)
    expect(withEth[0].id).toBe('h2')
    expect(base).toHaveLength(1) // el original quedó intacto
    expect(removeHolding(withEth, 'h1').map((h) => h.id)).toEqual(['h2'])
  })
})

describe('load/saveHoldings', () => {
  it('roundtrip por storage', () => {
    const storage = mkStorage()
    saveHoldings([mkHolding()], storage)
    expect(loadHoldings(storage)).toEqual([mkHolding()])
  })

  it('JSON roto, shape inválida o valores no positivos degradan sin romper', () => {
    expect(loadHoldings(mkStorage({ [HOLDINGS_STORAGE_KEY]: 'no-json{' }))).toEqual([])
    expect(loadHoldings(mkStorage({ [HOLDINGS_STORAGE_KEY]: '{"x":1}' }))).toEqual([])
    const dirty = JSON.stringify([
      mkHolding(),
      { id: 'bad', coinId: 'x', symbol: 'x', amount: -1, buyPrice: 10 }, // amount inválido
      { id: 'bad2', coinId: 'x', symbol: 'x', amount: 1, buyPrice: 0 }, // buyPrice inválido
      'basura',
    ])
    expect(loadHoldings(mkStorage({ [HOLDINGS_STORAGE_KEY]: dirty }))).toEqual([mkHolding()])
  })

  it('sin storage (bloqueado) devuelve [] y save no explota', () => {
    expect(loadHoldings(null)).toEqual([])
    expect(() => saveHoldings([mkHolding()], null)).not.toThrow()
  })
})

describe('computePortfolio', () => {
  it('valúa lotes, PnL por lote y agregados', () => {
    // BTC: 0.5 @ 40k -> vale 25k, costó 20k, +5k (+25%)
    // ETH: 2 @ 1800 -> vale 4k, costó 3.6k, +400 (+11.11%)
    const summary = computePortfolio(
      [mkHolding(), mkHolding({ id: 'h2', coinId: 'ethereum', symbol: 'eth', amount: 2, buyPrice: 1_800 })],
      [BTC, ETH],
    )
    const [btc, eth] = summary.positions
    expect(btc.value).toBe(25_000)
    expect(btc.pnlUsd).toBe(5_000)
    expect(btc.pnlPct).toBeCloseTo(25)
    expect(eth.pnlUsd).toBeCloseTo(400)
    expect(summary.totalValue).toBe(29_000)
    expect(summary.totalCost).toBe(23_600)
    expect(summary.totalPnlUsd).toBeCloseTo(5_400)
    expect(summary.totalPnlPct).toBeCloseTo((5_400 / 23_600) * 100)
    // Allocation: 25k/29k y 4k/29k
    expect(btc.allocationPct).toBeCloseTo((25_000 / 29_000) * 100)
    expect(eth.allocationPct).toBeCloseTo((4_000 / 29_000) * 100)
  })

  it('el precio vivo del SSE pisa al del top100', () => {
    const summary = computePortfolio([mkHolding()], [BTC], { BTCUSDT: 60_000 })
    expect(summary.positions[0].currentPrice).toBe(60_000)
    expect(summary.positions[0].value).toBe(30_000)
  })

  it('moneda sin precio: value null, no suma al total y no rompe los agregados', () => {
    const summary = computePortfolio(
      [mkHolding(), mkHolding({ id: 'h2', coinId: 'raro', symbol: 'raro', amount: 10, buyPrice: 1 })],
      [BTC],
    )
    const raro = summary.positions[1]
    expect(raro.value).toBeNull()
    expect(raro.pnlUsd).toBeNull()
    expect(raro.allocationPct).toBeNull()
    expect(summary.totalValue).toBe(25_000) // solo BTC
    expect(summary.totalCost).toBe(20_000) // el costo del lote sin precio tampoco entra
  })

  it('portfolio vacío: totales en cero y pct null', () => {
    const summary = computePortfolio([], [BTC])
    expect(summary.totalValue).toBe(0)
    expect(summary.totalPnlPct).toBeNull()
  })
})
