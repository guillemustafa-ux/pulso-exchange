/**
 * E2E de humo sobre el build real, con TODA la API stubbeada por route
 * interception (determinista: sin backend, sin red, sin flakes de upstream).
 *
 * Cubre los flujos que integran varias piezas de verdad:
 *  - Mercado: fetch top100 -> tabla renderizada con formato USD.
 *  - Conversor: precios USD + cotizaciones AR -> conversión cripto->USD->ARS
 *    (la misma matemática que valida rates.test.ts, acá punta a punta en UI).
 *  - i18n: el switch de idioma cambia los textos (es -> en).
 */
import { expect, test, type Page } from '@playwright/test'

const BTC = {
  id: 'bitcoin',
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

const EARN_AR = {
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

async function stubApi(page: Page): Promise<void> {
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

test.beforeEach(async ({ page }) => {
  await stubApi(page)
})

test('mercado: la tabla renderiza el top100 con formato USD', async ({ page }) => {
  await page.goto('/market')
  await expect(page.getByText('Bitcoin').first()).toBeVisible()
  await expect(page.getByText('$50,000.00').first()).toBeVisible()
})

test('conversor: 1 BTC -> USD y ARS con la cotización MEP', async ({ page }) => {
  await page.goto('/converter')
  // 1 BTC a 50.000 USD; MEP 1200 -> 60.000.000 ARS (formato es-AR sin decimales)
  await expect(page.getByText('$50,000.00').first()).toBeVisible()
  await expect(page.getByText(/60\.000\.000/).first()).toBeVisible()
})

test('conversor: cambiar la cantidad recalcula', async ({ page }) => {
  await page.goto('/converter')
  const input = page.locator('input[type="number"], input[inputmode="decimal"]').first()
  await input.fill('2')
  await expect(page.getByText('$100,000.00').first()).toBeVisible()
})

test('alertas: crear una que ya cumple el objetivo la dispara al toque', async ({ page }) => {
  await page.goto('/alerts')
  // BTC stub = 50.000: "baja a 60.000" ya se cumple -> dispara en la evaluación inmediata.
  await page.getByRole('button', { name: 'Baja a' }).click()
  await page.locator('#alert-target').fill('60000')
  await page.getByRole('button', { name: 'Crear alerta' }).click()
  await expect(page.getByText('Disparada', { exact: true })).toBeVisible()
  await expect(page.getByText('Disparadas (1)')).toBeVisible()
})

test('alertas: una lejos del precio queda activa y persiste al recargar', async ({ page }) => {
  await page.goto('/alerts')
  await page.getByRole('button', { name: 'Sube a' }).click()
  await page.locator('#alert-target').fill('100000')
  await page.getByRole('button', { name: 'Crear alerta' }).click()
  await expect(page.getByText('Activas (1)')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Activas (1)')).toBeVisible() // localStorage
})

test('i18n: el switch cambia es -> en', async ({ page }) => {
  await page.goto('/market')
  // Nav en español por defecto; tras el switch, las labels pasan a inglés.
  await expect(page.getByText('Mercado').first()).toBeVisible()
  // El nombre accesible del botón es su aria-label ("Cambiar a inglés"),
  // así que se ubica por el TEXTO visible "EN" del switch.
  await page.locator('button', { hasText: /^EN$/ }).first().click()
  await expect(page.getByText('Market').first()).toBeVisible()
})
