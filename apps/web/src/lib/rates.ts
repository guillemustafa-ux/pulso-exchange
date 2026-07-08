/**
 * Helpers de cotización del dólar AR, compartidos por el Conversor y el
 * Portfolio. Trabajan sobre el shape "ancho y variable" de CriptoYa que expone
 * el backend (`EarnCotizaciones`), sin tipar cada subcampo.
 */
import type { EarnCotizaciones } from '../services/api'

export type ArsRateKey = 'mep' | 'ccl' | 'usdt'

/** Dólar MEP/CCL de referencia: precio CI del AL30 (el más líquido en CriptoYa). */
export function extractDolarPrice(
  dolar: Record<string, unknown> | undefined,
  key: 'mep' | 'ccl',
): number | null {
  const node = dolar?.[key] as { al30?: { ci?: { price?: number } } } | undefined
  const price = node?.al30?.ci?.price
  return typeof price === 'number' ? price : null
}

/** Promedio del ask de USDT/ARS entre casas — descarta ceros/no numéricos (fuentes caídas). */
export function averageUsdtArsAsk(usdtArs: Record<string, unknown> | undefined): number | null {
  if (!usdtArs) return null
  const asks = Object.values(usdtArs)
    .map((entry) => (entry as { ask?: number } | undefined)?.ask)
    .filter((ask): ask is number => typeof ask === 'number' && ask > 0)
  if (asks.length === 0) return null
  return asks.reduce((sum, ask) => sum + ask, 0) / asks.length
}

/** Las tres cotizaciones ARS (MEP/CCL/USDT) a partir de `cotizaciones` del backend. */
export function computeArsRates(
  cotizaciones: EarnCotizaciones | null | undefined,
): Record<ArsRateKey, number | null> {
  return {
    mep: extractDolarPrice(cotizaciones?.dolar, 'mep'),
    ccl: extractDolarPrice(cotizaciones?.dolar, 'ccl'),
    usdt: averageUsdtArsAsk(cotizaciones?.usdt_ars),
  }
}
