import { useCallback, useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { Table } from '../components/ui/Table'
import type { Column } from '../components/ui/Table'
import { PulseIcon } from '../components/icons/PulseIcon'
import { IconTrending } from '../components/icons/Icon'
import {
  ApiError,
  fetchFearGreed,
  fetchTrendsSummary,
} from '../services/api'
import type { FearGreedItem, MoverItem, TrendingCoinSummary, TrendsSummaryResponse } from '../services/api'
import { formatCompactUsd, formatPercent, formatUsd } from '../lib/format'
import { cn } from '../lib/cn'
import { color } from '../tokens'

/** El TTL más corto entre las fuentes que combina /summary es el trending/global de CoinGecko (5min). */
const REFRESH_INTERVAL_MS = 5 * 60_000

// ---------------------------------------------------------------------------
// Fear & Greed — bandas de color (spec): 0-25 rojo, 26-50 naranja, 51-75
// verde claro, 76-100 semantic.positive (cian, tal como lo define la marca).
// ---------------------------------------------------------------------------

interface GaugeBand {
  min: number
  max: number
  hex: string
  labelKey: string
}

const GAUGE_BANDS: GaugeBand[] = [
  { min: 0, max: 25, hex: color.semantic.negative, labelKey: 'trends.bands.extremeFear' },
  { min: 25, max: 50, hex: '#F97316', labelKey: 'trends.bands.fear' },
  { min: 50, max: 75, hex: '#4ADE80', labelKey: 'trends.bands.greed' },
  { min: 75, max: 100, hex: color.semantic.positive, labelKey: 'trends.bands.extremeGreed' },
]

function getBand(value: number): GaugeBand {
  return GAUGE_BANDS.find((b) => value <= b.max) ?? GAUGE_BANDS[GAUGE_BANDS.length - 1]
}

const GAUGE_CX = 100
const GAUGE_CY = 100
const GAUGE_RADIUS = 80
const GAUGE_STROKE = 16
const GAUGE_GAP_DEG = 2.5

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const angleRad = ((angleDeg - 180) * Math.PI) / 180
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) }
}

/** Arco SVG (path `A`) entre dos ángulos, 0deg = extremo izquierdo, 180deg = extremo derecho. */
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
}

// ---------------------------------------------------------------------------
// Gauge semicircular
// ---------------------------------------------------------------------------

function FearGreedGauge({ value }: { value: number | null }): JSX.Element {
  const { t } = useTranslation()
  const prefersReducedMotion = useReducedMotion()
  const hasValue = value !== null && !Number.isNaN(value)
  const clamped = hasValue ? Math.min(100, Math.max(0, value as number)) : 0
  const needleRotation = (clamped / 100) * 180 - 90
  const band = hasValue ? getBand(clamped) : null
  const bandLabel = band ? t(band.labelKey) : null

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        viewBox="0 0 200 112"
        className="w-full max-w-[280px]"
        role="img"
        aria-label={hasValue ? t('trends.gaugeAria', { value: clamped, label: bandLabel }) : t('trends.gaugeAriaEmpty')}
      >
        {GAUGE_BANDS.map((b, i) => {
          const startAngle = (b.min / 100) * 180 + (i === 0 ? 0 : GAUGE_GAP_DEG / 2)
          const endAngle = (b.max / 100) * 180 - (i === GAUGE_BANDS.length - 1 ? 0 : GAUGE_GAP_DEG / 2)
          return (
            <path
              key={b.labelKey}
              d={describeArc(GAUGE_CX, GAUGE_CY, GAUGE_RADIUS, startAngle, endAngle)}
              fill="none"
              stroke={b.hex}
              strokeWidth={GAUGE_STROKE}
              strokeLinecap="round"
              opacity={hasValue ? 1 : 0.28}
            />
          )
        })}

        {hasValue && (
          <motion.g
            style={{ transformOrigin: `${GAUGE_CX}px ${GAUGE_CY}px` }}
            initial={false}
            animate={{ rotate: needleRotation }}
            transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 55, damping: 11 }}
          >
            <line
              x1={GAUGE_CX}
              y1={GAUGE_CY}
              x2={GAUGE_CX}
              y2={GAUGE_CY - GAUGE_RADIUS + 10}
              stroke={color.text.primary}
              strokeWidth={3}
              strokeLinecap="round"
            />
          </motion.g>
        )}
        <circle cx={GAUGE_CX} cy={GAUGE_CY} r={5.5} fill={color.text.primary} />
      </svg>

      <div className="-mt-3 flex flex-col items-center">
        <span className="font-display text-3xl font-semibold tabular-nums text-text-primary">
          {hasValue ? clamped : '—'}
        </span>
        <span className="text-sm font-medium" style={{ color: band?.hex ?? color.text.tertiary }}>
          {bandLabel ?? t('trends.bands.noData')}
        </span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Histórico 30 días (AreaChart)
// ---------------------------------------------------------------------------

function FearGreedHistoryChart({ data }: { data: FearGreedItem[] }): JSX.Element {
  const { t } = useTranslation()
  const chartData = useMemo(
    () =>
      [...data]
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((d) => ({
          date: new Date(d.timestamp * 1000).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' }),
          value: d.value,
        })),
    [data],
  )

  if (chartData.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-text-muted">{t('trends.historyEmpty')}</div>
    )
  }

  return (
    <div className="h-40 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="fngHistoryGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color.brand.violet} stopOpacity={0.45} />
              <stop offset="100%" stopColor={color.brand.violet} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.12)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: color.text.tertiary }}
            axisLine={false}
            tickLine={false}
            interval={Math.max(0, Math.ceil(chartData.length / 6) - 1)}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 10, fill: color.text.tertiary }}
            axisLine={false}
            tickLine={false}
            width={26}
          />
          <Tooltip
            contentStyle={{
              background: color.surface[2],
              border: `1px solid ${color.border.default}`,
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: color.text.secondary }}
            itemStyle={{ color: color.text.primary }}
            formatter={(value) => [`${value}`, t('trends.tooltipIndex')]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color.brand.violet}
            strokeWidth={2}
            fill="url(#fngHistoryGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dominancia BTC (donut)
// ---------------------------------------------------------------------------

const BTC_ORANGE = '#F7931A'

function BtcDominanceDonut({ btcDominance }: { btcDominance: number | null }): JSX.Element {
  const { t } = useTranslation()
  const hasValue = btcDominance !== null && !Number.isNaN(btcDominance)
  const value = hasValue ? Math.min(100, Math.max(0, btcDominance as number)) : 0
  const data = [
    { name: 'BTC', value },
    { name: 'Resto', value: 100 - value },
  ]

  return (
    <div className="relative mx-auto h-40 w-40">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="72%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            stroke="none"
            isAnimationActive={hasValue}
          >
            <Cell key="btc" fill={hasValue ? BTC_ORANGE : color.surface[3]} />
            <Cell key="rest" fill="rgba(139,92,246,0.16)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-semibold tabular-nums text-text-primary">
          {hasValue ? `${value.toFixed(1)}%` : '—'}
        </span>
        <span className="text-[11px] text-text-tertiary">{t('trends.dominanceTitle')}</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Trending
// ---------------------------------------------------------------------------

function trendingPrice(coin: TrendingCoinSummary): number | null {
  const raw = coin.data?.price
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') {
    const parsed = Number(raw)
    return Number.isNaN(parsed) ? null : parsed
  }
  return null
}

function TrendingCard({ coin, rank }: { coin: TrendingCoinSummary; rank: number }): JSX.Element {
  const { t } = useTranslation()
  const price = trendingPrice(coin)
  return (
    <Card glow="violet" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Badge variant="info" size="sm">
          {t('trends.trendingRank', { rank })}
        </Badge>
        {coin.market_cap_rank && (
          <span className="text-[11px] text-text-muted">{t('trends.rank', { rank: coin.market_cap_rank })}</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {coin.thumb ? (
          <img
            src={coin.thumb}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 shrink-0 rounded-full bg-surface-2"
            loading="lazy"
          />
        ) : (
          <div className="h-8 w-8 shrink-0 rounded-full bg-surface-2" />
        )}
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-medium text-text-primary">{coin.name}</p>
          <p className="truncate text-xs uppercase tracking-wide text-text-tertiary">{coin.symbol}</p>
        </div>
      </div>
      <p className="font-display text-base font-semibold tabular-nums text-text-primary">
        {price !== null ? formatUsd(price) : '—'}
      </p>
    </Card>
  )
}

function TrendingCardSkeleton(): JSX.Element {
  return (
    <Card glow="none" className="flex flex-col gap-3">
      <Skeleton variant="text" className="w-20" />
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" className="h-8 w-8" />
        <div className="flex-1">
          <Skeleton lines={2} />
        </div>
      </div>
      <Skeleton variant="text" className="w-16" />
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Ganadores / Perdedores
// ---------------------------------------------------------------------------

function PercentCell({ value }: { value: number | null | undefined }): JSX.Element {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className="text-text-muted">—</span>
  }
  const positive = value >= 0
  return (
    <span className={cn('inline-flex items-center gap-1 tabular-nums', positive ? 'text-positive' : 'text-negative')}>
      <span aria-hidden="true">{positive ? '▲' : '▼'}</span>
      {formatPercent(value)}
    </span>
  )
}

function MoverNameCell({ coin }: { coin: MoverItem }): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      {coin.image ? (
        <img
          src={coin.image}
          alt=""
          width={22}
          height={22}
          className="h-[22px] w-[22px] shrink-0 rounded-full bg-surface-2"
          loading="lazy"
        />
      ) : (
        <div className="h-[22px] w-[22px] shrink-0 rounded-full bg-surface-2" />
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">{coin.name}</p>
        <p className="truncate text-[11px] uppercase tracking-wide text-text-tertiary">{coin.symbol}</p>
      </div>
    </div>
  )
}

function useMoverColumns(): Column<MoverItem>[] {
  const { t } = useTranslation()
  return useMemo<Column<MoverItem>[]>(
    () => [
      { key: 'name', header: t('trends.columns.name'), cell: (row) => <MoverNameCell coin={row} /> },
      {
        key: 'price',
        header: t('trends.columns.price'),
        align: 'right',
        cell: (row) => <span>{formatUsd(row.current_price)}</span>,
      },
      {
        key: 'change',
        header: t('trends.columns.change'),
        align: 'right',
        cell: (row) => <PercentCell value={row.price_change_percentage_24h} />,
      },
    ],
    [t],
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export function Trends(): JSX.Element {
  const { t } = useTranslation()
  const [summary, setSummary] = useState<TrendsSummaryResponse | null>(null)
  const [history, setHistory] = useState<FearGreedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const moverColumns = useMoverColumns()

  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true)
    setError(null)
    try {
      const [summaryData, fngData] = await Promise.all([fetchTrendsSummary(), fetchFearGreed()])
      setSummary(summaryData)
      setHistory(fngData.data)
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

  // Refresco silencioso en background — no dispara el skeleton, solo actualiza los datos.
  useEffect(() => {
    const timer = window.setInterval(() => load({ silent: true }), REFRESH_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [load])

  // Sin datos previos y la carga inicial falló: no hay nada que mostrar, solo el error.
  if (error && !summary) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center">
        <PulseIcon variant="flat" className="h-6 w-16 text-text-muted" />
        <div>
          <h2 className="font-display text-lg font-medium text-text-primary">{t('trends.loadErrorTitle')}</h2>
          <p className="mt-1 text-sm text-text-tertiary">{error}</p>
        </div>
        <Button variant="primary" onClick={() => load()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }

  const fearGreedValue = summary?.fear_greed?.value ?? null
  const trending = summary?.trending ?? []
  const gainers = summary?.gainers ?? []
  const losers = summary?.losers ?? []

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-violet/10 p-2 text-violet">
            <IconTrending className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-text-primary">{t('trends.title')}</h1>
            <p className="mt-1 text-sm text-text-tertiary">{t('trends.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="realtime" size="md" live>
            {t('common.liveData')}
          </Badge>
          {lastUpdated && (
            <span className="hidden text-xs text-text-muted sm:inline">
              {t('common.updated', { time: new Date(lastUpdated).toLocaleTimeString('es-AR') })}
            </span>
          )}
        </div>
      </div>

      {error && summary && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-negative/25 bg-negative/5 px-4 py-3">
          <p className="text-sm text-negative">{t('common.updateError', { error })}</p>
          <Button variant="secondary" size="sm" onClick={() => load()}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card glow="violet" className="flex flex-col gap-4 lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>{t('trends.fearGreedTitle')}</CardTitle>
              <CardDescription>{t('trends.fearGreedDesc')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {loading && !summary ? (
              <Skeleton variant="block" className="h-40 w-full" />
            ) : (
              <FearGreedGauge value={fearGreedValue} />
            )}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
                {t('trends.last30days')}
              </p>
              {loading && history.length === 0 ? (
                <Skeleton variant="block" className="h-40 w-full" />
              ) : (
                <FearGreedHistoryChart data={history} />
              )}
            </div>
          </CardContent>
        </Card>

        <Card glow="magenta" className="flex flex-col gap-4">
          <CardHeader>
            <div>
              <CardTitle>{t('trends.dominanceTitle')}</CardTitle>
              <CardDescription>{t('trends.dominanceDesc')}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col items-center justify-center gap-4">
            {loading && !summary ? (
              <Skeleton variant="circle" className="h-40 w-40" />
            ) : (
              <BtcDominanceDonut btcDominance={summary?.btc_dominance ?? null} />
            )}
            <div className="flex w-full items-center justify-between border-t border-border-subtle pt-3 text-sm">
              <span className="text-text-tertiary">{t('trends.marketCapTotal')}</span>
              <span className="font-medium tabular-nums text-text-primary">
                {formatCompactUsd(summary?.market_cap_usd)}
              </span>
            </div>
            <div className="-mt-2 flex w-full items-center justify-between text-xs">
              <span className="text-text-tertiary">{t('trends.change24h')}</span>
              <PercentCell value={summary?.market_cap_change_percentage_24h} />
            </div>
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-medium text-text-primary">{t('trends.trendingTitle')}</h2>
          <span className="text-xs text-text-muted">{t('trends.trendingSubtitle')}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading && !summary
            ? Array.from({ length: 7 }, (_, i) => <TrendingCardSkeleton key={i} />)
            : trending.map((coin, i) => <TrendingCard key={coin.id} coin={coin} rank={i + 1} />)}
        </div>
        {!loading && summary && trending.length === 0 && (
          <p className="py-6 text-center text-sm text-text-muted">{t('trends.trendingEmpty')}</p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card glow="cyan" bare className="p-5">
          <CardHeader>
            <CardTitle>{t('trends.gainersTitle')}</CardTitle>
          </CardHeader>
          <Table
            data={gainers}
            columns={moverColumns}
            rowKey={(row) => row.id}
            loading={loading && !summary}
            pageSize={5}
            emptyTitle={t('trends.emptyTitle')}
            emptyDescription={t('trends.gainersEmptyDesc')}
          />
        </Card>

        <Card glow="none" bare className="p-5">
          <CardHeader>
            <CardTitle>{t('trends.losersTitle')}</CardTitle>
          </CardHeader>
          <Table
            data={losers}
            columns={moverColumns}
            rowKey={(row) => row.id}
            loading={loading && !summary}
            pageSize={5}
            emptyTitle={t('trends.emptyTitle')}
            emptyDescription={t('trends.losersEmptyDesc')}
          />
        </Card>
      </div>
    </div>
  )
}

export default Trends
