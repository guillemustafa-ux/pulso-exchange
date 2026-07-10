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

test('educación: las lecciones se traducen con el switch de idioma', async ({ page }) => {
  await page.goto('/education')
  // Título de la lección 1 en español.
  await expect(page.getByText('Wallets y seeds: la base de la custodia')).toBeVisible()
  await page.locator('button', { hasText: /^EN$/ }).first().click()
  // Mismo curso, título ahora en inglés (contenido, no solo chrome).
  await expect(page.getByText('Wallets and seeds: the foundation of custody')).toBeVisible()
})

test('watchlist: marcar en Mercado aparece en Favoritos y persiste', async ({ page }) => {
  await page.goto('/market')
  await expect(page.getByText('Bitcoin').first()).toBeVisible()
  // La estrella de la fila de BTC (aria-label "Agregar BTC a favoritos").
  await page.getByRole('button', { name: /Agregar BTC a favoritos/i }).click()
  await page.goto('/watchlist')
  await expect(page.getByText('Bitcoin').first()).toBeVisible()
  await expect(page.getByText('$50,000.00').first()).toBeVisible()
  // Persiste al recargar (localStorage).
  await page.reload()
  await expect(page.getByText('Bitcoin').first()).toBeVisible()
})

test('watchlist: vacía muestra el estado inicial', async ({ page }) => {
  await page.goto('/watchlist')
  await expect(page.getByRole('button', { name: 'Ir a Mercado' })).toBeVisible()
})

test('stream SSE: el precio vivo pisa al de CoinGecko y el badge pasa a tiempo real', async ({ page }) => {
  // Registrada DESPUÉS del stubApi del beforeEach -> tiene precedencia sobre
  // el catch-all para esta URL. Un frame snapshot y la conexión cierra
  // (EventSource reintenta solo; alcanza para el assert).
  await page.route('**/api/stream/prices', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      body: 'data: {"type":"snapshot","prices":{"BTCUSDT":51234}}\n\n',
    }),
  )
  await page.goto('/market')
  // El top100 stub dice 50.000, pero el stream manda 51.234 -> gana el vivo.
  await expect(page.getByText('$51,234.00').first()).toBeVisible()
  await expect(page.getByText('Precios en tiempo real')).toBeVisible()
})

test('stream SSE: sin stream la página degrada al polling sin romper', async ({ page }) => {
  // El catch-all del stubApi responde JSON al stream -> EventSource falla el
  // MIME check y se cierra; la tabla sigue con los datos del polling.
  await page.goto('/market')
  await expect(page.getByText('$50,000.00').first()).toBeVisible()
  await expect(page.getByText('Datos en vivo')).toBeVisible() // badge de polling, no promete stream
})

test('trading: el terminal renderiza velas stubbeadas con OHLC y stats', async ({ page }) => {
  // 30 velas horarias sintéticas — suficientes para que la SMA 21 exista.
  const klines = Array.from({ length: 30 }, (_, i) => ({
    open_time: (1_700_000_000 + i * 3600) * 1000,
    open: 50000 + i * 10,
    high: 50100 + i * 10,
    low: 49900 + i * 10,
    close: 50050 + i * 10,
    volume: 1000 + i,
    close_time: null,
    quote_volume: null,
    trades: null,
  }))
  await page.route('**/api/market/klines/**', (route) =>
    route.fulfill({
      json: { source: 'binance', symbol: 'BTCUSDT', interval: '1h', coingecko_id: null, klines },
    }),
  )
  await page.goto('/trading')
  // Leyenda OHLC de la última vela (close = 50050 + 29*10 = 50340).
  await expect(page.getByText('$50,340.00').first()).toBeVisible()
  // Chart montado (canvas de lightweight-charts adentro).
  await expect(page.getByTestId('trading-chart').locator('canvas').first()).toBeAttached()
  // Stats del par desde el stub del top100 (market cap compacto de BTC).
  await expect(page.getByText('Máx 24h')).toBeVisible()
  // Toggle SMA presente y activo.
  await expect(page.getByRole('button', { name: 'SMA 9/21' })).toBeVisible()
})

test('portfolio: alta de posición manual calcula PnL y persiste', async ({ page }) => {
  await page.goto('/portfolio')
  // 0.5 BTC comprados a 40.000; el stub cotiza BTC a 50.000 -> vale 25.000, +5.000 (+25%).
  await page.getByLabel('Cantidad comprada').fill('0.5')
  await page.getByLabel('Precio de compra en USD').fill('40000')
  await page.getByRole('button', { name: 'Agregar' }).click()
  await expect(page.getByText('Valor total')).toBeVisible()
  await expect(page.getByText('$25,000.00').first()).toBeVisible()
  await expect(page.getByText('+$5,000.00').first()).toBeVisible()
  // Persiste al recargar (localStorage).
  await page.reload()
  await expect(page.getByText('$25,000.00').first()).toBeVisible()
  // Eliminar la posición vuelve al estado vacío.
  await page.getByRole('button', { name: 'Eliminar posición de BTC' }).click()
  await expect(page.getByText(/Todavía no cargaste posiciones/)).toBeVisible()
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
