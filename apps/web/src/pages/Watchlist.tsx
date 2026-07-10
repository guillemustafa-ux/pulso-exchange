import { useCallback, useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PulseIcon } from '../components/icons/PulseIcon'
import { IconStar } from '../components/icons/Icon'
import { ApiError, fetchTop100 } from '../services/api'
import type { CoinMarketItem } from '../services/api'
import { formatCompactUsd, formatPercent, formatUsd } from '../lib/format'
import { cn } from '../lib/cn'
import { loadWatchlist, saveWatchlist, toggleWatch } from '../lib/watchlist'
import { loadAlerts } from '../lib/alerts'
import { useSetPageContext } from '../context/AIContext'

const REFRESH_INTERVAL_MS = 60_000

export function Watchlist(): JSX.Element {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [coins, setCoins] = useState<CoinMarketItem[]>([])
  const [watchlist, setWatchlist] = useState<string[]>(() => loadWatchlist())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true)
      setError(null)
      try {
        setCoins(await fetchTop100())
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t('common.connectionError'))
      } finally {
        if (!opts.silent) setLoading(false)
      }
    },
    [t],
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const timer = window.setInterval(() => load({ silent: true }), REFRESH_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [load])

  // Cuántas alertas ACTIVAS tiene cada moneda — integra el módulo Alertas sin acoplarse a él.
  const activeAlertsByCoin = useMemo(() => {
    const map: Record<string, number> = {}
    for (const alert of loadAlerts()) {
      if (alert.status === 'active') map[alert.coinId] = (map[alert.coinId] ?? 0) + 1
    }
    return map
  }, [])

  // Las monedas seguidas, en el orden de la watchlist, resueltas contra el top100.
  const watchedCoins = useMemo(
    () =>
      watchlist
        .map((id) => coins.find((c) => c.id === id))
        .filter((c): c is CoinMarketItem => c !== undefined),
    [watchlist, coins],
  )

  useSetPageContext({
    seccion: 'watchlist',
    monedas_seguidas: watchedCoins.length,
    simbolos: watchedCoins.slice(0, 12).map((c) => c.symbol.toUpperCase()),
  })

  function unwatch(coinId: string): void {
    setWatchlist((prev) => {
      const next = toggleWatch(prev, coinId)
      saveWatchlist(next)
      return next
    })
  }

  if (error && coins.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center">
        <PulseIcon variant="flat" className="h-6 w-16 text-text-muted" />
        <div>
          <h2 className="font-display text-lg font-medium text-text-primary">{t('watchlist.loadErrorTitle')}</h2>
          <p className="mt-1 text-sm text-text-tertiary">{error}</p>
        </div>
        <Button variant="primary" onClick={() => load()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">{t('watchlist.title')}</h1>
        <p className="mt-1 text-sm text-text-tertiary">{t('watchlist.subtitle')}</p>
      </div>

      {watchlist.length === 0 && (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <IconStar className="h-8 w-8 text-text-muted" />
          <p className="max-w-sm text-sm text-text-tertiary">{t('watchlist.empty')}</p>
          <Button variant="secondary" onClick={() => navigate('/market')}>
            {t('watchlist.goToMarket')}
          </Button>
        </Card>
      )}

      {watchlist.length > 0 && watchedCoins.length === 0 && loading && (
        <p className="py-10 text-center text-sm text-text-muted">{t('common.loading')}</p>
      )}

      {watchedCoins.map((coin) => {
        const change = coin.price_change_percentage_24h_in_currency ?? coin.price_change_percentage_24h
        const positive = (change ?? 0) >= 0
        const alertCount = activeAlertsByCoin[coin.id] ?? 0
        return (
          <Card
            key={coin.id}
            className="flex cursor-pointer flex-col gap-3 transition-colors hover:border-border-emphasis sm:flex-row sm:items-center sm:justify-between"
            onClick={() => navigate(`/market/${coin.id}`)}
          >
            <div className="flex items-center gap-3">
              {coin.image ? (
                <img src={coin.image} alt="" width={32} height={32} className="h-8 w-8 rounded-full bg-surface-2" loading="lazy" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-surface-2" />
              )}
              <div>
                <p className="font-medium text-text-primary">{coin.name}</p>
                <p className="text-xs uppercase tracking-wide text-text-tertiary">{coin.symbol}</p>
              </div>
            </div>

            <div className="flex items-center gap-5">
              <div className="text-right">
                <p className="font-display tabular-nums text-text-primary">{formatUsd(coin.current_price)}</p>
                <p className={cn('text-xs tabular-nums', positive ? 'text-positive' : 'text-negative')}>
                  {change == null ? '—' : `${positive ? '▲' : '▼'} ${formatPercent(change)}`}
                </p>
              </div>
              <div className="hidden text-right text-xs text-text-muted sm:block">
                <p>{t('watchlist.marketCap')}</p>
                <p className="tabular-nums text-text-secondary">{formatCompactUsd(coin.market_cap)}</p>
              </div>
              {alertCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate('/alerts')
                  }}
                  className="rounded-full bg-violet/15 px-2.5 py-1 text-xs font-medium text-violet transition-colors hover:bg-violet/25"
                >
                  {t('watchlist.alertCount', { count: alertCount })}
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  unwatch(coin.id)
                }}
                aria-label={t('watchlist.removeAria', { symbol: coin.symbol.toUpperCase() })}
                className="text-amber-400 transition-colors hover:text-text-muted"
              >
                <IconStar filled className="h-5 w-5" />
              </button>
            </div>
          </Card>
        )
      })}

      {watchedCoins.length > 0 && <p className="text-xs text-text-muted">{t('watchlist.disclaimer')}</p>}
    </div>
  )
}

export default Watchlist
