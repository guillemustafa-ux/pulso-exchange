/**
 * Stubs de API compartidos por las suites E2E (smoke + mobile): toda la API
 * interceptada por route interception, determinista, sin red.
 */
import type { Page } from '@playwright/test'

export const BTC = {
  // Id estilo CoinPaprika A PROPÓSITO: producción suele servir el fallback
  // (CoinGecko ratelimitea datacenters) y los defaults hardcodeados tipo
  // 'bitcoin' no existen en ese esquema — la suite cubre esa realidad.
  id: 'btc-bitcoin',
  symbol: 'btc',
  name: 'Bitcoin',
  image: null,
  current_price: 50000,
  market_cap: 985_000_000_000,
  market_cap_rank: 1,
  total_volume: 30_000_000_000,
  price_change_percentage_24h: 2.5,
  price_change_percentage_24h_in_currency: 2.5,
  price_change_percentage_7d_in_currency: -1.2,
  market_cap_change_percentage_24h: 2.4,
  circulating_supply: 19_700_000,
  total_supply: 19_700_000,
  max_supply: 21_000_000,
  last_updated: '2026-07-08T00:00:00Z',
  sparkline_in_7d: null,
}

export const EARN_AR = {
  disclaimer: 'stub',
  updated_at: '2026-07-08T00:00:00Z',
  opciones: [],
  cotizaciones: {
    dolar: {
      mep: { al30: { ci: { price: 1200 } } },
      ccl: { al30: { ci: { price: 1250 } } },
    },
    usdt_ars: { binance: { ask: 1300 }, otra: { ask: 1310 } },
  },
  cotizaciones_error: null,
}

export async function stubApi(page: Page): Promise<void> {
  await page.route('**/api/market/top100', (route) =>
    route.fulfill({ json: [BTC] }),
  )
  await page.route('**/api/earn/ar', (route) => route.fulfill({ json: EARN_AR }))
  // Cualquier otro endpoint: vacío pero 200, para que ninguna página rompa.
  await page.route('**/api/**', (route) => {
    if (route.request().url().includes('/api/market/top100')) return route.fallback()
    if (route.request().url().includes('/api/earn/ar')) return route.fallback()
    return route.fulfill({ json: {} })
  })
}
