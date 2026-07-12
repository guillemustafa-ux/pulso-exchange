/**
 * Auditoría móvil permanente: cada módulo renderizado en viewport de teléfono
 * (390×844, iPhone 12-14) NO debe desbordar horizontalmente. El desborde
 * lateral es el defecto móvil más común y el más dañino en una app que se
 * distribuye por Play Store — esta suite lo convierte en regresión detectable.
 */
import { expect, test } from '@playwright/test'
import { stubApi } from './stubs'

test.use({ viewport: { width: 390, height: 844 } })

const ROUTES = [
  '/',
  '/market',
  '/trading',
  '/converter',
  '/portfolio',
  '/alerts',
  '/watchlist',
  '/earn',
  '/defi',
  '/staking',
  '/trends',
  '/bots',
  '/security',
  '/education',
]

test.beforeEach(async ({ page }) => {
  await stubApi(page)
})

for (const route of ROUTES) {
  test(`móvil: ${route} no desborda horizontalmente`, async ({ page }) => {
    await page.goto(route)
    // Margen para el chunk lazy de la página + primer render con datos stub.
    await page.waitForTimeout(900)
    const { scrollW, innerW } = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
    }))
    expect(scrollW, `scrollWidth ${scrollW}px > viewport ${innerW}px en ${route}`).toBeLessThanOrEqual(innerW)
  })
}
