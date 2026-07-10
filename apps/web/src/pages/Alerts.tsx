import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PulseIcon } from '../components/icons/PulseIcon'
import { ApiError, fetchTop100 } from '../services/api'
import type { CoinMarketItem } from '../services/api'
import { formatUsd } from '../lib/format'
import { cn } from '../lib/cn'
import {
  createAlert,
  evaluateAlerts,
  loadAlerts,
  saveAlerts,
  type AlertCondition,
  type PriceAlert,
} from '../lib/alerts'
import { useSetPageContext } from '../context/AIContext'

/** Mismo ritmo que el tick del top100 en Mercado: 60s es suficiente para alertas manuales. */
const REFRESH_INTERVAL_MS = 60_000

/** Notificación del navegador si el usuario la habilitó — best effort, nunca rompe. */
function notifyBrowser(title: string, body: string): void {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body })
    }
  } catch {
    // entornos sin Notification (iOS standalone, permisos raros): se ignora
  }
}

export function Alerts(): JSX.Element {
  const { t } = useTranslation()
  const [coins, setCoins] = useState<CoinMarketItem[]>([])
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => loadAlerts())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form
  const [coinId, setCoinId] = useState('bitcoin')
  const [condition, setCondition] = useState<AlertCondition>('above')
  const [target, setTarget] = useState('')

  // Evita pedir el permiso de notificaciones hasta que el usuario CREA una alerta.
  const permissionAsked = useRef(false)

  const prices = useMemo(() => {
    const map: Record<string, number> = {}
    for (const c of coins) if (typeof c.current_price === 'number') map[c.id] = c.current_price
    return map
  }, [coins])

  /** Re-evalúa las alertas contra un mapa de precios y persiste si algo cambió. */
  const runEvaluation = useCallback(
    (priceMap: Record<string, number>) => {
      setAlerts((prev) => {
        const { alerts: next, fired } = evaluateAlerts(prev, priceMap, new Date().toISOString())
        if (fired.length === 0) return prev
        saveAlerts(next)
        for (const alert of fired) {
          notifyBrowser(
            t('alerts.notifTitle', { symbol: alert.symbol.toUpperCase() }),
            t('alerts.notifBody', {
              symbol: alert.symbol.toUpperCase(),
              price: formatUsd(alert.triggeredPrice),
              target: formatUsd(alert.targetUsd),
            }),
          )
        }
        return next
      })
    },
    [t],
  )

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true)
      setError(null)
      try {
        const top = await fetchTop100()
        const valid = top.filter((c) => typeof c.current_price === 'number' && c.current_price > 0)
        setCoins(valid)
        const priceMap: Record<string, number> = {}
        for (const c of valid) priceMap[c.id] = c.current_price as number
        runEvaluation(priceMap)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t('common.connectionError'))
      } finally {
        if (!opts.silent) setLoading(false)
      }
    },
    [runEvaluation, t],
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const timer = window.setInterval(() => load({ silent: true }), REFRESH_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [load])

  // Fallback a la primera del top100: el id default ('bitcoin') es el esquema
  // de CoinGecko, pero con el fallback CoinPaprika los ids son otros
  // ('btc-bitcoin') y un default hardcodeado no matchearía nunca.
  const selectedCoin = useMemo(
    () => coins.find((c) => c.id === coinId) ?? coins[0],
    [coins, coinId],
  )
  const parsedTarget = Number(target.replace(',', '.'))
  const targetValid = Number.isFinite(parsedTarget) && parsedTarget > 0

  const active = alerts.filter((a) => a.status === 'active')
  const triggered = alerts.filter((a) => a.status === 'triggered')

  useSetPageContext({
    seccion: 'alerts',
    alertas_activas: active.length,
    alertas_disparadas: triggered.length,
  })

  function addAlert(): void {
    if (!targetValid || !selectedCoin) return
    if (!permissionAsked.current) {
      permissionAsked.current = true
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          void Notification.requestPermission()
        }
      } catch {
        // sin soporte: la alerta funciona igual, solo en la UI
      }
    }
    const alert = createAlert(
      {
        coinId: selectedCoin.id,
        symbol: selectedCoin.symbol,
        name: selectedCoin.name,
        condition,
        targetUsd: parsedTarget,
      },
      new Date().toISOString(),
    )
    setAlerts((prev) => {
      const next = [alert, ...prev]
      saveAlerts(next)
      return next
    })
    setTarget('')
    // Evaluación inmediata: si el objetivo ya se cumple con el precio actual,
    // la alerta se dispara en este mismo tick (no espera 60s).
    runEvaluation(prices)
  }

  function removeAlert(id: string): void {
    setAlerts((prev) => {
      const next = prev.filter((a) => a.id !== id)
      saveAlerts(next)
      return next
    })
  }

  function rearmAlert(id: string): void {
    setAlerts((prev) => {
      const next = prev.map((a) =>
        a.id === id ? { ...a, status: 'active' as const, triggeredAt: null, triggeredPrice: null } : a,
      )
      saveAlerts(next)
      return next
    })
    runEvaluation(prices)
  }

  const conditionOptions: Array<{ key: AlertCondition; label: string }> = [
    { key: 'above', label: t('alerts.above') },
    { key: 'below', label: t('alerts.below') },
  ]

  if (error && coins.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center">
        <PulseIcon variant="flat" className="h-6 w-16 text-text-muted" />
        <div>
          <h2 className="font-display text-lg font-medium text-text-primary">{t('alerts.loadErrorTitle')}</h2>
          <p className="mt-1 text-sm text-text-tertiary">{error}</p>
        </div>
        <Button variant="primary" onClick={() => load()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">{t('alerts.title')}</h1>
        <p className="mt-1 text-sm text-text-tertiary">{t('alerts.subtitle')}</p>
      </div>

      {/* Crear alerta */}
      <Card glow="violet" className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-wide text-text-tertiary" htmlFor="alert-coin">
            {t('alerts.coinLabel')}
          </label>
          <select
            id="alert-coin"
            value={selectedCoin?.id ?? coinId}
            onChange={(e) => setCoinId(e.target.value)}
            disabled={loading && coins.length === 0}
            className="w-full rounded-lg border border-border-default bg-surface-1 px-3 py-2 text-sm text-text-primary outline-none focus:border-border-emphasis"
          >
            {coins.map((c) => (
              <option key={c.id} value={c.id}>
                {c.symbol.toUpperCase()} — {c.name}
              </option>
            ))}
          </select>
          {selectedCoin?.current_price != null && (
            <span className="text-xs text-text-muted">
              {t('alerts.currentPrice', {
                symbol: selectedCoin.symbol.toUpperCase(),
                price: formatUsd(selectedCoin.current_price),
              })}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-text-tertiary">{t('alerts.conditionLabel')}</span>
          <div className="flex flex-wrap gap-2">
            {conditionOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setCondition(opt.key)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                  condition === opt.key
                    ? 'border-violet/50 bg-violet/15 text-text-primary'
                    : 'border-border-default text-text-tertiary hover:text-text-secondary',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-wide text-text-tertiary" htmlFor="alert-target">
            {t('alerts.targetLabel')}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="alert-target"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-border-default bg-surface-1 px-3 py-2 font-display text-lg tabular-nums text-text-primary outline-none focus:border-border-emphasis"
            />
            <Button variant="primary" onClick={addAlert} disabled={!targetValid || !selectedCoin}>
              {t('alerts.create')}
            </Button>
          </div>
          {!targetValid && target.trim() !== '' && (
            <span className="text-xs text-negative">{t('alerts.invalidTarget')}</span>
          )}
        </div>
      </Card>

      {/* Activas */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-medium text-text-primary">
          {t('alerts.activeTitle')} <span className="text-text-muted">({active.length})</span>
        </h2>
        {active.length === 0 && <p className="text-sm text-text-tertiary">{t('alerts.emptyActive')}</p>}
        {active.map((alert) => {
          const price = prices[alert.coinId]
          return (
            <Card key={alert.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-text-primary">
                  {alert.symbol.toUpperCase()}{' '}
                  <span className="text-text-tertiary">
                    {alert.condition === 'above' ? '≥' : '≤'} {formatUsd(alert.targetUsd)}
                  </span>
                </p>
                <p className="text-xs text-text-muted">
                  {typeof price === 'number'
                    ? t('alerts.currentPrice', { symbol: alert.symbol.toUpperCase(), price: formatUsd(price) })
                    : t('alerts.priceUnknown')}
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={() => removeAlert(alert.id)}>
                {t('alerts.delete')}
              </Button>
            </Card>
          )
        })}
      </section>

      {/* Disparadas */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-medium text-text-primary">
          {t('alerts.triggeredTitle')} <span className="text-text-muted">({triggered.length})</span>
        </h2>
        {triggered.length === 0 && <p className="text-sm text-text-tertiary">{t('alerts.emptyTriggered')}</p>}
        {triggered.map((alert) => (
          <Card
            key={alert.id}
            className="flex flex-col gap-2 border-violet/40 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-text-primary">
                {alert.symbol.toUpperCase()}{' '}
                <span className="text-text-tertiary">
                  {alert.condition === 'above' ? '≥' : '≤'} {formatUsd(alert.targetUsd)}
                </span>{' '}
                <span className="rounded-full bg-violet/15 px-2 py-0.5 text-xs font-medium text-violet">
                  {t('alerts.firedBadge')}
                </span>
              </p>
              <p className="text-xs text-text-muted">
                {t('alerts.firedDetail', {
                  price: formatUsd(alert.triggeredPrice),
                  when: alert.triggeredAt ? new Date(alert.triggeredAt).toLocaleString() : '—',
                })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => rearmAlert(alert.id)}>
                {t('alerts.rearm')}
              </Button>
              <Button variant="danger" size="sm" onClick={() => removeAlert(alert.id)}>
                {t('alerts.delete')}
              </Button>
            </div>
          </Card>
        ))}
      </section>

      <p className="text-xs text-text-muted">{t('alerts.disclaimer')}</p>
    </div>
  )
}

export default Alerts
