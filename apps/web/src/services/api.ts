/**
 * PULSO — cliente HTTP para la API (`apps/api`, FastAPI en :8000 por defecto).
 * `VITE_API_URL` sobreescribe el origin (ej. en deploy); en local usamos el
 * default de abajo para no depender de un `.env` presente.
 */

const DEFAULT_API_URL = 'http://localhost:8000'

const API_URL = (
  (import.meta.env.VITE_API_URL as string | undefined)?.trim() || DEFAULT_API_URL
).replace(/\/+$/, '')

/** Error tipado con el status HTTP — permite distinguir 404 (sin datos) de fallas genéricas. */
export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function getJson<T>(path: string): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`)
  } catch {
    throw new ApiError('No se pudo conectar con la API de PULSO. ¿Está corriendo en :8000?', 0)
  }

  if (!res.ok) {
    let detail = res.statusText || `Error ${res.status}`
    try {
      const body = (await res.json()) as { detail?: unknown }
      if (typeof body?.detail === 'string' && body.detail.trim()) detail = body.detail
    } catch {
      // Respuesta sin body JSON parseable: nos quedamos con el statusText.
    }
    throw new ApiError(detail, res.status)
  }

  return (await res.json()) as T
}

// ---------------------------------------------------------------------------
// GET /api/market/top100
// ---------------------------------------------------------------------------

export interface SparklineData {
  price: number[]
}

export interface CoinMarketItem {
  id: string
  symbol: string
  name: string
  image: string | null
  current_price: number | null
  market_cap: number | null
  market_cap_rank: number | null
  total_volume: number | null
  high_24h: number | null
  low_24h: number | null
  price_change_24h: number | null
  price_change_percentage_24h: number | null
  market_cap_change_24h: number | null
  market_cap_change_percentage_24h: number | null
  circulating_supply: number | null
  total_supply: number | null
  max_supply: number | null
  ath: number | null
  ath_change_percentage: number | null
  atl: number | null
  atl_change_percentage: number | null
  last_updated: string | null
  price_change_percentage_24h_in_currency: number | null
  price_change_percentage_7d_in_currency: number | null
  sparkline_in_7d: SparklineData | null
}

export function fetchTop100(): Promise<CoinMarketItem[]> {
  return getJson<CoinMarketItem[]>('/api/market/top100')
}

// ---------------------------------------------------------------------------
// GET /api/market/klines/{symbol}
// ---------------------------------------------------------------------------

/** Timeframes que expone el selector de CoinDetail — todos soportados nativamente por Binance. */
export type KlineInterval = '1h' | '4h' | '1d' | '1w'

export interface KlineItem {
  open_time: number
  open: number
  high: number
  low: number
  close: number
  volume: number | null
  close_time: number | null
  quote_volume: number | null
  trades: number | null
}

export interface KlinesResponse {
  source: 'binance' | 'coingecko'
  symbol: string
  interval: string
  coingecko_id: string | null
  klines: KlineItem[]
}

export function fetchKlines(
  symbol: string,
  interval: KlineInterval = '1h',
  limit = 200,
): Promise<KlinesResponse> {
  const params = new URLSearchParams({ interval, limit: String(limit) })
  return getJson<KlinesResponse>(`/api/market/klines/${encodeURIComponent(symbol)}?${params.toString()}`)
}

// ---------------------------------------------------------------------------
// GET /api/earn/ar
// ---------------------------------------------------------------------------

export type EarnTipo = 'exchange_ar' | 'fintech' | 'defi'
export type EarnMoneda = 'ARS' | 'USDT' | 'USDC' | 'BTC'

export interface EarnOption {
  nombre: string
  tipo: EarnTipo
  moneda: EarnMoneda
  apy_aprox: number
  url: string
  ultima_actualizacion: string
}

/** Pass-through de CriptoYa (`/api/dolar` + `/api/usdt/ars/1`) -- shape ancho y variable, no vale tipar cada subcampo. */
export interface EarnCotizaciones {
  dolar: Record<string, unknown>
  usdt_ars: Record<string, unknown>
}

export interface EarnArResponse {
  disclaimer: string
  updated_at: string
  opciones: EarnOption[]
  /** `null` cuando CriptoYa no respondió a tiempo -- la tabla curada llega igual. */
  cotizaciones: EarnCotizaciones | null
  cotizaciones_error?: string | null
}

export function fetchEarnAr(): Promise<EarnArResponse> {
  return getJson<EarnArResponse>('/api/earn/ar')
}

// ---------------------------------------------------------------------------
// GET /api/defi/protocols
// ---------------------------------------------------------------------------

export interface DefiProtocolItem {
  id: string
  name: string
  logo: string | null
  category: string | null
  chains: string[]
  tvl: number | null
  change_7d: number | null
  /** Unix timestamp (segundos) de cuándo DefiLlama empezó a trackear el protocolo. */
  listed_at: number | null
}

export function fetchDefiProtocols(): Promise<DefiProtocolItem[]> {
  return getJson<DefiProtocolItem[]>('/api/defi/protocols')
}
