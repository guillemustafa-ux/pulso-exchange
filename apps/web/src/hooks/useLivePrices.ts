import { useEffect, useState } from 'react'
import { API_URL } from '../services/api'
import { applyPriceEvent, parsePriceEvent } from '../lib/livePrices'

/**
 * Suscripción al stream SSE de precios (`/api/stream/prices`).
 *
 * - `prices`: mapa par Binance -> precio USD, reconstruido de snapshot + diffs.
 * - `live`: true mientras el stream entrega datos; false si se cae.
 *
 * Degradación: EventSource reintenta solo, pero tras `MAX_CONSECUTIVE_ERRORS`
 * errores seguidos (o cierre definitivo, ej. backend sin el endpoint) se corta
 * para no spamear reconexiones -- las páginas quedan con su polling de 60s,
 * que sigue corriendo igual con o sin stream (el SSE es un overlay, no un
 * reemplazo de la fuente de datos).
 */

const MAX_CONSECUTIVE_ERRORS = 3

export function useLivePrices(): { prices: Record<string, number>; live: boolean } {
  const [prices, setPrices] = useState<Record<string, number>>({})
  const [live, setLive] = useState(false)

  useEffect(() => {
    // Entornos sin EventSource (SSR/tests de node): sin stream, solo polling.
    if (typeof EventSource === 'undefined') return

    let errors = 0
    const source = new EventSource(`${API_URL}/api/stream/prices`)

    source.onmessage = (e: MessageEvent<string>) => {
      const event = parsePriceEvent(e.data)
      if (!event) return
      errors = 0
      setLive(true)
      setPrices((prev) => applyPriceEvent(prev, event))
    }

    source.onerror = () => {
      errors += 1
      // `live` baja solo al rendirse de verdad (cierre definitivo o N errores
      // SEGUIDOS sin datos en el medio): las reconexiones transitorias del
      // EventSource no hacen parpadear el badge.
      if (source.readyState === EventSource.CLOSED || errors >= MAX_CONSECUTIVE_ERRORS) {
        source.close()
        setLive(false)
      }
    }

    return () => source.close()
  }, [])

  return { prices, live }
}
