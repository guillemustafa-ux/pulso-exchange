import { useMemo, useState } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { IconClose } from '../icons/Icon'
import { cn } from '../../lib/cn'
import { formatPercent, formatUsd } from '../../lib/format'
import {
  addHolding,
  computePortfolio,
  loadHoldings,
  removeHolding,
  saveHoldings,
} from '../../lib/holdings'
import type { Holding } from '../../lib/holdings'
import { useLivePrices } from '../../hooks/useLivePrices'
import { liveUsdtPrice } from '../../lib/livePrices'
import type { CoinMarketItem } from '../../services/api'

interface HoldingsProps {
  /** Top 100 ya cargado por la página (para el selector y los precios base). */
  coins: CoinMarketItem[]
}

function PnlText({ usd, pct, className }: { usd: number | null; pct: number | null; className?: string }): JSX.Element {
  if (usd === null) return <span className="text-text-muted">—</span>
  const positive = usd >= 0
  return (
    <span className={cn('tabular-nums', positive ? 'text-positive' : 'text-negative', className)}>
      {positive ? '+' : '−'}{formatUsd(Math.abs(usd))}
      {pct !== null && <span className="ml-1 text-xs">({positive ? '+' : ''}{formatPercent(pct)})</span>}
    </span>
  )
}

/**
 * Posiciones manuales (lotes) con PnL valuado en vivo: el precio actual sale
 * del stream SSE cuando está y del top100 si no. Todo vive en localStorage —
 * no requiere wallet ni cuenta, igual que Alertas y Favoritos.
 */
export function Holdings({ coins }: HoldingsProps): JSX.Element {
  const { t } = useTranslation()
  const [holdings, setHoldings] = useState<Holding[]>(() => loadHoldings())
  const { prices: livePrices } = useLivePrices()

  const [coinId, setCoinId] = useState('bitcoin')
  const [amount, setAmount] = useState('')
  const [buyPrice, setBuyPrice] = useState('')

  // Fallback a la primera del top100: el id default ('bitcoin') es el esquema
  // de CoinGecko, pero con el fallback CoinPaprika los ids son otros
  // ('btc-bitcoin') y un default hardcodeado no matchearía nunca.
  const selectedCoin = useMemo(
    () => coins.find((c) => c.id === coinId) ?? coins[0],
    [coins, coinId],
  )
  const currentOfSelected =
    (selectedCoin ? liveUsdtPrice(livePrices, selectedCoin.symbol) : null) ??
    selectedCoin?.current_price ??
    null

  const summary = useMemo(
    () => computePortfolio(holdings, coins, livePrices),
    [holdings, coins, livePrices],
  )

  const parsedAmount = Number(amount.replace(',', '.'))
  const amountValid = Number.isFinite(parsedAmount) && parsedAmount > 0
  // Precio de compra vacío = "la compré ahora": usa el precio actual.
  const parsedBuy = buyPrice.trim() === '' ? currentOfSelected : Number(buyPrice.replace(',', '.'))
  const buyValid = parsedBuy !== null && Number.isFinite(parsedBuy) && parsedBuy > 0
  const canAdd = amountValid && buyValid && selectedCoin !== undefined

  function persist(next: Holding[]): void {
    setHoldings(next)
    saveHoldings(next)
  }

  function handleAdd(): void {
    if (!canAdd || !selectedCoin || parsedBuy === null) return
    persist(
      addHolding(holdings, {
        coinId: selectedCoin.id,
        symbol: selectedCoin.symbol,
        amount: parsedAmount,
        buyPrice: parsedBuy,
      }),
    )
    setAmount('')
    setBuyPrice('')
  }

  const inputClass =
    'w-full rounded-lg border border-border-default bg-surface-1 px-3 py-2 text-sm tabular-nums text-text-primary outline-none focus:border-border-emphasis'

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-lg font-semibold text-text-primary">{t('holdings.title')}</h2>
        <p className="mt-0.5 text-sm text-text-tertiary">{t('holdings.subtitle')}</p>
      </div>

      {/* Totales */}
      {summary.positions.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border-subtle bg-surface-1 px-4 py-3">
            <span className="text-xs uppercase tracking-wide text-text-tertiary">{t('holdings.totalValue')}</span>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-text-primary">
              {formatUsd(summary.totalValue)}
            </p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-1 px-4 py-3">
            <span className="text-xs uppercase tracking-wide text-text-tertiary">{t('holdings.totalCost')}</span>
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-text-secondary">
              {formatUsd(summary.totalCost)}
            </p>
          </div>
          <div className="rounded-lg border border-border-subtle bg-surface-1 px-4 py-3">
            <span className="text-xs uppercase tracking-wide text-text-tertiary">{t('holdings.totalPnl')}</span>
            <p className="mt-1 font-display text-2xl font-semibold">
              <PnlText usd={summary.totalPnlUsd} pct={summary.totalPnlPct} />
            </p>
          </div>
        </div>
      )}

      {/* Alta de lote */}
      <Card className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
          <select
            value={selectedCoin?.id ?? coinId}
            onChange={(e) => setCoinId(e.target.value)}
            aria-label={t('holdings.coinAria')}
            className={inputClass}
          >
            {coins.map((c) => (
              <option key={c.id} value={c.id}>
                {c.symbol.toUpperCase()} — {c.name}
              </option>
            ))}
          </select>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={t('holdings.amountPlaceholder')}
            aria-label={t('holdings.amountAria')}
            className={cn(inputClass, 'sm:w-36')}
          />
          <input
            inputMode="decimal"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            placeholder={
              currentOfSelected !== null
                ? t('holdings.buyPricePlaceholder', { price: formatUsd(currentOfSelected) })
                : t('holdings.buyPriceEmpty')
            }
            aria-label={t('holdings.buyPriceAria')}
            className={cn(inputClass, 'sm:w-52')}
          />
          <Button variant="primary" disabled={!canAdd} onClick={handleAdd}>
            {t('holdings.add')}
          </Button>
        </div>
        {!amountValid && amount.trim() !== '' && (
          <span className="text-xs text-negative">{t('holdings.invalidAmount')}</span>
        )}
      </Card>

      {/* Posiciones */}
      {summary.positions.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">{t('holdings.empty')}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {summary.positions.map((p) => (
            <Card key={p.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                {p.image ? (
                  <img src={p.image} alt="" width={28} height={28} className="h-7 w-7 rounded-full bg-surface-2" loading="lazy" />
                ) : (
                  <div className="h-7 w-7 rounded-full bg-surface-2" />
                )}
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {p.name}{' '}
                    <span className="text-xs uppercase tracking-wide text-text-tertiary">
                      {p.amount} {p.symbol.toUpperCase()}
                    </span>
                  </p>
                  <p className="text-xs tabular-nums text-text-muted">
                    {t('holdings.bought', { price: formatUsd(p.buyPrice) })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="font-display tabular-nums text-text-primary">{p.value !== null ? formatUsd(p.value) : '—'}</p>
                  <PnlText usd={p.pnlUsd} pct={p.pnlPct} className="text-xs" />
                </div>
                {/* Barra de allocation */}
                <div className="hidden w-28 sm:block">
                  {p.allocationPct !== null && (
                    <>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full bg-brand-gradient"
                          style={{ width: `${Math.max(2, p.allocationPct)}%` }}
                          aria-hidden="true"
                        />
                      </div>
                      <p className="mt-1 text-right text-[11px] tabular-nums text-text-muted">
                        {formatPercent(p.allocationPct)}
                      </p>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => persist(removeHolding(holdings, p.id))}
                  aria-label={t('holdings.removeAria', { symbol: p.symbol.toUpperCase() })}
                  className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-2/60 hover:text-negative"
                >
                  <IconClose className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {summary.positions.length > 0 && (
        <p className="text-xs text-text-muted">{t('holdings.disclaimer')}</p>
      )}
    </section>
  )
}
