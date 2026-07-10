/**
 * Terminal de trading — lógica PURA sobre las velas del backend
 * (`/api/market/klines`): transformación a las shapes de lightweight-charts,
 * SMA para los overlays y el merge del precio vivo (SSE) en la última vela.
 * Sin React ni chart acá: todo testeable con vitest en node.
 */
import type { UTCTimestamp } from 'lightweight-charts'
import type { KlineItem } from '../services/api'

export interface Candle {
  time: UTCTimestamp
  open: number
  high: number
  low: number
  close: number
}

export interface VolumeBar {
  time: UTCTimestamp
  value: number
  color: string
}

export interface LinePoint {
  time: UTCTimestamp
  value: number
}

/** Mismos colores que las velas de CoinDetail; el volumen va translúcido. */
export const UP_COLOR = '#22D3EE'
export const DOWN_COLOR = '#F43F5E'
const VOLUME_UP = 'rgba(34, 211, 238, 0.35)'
const VOLUME_DOWN = 'rgba(244, 63, 94, 0.35)'

/** Ordena ascendente y dedupea por timestamp — lightweight-charts exige series estrictamente crecientes. */
function dedupeSorted<T extends { time: UTCTimestamp }>(items: T[]): T[] {
  const byTime = new Map<number, T>()
  for (const item of items) byTime.set(item.time as number, item)
  return Array.from(byTime.values()).sort((a, b) => (a.time as number) - (b.time as number))
}

export function toCandles(klines: KlineItem[]): Candle[] {
  return dedupeSorted(
    klines.map((k) => ({
      time: Math.floor(k.open_time / 1000) as UTCTimestamp,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    })),
  )
}

/** Barras de volumen coloreadas según la dirección de la vela; sin volumen (fallback CoinGecko) -> []. */
export function toVolumes(klines: KlineItem[]): VolumeBar[] {
  const bars: VolumeBar[] = []
  for (const k of klines) {
    if (k.volume == null) continue
    bars.push({
      time: Math.floor(k.open_time / 1000) as UTCTimestamp,
      value: k.volume,
      color: k.close >= k.open ? VOLUME_UP : VOLUME_DOWN,
    })
  }
  return dedupeSorted(bars)
}

/**
 * SMA simple sobre los cierres, alineada al tiempo de cada vela. Los primeros
 * `period - 1` puntos no existen (ventana incompleta) — la línea arranca donde
 * la media es real, igual que en cualquier terminal seria.
 */
export function sma(candles: Candle[], period: number): LinePoint[] {
  if (period <= 0 || candles.length < period) return []
  const points: LinePoint[] = []
  let sum = 0
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close
    if (i >= period) sum -= candles[i - period].close
    if (i >= period - 1) points.push({ time: candles[i].time, value: sum / period })
  }
  return points
}

/**
 * Mueve la última vela con el precio vivo del stream SSE: pisa el close y
 * estira high/low si el precio se salió del rango. Devuelve null si no hay
 * nada que actualizar (sin velas o precio sin cambio).
 */
export function applyLivePrice(last: Candle | undefined, livePrice: number | null): Candle | null {
  if (!last || livePrice == null || livePrice === last.close) return null
  return {
    ...last,
    close: livePrice,
    high: Math.max(last.high, livePrice),
    low: Math.min(last.low, livePrice),
  }
}
