import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { CandlestickSeries, ColorType, HistogramSeries, LineSeries, createChart } from 'lightweight-charts'
import type { IChartApi, ISeriesApi, MouseEventParams } from 'lightweight-charts'
import { cn } from '../lib/cn'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { PulseIcon } from '../components/icons/PulseIcon'
import { ApiError, fetchKlines, fetchTop100 } from '../services/api'
import type { CoinMarketItem, KlineInterval } from '../services/api'
import { applyLivePrice, sma, toCandles, toVolumes, DOWN_COLOR, UP_COLOR } from '../lib/klines'
import type { Candle } from '../lib/klines'
import { liveUsdtPrice } from '../lib/livePrices'
import { useLivePrices } from '../hooks/useLivePrices'
import { formatCompactUsd, formatUsd } from '../lib/format'
import { useSetPageContext } from '../context/AIContext'

const CHART_HEIGHT = 440

const TIMEFRAMES: { value: KlineInterval; label: string }[] = [
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1d' },
  { value: '1w', label: '1w' },
]

/** Períodos de las SMA — los MISMOS que usa la estrategia SMA del módulo Bots. */
const SMA_FAST = 9
const SMA_SLOW = 21
const SMA_FAST_COLOR = '#A855F7'
const SMA_SLOW_COLOR = '#F59E0B'

interface OhlcLegend {
  open: number
  high: number
  low: number
  close: number
}

/**
 * Terminal de trading: velas de Binance a página completa con volumen,
 * overlays SMA 9/21 (las mismas medias que cruza el bot SMA) y la última vela
 * moviéndose EN VIVO con el stream SSE. Solo lectura — acá no se opera nada.
 */
export function Trading(): JSX.Element {
  const { t } = useTranslation()
  const [coins, setCoins] = useState<CoinMarketItem[]>([])
  const [symbol, setSymbol] = useState('BTC')
  const [interval, setInterval_] = useState<KlineInterval>('1h')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryToken, setRetryToken] = useState(0)
  const [legend, setLegend] = useState<OhlcLegend | null>(null)
  const [showSma, setShowSma] = useState(true)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const smaFastRef = useRef<ISeriesApi<'Line'> | null>(null)
  const smaSlowRef = useRef<ISeriesApi<'Line'> | null>(null)
  const lastCandleRef = useRef<Candle | undefined>(undefined)
  // true mientras el crosshair está sobre una vela: los ticks del SSE no pisan esa leyenda.
  const hoveringRef = useRef(false)

  const { prices: livePrices, live: streamLive } = useLivePrices()

  // Lista de monedas para el selector (mejor esfuerzo: el chart funciona igual sin ella).
  useEffect(() => {
    fetchTop100()
      .then(setCoins)
      .catch(() => {})
  }, [])

  const selectedCoin = useMemo(
    () => coins.find((c) => c.symbol.toUpperCase() === symbol) ?? null,
    [coins, symbol],
  )

  // El chart se crea UNA vez; las series viven con él y las llenan los efectos de datos.
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

    const candles = chart.addSeries(CandlestickSeries, {
      upColor: UP_COLOR,
      downColor: DOWN_COLOR,
      borderVisible: false,
      wickUpColor: UP_COLOR,
      wickDownColor: DOWN_COLOR,
    })
    // Volumen abajo, en su propia escala superpuesta (el patrón clásico de lightweight-charts).
    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
      lastValueVisible: false,
      priceLineVisible: false,
    })
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
    const smaFast = chart.addSeries(LineSeries, {
      color: SMA_FAST_COLOR,
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    })
    const smaSlow = chart.addSeries(LineSeries, {
      color: SMA_SLOW_COLOR,
      lineWidth: 1,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    })

    chartRef.current = chart
    candleSeriesRef.current = candles
    volumeSeriesRef.current = volume
    smaFastRef.current = smaFast
    smaSlowRef.current = smaSlow

    // Leyenda OHLC: sigue el crosshair; fuera del chart vuelve a la última vela.
    const onCrosshair = (param: MouseEventParams): void => {
      const data = param.seriesData.get(candles) as Candle | undefined
      hoveringRef.current = data !== undefined
      setLegend(
        data
          ? { open: data.open, high: data.high, low: data.low, close: data.close }
          : lastCandleRef.current
            ? { ...lastCandleRef.current }
            : null,
      )
    }
    chart.subscribeCrosshairMove(onCrosshair)

    return () => {
      chart.unsubscribeCrosshairMove(onCrosshair)
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      volumeSeriesRef.current = null
      smaFastRef.current = null
      smaSlowRef.current = null
    }
  }, [])

  // Carga de velas por (símbolo, intervalo); vuelca candles + volumen + SMAs.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchKlines(`${symbol}USDT`, interval)
      .then((res) => {
        if (cancelled || !candleSeriesRef.current) return
        const candles = toCandles(res.klines)
        candleSeriesRef.current.setData(candles)
        volumeSeriesRef.current?.setData(toVolumes(res.klines))
        smaFastRef.current?.setData(sma(candles, SMA_FAST))
        smaSlowRef.current?.setData(sma(candles, SMA_SLOW))
        lastCandleRef.current = candles[candles.length - 1]
        setLegend(lastCandleRef.current ? { ...lastCandleRef.current } : null)
        chartRef.current?.timeScale().fitContent()
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoading(false)
        setError(
          err instanceof ApiError
            ? err.status === 404
              ? t('trading.errorNoPair', { symbol })
              : err.message
            : t('common.connectionError'),
        )
      })

    return () => {
      cancelled = true
    }
  }, [symbol, interval, retryToken, t])

  // La última vela se mueve con el precio vivo del SSE (close pisado, high/low estirados).
  const livePrice = liveUsdtPrice(livePrices, symbol)
  useEffect(() => {
    const updated = applyLivePrice(lastCandleRef.current, livePrice)
    if (!updated || !candleSeriesRef.current) return
    candleSeriesRef.current.update(updated)
    lastCandleRef.current = updated
    // Sin crosshair activo, la leyenda acompaña el precio vivo.
    if (!hoveringRef.current) setLegend({ ...updated })
  }, [livePrice])

  const toggleSma = useCallback(() => {
    setShowSma((prev) => {
      const next = !prev
      smaFastRef.current?.applyOptions({ visible: next })
      smaSlowRef.current?.applyOptions({ visible: next })
      return next
    })
  }, [])

  useSetPageContext({
    seccion: 'trading',
    par: `${symbol}USDT`,
    intervalo: interval,
    precio_usd: livePrice ?? selectedCoin?.current_price ?? null,
    sma_visibles: showSma ? [SMA_FAST, SMA_SLOW] : [],
  })

  const displayPrice = livePrice ?? selectedCoin?.current_price ?? legend?.close ?? null

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">{t('trading.title')}</h1>
          <p className="mt-1 text-sm text-text-tertiary">{t('trading.subtitle')}</p>
        </div>
        <Badge variant="realtime" size="md" live={streamLive}>
          {t(streamLive ? 'common.liveStream' : 'common.liveData')}
        </Badge>
      </div>

      {/* Barra de control: par + precio + timeframes + toggle SMA */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-default bg-surface-1/70 p-3">
        <select
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          aria-label={t('trading.pairAria')}
          className="rounded-lg border border-border-default bg-surface-1 px-3 py-2 text-sm text-text-primary outline-none focus:border-border-emphasis"
        >
          {(coins.length > 0 ? coins : [{ id: 'btc', symbol: 'btc', name: 'Bitcoin' } as CoinMarketItem]).map(
            (c) => (
              <option key={c.id} value={c.symbol.toUpperCase()}>
                {c.symbol.toUpperCase()}/USDT — {c.name}
              </option>
            ),
          )}
        </select>

        {displayPrice != null && (
          <span className="font-display text-xl font-semibold tabular-nums text-text-primary">
            {formatUsd(displayPrice)}
          </span>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
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
          <button
            type="button"
            onClick={toggleSma}
            aria-pressed={showSma}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150',
              showSma
                ? 'border-border-emphasis text-text-primary'
                : 'border-border-subtle text-text-muted hover:text-text-secondary',
            )}
          >
            SMA {SMA_FAST}/{SMA_SLOW}
          </button>
        </div>
      </div>

      {/* Leyenda OHLC + referencias de las SMA */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 font-mono text-xs tabular-nums text-text-tertiary">
        {legend && (
          <>
            <span>O <span className="text-text-secondary">{formatUsd(legend.open)}</span></span>
            <span>H <span className="text-positive">{formatUsd(legend.high)}</span></span>
            <span>L <span className="text-negative">{formatUsd(legend.low)}</span></span>
            <span>C <span className={cn(legend.close >= legend.open ? 'text-positive' : 'text-negative')}>{formatUsd(legend.close)}</span></span>
          </>
        )}
        {showSma && (
          <span className="ml-auto flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4" style={{ backgroundColor: SMA_FAST_COLOR }} aria-hidden="true" />
              SMA {SMA_FAST}
            </span>
            <span className="flex items-center gap-1">
              <span className="h-0.5 w-4" style={{ backgroundColor: SMA_SLOW_COLOR }} aria-hidden="true" />
              SMA {SMA_SLOW}
            </span>
          </span>
        )}
      </div>

      {/* El chart */}
      <div className="relative w-full overflow-hidden rounded-xl border border-border-default bg-surface-1/50" style={{ height: CHART_HEIGHT }}>
        <div ref={containerRef} className="h-full w-full" data-testid="trading-chart" />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner size="lg" color="violet" label={t('trading.loadingChart')} />
          </div>
        )}
        {!loading && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-1/80 text-center">
            <PulseIcon variant="flat" className="h-5 w-14 text-text-muted" />
            <p className="max-w-xs text-sm text-text-tertiary">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => setRetryToken((prev) => prev + 1)}>
              {t('common.retry')}
            </Button>
          </div>
        )}
      </div>

      {/* Stats del par (del top100, si está) */}
      {selectedCoin && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border-subtle bg-surface-1/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-text-muted">{t('trading.marketCap')}</p>
            <p className="font-display tabular-nums text-text-secondary">{formatCompactUsd(selectedCoin.market_cap)}</p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-1/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-text-muted">{t('trading.volume24h')}</p>
            <p className="font-display tabular-nums text-text-secondary">{formatCompactUsd(selectedCoin.total_volume)}</p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-1/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-text-muted">{t('trading.high24h')}</p>
            <p className="font-display tabular-nums text-text-secondary">{formatUsd(selectedCoin.high_24h)}</p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-1/60 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-text-muted">{t('trading.low24h')}</p>
            <p className="font-display tabular-nums text-text-secondary">{formatUsd(selectedCoin.low_24h)}</p>
          </div>
        </div>
      )}

      <p className="text-xs text-text-muted">{t('trading.disclaimer')}</p>
    </div>
  )
}

export default Trading
