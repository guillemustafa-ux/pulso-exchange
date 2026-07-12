import { useCallback, useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { PulseIcon } from '../components/icons/PulseIcon'
import { IconSearch } from '../components/icons/Icon'
import { ApiError, fetchDefiProtocols } from '../services/api'
import type { DefiProtocolItem } from '../services/api'
import { formatCompactUsd, formatPercent } from '../lib/format'
import { cn } from '../lib/cn'
import { useSetPageContext } from '../context/AIContext'

/** Coincide con el TTL del cache del backend (5min) — no tiene sentido pollear más seguido. */
const REFRESH_INTERVAL_MS = 5 * 60_000

/** Sentinel de "sin filtro" para los selectores de categoría/cadena. */
const ALL = '__all__'

const ONE_BILLION = 1_000_000_000
const ONE_HUNDRED_MILLION = 100_000_000
const TWO_YEARS_SECONDS = 2 * 365 * 24 * 60 * 60

/** Cuántas cadenas distintas mostrar como filtro (evita ~150 chips de cadenas de un solo protocolo). */
const MAX_CHAIN_FILTERS = 20

type RiskVariant = 'success' | 'danger' | 'neutral'

interface Risk {
  labelKey: string
  variant: RiskVariant
}

/**
 * Riesgo relativo aproximado por TVL + antigüedad (no es asesoramiento
 * financiero, solo una señal visual rápida):
 * - TVL > $1B y listado en DefiLlama hace más de 2 años -> "Establecido".
 * - TVL < $100M -> "Alto riesgo" (protocolo chico / poco probado).
 * - Resto -> riesgo medio (neutral).
 */
function getRisk(protocol: DefiProtocolItem): Risk {
  const tvl = protocol.tvl ?? 0
  const ageSeconds = protocol.listed_at ? Date.now() / 1000 - protocol.listed_at : null

  if (tvl > ONE_BILLION && ageSeconds !== null && ageSeconds > TWO_YEARS_SECONDS) {
    return { labelKey: 'defi.risk.established', variant: 'success' }
  }
  if (tvl < ONE_HUNDRED_MILLION) {
    return { labelKey: 'defi.risk.high', variant: 'danger' }
  }
  return { labelKey: 'defi.risk.medium', variant: 'neutral' }
}

function PercentCell({ value }: { value: number | null | undefined }): JSX.Element {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className="text-text-muted">—</span>
  }
  const positive = value >= 0
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-sm tabular-nums',
        positive ? 'text-positive' : 'text-negative',
      )}
    >
      <span aria-hidden="true">{positive ? '▲' : '▼'}</span>
      {formatPercent(value)}
    </span>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active ? 'true' : 'false'}
      className={cn(
        'inline-flex h-8 shrink-0 items-center whitespace-nowrap rounded-full border px-3 text-xs font-medium',
        'transition-colors duration-150',
        active
          ? 'border-border-emphasis bg-violet/15 text-text-primary'
          : 'border-border-subtle text-text-tertiary hover:border-border-default hover:text-text-secondary',
      )}
    >
      {label}
    </button>
  )
}

function ProtocolLogo({ src }: { src: string | null }): JSX.Element {
  if (!src) return <div className="h-9 w-9 shrink-0 rounded-full bg-surface-2" />
  return (
    <img
      src={src}
      alt=""
      width={36}
      height={36}
      className="h-9 w-9 shrink-0 rounded-full bg-surface-2 object-cover"
      loading="lazy"
      onError={(e) => {
        e.currentTarget.style.display = 'none'
      }}
    />
  )
}

function ProtocolCard({ protocol }: { protocol: DefiProtocolItem }): JSX.Element {
  const { t } = useTranslation()
  const risk = getRisk(protocol)
  const visibleChains = protocol.chains.slice(0, 3)
  const extraChains = protocol.chains.length - visibleChains.length

  return (
    <Card glow="violet" className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ProtocolLogo src={protocol.logo} />
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-medium text-text-primary">{protocol.name}</p>
            {protocol.category && (
              <p className="truncate text-xs uppercase tracking-wide text-text-tertiary">{protocol.category}</p>
            )}
          </div>
        </div>
        <Badge variant={risk.variant} size="sm" className="shrink-0">
          {t(risk.labelKey)}
        </Badge>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-text-tertiary">{t('defi.tvl')}</p>
          <p className="font-display text-lg font-semibold tabular-nums text-text-primary">
            {formatCompactUsd(protocol.tvl)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-text-tertiary">{t('defi.change7d')}</p>
          <PercentCell value={protocol.change_7d} />
        </div>
      </div>

      {protocol.chains.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-border-subtle pt-3">
          {visibleChains.map((chain) => (
            <span key={chain} className="rounded-full bg-surface-2/70 px-2 py-0.5 text-[11px] text-text-tertiary">
              {chain}
            </span>
          ))}
          {extraChains > 0 && (
            <span className="rounded-full bg-surface-2/70 px-2 py-0.5 text-[11px] text-text-tertiary">
              +{extraChains}
            </span>
          )}
        </div>
      )}
    </Card>
  )
}

function ProtocolCardSkeleton(): JSX.Element {
  return (
    <Card glow="none" className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" className="h-9 w-9" />
        <div className="flex-1">
          <Skeleton lines={2} />
        </div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <Skeleton variant="text" className="w-16" />
        <Skeleton variant="text" className="w-12" />
      </div>
      <Skeleton variant="text" className="w-2/3" />
    </Card>
  )
}

export function DeFi(): JSX.Element {
  const { t } = useTranslation()
  const [protocols, setProtocols] = useState<DefiProtocolItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [category, setCategory] = useState<string>(ALL)
  const [chain, setChain] = useState<string>(ALL)
  const [query, setQuery] = useState('')

  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true)
    setError(null)
    try {
      const data = await fetchDefiProtocols()
      setProtocols(data)
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

  // Refresco silencioso en background — no dispara el skeleton, solo actualiza cards.
  useEffect(() => {
    const timer = window.setInterval(() => load({ silent: true }), REFRESH_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [load])

  const categories = useMemo(() => {
    if (!protocols) return []
    const counts = new Map<string, number>()
    for (const p of protocols) {
      if (!p.category) continue
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([name]) => name)
  }, [protocols])

  const chains = useMemo(() => {
    if (!protocols) return []
    const counts = new Map<string, number>()
    for (const p of protocols) {
      for (const c of p.chains) counts.set(c, (counts.get(c) ?? 0) + 1)
    }
    return [...counts.entries()]
      .filter(([, count]) => count > 1) // cadenas de un solo protocolo no aportan como filtro
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, MAX_CHAIN_FILTERS)
      .map(([name]) => name)
  }, [protocols])

  const filtered = useMemo(() => {
    if (!protocols) return []
    const q = query.trim().toLowerCase()
    return protocols.filter((p) => {
      if (category !== ALL && p.category !== category) return false
      if (chain !== ALL && !p.chains.includes(chain)) return false
      if (q && !p.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [protocols, category, chain, query])

  // Snapshot para el AIAssistant: protocolos visibles con el filtro actual (top 10 por TVL).
  useSetPageContext({
    seccion: 'defi',
    filtro_categoria: category === ALL ? null : category,
    filtro_cadena: chain === ALL ? null : chain,
    protocolos_visibles: filtered.slice(0, 10).map((p) => ({
      nombre: p.name,
      categoria: p.category,
      tvl_usd: p.tvl,
      cambio_7d_pct: p.change_7d,
      cadenas: p.chains,
    })),
  })

  // Sin datos previos y la carga inicial falló: no hay cards que mostrar, solo el error.
  if (error && !protocols) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center">
        <PulseIcon variant="flat" className="h-6 w-16 text-text-muted" />
        <div>
          <h2 className="font-display text-lg font-medium text-text-primary">{t('defi.loadErrorTitle')}</h2>
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
          <h1 className="font-display text-2xl font-semibold text-text-primary">{t('defi.title')}</h1>
          <p className="mt-1 text-sm text-text-tertiary">{t('defi.subtitle')}</p>
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

      {error && protocols && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-negative/25 bg-negative/5 px-4 py-3">
          <p className="text-sm text-negative">{t('common.updateError', { error })}</p>
          <Button variant="secondary" size="sm" onClick={() => load()}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {protocols && (
        <div className="flex flex-col gap-3">
          <div className="relative w-full max-w-xs">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('defi.searchPlaceholder')}
              className={cn(
                'h-9 w-full rounded-md border border-border-subtle bg-surface-2/70 pl-9 pr-3 text-sm text-text-primary',
                'placeholder:text-text-muted outline-none transition-colors duration-200',
                'focus:border-border-focus focus:shadow-focus-ring',
              )}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <FilterChip label={t('defi.allCategories')} active={category === ALL} onClick={() => setCategory(ALL)} />
            {categories.map((c) => (
              <FilterChip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            <FilterChip label={t('defi.allChains')} active={chain === ALL} onClick={() => setChain(ALL)} />
            {chains.map((c) => (
              <FilterChip key={c} label={c} active={chain === c} onClick={() => setChain(c)} />
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading && !protocols
          ? Array.from({ length: 9 }, (_, i) => <ProtocolCardSkeleton key={i} />)
          : filtered.map((p) => <ProtocolCard key={p.id} protocol={p} />)}
      </div>

      {!loading && protocols && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <PulseIcon variant="flat" className="h-6 w-16 text-text-muted" />
          <div>
            <p className="font-display text-sm font-medium text-text-secondary">{t('defi.emptyTitle')}</p>
            <p className="mt-1 text-xs text-text-muted">{t('defi.emptyDescription')}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default DeFi
