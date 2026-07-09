import { describe, expect, it } from 'vitest'
import { averageUsdtArsAsk, computeArsRates, extractDolarPrice } from './rates'
import type { EarnCotizaciones } from '../services/api'

const COTIZACIONES: EarnCotizaciones = {
  dolar: {
    mep: { al30: { ci: { price: 1200 } } },
    ccl: { al30: { ci: { price: 1250.5 } } },
  },
  usdt_ars: {
    binance: { ask: 1300 },
    otraCasa: { ask: 1310 },
    caida: { ask: 0 }, // fuente caída: ask 0 se descarta
    rota: { ask: 'n/a' }, // shape inesperado: se descarta
  },
}

describe('extractDolarPrice', () => {
  it('extrae el precio CI del AL30 para mep y ccl', () => {
    expect(extractDolarPrice(COTIZACIONES.dolar, 'mep')).toBe(1200)
    expect(extractDolarPrice(COTIZACIONES.dolar, 'ccl')).toBe(1250.5)
  })

  it('devuelve null si falta el nodo o el precio no es numérico', () => {
    expect(extractDolarPrice(undefined, 'mep')).toBeNull()
    expect(extractDolarPrice({}, 'mep')).toBeNull()
    expect(extractDolarPrice({ mep: { al30: { ci: { price: 'x' } } } }, 'mep')).toBeNull()
    expect(extractDolarPrice({ mep: { al30: {} } }, 'mep')).toBeNull()
  })
})

describe('averageUsdtArsAsk', () => {
  it('promedia solo los asks numéricos positivos', () => {
    // (1300 + 1310) / 2 — los ceros y no-numéricos quedan afuera
    expect(averageUsdtArsAsk(COTIZACIONES.usdt_ars)).toBe(1305)
  })

  it('devuelve null sin fuentes válidas', () => {
    expect(averageUsdtArsAsk(undefined)).toBeNull()
    expect(averageUsdtArsAsk({})).toBeNull()
    expect(averageUsdtArsAsk({ a: { ask: 0 }, b: { ask: -5 } })).toBeNull()
  })
})

describe('computeArsRates', () => {
  it('compone las tres cotizaciones', () => {
    expect(computeArsRates(COTIZACIONES)).toEqual({ mep: 1200, ccl: 1250.5, usdt: 1305 })
  })

  it('con cotizaciones null devuelve las tres en null (CriptoYa caído)', () => {
    expect(computeArsRates(null)).toEqual({ mep: null, ccl: null, usdt: null })
    expect(computeArsRates(undefined)).toEqual({ mep: null, ccl: null, usdt: null })
  })
})
