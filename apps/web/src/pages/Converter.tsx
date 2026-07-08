import { useCallback, useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PulseIcon } from '../components/icons/PulseIcon'
import { ApiError, fetchEarnAr, fetchTop100 } from '../services/api'
import type { CoinMarketItem, EarnCotizaciones } from '../services/api'
import { formatArs, formatUsd } from '../lib/format'
import { cn } from '../lib/cn'
import { computeArsRates, type ArsRateKey } from '../lib/rates'
import { useSetPageContext } from '../context/AIContext'

/** Coincide con el TTL del cache del backend de Earn (10 min). */
const REFRESH_INTERVAL_MS = 10 * 60_000

export function Converter(): JSX.Element {
  const { t } = useTranslation()
  const [coins, setCoins] = useState<CoinMarketItem[]>([])
  const [cotizaciones, setCotizaciones] = useState<EarnCotizaciones | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [amount, setAmount] = useState('1')
  const [coinId, setCoinId] = useState('bitcoin')
  const [rateKey, setRateKey] = useState<ArsRateKey>('mep')

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setLoading(true)
      setError(null)
      try {
        // El conversor combina dos fuentes que la app ya expone: precios cripto
        // (top100, en USD) y las cotizaciones del dólar AR (CriptoYa via Earn).
        const [top, earn] = await Promise.all([fetchTop100(), fetchEarnAr()])
        setCoins(top.filter((c) => typeof c.current_price === 'number' && c.current_price > 0))
        setCotizaciones(earn.cotizaciones)
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

  const rates: Record<ArsRateKey, number | null> = useMemo(
    () => computeArsRates(cotizaciones),
    [cotizaciones],
  )

  const selectedCoin = useMemo(() => coins.find((c) => c.id === coinId), [coins, coinId])
  const parsedAmount = Number(amount.replace(',', '.'))
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0

  const usdValue = amountValid && selectedCoin?.current_price ? parsedAmount * selectedCoin.current_price : null
  const arsRate = rates[rateKey]
  const arsValue = usdValue !== null && arsRate !== null ? usdValue * arsRate : null

  useSetPageContext({
    seccion: 'converter',
    monto: amountValid ? parsedAmount : null,
    cripto: selectedCoin ? { id: selectedCoin.id, symbol: selectedCoin.symbol, precio_usd: selectedCoin.current_price } : null,
    cotizacion_ars_usada: { tipo: rateKey, valor: arsRate },
    resultado: { usd: usdValue, ars: arsValue },
  })

  const rateOptions: Array<{ key: ArsRateKey; label: string }> = [
    { key: 'mep', label: t('converter.rates.mep') },
    { key: 'ccl', label: t('converter.rates.ccl') },
    { key: 'usdt', label: t('converter.rates.usdt') },
  ]

  if (error && coins.length === 0) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center">
        <PulseIcon variant="flat" className="h-6 w-16 text-text-muted" />
        <div>
          <h2 className="font-display text-lg font-medium text-text-primary">{t('converter.loadErrorTitle')}</h2>
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
        <h1 className="font-display text-2xl font-semibold text-text-primary">{t('converter.title')}</h1>
        <p className="mt-1 text-sm text-text-tertiary">{t('converter.subtitle')}</p>
      </div>

      <Card glow="violet" className="flex flex-col gap-5">
        {/* Entrada: monto + cripto */}
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase tracking-wide text-text-tertiary" htmlFor="conv-amount">
            {t('converter.amountLabel')}
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="conv-amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-lg border border-border-default bg-surface-1 px-3 py-2 font-display text-lg tabular-nums text-text-primary outline-none focus:border-border-emphasis"
            />
            <select
              value={coinId}
              onChange={(e) => setCoinId(e.target.value)}
              disabled={loading && coins.length === 0}
              className="w-full rounded-lg border border-border-default bg-surface-1 px-3 py-2 text-sm text-text-primary outline-none focus:border-border-emphasis sm:w-48"
            >
              {coins.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.symbol.toUpperCase()} — {c.name}
                </option>
              ))}
            </select>
          </div>
          {!amountValid && amount.trim() !== '' && (
            <span className="text-xs text-negative">{t('converter.invalidAmount')}</span>
          )}
        </div>

        {/* Selector de cotización ARS */}
        <div className="flex flex-col gap-2">
          <span className="text-xs uppercase tracking-wide text-text-tertiary">{t('converter.rateLabel')}</span>
          <div className="flex flex-wrap gap-2">
            {rateOptions.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRateKey(opt.key)}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                  rateKey === opt.key
                    ? 'border-violet/50 bg-violet/15 text-text-primary'
                    : 'border-border-default text-text-tertiary hover:text-text-secondary',
                )}
              >
                {opt.label}
                {rates[opt.key] !== null && (
                  <span className="ml-1.5 text-xs text-text-muted">{formatArs(rates[opt.key])}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Resultado */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border-subtle bg-surface-1 px-4 py-3">
            <span className="text-xs uppercase tracking-wide text-text-tertiary">{t('converter.inUsd')}</span>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-text-primary">
              {usdValue !== null ? formatUsd(usdValue) : '—'}
            </p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-1 px-4 py-3">
            <span className="text-xs uppercase tracking-wide text-text-tertiary">
              {t('converter.inArs', { rate: t(`converter.rates.${rateKey}`) })}
            </span>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-text-primary">
              {arsValue !== null ? formatArs(arsValue) : '—'}
            </p>
          </div>
        </div>

        {selectedCoin?.current_price != null && (
          <p className="text-xs text-text-muted">
            {t('converter.priceRef', {
              symbol: selectedCoin.symbol.toUpperCase(),
              price: formatUsd(selectedCoin.current_price),
            })}
          </p>
        )}
      </Card>

      <p className="text-xs text-text-muted">{t('converter.disclaimer')}</p>
    </div>
  )
}

export default Converter
