/**
 * Alertas de precio — lógica pura + persistencia local.
 *
 * Las alertas viven SOLO en este navegador (localStorage): PULSO no tiene
 * cuentas de usuario y el backend no guarda estado por visitante, así que un
 * server-side scheduler no tendría a quién notificar. El chequeo corre
 * mientras la app está abierta, contra el mismo top100 que ya consume la UI.
 *
 * La evaluación (`evaluateAlerts`) es una función pura y testeable: recibe
 * alertas + precios y devuelve el nuevo estado + cuáles se dispararon.
 */

export type AlertCondition = 'above' | 'below'

export interface PriceAlert {
  id: string
  coinId: string
  symbol: string
  name: string
  condition: AlertCondition
  targetUsd: number
  status: 'active' | 'triggered'
  createdAt: string
  triggeredAt: string | null
  /** Precio observado en el tick que disparó la alerta. */
  triggeredPrice: number | null
}

export const ALERTS_STORAGE_KEY = 'pulso-alerts'

/** Dispara si el precio actual alcanzó el objetivo (>= para above, <= para below). */
export function shouldFire(alert: PriceAlert, price: number): boolean {
  return alert.condition === 'above' ? price >= alert.targetUsd : price <= alert.targetUsd
}

/**
 * Evalúa todas las alertas contra un mapa `coinId -> precio USD`.
 * Las ya disparadas y las de monedas sin precio quedan intactas.
 */
export function evaluateAlerts(
  alerts: PriceAlert[],
  prices: Record<string, number>,
  nowIso: string,
): { alerts: PriceAlert[]; fired: PriceAlert[] } {
  const fired: PriceAlert[] = []
  const next = alerts.map((alert) => {
    if (alert.status !== 'active') return alert
    const price = prices[alert.coinId]
    if (typeof price !== 'number' || !Number.isFinite(price)) return alert
    if (!shouldFire(alert, price)) return alert
    const triggered: PriceAlert = {
      ...alert,
      status: 'triggered',
      triggeredAt: nowIso,
      triggeredPrice: price,
    }
    fired.push(triggered)
    return triggered
  })
  return { alerts: next, fired }
}

export interface NewAlertInput {
  coinId: string
  symbol: string
  name: string
  condition: AlertCondition
  targetUsd: number
}

export function createAlert(input: NewAlertInput, nowIso: string): PriceAlert {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    coinId: input.coinId,
    symbol: input.symbol,
    name: input.name,
    condition: input.condition,
    targetUsd: input.targetUsd,
    status: 'active',
    createdAt: nowIso,
    triggeredAt: null,
    triggeredPrice: null,
  }
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null // navegador con storage bloqueado (modo privado estricto)
  }
}

/** Carga defensiva: JSON roto o shape inesperado degradan a lista vacía, nunca rompen la página. */
export function loadAlerts(storage: StorageLike | null = defaultStorage()): PriceAlert[] {
  if (!storage) return []
  try {
    const raw = storage.getItem(ALERTS_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (a): a is PriceAlert =>
        typeof a === 'object' &&
        a !== null &&
        typeof (a as PriceAlert).id === 'string' &&
        typeof (a as PriceAlert).coinId === 'string' &&
        typeof (a as PriceAlert).targetUsd === 'number' &&
        ((a as PriceAlert).condition === 'above' || (a as PriceAlert).condition === 'below') &&
        ((a as PriceAlert).status === 'active' || (a as PriceAlert).status === 'triggered'),
    )
  } catch {
    return []
  }
}

export function saveAlerts(alerts: PriceAlert[], storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return
  try {
    storage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts))
  } catch {
    // cuota llena / storage bloqueado: la alerta sigue viva en memoria
  }
}
