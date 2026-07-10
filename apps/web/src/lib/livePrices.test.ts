import { describe, expect, it } from 'vitest'
import { applyPriceEvent, liveUsdtPrice, mergeLivePrices, parsePriceEvent } from './livePrices'

describe('parsePriceEvent', () => {
  it('parsea un snapshot válido', () => {
    const event = parsePriceEvent('{"type":"snapshot","prices":{"BTCUSDT":50000}}')
    expect(event).toEqual({ type: 'snapshot', prices: { BTCUSDT: 50000 } })
  })

  it('JSON roto o shape inesperada degradan a null, nunca lanzan', () => {
    expect(parsePriceEvent('no-json{')).toBeNull()
    expect(parsePriceEvent('"solo un string"')).toBeNull()
    expect(parsePriceEvent('{"type":"otra","prices":{}}')).toBeNull()
    expect(parsePriceEvent('{"type":"update"}')).toBeNull()
    expect(parsePriceEvent('{"type":"update","prices":[1,2]}')).toBeNull()
  })

  it('filtra precios no numéricos o no finitos', () => {
    const event = parsePriceEvent(
      '{"type":"update","prices":{"BTCUSDT":50000,"MALO":"x","NULO":null}}',
    )
    expect(event?.prices).toEqual({ BTCUSDT: 50000 })
  })
})

describe('applyPriceEvent', () => {
  it('snapshot reemplaza el estado completo', () => {
    const next = applyPriceEvent(
      { ETHUSDT: 3000 },
      { type: 'snapshot', prices: { BTCUSDT: 50000 } },
    )
    expect(next).toEqual({ BTCUSDT: 50000 }) // ETH del estado viejo desapareció
  })

  it('update mergea el diff encima sin mutar el estado anterior', () => {
    const prev = { BTCUSDT: 50000, ETHUSDT: 3000 }
    const next = applyPriceEvent(prev, { type: 'update', prices: { ETHUSDT: 3001 } })
    expect(next).toEqual({ BTCUSDT: 50000, ETHUSDT: 3001 })
    expect(prev.ETHUSDT).toBe(3000) // el original quedó intacto
  })
})

describe('liveUsdtPrice', () => {
  it('resuelve el par USDT desde el símbolo del top100 (case-insensitive)', () => {
    expect(liveUsdtPrice({ BTCUSDT: 50000 }, 'btc')).toBe(50000)
    expect(liveUsdtPrice({ BTCUSDT: 50000 }, 'BTC')).toBe(50000)
    expect(liveUsdtPrice({ BTCUSDT: 50000 }, 'doge')).toBeNull()
  })
})

describe('mergeLivePrices', () => {
  const coins = [
    { symbol: 'btc', current_price: 50000, name: 'Bitcoin' },
    { symbol: 'eth', current_price: 3000, name: 'Ethereum' },
    { symbol: 'rare', current_price: 1, name: 'SinParEnBinance' },
  ]

  it('pisa current_price con el precio vivo y respeta el resto de los campos', () => {
    const merged = mergeLivePrices(coins, { BTCUSDT: 51000 })
    expect(merged[0].current_price).toBe(51000)
    expect(merged[0].name).toBe('Bitcoin')
    expect(merged[1].current_price).toBe(3000) // sin dato vivo -> intacto
    expect(merged[2]).toBe(coins[2]) // misma referencia si no cambió
  })

  it('devuelve el MISMO array si ningún precio difiere (identidad estable)', () => {
    expect(mergeLivePrices(coins, {})).toBe(coins)
    expect(mergeLivePrices(coins, { BTCUSDT: 50000 })).toBe(coins) // igual al actual
  })

  it('no muta las monedas originales', () => {
    mergeLivePrices(coins, { BTCUSDT: 60000 })
    expect(coins[0].current_price).toBe(50000)
  })
})
