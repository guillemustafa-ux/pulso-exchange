import { useCallback, useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { useAccount, useBalance, useReadContract, useSwitchChain } from 'wagmi'
import { formatUnits } from 'viem'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { WalletButton } from '../components/WalletButton'
import { IconWallet } from '../components/icons/Icon'
import { cn } from '../lib/cn'
import { formatArs, formatUsd } from '../lib/format'
import { computeArsRates, type ArsRateKey } from '../lib/rates'
import { ApiError, fetchEarnAr, fetchTop100 } from '../services/api'
import type { CoinMarketItem, EarnCotizaciones } from '../services/api'
import { CHAIN_ID, CONTRACT_ADDRESSES, etherscanAddressUrl } from '../contracts/addresses'
import { PulsoTokenAbi } from '../contracts/abi/PulsoToken'
import { PulsoStakingAbi } from '../contracts/abi/PulsoStaking'
import { useSetPageContext } from '../context/AIContext'

const TOKEN = { address: CONTRACT_ADDRESSES.PulsoToken, abi: PulsoTokenAbi } as const
const STAKING = { address: CONTRACT_ADDRESSES.PulsoStaking, abi: PulsoStakingAbi } as const

/** Coincide con el TTL del cache del backend de Earn (10 min). */
const REFRESH_INTERVAL_MS = 10 * 60_000

/** bigint (18 dec) -> número legible, o '—' si todavía no llegó. */
function tokenAmount(value: bigint | undefined, digits = 4): string {
  if (value === undefined) return '—'
  const n = Number(formatUnits(value, 18))
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(n)
}

const cellClass = 'px-4 py-3 align-middle text-sm text-text-secondary'

export function Portfolio(): JSX.Element {
  const { t } = useTranslation()
  const { isConnected, address, chain } = useAccount()
  const { switchChain, isPending: switchPending } = useSwitchChain()

  const wrongNetwork = isConnected && chain !== undefined && chain.id !== CHAIN_ID

  // --- Lecturas on-chain de la wallet conectada (Sepolia) ---
  const ethBalance = useBalance({ address, chainId: CHAIN_ID, query: { enabled: !!address } })
  const { data: pulsoWallet } = useReadContract({
    ...TOKEN,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const { data: pulsoStaked } = useReadContract({
    ...STAKING,
    functionName: 'balances',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  })
  const { data: pulsoRewards } = useReadContract({
    ...STAKING,
    functionName: 'earned',
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 30_000 },
  })

  // --- Precios de mercado (mismas fuentes que el Conversor) ---
  const [coins, setCoins] = useState<CoinMarketItem[]>([])
  const [cotizaciones, setCotizaciones] = useState<EarnCotizaciones | null>(null)
  const [pricesError, setPricesError] = useState<string | null>(null)
  const [rateKey, setRateKey] = useState<ArsRateKey>('mep')

  const loadPrices = useCallback(async () => {
    setPricesError(null)
    try {
      const [top, earn] = await Promise.all([fetchTop100(), fetchEarnAr()])
      setCoins(top)
      setCotizaciones(earn.cotizaciones)
    } catch (err) {
      setPricesError(err instanceof ApiError ? err.message : t('common.connectionError'))
    }
  }, [t])

  useEffect(() => {
    loadPrices()
    const timer = window.setInterval(loadPrices, REFRESH_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [loadPrices])

  const rates = useMemo(() => computeArsRates(cotizaciones), [cotizaciones])
  const arsRate = rates[rateKey]

  const ethPrice = useMemo(() => {
    const eth = coins.find((c) => c.symbol.toLowerCase() === 'eth')
    return typeof eth?.current_price === 'number' ? eth.current_price : null
  }, [coins])

  const ethAmount = ethBalance.data ? Number(formatUnits(ethBalance.data.value, 18)) : null
  const ethUsd = ethAmount !== null && ethPrice !== null ? ethAmount * ethPrice : null
  const ethArs = ethUsd !== null && arsRate !== null ? ethUsd * arsRate : null

  useSetPageContext({
    seccion: 'portfolio',
    wallet_conectada: isConnected,
    eth: { cantidad: ethAmount, valor_usd: ethUsd },
    pulso: {
      wallet: pulsoWallet !== undefined ? Number(formatUnits(pulsoWallet, 18)) : null,
      staking: pulsoStaked !== undefined ? Number(formatUnits(pulsoStaked, 18)) : null,
      recompensas: pulsoRewards !== undefined ? Number(formatUnits(pulsoRewards, 18)) : null,
    },
    cotizacion_ars_usada: { tipo: rateKey, valor: arsRate },
  })

  const rateOptions: Array<{ key: ArsRateKey; label: string }> = [
    { key: 'mep', label: t('portfolio.rates.mep') },
    { key: 'ccl', label: t('portfolio.rates.ccl') },
    { key: 'usdt', label: t('portfolio.rates.usdt') },
  ]

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-violet/10 p-2 text-violet">
            <IconWallet className="h-5 w-5" />
          </span>
          <h1 className="font-display text-2xl font-semibold text-text-primary">{t('portfolio.title')}</h1>
        </div>
        <p className="max-w-2xl text-sm text-text-secondary">{t('portfolio.subtitle')}</p>
      </header>

      {!isConnected ? (
        <Card glow="violet">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-sm font-medium text-text-primary">{t('portfolio.connect.title')}</p>
            <p className="max-w-md text-xs text-text-tertiary">{t('portfolio.connect.desc')}</p>
            <WalletButton />
          </CardContent>
        </Card>
      ) : wrongNetwork ? (
        <Card glow="magenta">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-sm font-medium text-text-primary">{t('portfolio.wrongNetwork')}</p>
            <Button variant="primary" loading={switchPending} onClick={() => switchChain({ chainId: CHAIN_ID })}>
              {t('portfolio.switchNetwork')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Selector de cotización ARS */}
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-text-tertiary">{t('portfolio.rateLabel')}</span>
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

          {/* Total valuado (solo lo que tiene precio de mercado: ETH) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border-subtle bg-surface-1 px-4 py-3">
              <span className="text-xs uppercase tracking-wide text-text-tertiary">
                {t('portfolio.totalLabel')} · USD
              </span>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-text-primary">
                {ethUsd !== null ? formatUsd(ethUsd) : '—'}
              </p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-surface-1 px-4 py-3">
              <span className="text-xs uppercase tracking-wide text-text-tertiary">
                {t('portfolio.totalLabel')} · ARS ({t(`portfolio.rates.${rateKey}`)})
              </span>
              <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-text-primary">
                {ethArs !== null ? formatArs(ethArs) : '—'}
              </p>
            </div>
          </div>
          <p className="-mt-4 text-xs text-text-muted">{t('portfolio.totalHint')}</p>

          {pricesError && <p className="text-xs text-negative">{pricesError}</p>}

          {/* Holdings */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-tertiary">
              {t('portfolio.holdingsTitle')}
            </h2>
            <div className="overflow-x-auto rounded-xl border border-border-subtle bg-surface-1">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-border-subtle text-left text-xs text-text-tertiary">
                    <th className="px-4 py-3 font-medium">{t('portfolio.cols.asset')}</th>
                    <th className="px-4 py-3 font-medium">{t('portfolio.cols.amount')}</th>
                    <th className="px-4 py-3 font-medium">{t('portfolio.cols.priceUsd')}</th>
                    <th className="px-4 py-3 font-medium">{t('portfolio.cols.valueUsd')}</th>
                    <th className="px-4 py-3 font-medium">{t('portfolio.cols.valueArs')}</th>
                  </tr>
                </thead>
                <tbody>
                  {/* ETH nativo (valuado a precio de mercado) */}
                  <tr className="border-b border-border-subtle/60">
                    <td className={cellClass}>
                      <span className="font-medium text-text-primary">{t('portfolio.assets.eth')}</span>
                    </td>
                    <td className={cn(cellClass, 'tabular-nums')}>{ethAmount !== null ? ethAmount.toFixed(6) : '—'}</td>
                    <td className={cn(cellClass, 'tabular-nums')}>{ethPrice !== null ? formatUsd(ethPrice) : '—'}</td>
                    <td className={cn(cellClass, 'tabular-nums')}>{ethUsd !== null ? formatUsd(ethUsd) : '—'}</td>
                    <td className={cn(cellClass, 'tabular-nums')}>{ethArs !== null ? formatArs(ethArs) : '—'}</td>
                  </tr>
                  {/* PULSO en wallet (token testnet, sin precio de mercado) */}
                  <tr className="border-b border-border-subtle/60">
                    <td className={cellClass}>
                      <span className="font-medium text-text-primary">{t('portfolio.assets.pulsoWallet')}</span>
                    </td>
                    <td className={cn(cellClass, 'tabular-nums')}>{tokenAmount(pulsoWallet)}</td>
                    <td className={cellClass} colSpan={3}>
                      <Badge variant="neutral">{t('portfolio.noMarketPrice')}</Badge>
                    </td>
                  </tr>
                  {/* PULSO en staking */}
                  <tr className="border-b border-border-subtle/60">
                    <td className={cellClass}>
                      <span className="font-medium text-text-primary">{t('portfolio.assets.pulsoStaked')}</span>
                    </td>
                    <td className={cn(cellClass, 'tabular-nums')}>{tokenAmount(pulsoStaked)}</td>
                    <td className={cellClass} colSpan={3} />
                  </tr>
                  {/* Recompensas de staking pendientes */}
                  <tr>
                    <td className={cellClass}>
                      <span className="font-medium text-text-primary">{t('portfolio.assets.pulsoRewards')}</span>
                    </td>
                    <td className={cn(cellClass, 'tabular-nums')}>{tokenAmount(pulsoRewards, 6)}</td>
                    <td className={cellClass} colSpan={3} />
                  </tr>
                </tbody>
              </table>
            </div>

            {address && (
              <a
                href={etherscanAddressUrl(address)}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent-strong hover:underline"
              >
                {t('portfolio.viewOnExplorer')} ↗
              </a>
            )}
          </div>

          <p className="text-xs text-text-muted">{t('portfolio.disclaimer')}</p>
        </>
      )}
    </div>
  )
}

export default Portfolio
