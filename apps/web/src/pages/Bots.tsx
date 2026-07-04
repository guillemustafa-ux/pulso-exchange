import { useCallback, useEffect, useMemo, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { Table } from '../components/ui/Table'
import type { Column } from '../components/ui/Table'
import { PulseIcon } from '../components/icons/PulseIcon'
import { IconBots, IconClose, IconWarning } from '../components/icons/Icon'
import {
  ApiError,
  createBot,
  deleteBot,
  fetchBotEquity,
  fetchBotTrades,
  fetchBots,
  setBotEstado,
} from '../services/api'
import type { Bot, BotEstrategia, EquityPoint, Trade } from '../services/api'
import { formatPercent, formatUsd } from '../lib/format'
import { cn } from '../lib/cn'

/** Spec: polling cada 15s (no WebSocket). */
const REFRESH_INTERVAL_MS = 15_000

/** Keys de traducción por estrategia -- ver `bots.estrategiaLabel.*` en `src/locales/{es,en}.json`. */
const ESTRATEGIA_LABEL_KEY: Record<BotEstrategia, string> = {
  DCA: 'bots.estrategiaLabel.DCA',
  GRID: 'bots.estrategiaLabel.GRID',
  SMA: 'bots.estrategiaLabel.SMA',
}

const INPUT_CLASS = cn(
  'h-10 w-full rounded-md border border-border-subtle bg-surface-2/70 px-3 text-sm text-text-primary',
  'placeholder:text-text-muted outline-none transition-colors duration-200',
  'focus:border-border-focus focus:shadow-focus-ring',
)

/** Cantidad de cripto: más decimales cuanto más chica (holdings tipo 0.0008 BTC no se ven con 2 decimales). */
function formatCantidad(value: number): string {
  if (!Number.isFinite(value)) return '—'
  const abs = Math.abs(value)
  const digits = abs === 0 ? 4 : abs < 0.001 ? 8 : abs < 1 ? 6 : 4
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(
    value,
  )
}

function PnlText({ usd, pct, size = 'lg' }: { usd: number; pct: number; size?: 'lg' | 'sm' }): JSX.Element {
  const positive = usd >= 0
  const tone = positive ? 'text-positive' : 'text-negative'
  return (
    <div className="flex flex-col">
      <span className={cn('font-display font-semibold tabular-nums', tone, size === 'lg' ? 'text-lg' : 'text-sm')}>
        {positive ? '+' : '-'}
        {formatUsd(Math.abs(usd))}
      </span>
      <span className={cn('text-xs tabular-nums', tone)}>
        <span aria-hidden="true">{positive ? '▲' : '▼'}</span> {formatPercent(pct)}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Equity charts (recharts) -- mini (lista) y completa (detalle)
// ---------------------------------------------------------------------------

function MiniEquityChart({ data }: { data: EquityPoint[] }): JSX.Element {
  const { t } = useTranslation()
  if (data.length < 2) {
    return (
      <div className="flex h-12 items-center justify-center text-[11px] text-text-muted">{t('bots.noHistory')}</div>
    )
  }
  const positive = data[data.length - 1].equity >= data[0].equity
  const color = positive ? '#22D3EE' : '#F43F5E'
  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line type="monotone" dataKey="equity" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function EquityChart({ data }: { data: EquityPoint[] }): JSX.Element {
  const { t } = useTranslation()
  if (data.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-center">
        <PulseIcon variant="flat" className="h-6 w-16 text-text-muted" />
        <p className="text-xs text-text-muted">{t('bots.noEquityHistory')}</p>
      </div>
    )
  }
  const positive = data[data.length - 1].equity >= data[0].equity
  const color = positive ? '#22D3EE' : '#F43F5E'
  const formatted = data.map((p) => ({
    ...p,
    label: new Date(p.timestamp).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
  }))
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={formatted} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(139, 92, 246, 0.08)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#8B7FAE' }}
            axisLine={{ stroke: 'rgba(139, 92, 246, 0.22)' }}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#8B7FAE' }}
            axisLine={false}
            tickLine={false}
            width={72}
            tickFormatter={(v: number) => formatUsd(v)}
            domain={['auto', 'auto']}
          />
          <Tooltip
            contentStyle={{
              background: '#1A1035',
              border: '1px solid rgba(139, 92, 246, 0.22)',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: '#C4B5FD' }}
            formatter={(value) => [formatUsd(Number(value)), 'Equity']}
          />
          <Line type="monotone" dataKey="equity" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Banner permanente -- PROHIBIDO que pase desapercibido: semantic.negative.
// ---------------------------------------------------------------------------

function PaperTradingBanner(): JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="flex items-start gap-3 rounded-lg border border-negative/30 bg-negative/10 px-4 py-3">
      <IconWarning className="mt-0.5 h-4 w-4 shrink-0 text-negative" />
      <p className="text-sm font-medium text-negative">{t('bots.banner')}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal shell compartido (wizard + detalle)
// ---------------------------------------------------------------------------

function ModalShell({
  onClose,
  labelledBy,
  maxWidth = 'max-w-lg',
  children,
}: {
  onClose: () => void
  labelledBy: string
  maxWidth?: string
  children: ReactNode
}): JSX.Element {
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
          aria-labelledby={labelledBy}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'relative flex max-h-[90dvh] w-full flex-col overflow-y-auto rounded-xl border border-border-default bg-surface-1/95 p-5 shadow-raised backdrop-blur-xl md:p-6',
            maxWidth,
          )}
        >
          {children}
        </motion.div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Wizard de creación (3 pasos: estrategia -> par + capital -> parámetros)
// ---------------------------------------------------------------------------

const ESTRATEGIAS: { id: BotEstrategia; labelKey: string; descKey: string }[] = [
  { id: 'DCA', labelKey: 'bots.wizard.estrategias.DCA.label', descKey: 'bots.wizard.estrategias.DCA.desc' },
  { id: 'GRID', labelKey: 'bots.wizard.estrategias.GRID.label', descKey: 'bots.wizard.estrategias.GRID.desc' },
  { id: 'SMA', labelKey: 'bots.wizard.estrategias.SMA.label', descKey: 'bots.wizard.estrategias.SMA.desc' },
]

const PARES_SUGERIDOS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT']

interface WizardState {
  estrategia: BotEstrategia | null
  nombre: string
  nombreTocado: boolean
  par: string
  capitalInicial: string
  // DCA
  intervaloSegundos: string
  montoPorOrdenDca: string
  // GRID
  niveles: string
  spreadPct: string
  capitalPorNivel: string
  // SMA
  smaCorta: string
  smaLarga: string
  interval: string
  montoPorOrdenSma: string
}

const INITIAL_WIZARD_STATE: WizardState = {
  estrategia: null,
  nombre: '',
  nombreTocado: false,
  par: 'BTCUSDT',
  capitalInicial: '1000',
  intervaloSegundos: '3600',
  montoPorOrdenDca: '',
  niveles: '5',
  spreadPct: '1',
  capitalPorNivel: '',
  smaCorta: '9',
  smaLarga: '21',
  interval: '1h',
  montoPorOrdenSma: '',
}

function buildParams(state: WizardState): Record<string, unknown> {
  if (state.estrategia === 'DCA') {
    const params: Record<string, unknown> = {}
    if (state.intervaloSegundos) params.intervalo_segundos = Number(state.intervaloSegundos)
    if (state.montoPorOrdenDca) params.monto_por_orden = Number(state.montoPorOrdenDca)
    return params
  }
  if (state.estrategia === 'GRID') {
    const params: Record<string, unknown> = {}
    if (state.niveles) params.niveles = Number(state.niveles)
    if (state.spreadPct) params.spread_pct = Number(state.spreadPct)
    if (state.capitalPorNivel) params.capital_por_nivel = Number(state.capitalPorNivel)
    return params
  }
  if (state.estrategia === 'SMA') {
    const params: Record<string, unknown> = {}
    if (state.smaCorta) params.sma_corta = Number(state.smaCorta)
    if (state.smaLarga) params.sma_larga = Number(state.smaLarga)
    if (state.interval) params.interval = state.interval
    if (state.montoPorOrdenSma) params.monto_por_orden = Number(state.montoPorOrdenSma)
    return params
  }
  return {}
}

function StepIndicator({ step }: { step: 1 | 2 | 3 }): JSX.Element {
  const { t } = useTranslation()
  const labels = t('bots.wizard.steps', { returnObjects: true }) as string[]
  return (
    <div className="mb-5 flex items-center gap-2">
      {labels.map((label, i) => {
        const n = (i + 1) as 1 | 2 | 3
        const active = n === step
        const done = n < step
        return (
          <div key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium',
                active
                  ? 'border-border-emphasis bg-violet/15 text-text-primary'
                  : done
                    ? 'border-positive/40 bg-positive/10 text-positive'
                    : 'border-border-subtle text-text-tertiary',
              )}
            >
              {n}
            </span>
            <span className={cn('hidden text-xs sm:inline', active ? 'text-text-primary' : 'text-text-tertiary')}>
              {label}
            </span>
            {i < labels.length - 1 && <span className="h-px flex-1 bg-border-subtle" />}
          </div>
        )
      })}
    </div>
  )
}

function CreateBotWizard({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (bot: Bot) => void
}): JSX.Element {
  const { t } = useTranslation()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [state, setState] = useState<WizardState>(INITIAL_WIZARD_STATE)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function selectEstrategia(estrategia: BotEstrategia): void {
    setState((s) => ({ ...s, estrategia, nombre: s.nombreTocado ? s.nombre : `${estrategia} ${s.par}`.trim() }))
    setStep(2)
  }

  function updatePar(value: string): void {
    setState((s) => ({
      ...s,
      par: value,
      nombre: s.nombreTocado ? s.nombre : `${s.estrategia ?? ''} ${value}`.trim(),
    }))
  }

  const capitalNum = Number(state.capitalInicial)
  const step2Valid =
    state.par.trim().length >= 5 && Number.isFinite(capitalNum) && capitalNum > 0 && state.nombre.trim().length > 0

  const smaInvalid =
    state.estrategia === 'SMA' &&
    state.smaCorta !== '' &&
    state.smaLarga !== '' &&
    Number(state.smaCorta) >= Number(state.smaLarga)

  async function handleSubmit(): Promise<void> {
    if (!state.estrategia) return
    setSubmitting(true)
    setFormError(null)
    try {
      const bot = await createBot({
        nombre: state.nombre.trim(),
        estrategia: state.estrategia,
        par: state.par.trim().toUpperCase(),
        capital_inicial: capitalNum,
        params: buildParams(state),
      })
      onCreated(bot)
      onClose()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('bots.wizard.genericError'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell onClose={onClose} labelledBy="wizard-title" maxWidth="max-w-xl">
      <div className="mb-1 flex items-start justify-between gap-3 pr-8">
        <h2 id="wizard-title" className="font-display text-lg font-semibold text-text-primary">
          {t('bots.wizard.title')}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="absolute right-4 top-4 rounded-md p-1.5 text-text-tertiary transition-colors duration-150 hover:bg-surface-2/60 hover:text-text-primary"
        >
          <IconClose className="h-5 w-5" />
        </button>
      </div>

      <StepIndicator step={step} />

      {step === 1 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {ESTRATEGIAS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => selectEstrategia(e.id)}
              className={cn(
                'flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors duration-150',
                state.estrategia === e.id
                  ? 'border-border-emphasis bg-violet/10'
                  : 'border-border-subtle hover:border-border-default hover:bg-surface-2/40',
              )}
            >
              <span className="font-display text-sm font-semibold text-text-primary">{t(e.labelKey)}</span>
              <span className="text-xs text-text-tertiary">{t(e.descKey)}</span>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{t('bots.wizard.nombreLabel')}</span>
            <input
              type="text"
              value={state.nombre}
              onChange={(e) => setState((s) => ({ ...s, nombre: e.target.value, nombreTocado: true }))}
              className={INPUT_CLASS}
              placeholder={t('bots.wizard.nombrePlaceholder')}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{t('bots.wizard.parLabel')}</span>
            <input
              type="text"
              value={state.par}
              onChange={(e) => updatePar(e.target.value.toUpperCase())}
              className={INPUT_CLASS}
              placeholder={t('bots.wizard.parPlaceholder')}
            />
            <div className="flex flex-wrap gap-1.5">
              {PARES_SUGERIDOS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => updatePar(p)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-150',
                    state.par === p
                      ? 'border-border-emphasis bg-violet/15 text-text-primary'
                      : 'border-border-subtle text-text-tertiary hover:border-border-default',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{t('bots.wizard.capitalLabel')}</span>
            <input
              type="number"
              min="1"
              step="any"
              value={state.capitalInicial}
              onChange={(e) => setState((s) => ({ ...s, capitalInicial: e.target.value }))}
              className={INPUT_CLASS}
              placeholder="1000"
            />
          </label>
        </div>
      )}

      {step === 3 && state.estrategia === 'DCA' && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{t('bots.wizard.dca.frecuencia')}</span>
            <select
              value={state.intervaloSegundos}
              onChange={(e) => setState((s) => ({ ...s, intervaloSegundos: e.target.value }))}
              className={INPUT_CLASS}
            >
              <option value="60">{t('bots.wizard.dca.opcion1m')}</option>
              <option value="300">{t('bots.wizard.dca.opcion5m')}</option>
              <option value="3600">{t('bots.wizard.dca.opcion1h')}</option>
              <option value="14400">{t('bots.wizard.dca.opcion4h')}</option>
              <option value="86400">{t('bots.wizard.dca.opcion1d')}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{t('bots.wizard.dca.monto')}</span>
            <input
              type="number"
              min="0"
              step="any"
              value={state.montoPorOrdenDca}
              onChange={(e) => setState((s) => ({ ...s, montoPorOrdenDca: e.target.value }))}
              className={INPUT_CLASS}
              placeholder={String(Math.max(1, Math.round(capitalNum * 0.1 || 10)))}
            />
          </label>
        </div>
      )}

      {step === 3 && state.estrategia === 'GRID' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-secondary">{t('bots.wizard.grid.niveles')}</span>
              <input
                type="number"
                min="1"
                max="20"
                value={state.niveles}
                onChange={(e) => setState((s) => ({ ...s, niveles: e.target.value }))}
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-secondary">{t('bots.wizard.grid.spread')}</span>
              <input
                type="number"
                min="0.1"
                step="any"
                value={state.spreadPct}
                onChange={(e) => setState((s) => ({ ...s, spreadPct: e.target.value }))}
                className={INPUT_CLASS}
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{t('bots.wizard.grid.capitalPorNivel')}</span>
            <input
              type="number"
              min="0"
              step="any"
              value={state.capitalPorNivel}
              onChange={(e) => setState((s) => ({ ...s, capitalPorNivel: e.target.value }))}
              className={INPUT_CLASS}
              placeholder={t('bots.wizard.grid.capitalPorNivelPlaceholder')}
            />
          </label>
          <p className="text-xs text-text-tertiary">{t('bots.wizard.grid.note')}</p>
        </div>
      )}

      {step === 3 && state.estrategia === 'SMA' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-secondary">{t('bots.wizard.sma.corta')}</span>
              <input
                type="number"
                min="1"
                value={state.smaCorta}
                onChange={(e) => setState((s) => ({ ...s, smaCorta: e.target.value }))}
                className={INPUT_CLASS}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-text-secondary">{t('bots.wizard.sma.larga')}</span>
              <input
                type="number"
                min="2"
                value={state.smaLarga}
                onChange={(e) => setState((s) => ({ ...s, smaLarga: e.target.value }))}
                className={INPUT_CLASS}
              />
            </label>
          </div>
          {smaInvalid && <p className="text-xs text-negative">{t('bots.wizard.sma.invalid')}</p>}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{t('bots.wizard.sma.timeframe')}</span>
            <select
              value={state.interval}
              onChange={(e) => setState((s) => ({ ...s, interval: e.target.value }))}
              className={INPUT_CLASS}
            >
              <option value="1h">{t('bots.wizard.sma.tf1h')}</option>
              <option value="4h">{t('bots.wizard.sma.tf4h')}</option>
              <option value="1d">{t('bots.wizard.sma.tf1d')}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-secondary">{t('bots.wizard.sma.monto')}</span>
            <input
              type="number"
              min="0"
              step="any"
              value={state.montoPorOrdenSma}
              onChange={(e) => setState((s) => ({ ...s, montoPorOrdenSma: e.target.value }))}
              className={INPUT_CLASS}
              placeholder={String(Math.max(1, Math.round(capitalNum * 0.2 || 20)))}
            />
          </label>
        </div>
      )}

      {formError && <p className="mt-4 text-sm text-negative">{formError}</p>}

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => (step === 1 ? onClose() : setStep((s) => (s - 1) as 1 | 2))}
          disabled={submitting}
        >
          {step === 1 ? t('bots.wizard.cancel') : t('bots.wizard.back')}
        </Button>
        {step < 3 ? (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setStep((s) => (s + 1) as 2 | 3)}
            disabled={step === 1 ? !state.estrategia : !step2Valid}
          >
            {t('bots.wizard.continue')}
          </Button>
        ) : (
          <Button variant="primary" size="sm" onClick={handleSubmit} loading={submitting} disabled={smaInvalid}>
            {t('bots.wizard.submit')}
          </Button>
        )}
      </div>
    </ModalShell>
  )
}

// ---------------------------------------------------------------------------
// Detalle de bot (equity curve completa + trades + acciones)
// ---------------------------------------------------------------------------

function BotDetailModal({
  bot,
  onClose,
  onChanged,
  onDeleted,
}: {
  bot: Bot
  onClose: () => void
  onChanged: (bot: Bot) => void
  onDeleted: (id: number) => void
}): JSX.Element {
  const { t } = useTranslation()
  const [trades, setTrades] = useState<Trade[] | null>(null)
  const [equity, setEquity] = useState<EquityPoint[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [toggling, setToggling] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    Promise.all([fetchBotTrades(bot.id), fetchBotEquity(bot.id)])
      .then(([tradesData, equityData]) => {
        if (cancelled) return
        setTrades(tradesData)
        setEquity(equityData)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(err instanceof ApiError ? err.message : t('bots.detail.loadError'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bot.id])

  async function handleToggleEstado(): Promise<void> {
    setToggling(true)
    setActionError(null)
    try {
      const updated = await setBotEstado(bot.id, bot.estado === 'activo' ? 'pausado' : 'activo')
      onChanged(updated)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : t('bots.detail.toggleError'))
    } finally {
      setToggling(false)
    }
  }

  async function handleDelete(): Promise<void> {
    setDeleting(true)
    setActionError(null)
    try {
      await deleteBot(bot.id)
      onDeleted(bot.id)
      onClose()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : t('bots.detail.deleteError'))
      setDeleting(false)
    }
  }

  const tradeColumns = useMemo<Column<Trade>[]>(
    () => [
      {
        key: 'timestamp',
        header: t('bots.detail.columns.fecha'),
        cell: (row) => <span className="text-text-tertiary">{new Date(row.timestamp).toLocaleString('es-AR')}</span>,
      },
      {
        key: 'tipo',
        header: t('bots.detail.columns.tipo'),
        cell: (row) => (
          <Badge variant={row.tipo === 'compra' ? 'success' : 'danger'} size="sm">
            {row.tipo === 'compra' ? t('bots.detail.tipo.compra') : t('bots.detail.tipo.venta')}
          </Badge>
        ),
      },
      { key: 'precio', header: t('bots.detail.columns.precio'), align: 'right', cell: (row) => formatUsd(row.precio) },
      {
        key: 'cantidad',
        header: t('bots.detail.columns.cantidad'),
        align: 'right',
        cell: (row) => formatCantidad(row.cantidad),
      },
    ],
    [t],
  )

  return (
    <ModalShell onClose={onClose} labelledBy="bot-detail-title" maxWidth="max-w-3xl">
      <div className="flex items-start justify-between gap-3 pr-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="bot-detail-title" className="font-display truncate text-lg font-semibold text-text-primary">
              {bot.nombre}
            </h2>
            <Badge variant="info" size="sm">
              {t(ESTRATEGIA_LABEL_KEY[bot.estrategia])}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-text-tertiary">
            {bot.par} · {t('bots.detail.createdAt', { date: new Date(bot.creado_at).toLocaleString('es-AR') })}
          </p>
        </div>
        <Badge variant={bot.estado === 'activo' ? 'success' : 'neutral'} size="sm" live={bot.estado === 'activo'}>
          {bot.estado === 'activo' ? t('bots.estado.activo') : t('bots.estado.pausado')}
        </Badge>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t('common.close')}
        className="absolute right-4 top-4 rounded-md p-1.5 text-text-tertiary transition-colors duration-150 hover:bg-surface-2/60 hover:text-text-primary"
      >
        <IconClose className="h-5 w-5" />
      </button>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <Card glow="none" className="flex flex-col gap-1">
          <span className="text-xs text-text-tertiary">{t('bots.pnl')}</span>
          <PnlText usd={bot.pnl_usd} pct={bot.pnl_pct} />
        </Card>
        <Card glow="none" className="flex flex-col gap-1">
          <span className="text-xs text-text-tertiary">{t('bots.detail.capitalInicial')}</span>
          <span className="text-sm font-medium tabular-nums text-text-primary">{formatUsd(bot.capital_inicial)}</span>
        </Card>
        <Card glow="none" className="flex flex-col gap-1">
          <span className="text-xs text-text-tertiary">{t('bots.detail.cashDisponible')}</span>
          <span className="text-sm font-medium tabular-nums text-text-primary">{formatUsd(bot.capital_actual)}</span>
        </Card>
        <Card glow="none" className="flex flex-col gap-1">
          <span className="text-xs text-text-tertiary">{t('bots.detail.holding')}</span>
          <span className="text-sm font-medium tabular-nums text-text-primary">{formatCantidad(bot.cantidad_total)}</span>
        </Card>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
          {t('bots.detail.equityCurve')}
        </p>
        {loading ? <Skeleton variant="block" className="h-64 w-full" /> : <EquityChart data={equity ?? []} />}
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-tertiary">
          {t('bots.detail.tradesHistory')}
        </p>
        <Table
          data={trades ?? []}
          columns={tradeColumns}
          rowKey={(row) => row.id}
          loading={loading}
          pageSize={8}
          emptyTitle={t('bots.detail.noTrades')}
          emptyDescription={t('bots.detail.noTradesDesc')}
        />
      </div>

      {loadError && <p className="mt-3 text-sm text-negative">{loadError}</p>}
      {actionError && <p className="mt-3 text-sm text-negative">{actionError}</p>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle pt-4">
        <Button variant="secondary" size="sm" onClick={handleToggleEstado} loading={toggling}>
          {bot.estado === 'activo' ? t('bots.detail.pausar') : t('bots.detail.reanudar')}
        </Button>
        {confirmingDelete ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-tertiary">{t('bots.detail.confirmDelete')}</span>
            <Button variant="secondary" size="sm" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
              {t('common.cancel')}
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>
              {t('common.confirm')}
            </Button>
          </div>
        ) : (
          <Button variant="danger" size="sm" onClick={() => setConfirmingDelete(true)}>
            {t('bots.detail.eliminar')}
          </Button>
        )}
      </div>
    </ModalShell>
  )
}

// ---------------------------------------------------------------------------
// Lista de bots
// ---------------------------------------------------------------------------

function BotCard({ bot, onOpen }: { bot: Bot; onOpen: () => void }): JSX.Element {
  const { t } = useTranslation()
  const valorTotal = bot.capital_actual + bot.cantidad_total * (bot.precio_actual ?? 0)
  return (
    <Card glow="violet" className="flex cursor-pointer flex-col gap-4" onClick={onOpen}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-medium text-text-primary">{bot.nombre}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge variant="info" size="sm">
              {t(ESTRATEGIA_LABEL_KEY[bot.estrategia])}
            </Badge>
            <span className="text-xs text-text-tertiary">{bot.par}</span>
          </div>
        </div>
        <Badge variant={bot.estado === 'activo' ? 'success' : 'neutral'} size="sm" live={bot.estado === 'activo'}>
          {bot.estado === 'activo' ? t('bots.estado.activo') : t('bots.estado.pausado')}
        </Badge>
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-text-tertiary">{t('bots.pnl')}</p>
          <PnlText usd={bot.pnl_usd} pct={bot.pnl_pct} />
        </div>
        <div className="text-right">
          <p className="text-xs text-text-tertiary">{t('bots.valorTotal')}</p>
          <p className="text-sm tabular-nums text-text-secondary">{formatUsd(valorTotal)}</p>
        </div>
      </div>

      <MiniEquityChart data={bot.equity_curve} />
    </Card>
  )
}

function BotCardSkeleton(): JSX.Element {
  return (
    <Card glow="none" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton lines={2} className="w-2/3" />
        <Skeleton variant="text" className="w-14" />
      </div>
      <div className="flex items-end justify-between gap-3">
        <Skeleton variant="text" className="w-20" />
        <Skeleton variant="text" className="w-16" />
      </div>
      <Skeleton variant="block" className="h-12 w-full" />
    </Card>
  )
}

export function Bots(): JSX.Element {
  const { t } = useTranslation()
  const [bots, setBots] = useState<Bot[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedBotId, setSelectedBotId] = useState<number | null>(null)

  const load = useCallback(async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true)
    setError(null)
    try {
      const data = await fetchBots()
      setBots(data)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.connectionError'))
    } finally {
      if (!opts.silent) setLoading(false)
    }
  }, [t])

  useEffect(() => {
    load()
  }, [load])

  // Polling cada 15s, sin WebSocket -- refresco silencioso (no dispara el skeleton).
  useEffect(() => {
    const timer = window.setInterval(() => load({ silent: true }), REFRESH_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [load])

  const selectedBot = useMemo(() => bots?.find((b) => b.id === selectedBotId) ?? null, [bots, selectedBotId])

  function handleCreated(bot: Bot): void {
    setBots((prev) => (prev ? [bot, ...prev] : [bot]))
  }

  function handleChanged(bot: Bot): void {
    setBots((prev) => prev?.map((b) => (b.id === bot.id ? bot : b)) ?? prev)
  }

  function handleDeleted(id: number): void {
    setBots((prev) => prev?.filter((b) => b.id !== id) ?? prev)
    setSelectedBotId((cur) => (cur === id ? null : cur))
  }

  if (error && !bots) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center">
        <PulseIcon variant="flat" className="h-6 w-16 text-text-muted" />
        <div>
          <h2 className="font-display text-lg font-medium text-text-primary">{t('bots.loadErrorTitle')}</h2>
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
      <PaperTradingBanner />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display flex items-center gap-2 text-2xl font-semibold text-text-primary">
            <IconBots className="h-6 w-6 text-violet" />
            {t('bots.title')}
          </h1>
          <p className="mt-1 text-sm text-text-tertiary">{t('bots.subtitle')}</p>
        </div>
        <Button variant="primary" onClick={() => setWizardOpen(true)}>
          {t('bots.createBot')}
        </Button>
      </div>

      {error && bots && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-negative/25 bg-negative/5 px-4 py-3">
          <p className="text-sm text-negative">{t('common.updateError', { error })}</p>
          <Button variant="secondary" size="sm" onClick={() => load()}>
            {t('common.retry')}
          </Button>
        </div>
      )}

      {loading && !bots ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <BotCardSkeleton key={i} />
          ))}
        </div>
      ) : bots && bots.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bots.map((bot) => (
            <BotCard key={bot.id} bot={bot} onOpen={() => setSelectedBotId(bot.id)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border-subtle py-16 text-center">
          <PulseIcon variant="flat" className="h-6 w-16 text-text-muted" />
          <div>
            <p className="font-display text-sm font-medium text-text-secondary">{t('bots.emptyTitle')}</p>
            <p className="mt-1 text-xs text-text-muted">{t('bots.emptyDescription')}</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setWizardOpen(true)}>
            {t('bots.createFirst')}
          </Button>
        </div>
      )}

      <AnimatePresence>
        {wizardOpen && <CreateBotWizard onClose={() => setWizardOpen(false)} onCreated={handleCreated} />}
      </AnimatePresence>
      <AnimatePresence>
        {selectedBot && (
          <BotDetailModal
            key={selectedBot.id}
            bot={selectedBot}
            onClose={() => setSelectedBotId(null)}
            onChanged={handleChanged}
            onDeleted={handleDeleted}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default Bots
