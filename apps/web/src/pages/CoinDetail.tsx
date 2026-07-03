import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { motion } from 'framer-motion'
import { CandlestickSeries, ColorType, LineSeries, createChart } from 'lightweight-charts'
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts'
import { cn } from '../lib/cn'
import { Spinner } from '../components/ui/Spinner'
import { Button } from '../components/ui/Button'
import { IconClose } from '../components/icons/Icon'
import { ApiError, fetchKlines } from '../services/api'
import type { CoinMarketItem, KlineInterval } from '../services/api'
import { formatPercent, formatUsd } from '../lib/format'

const CHART_HEIGHT = 320

const TIMEFRAMES: { value: KlineInterval; label: string }[] = [
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1d' },
  { value: '1w', label: '1w' },
]

type SeriesKind = 'candlestick' | 'line'

interface TimedPoint {
  time: UTCTimestamp
}

/** Ordena ascendente y dedupea por timestamp — lightweight-charts exige series estrictamente crecientes. */
function dedupeSorted<T extends TimedPoint>(items: T[]): T[] {
  const byTime = new Map<number, T>()
  for (const item of items) byTime.set(item.time as number, item)
  return Array.from(byTime.values()).sort((a, b) => (a.time as number) - (b.time as number))
}

export interface CoinDetailProps {
  coin: CoinMarketItem
  onClose: () => void
}

/**
 * Modal de detalle: header con precio + 24h%, selector de timeframe y
 * gráfico de velas (Binance) que cae a línea (fallback CoinGecko OHLC) si el
 * backend no encuentra el par en Binance. Ruteado en `/market/:id` desde
 * `Market.tsx`, así que también es enlazable/compartible.
 */
export function CoinDetail({ coin, onClose }: CoinDetailProps): JSX.Element {
  const [interval, setInterval_] = useState<KlineInterval>('1h')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState<'binance' | 'coingecko' | null>(null)
  const [retryToken, setRetryToken] = useState(0)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null)
  const seriesKindRef = useRef<SeriesKind | null>(null)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  // Crea el chart una sola vez por montaje (CoinDetail se remonta con `key={coin.id}`).
  useEffect(() => {
    if (!containerRef.current) return
    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: CHART_HEIGHT,
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8B7FAE',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(139, 92, 246, 0.08)' },
        horzLines: { color: 'rgba(139, 92, 246, 0.08)' },
      },
      rightPriceScale: { borderColor: 'rgba(139, 92, 246, 0.22)' },
      timeScale: { borderColor: 'rgba(139, 92, 246, 0.22)', timeVisible: true, secondsVisible: false },
      crosshair: {
        vertLine: { color: '#A855F7', labelBackgroundColor: '#241748' },
        horzLine: { color: '#A855F7', labelBackgroundColor: '#241748' },
      },
    })
    chartRef.current = chart
    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
      seriesKindRef.current = null
    }
  }, [])

  // Trae las velas del backend cada vez que cambia el timeframe (o se reintenta) y las vuelca al chart.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchKlines(`${coin.symbol.toUpperCase()}USDT`, interval)
      .then((res) => {
        if (cancelled) return
        const chart = chartRef.current
        if (!chart) return

        const desiredKind: SeriesKind = res.source === 'binance' ? 'candlestick' : 'line'

        if (seriesRef.current && seriesKindRef.current !== desiredKind) {
          chart.removeSeries(seriesRef.current)
          seriesRef.current = null
          seriesKindRef.current = null
        }

        if (desiredKind === 'candlestick') {
          const candles = dedupeSorted(
            res.klines.map((k) => ({
              time: Math.floor(k.open_time / 1000) as UTCTimestamp,
              open: k.open,
              high: k.high,
              low: k.low,
              close: k.close,
            })),
          )
          if (!seriesRef.current) {
            seriesRef.current = chart.addSeries(CandlestickSeries, {
              upColor: '#22D3EE',
              downColor: '#F43F5E',
              borderVisible: false,
              wickUpColor: '#22D3EE',
              wickDownColor: '#F43F5E',
            })
            seriesKindRef.current = 'candlestick'
          }
          ;(seriesRef.current as ISeriesApi<'Candlestick'>).setData(candles)
        } else {
          const points = dedupeSorted(
            res.klines.map((k) => ({
              time: Math.floor(k.open_time / 1000) as UTCTimestamp,
              value: k.close,
            })),
          )
          const trendPositive = points.length > 1 ? points[points.length - 1].value >= points[0].value : true
          if (!seriesRef.current) {
            seriesRef.current = chart.addSeries(LineSeries, {
              color: trendPositive ? '#22D3EE' : '#F43F5E',
              lineWidth: 2,
            })
            seriesKindRef.current = 'line'
          } else {
            ;(seriesRef.current as ISeriesApi<'Line'>).applyOptions({
              color: trendPositive ? '#22D3EE' : '#F43F5E',
            })
          }
          ;(seriesRef.current as ISeriesApi<'Line'>).setData(points)
        }

        chart.timeScale().fitContent()
        setSource(res.source)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoading(false)
        setSource(null)
        setError(
          err instanceof ApiError
            ? err.status === 404
              ? 'No hay datos de gráfico para este par, ni en Binance ni en CoinGecko.'
              : err.message
            : 'No se pudo cargar el gráfico.',
        )
      })

    return () => {
      cancelled = true
    }
  }, [coin.symbol, interval, retryToken])

  const changePct = coin.price_change_percentage_24h_in_currency ?? coin.price_change_percentage_24h
  const positive = (changePct ?? 0) >= 0

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 z-modal bg-surface-overlay"
      />
      <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={`Detalle de ${coin.name}`}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="relative flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-y-auto rounded-xl border border-border-default bg-surface-1/95 p-5 shadow-raised backdrop-blur-xl md:p-6"
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute right-4 top-4 rounded-md p-1.5 text-text-tertiary transition-colors duration-150 hover:bg-surface-2/60 hover:text-text-primary"
          >
            <IconClose className="h-5 w-5" />
          </button>

          <div className="flex items-start gap-3 pr-8">
            {coin.image ? (
              <img
                src={coin.image}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded-full bg-surface-2"
              />
            ) : (
              <div className="h-10 w-10 shrink-0 rounded-full bg-surface-2" />
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-2">
                <h2 className="font-display text-lg font-semibold text-text-primary">{coin.name}</h2>
                <span className="text-xs uppercase tracking-wide text-text-tertiary">{coin.symbol}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="font-display text-2xl font-semibold tabular-nums text-text-primary">
                  {formatUsd(coin.current_price)}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-sm tabular-nums',
                    positive ? 'text-positive' : 'text-negative',
                  )}
                >
                  <span aria-hidden="true">{positive ? '▲' : '▼'}</span>
                  {formatPercent(changePct)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-1.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                type="button"
                onClick={() => setInterval_(tf.value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150',
                  interval === tf.value
                    ? 'border-border-emphasis bg-brand-gradient text-white'
                    : 'border-border-subtle text-text-tertiary hover:border-border-default hover:text-text-secondary',
                )}
              >
                {tf.label}
              </button>
            ))}
            {source && (
              <span className="ml-auto text-[11px] text-text-muted">
                {source === 'binance' ? 'Binance · velas' : 'CoinGecko · línea'}
              </span>
            )}
          </div>

          <div className="relative mt-3 h-80 w-full">
            <div ref={containerRef} className="h-full w-full" />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Spinner size="lg" color="violet" label="Cargando gráfico" />
              </div>
            )}
            {!loading && error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-1/80 text-center">
                <p className="max-w-xs text-sm text-text-tertiary">{error}</p>
                <Button variant="secondary" size="sm" onClick={() => setRetryToken((t) => t + 1)}>
                  Reintentar
                </Button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </>
  )
}

export default CoinDetail
