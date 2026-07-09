import { describe, expect, it } from 'vitest'
import {
  ALERTS_STORAGE_KEY,
  createAlert,
  evaluateAlerts,
  loadAlerts,
  saveAlerts,
  shouldFire,
  type PriceAlert,
} from './alerts'

const NOW = '2026-07-08T12:00:00.000Z'

function mkAlert(over: Partial<PriceAlert> = {}): PriceAlert {
  return {
    ...createAlert(
      { coinId: 'bitcoin', symbol: 'btc', name: 'Bitcoin', condition: 'above', targetUsd: 60000 },
      NOW,
    ),
    ...over,
  }
}

describe('shouldFire', () => {
  it('above dispara cuando el precio alcanza o supera el objetivo', () => {
    expect(shouldFire(mkAlert({ condition: 'above', targetUsd: 60000 }), 59999)).toBe(false)
    expect(shouldFire(mkAlert({ condition: 'above', targetUsd: 60000 }), 60000)).toBe(true)
    expect(shouldFire(mkAlert({ condition: 'above', targetUsd: 60000 }), 70000)).toBe(true)
  })

  it('below dispara cuando el precio cae al objetivo o menos', () => {
    expect(shouldFire(mkAlert({ condition: 'below', targetUsd: 40000 }), 40001)).toBe(false)
    expect(shouldFire(mkAlert({ condition: 'below', targetUsd: 40000 }), 40000)).toBe(true)
    expect(shouldFire(mkAlert({ condition: 'below', targetUsd: 40000 }), 30000)).toBe(true)
  })
})

describe('evaluateAlerts', () => {
  it('dispara la activa que cruzó y marca timestamp + precio observado', () => {
    const alerts = [mkAlert({ condition: 'above', targetUsd: 60000 })]
    const { alerts: next, fired } = evaluateAlerts(alerts, { bitcoin: 65000 }, NOW)
    expect(fired).toHaveLength(1)
    expect(next[0].status).toBe('triggered')
    expect(next[0].triggeredAt).toBe(NOW)
    expect(next[0].triggeredPrice).toBe(65000)
  })

  it('no toca alertas sin precio para su moneda ni las ya disparadas', () => {
    const sinPrecio = mkAlert({ coinId: 'dogecoin' })
    const disparada = mkAlert({ status: 'triggered', triggeredAt: NOW, triggeredPrice: 1 })
    const { alerts: next, fired } = evaluateAlerts([sinPrecio, disparada], { bitcoin: 99999 }, NOW)
    expect(fired).toHaveLength(0)
    expect(next[0]).toBe(sinPrecio)
    expect(next[1]).toBe(disparada)
  })

  it('la que no cruzó sigue activa', () => {
    const { alerts: next, fired } = evaluateAlerts(
      [mkAlert({ condition: 'above', targetUsd: 60000 })],
      { bitcoin: 50000 },
      NOW,
    )
    expect(fired).toHaveLength(0)
    expect(next[0].status).toBe('active')
  })
})

describe('load/save con storage inyectado', () => {
  function fakeStorage(initial: Record<string, string> = {}) {
    const data = new Map(Object.entries(initial))
    return {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
    }
  }

  it('roundtrip guarda y recupera', () => {
    const storage = fakeStorage()
    const alerts = [mkAlert()]
    saveAlerts(alerts, storage)
    expect(loadAlerts(storage)).toEqual(alerts)
  })

  it('JSON roto o shape inesperado degradan a lista vacía', () => {
    expect(loadAlerts(fakeStorage({ [ALERTS_STORAGE_KEY]: 'no-json{{' }))).toEqual([])
    expect(loadAlerts(fakeStorage({ [ALERTS_STORAGE_KEY]: '{"a":1}' }))).toEqual([])
    expect(
      loadAlerts(fakeStorage({ [ALERTS_STORAGE_KEY]: '[{"id":1},{"x":true}]' })),
    ).toEqual([])
  })

  it('sin storage disponible devuelve vacío y no explota al guardar', () => {
    expect(loadAlerts(null)).toEqual([])
    expect(() => saveAlerts([mkAlert()], null)).not.toThrow()
  })
})
