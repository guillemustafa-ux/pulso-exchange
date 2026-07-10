/**
 * Watchlist — favoritos del usuario, lógica pura + persistencia local.
 *
 * Igual que las alertas ([[lib/alerts]]), la watchlist vive solo en este
 * navegador (localStorage): PULSO no tiene cuentas de usuario. Guarda apenas el
 * `coinId` de cada moneda seguida; los datos de mercado (precio, nombre) se
 * releen del top100 que la app ya consume, para no persistir precios viejos.
 *
 * La API es un set de funciones puras sobre `string[]` — fáciles de testear y
 * sin estado oculto.
 */

export const WATCHLIST_STORAGE_KEY = 'pulso-watchlist'

export function isWatched(list: readonly string[], coinId: string): boolean {
  return list.includes(coinId)
}

/** Agrega o saca `coinId`, devolviendo SIEMPRE un array nuevo (no muta el original). */
export function toggleWatch(list: readonly string[], coinId: string): string[] {
  return isWatched(list, coinId) ? list.filter((id) => id !== coinId) : [coinId, ...list]
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null // storage bloqueado (modo privado estricto)
  }
}

/** Carga defensiva: JSON roto o shape inesperado degradan a lista vacía, nunca rompen. */
export function loadWatchlist(storage: StorageLike | null = defaultStorage()): string[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(WATCHLIST_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    // Solo strings, y sin duplicados (por si un guardado viejo los tuviera).
    return [...new Set(parsed.filter((id): id is string => typeof id === 'string'))]
  } catch {
    return []
  }
}

export function saveWatchlist(list: readonly string[], storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return
  try {
    storage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(list))
  } catch {
    // cuota llena / storage bloqueado: la lista sigue viva en memoria
  }
}
