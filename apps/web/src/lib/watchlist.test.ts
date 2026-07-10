import { describe, expect, it } from 'vitest'
import {
  WATCHLIST_STORAGE_KEY,
  isWatched,
  loadWatchlist,
  saveWatchlist,
  toggleWatch,
} from './watchlist'

describe('isWatched', () => {
  it('detecta pertenencia', () => {
    expect(isWatched(['bitcoin', 'ethereum'], 'bitcoin')).toBe(true)
    expect(isWatched(['bitcoin'], 'solana')).toBe(false)
    expect(isWatched([], 'bitcoin')).toBe(false)
  })
})

describe('toggleWatch', () => {
  it('agrega al frente si no estaba', () => {
    expect(toggleWatch(['ethereum'], 'bitcoin')).toEqual(['bitcoin', 'ethereum'])
  })

  it('saca si ya estaba', () => {
    expect(toggleWatch(['bitcoin', 'ethereum'], 'bitcoin')).toEqual(['ethereum'])
  })

  it('no muta el array original', () => {
    const original = ['bitcoin']
    toggleWatch(original, 'ethereum')
    expect(original).toEqual(['bitcoin'])
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

  it('roundtrip', () => {
    const storage = fakeStorage()
    saveWatchlist(['bitcoin', 'solana'], storage)
    expect(loadWatchlist(storage)).toEqual(['bitcoin', 'solana'])
  })

  it('deduplica al cargar un guardado con repetidos', () => {
    expect(
      loadWatchlist(fakeStorage({ [WATCHLIST_STORAGE_KEY]: '["bitcoin","bitcoin","eth"]' })),
    ).toEqual(['bitcoin', 'eth'])
  })

  it('JSON roto o shape inesperado degradan a lista vacía', () => {
    expect(loadWatchlist(fakeStorage({ [WATCHLIST_STORAGE_KEY]: 'roto{{' }))).toEqual([])
    expect(loadWatchlist(fakeStorage({ [WATCHLIST_STORAGE_KEY]: '{"a":1}' }))).toEqual([])
    expect(loadWatchlist(fakeStorage({ [WATCHLIST_STORAGE_KEY]: '[1,2,true]' }))).toEqual([])
  })

  it('sin storage devuelve vacío y no explota al guardar', () => {
    expect(loadWatchlist(null)).toEqual([])
    expect(() => saveWatchlist(['bitcoin'], null)).not.toThrow()
  })
})
