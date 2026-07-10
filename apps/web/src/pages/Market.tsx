import { useCallback, useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Table } from '../components/ui/Table'
import type { Column } from '../components/ui/Table'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { PulseIcon } from '../components/icons/PulseIcon'
import { IconStar } from '../components/icons/Icon'
import { CoinDetail } from './CoinDetail'
import { ApiError, fetchTop100 } from '../services/api'
import type { CoinMarketItem } from '../services/api'
import { formatCompactUsd, formatPercent, formatUsd } from '../lib/format'
import { cn } from '../lib/cn'
import { loadWatchlist, saveWatchlist, toggleWatch } from '../lib/watchlist'
import { useSetPageContext } from '../context/AIContext'

/** Coincide con el TTL del cache del backend (60s) — no tiene sentido pollear más seguido. */
const REFRESH_INTERVAL_MS = 60_000

function PercentCell({ value }: { value: number | null | undefined }): JSX.Element {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className="text-text-muted">—</span>
  }
  const positive = value >= 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 tabular-nums',
        positive ? 'text-positive' : 'text-negative',
      )}
    >
      <span aria-hidden="true">{positive ? '▲' : '▼'}</span>
      {formatPercent(value)}
    </span>
  )
}

function buildSparklinePoints(prices: number[], width = 60, height = 24): string {
  if (prices.length < 2) return ''
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1
  const step = width / (prices.length - 1)
  return prices
    .map((price, i) => {
      const x = i * step
      const y = height - ((price - min) / range) * height
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

function Sparkline({ prices, positive }: { prices: number[]; positive: boolean }): JSX.Element {
  const points = buildSparklinePoints(prices)
  if (!points) return <span className="text-text-muted">—</span>
  return (
    <svg width={60} height={24} viewBox="0 0 60 24" className="ml-auto overflow-visible" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? 'var(--pulso-positive)' : 'var(--pulso-negative)'}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CoinNameCell({ coin }: { coin: CoinMarketItem }): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      {coin.image ? (
        <img
          src={coin.image}
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 shrink-0 rounded-full bg-surface-2"
          loading="lazy"
        />
      ) : (
        <div className="h-7 w-7 shrink-0 rounded-full bg-surface-2" />
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">{coin.name}</p>
        <p className="text-xs uppercase tracking-wide text-text-tertiary">{coin.symbol}</p>
      </div>
    </div>
  )
}

export function Market(): JSX.Element {
  const { t } = useTranslation()
  const [coins, setCoins] = useState<CoinMarketItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [watchlist, setWatchlist] = useState<string[]>(() => loadWatchlist())

  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()

  const handleToggleWatch = useCallback((coinId: string) => {
    setWatchlist((prev) => {
      const next = toggleWatch(prev, coinId)
      saveWatchlist(next)
      return next
    })
  }, [])

  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true)
    setError(null)
    try {
      const data = await fetchTop100()
      setCoins(data)
      setLastUpdated(Date.now())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.connectionError'))
    } finally {
      if (!opts.silent) setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  // Refresco silencioso en background — no dispara el skeleton, solo actualiza filas.
  useEffect(() => {
    const timer = window.setInterval(() => load({ silent: true }), REFRESH_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [load])

  const columns = useMemo<Column<CoinMarketItem>[]>(
    () => [
      {
        key: 'watch',
        header: '',
        width: '40px',
        cell: (row) => {
          const watched = watchlist.includes(row.id)
          return (
            <button
              type="button"
              // stopPropagation: la fila navega al detalle; la estrella no debe hacerlo.
              onClick={(e) => {
                e.stopPropagation()
                handleToggleWatch(row.id)
              }}
              aria-pressed={watched}
              aria-label={t(watched ? 'watchlist.removeAria' : 'watchlist.addAria', {
                symbol: row.symbol.toUpperCase(),
              })}
              className={cn(
                'transition-colors',
                watched ? 'text-amber-400' : 'text-text-muted hover:text-text-secondary',
              )}
            >
              <IconStar filled={watched} className="h-4 w-4" />
            </button>
          )
        },
      },
      {
        key: 'rank',
        header: t('market.columns.rank'),
        width: '48px',
        sortValue: (row) => row.market_cap_rank ?? Number.MAX_SAFE_INTEGER,
        cell: (row) => <span className="text-text-tertiary">{row.market_cap_rank ?? '—'}</span>,
      },
      {
        key: 'name',
        header: t('market.columns.name'),
        sortValue: (row) => row.name.toLowerCase(),
        cell: (row) => <CoinNameCell coin={row} />,
      },
      {
        key: 'price',
        header: t('market.columns.price'),
        align: 'right',
        sortValue: (row) => row.current_price ?? 0,
        cell: (row) => <span>{formatUsd(row.current_price)}</span>,
      },
      {
        key: 'change24h',
        header: t('market.columns.change24h'),
        align: 'right',
        sortValue: (row) => row.price_change_percentage_24h_in_currency ?? row.price_change_percentage_24h ?? 0,
        cell: (row) => (
          <PercentCell value={row.price_change_percentage_24h_in_currency ?? row.price_change_percentage_24h} />
        ),
      },
      {
        key: 'change7d',
        header: t('market.columns.change7d'),
        align: 'right',
        sortValue: (row) => row.price_change_percentage_7d_in_currency ?? 0,
        cell: (row) => <PercentCell value={row.price_change_percentage_7d_in_currency} />,
      },
      {
        key: 'sparkline',
        header: t('market.columns.sparkline'),
        align: 'right',
        width: '76px',
        cell: (row) => {
          const prices = row.sparkline_in_7d?.price ?? []
          const trend =
            row.price_change_percentage_7d_in_currency ??
            (prices.length > 1 ? prices[prices.length - 1] - prices[0] : 0)
          return <Sparkline prices={prices} positive={trend >= 0} />
        },
      },
      {
        key: 'marketCap',
        header: t('market.columns.marketCap'),
        align: 'right',
        sortValue: (row) => row.market_cap ?? 0,
        cell: (row) => <span>{formatCompactUsd(row.market_cap)}</span>,
      },
      {
        key: 'volume',
        header: t('market.columns.volume'),
        align: 'right',
        sortValue: (row) => row.total_volume ?? 0,
        cell: (row) => <span>{formatCompactUsd(row.total_volume)}</span>,
      },
    ],
    [t, watchlist, handleToggleWatch],
  )

  const selectedCoin = id ? (coins?.find((c) => c.id === id) ?? null) : null

  // Snapshot para el AIAssistant -- solo datos que están efectivamente en
  // pantalla, nunca precios/cifras que el modelo no puede ver acá.
  useSetPageContext({
    seccion: 'market',
    moneda_seleccionada: selectedCoin
      ? {
          symbol: selectedCoin.symbol,
          nombre: selectedCoin.name,
          precio_usd: selectedCoin.current_price,
          cambio_24h_pct:
            selectedCoin.price_change_percentage_24h_in_currency ?? selectedCoin.price_change_percentage_24h,
          market_cap_usd: selectedCoin.market_cap,
        }
      : null,
    top_monedas_visibles: (coins ?? []).slice(0, 8).map((c) => ({
      symbol: c.symbol,
      nombre: c.name,
      precio_usd: c.current_price,
      cambio_24h_pct: c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h,
    })),
  })

  function handleRowClick(coin: CoinMarketItem): void {
    navigate(`/market/${coin.id}`)
  }

  function handleCloseDetail(): void {
    navigate('/market')
  }

  // Sin datos previos y la carga inicial falló: no hay tabla que mostrar, solo el error.
  if (error && !coins) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center">
        <PulseIcon variant="flat" className="h-6 w-16 text-text-muted" />
        <div>
          <h2 className="font-display text-lg font-medium text-text-primary">{t('market.loadErrorTitle')}</h2>
          <p className="mt-1 text-sm text-text-tertiary">{error}</p>
        </div>
        <Button variant="primary" onClick={() => load()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">{t('market.title')}</h1>
          <p className="mt-1 text-sm text-text-tertiary">{t('market.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="info" size="md" live>
            {t('common.liveData')}
          </Badge>
          {lastUpdated && (
            <span className="hidden text-xs text-text-muted sm:inline">
              {t('common.updated', { time: new Date(lastUpdated).toLocaleTimeString('es-AR') })}
            </span>
          )}
        </div>
      </div>

      {error && coins && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-negative/25 bg-negative/5 px-4 py-3">
          <p className="text-sm text-negative">{t('common.updateError', { error })}</p>
          <Button variant="secondary" size="sm" onClick={() => load()}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      <Table
        data={coins ?? []}
        columns={columns}
        rowKey={(row) => row.id}
        onRowClick={handleRowClick}
        loading={loading && !coins}
        pageSize={20}
        searchable
        getSearchText={(row) => `${row.name} ${row.symbol}`}
        searchPlaceholder={t('market.searchPlaceholder')}
        emptyTitle={t('market.emptyTitle')}
        emptyDescription={t('market.emptyDescription')}
      />

      <AnimatePresence>
        {selectedCoin && <CoinDetail key={selectedCoin.id} coin={selectedCoin} onClose={handleCloseDetail} />}
      </AnimatePresence>
    </div>
  )
}

export default Market
