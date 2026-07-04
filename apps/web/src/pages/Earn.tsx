import { useCallback, useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import { Table } from '../components/ui/Table'
import type { Column } from '../components/ui/Table'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { IconWarning } from '../components/icons/Icon'
import { PulseIcon } from '../components/icons/PulseIcon'
import { ApiError, fetchEarnAr } from '../services/api'
import type { EarnCotizaciones, EarnMoneda, EarnOption, EarnTipo } from '../services/api'
import { formatArs, formatPercent } from '../lib/format'
import { cn } from '../lib/cn'
import { useSetPageContext } from '../context/AIContext'

/** Coincide con el TTL del cache del backend (10 min) — no tiene sentido pollear más seguido. */
const REFRESH_INTERVAL_MS = 10 * 60_000

const TIPO_LABEL: Record<EarnTipo, string> = {
  exchange_ar: 'Exchange AR',
  fintech: 'Fintech',
  defi: 'DeFi',
}

const MONEDA_BADGE_VARIANT: Record<EarnMoneda, 'success' | 'info' | 'neutral'> = {
  ARS: 'info',
  USDT: 'success',
  USDC: 'success',
  BTC: 'neutral',
}

/** Precio "dólar MEP/CCL" de referencia: promedio 24hs/CI del bono AL30 (el más líquido en CriptoYa). */
function extractDolarPrice(dolar: Record<string, unknown> | undefined, key: 'mep' | 'ccl'): number | null {
  const node = dolar?.[key] as { al30?: { ci?: { price?: number } } } | undefined
  const price = node?.al30?.ci?.price
  return typeof price === 'number' ? price : null
}

/** Promedio del ask entre casas de cambio -- descarta ceros/valores no numéricos (fuentes caídas). */
function averageUsdtArsAsk(usdtArs: Record<string, unknown> | undefined): number | null {
  if (!usdtArs) return null
  const asks = Object.values(usdtArs)
    .map((entry) => (entry as { ask?: number } | undefined)?.ask)
    .filter((ask): ask is number => typeof ask === 'number' && ask > 0)
  if (asks.length === 0) return null
  return asks.reduce((sum, ask) => sum + ask, 0) / asks.length
}

function CotizacionesStrip({ cotizaciones }: { cotizaciones: EarnCotizaciones | null }): JSX.Element {
  const mep = extractDolarPrice(cotizaciones?.dolar, 'mep')
  const ccl = extractDolarPrice(cotizaciones?.dolar, 'ccl')
  const usdtArs = averageUsdtArsAsk(cotizaciones?.usdt_ars)

  const items = [
    { label: 'Dólar MEP', value: formatArs(mep) },
    { label: 'Dólar CCL', value: formatArs(ccl) },
    { label: 'USDT/ARS (prom.)', value: formatArs(usdtArs) },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label} glow="none" className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-text-tertiary">{item.label}</span>
          <span className="font-display text-lg font-semibold tabular-nums text-text-primary">{item.value}</span>
        </Card>
      ))}
    </div>
  )
}

function NombreCell({ option }: { option: EarnOption }): JSX.Element {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-text-primary">{option.nombre}</p>
      <p className="text-xs text-text-tertiary">{TIPO_LABEL[option.tipo]}</p>
    </div>
  )
}

export function Earn(): JSX.Element {
  const [data, setData] = useState<{ opciones: EarnOption[]; cotizaciones: EarnCotizaciones | null; disclaimer: string } | null>(
    null,
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)

  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true)
    setError(null)
    try {
      const res = await fetchEarnAr()
      setData({ opciones: res.opciones, cotizaciones: res.cotizaciones, disclaimer: res.disclaimer })
      setLastUpdated(Date.now())
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo conectar con la API de PULSO.')
    } finally {
      if (!opts.silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Refresco silencioso en background — no dispara el skeleton, solo actualiza filas.
  useEffect(() => {
    const timer = window.setInterval(() => load({ silent: true }), REFRESH_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [load])

  // Orden por defecto: mayor APY primero. El header sigue siendo clickeable
  // para re-ordenar (Table.tsx maneja el toggle asc/desc/none).
  const opcionesOrdenadas = useMemo(
    () => (data ? [...data.opciones].sort((a, b) => b.apy_aprox - a.apy_aprox) : []),
    [data],
  )

  // Snapshot para el AIAssistant: top opciones visibles por APY.
  useSetPageContext({
    seccion: 'earn',
    opciones_visibles: opcionesOrdenadas.slice(0, 8).map((o) => ({
      nombre: o.nombre,
      tipo: o.tipo,
      moneda: o.moneda,
      apy_aprox_pct: o.apy_aprox,
    })),
  })

  const columns = useMemo<Column<EarnOption>[]>(
    () => [
      {
        key: 'nombre',
        header: 'Nombre',
        sortValue: (row) => row.nombre.toLowerCase(),
        cell: (row) => <NombreCell option={row} />,
      },
      {
        key: 'moneda',
        header: 'Moneda',
        sortValue: (row) => row.moneda,
        cell: (row) => (
          <Badge variant={MONEDA_BADGE_VARIANT[row.moneda]} size="sm">
            {row.moneda}
          </Badge>
        ),
      },
      {
        key: 'apy',
        header: 'APY aprox.',
        align: 'right',
        sortValue: (row) => row.apy_aprox,
        cell: (row) => <span className="font-medium text-positive">{formatPercent(row.apy_aprox)}</span>,
      },
      {
        key: 'actualizado',
        header: 'Actualizado',
        align: 'right',
        sortValue: (row) => row.ultima_actualizacion,
        cell: (row) => <span className="text-text-tertiary">{row.ultima_actualizacion}</span>,
      },
      {
        key: 'sitio',
        header: 'Sitio',
        align: 'right',
        cell: (row) => (
          <a
            href={row.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-sm font-medium text-violet underline-offset-2 hover:underline"
          >
            Visitar ↗
          </a>
        ),
      },
    ],
    [],
  )

  if (error && !data) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center">
        <PulseIcon variant="flat" className="h-6 w-16 text-text-muted" />
        <div>
          <h2 className="font-display text-lg font-medium text-text-primary">No se pudo cargar Earn AR</h2>
          <p className="mt-1 text-sm text-text-tertiary">{error}</p>
        </div>
        <Button variant="primary" onClick={() => load()}>
          Reintentar
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-text-primary">Earn AR</h1>
          <p className="mt-1 text-sm text-text-tertiary">
            Comparador de rendimientos: exchanges argentinos, fintechs y DeFi.
          </p>
        </div>
        {lastUpdated && (
          <span className="text-xs text-text-muted">
            Actualizado {new Date(lastUpdated).toLocaleTimeString('es-AR')}
          </span>
        )}
      </div>

      <div
        className={cn(
          'flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3',
        )}
      >
        <IconWarning className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <p className="text-sm text-amber-200">{data?.disclaimer ?? 'Cargando disclaimer...'}</p>
      </div>

      <CotizacionesStrip cotizaciones={data?.cotizaciones ?? null} />

      {error && data && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-negative/25 bg-negative/5 px-4 py-3">
          <p className="text-sm text-negative">No se pudo actualizar: {error}</p>
          <Button variant="secondary" size="sm" onClick={() => load()}>
            Reintentar
          </Button>
        </div>
      )}

      <Table
        data={opcionesOrdenadas}
        columns={columns}
        rowKey={(row) => row.nombre}
        loading={loading && !data}
        pageSize={10}
        emptyTitle="Sin datos"
        emptyDescription="No hay rendimientos para mostrar todavía."
      />
    </div>
  )
}

export default Earn
