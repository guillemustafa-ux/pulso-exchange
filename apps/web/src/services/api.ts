/**
 * PULSO — cliente HTTP para la API (`apps/api`, FastAPI en :8000 por defecto).
 * `VITE_API_URL` sobreescribe el origin (ej. en deploy); en local usamos el
 * default de abajo para no depender de un `.env` presente.
 */
import i18n from '../i18n'

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
    throw new ApiError(i18n.t('common.connectionError'), 0)
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

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new ApiError(i18n.t('common.connectionError'), 0)
  }

  if (!res.ok) {
    let detail = res.statusText || `Error ${res.status}`
    try {
      const data = (await res.json()) as { detail?: unknown }
      if (typeof data?.detail === 'string' && data.detail.trim()) detail = data.detail
    } catch {
      // Respuesta sin body JSON parseable: nos quedamos con el statusText.
    }
    throw new ApiError(detail, res.status)
  }

  return (await res.json()) as T
}

/** PATCH/DELETE genérico -- mismo manejo de error que `postJson`, sin exigir un body. */
async function sendJson<T>(path: string, method: 'PATCH' | 'DELETE', body?: unknown): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(i18n.t('common.connectionError'), 0)
  }

  if (!res.ok) {
    let detail = res.statusText || `Error ${res.status}`
    try {
      const data = (await res.json()) as { detail?: unknown }
      if (typeof data?.detail === 'string' && data.detail.trim()) detail = data.detail
    } catch {
      // Respuesta sin body JSON parseable (ej. 204 No Content, o statusText solo).
    }
    throw new ApiError(detail, res.status)
  }

  if (res.status === 204) return undefined as T
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

// ---------------------------------------------------------------------------
// POST /api/ai/ask
// ---------------------------------------------------------------------------

export interface AskAIResponse {
  respuesta: string
}

/** Asistente educativo contextual (Groq). `contexto` es el único dato "real" que el modelo puede usar. */
export function askAI(
  pregunta: string,
  seccion: string,
  contexto: Record<string, unknown>,
): Promise<AskAIResponse> {
  return postJson<AskAIResponse>('/api/ai/ask', { pregunta, seccion, contexto })
}

// ---------------------------------------------------------------------------
// GET /api/trends/fear-greed
// ---------------------------------------------------------------------------

export interface FearGreedItem {
  value: number
  value_classification: string
  /** Unix timestamp (segundos). */
  timestamp: number
}

export interface FearGreedResponse {
  name: string
  data: FearGreedItem[]
}

export function fetchFearGreed(): Promise<FearGreedResponse> {
  return getJson<FearGreedResponse>('/api/trends/fear-greed')
}

// ---------------------------------------------------------------------------
// GET /api/trends/summary
// ---------------------------------------------------------------------------

export interface FearGreedCurrent {
  value: number
  label: string
}

/** Mismo shape que `TrendingCoin` de CoinGecko `/search/trending` -- `data` queda pass-through (precio/variación por moneda, no vale tipar cada subcampo). */
export interface TrendingCoinSummary {
  id: string
  coin_id: number | null
  name: string
  symbol: string
  market_cap_rank: number | null
  thumb: string | null
  slug: string | null
  price_btc: number | null
  score: number | null
  data: Record<string, unknown> | null
}

export interface MoverItem {
  id: string
  symbol: string
  name: string
  image: string | null
  current_price: number | null
  price_change_percentage_24h: number | null
  market_cap_rank: number | null
}

export interface TrendsSummaryResponse {
  /** `null` si alternative.me no respondió a tiempo. */
  fear_greed: FearGreedCurrent | null
  trending: TrendingCoinSummary[]
  gainers: MoverItem[]
  losers: MoverItem[]
  market_cap_usd: number | null
  market_cap_change_percentage_24h: number | null
  btc_dominance: number | null
}

export function fetchTrendsSummary(): Promise<TrendsSummaryResponse> {
  return getJson<TrendsSummaryResponse>('/api/trends/summary')
}

// ---------------------------------------------------------------------------
// /api/bots -- motor de paper trading (100% simulado, ver PROMPT.md módulo Bots)
// ---------------------------------------------------------------------------

export type BotEstrategia = 'DCA' | 'GRID' | 'SMA'
export type BotEstado = 'activo' | 'pausado'
export type TradeTipo = 'compra' | 'venta'

export interface EquityPoint {
  timestamp: string
  equity: number
}

export interface Bot {
  id: number
  nombre: string
  estrategia: BotEstrategia
  par: string
  capital_inicial: number
  capital_actual: number
  cantidad_total: number
  capital_invertido: number
  /** `null` si Binance no respondió al armar la respuesta -- el PnL cae a 0 en ese caso. */
  precio_actual: number | null
  pnl_usd: number
  pnl_pct: number
  estado: BotEstado
  creado_at: string
  params: Record<string, unknown>
  /** Últimos ~60 puntos de equity -- alcanza para la mini curva de la lista. */
  equity_curve: EquityPoint[]
}

export interface Trade {
  id: number
  bot_id: number
  tipo: TradeTipo
  precio: number
  cantidad: number
  timestamp: string
}

export interface BotCreatePayload {
  nombre: string
  estrategia: BotEstrategia
  par: string
  capital_inicial: number
  params: Record<string, unknown>
}

export function fetchBots(): Promise<Bot[]> {
  return getJson<Bot[]>('/api/bots/')
}

export function createBot(payload: BotCreatePayload): Promise<Bot> {
  return postJson<Bot>('/api/bots/', payload)
}

export function fetchBotTrades(botId: number): Promise<Trade[]> {
  return getJson<Trade[]>(`/api/bots/${botId}/trades`)
}

/** Equity curve completa (todos los snapshots del motor) -- para el detalle del bot. */
export function fetchBotEquity(botId: number): Promise<EquityPoint[]> {
  return getJson<EquityPoint[]>(`/api/bots/${botId}/equity`)
}

export function setBotEstado(botId: number, estado: BotEstado): Promise<Bot> {
  return sendJson<Bot>(`/api/bots/${botId}/estado`, 'PATCH', { estado })
}

export function deleteBot(botId: number): Promise<void> {
  return sendJson<void>(`/api/bots/${botId}`, 'DELETE')
}
