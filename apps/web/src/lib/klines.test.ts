import { describe, expect, it } from 'vitest'
import type { KlineItem } from '../services/api'
import { applyLivePrice, sma, toCandles, toVolumes } from './klines'
import type { Candle } from './klines'

function mkKline(overrides: Partial<KlineItem> = {}): KlineItem {
  return {
    open_time: 1_700_000_000_000,
    open: 100,
    high: 110,
    low: 95,
    close: 105,
    volume: 1000,
    close_time: null,
    quote_volume: null,
    trades: null,
    ...overrides,
  }
}

function mkCandle(time: number, close: number): Candle {
  return { time: time as Candle['time'], open: close, high: close, low: close, close }
}

describe('toCandles', () => {
  it('convierte ms a segundos y mapea OHLC', () => {
    const [c] = toCandles([mkKline()])
    expect(c).toEqual({ time: 1_700_000_000, open: 100, high: 110, low: 95, close: 105 })
  })

  it('ordena ascendente y dedupea por timestamp (exigencia de lightweight-charts)', () => {
    const candles = toCandles([
      mkKline({ open_time: 2_000_000, close: 2 }),
      mkKline({ open_time: 1_000_000, close: 1 }),
      mkKline({ open_time: 2_000_000, close: 3 }), // dup: gana el último
    ])
    expect(candles.map((c) => [c.time, c.close])).toEqual([
      [1_000, 1],
      [2_000, 3],
    ])
  })
})

describe('toVolumes', () => {
  it('colorea según la dirección de la vela y saltea velas sin volumen', () => {
    const bars = toVolumes([
      mkKline({ open: 100, close: 105, volume: 10 }), // sube
      mkKline({ open_time: 1_700_000_060_000, open: 105, close: 101, volume: 20 }), // baja
      mkKline({ open_time: 1_700_000_120_000, volume: null }), // fallback CoinGecko
    ])
    expect(bars).toHaveLength(2)
    expect(bars[0].color).toContain('34, 211, 238') // cyan (up)
    expect(bars[1].color).toContain('244, 63, 94') // rose (down)
  })
})

describe('sma', () => {
  const candles = [1, 2, 3, 4, 5].map((n) => mkCandle(n * 60, n * 10)) // cierres 10..50

  it('arranca donde la ventana está completa y promedia bien', () => {
    const points = sma(candles, 3)
    // ventanas: (10+20+30)/3=20 en t=180, (20+30+40)/3=30 en t=240, (30+40+50)/3=40 en t=300
    expect(points).toEqual([
      { time: 180, value: 20 },
      { time: 240, value: 30 },
      { time: 300, value: 40 },
    ])
  })

  it('sin datos suficientes o period inválido devuelve []', () => {
    expect(sma(candles, 6)).toEqual([])
    expect(sma(candles, 0)).toEqual([])
    expect(sma([], 3)).toEqual([])
  })
})

describe('applyLivePrice', () => {
  const last: Candle = { time: 60 as Candle['time'], open: 100, high: 110, low: 95, close: 105 }

  it('pisa el close y estira el high si el vivo se escapa del rango', () => {
    expect(applyLivePrice(last, 115)).toEqual({ time: 60, open: 100, high: 115, low: 95, close: 115 })
  })

  it('estira el low en una caída', () => {
    expect(applyLivePrice(last, 90)).toEqual({ time: 60, open: 100, high: 110, low: 90, close: 90 })
  })

  it('sin vela, sin precio o sin cambio -> null (nada que actualizar)', () => {
    expect(applyLivePrice(undefined, 100)).toBeNull()
    expect(applyLivePrice(last, null)).toBeNull()
    expect(applyLivePrice(last, 105)).toBeNull()
  })

  it('no muta la vela original', () => {
    applyLivePrice(last, 120)
    expect(last.close).toBe(105)
  })
})
