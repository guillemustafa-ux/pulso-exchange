/**
 * Precios en vivo vía SSE — lógica PURA (parseo, merge de eventos, overlay
 * sobre el top100). El manejo del EventSource vive en `hooks/useLivePrices`;
 * acá no hay red ni estado, todo testeable con vitest en node.
 *
 * Modelo de datos: el backend streamea `{type, prices}` donde `prices` mapea
 * pares Binance (`BTCUSDT`) a precio spot USD. `snapshot` reemplaza el estado
 * completo; `update` es un diff que se mergea encima.
 */

/** Mensaje del stream `/api/stream/prices` (snapshot completo o diff). */
export interface PriceEvent {
  type: 'snapshot' | 'update'
  prices: Record<string, number>
}

/** Parseo defensivo de un frame SSE: JSON roto o shape inesperada -> null (nunca rompe). */
export function parsePriceEvent(raw: string): PriceEvent | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const { type, prices } = data as { type?: unknown; prices?: unknown }
  if (type !== 'snapshot' && type !== 'update') return null
  if (typeof prices !== 'object' || prices === null || Array.isArray(prices)) return null

  const clean: Record<string, number> = {}
  for (const [symbol, price] of Object.entries(prices)) {
    if (typeof price === 'number' && Number.isFinite(price)) clean[symbol] = price
  }
  return { type, prices: clean }
}

/** Aplica un evento al mapa de precios actual. Nunca muta: devuelve un mapa nuevo. */
export function applyPriceEvent(
  current: Record<string, number>,
  event: PriceEvent,
): Record<string, number> {
  if (event.type === 'snapshot') return { ...event.prices }
  return { ...current, ...event.prices }
}

/** Precio en vivo para un símbolo del top100 (btc -> BTCUSDT), o null si no está en el stream. */
export function liveUsdtPrice(prices: Record<string, number>, symbol: string): number | null {
  return prices[`${symbol.toUpperCase()}USDT`] ?? null
}

interface PricedCoin {
  symbol: string
  current_price: number | null
}

/**
 * Overlay de precios vivos sobre las monedas del top100: pisa `current_price`
 * cuando el stream tiene el par; el resto de los campos (market cap, %24h)
 * siguen siendo los de CoinGecko. Si ningún precio cambia, devuelve el MISMO
 * array (identidad estable -> los useMemo/render de las tablas no se agitan).
 */
export function mergeLivePrices<T extends PricedCoin>(
  coins: T[],
  prices: Record<string, number>,
): T[] {
  let changed = false
  const merged = coins.map((coin) => {
    const live = liveUsdtPrice(prices, coin.symbol)
    if (live === null || live === coin.current_price) return coin
    changed = true
    return { ...coin, current_price: live }
  })
  return changed ? merged : coins
}
