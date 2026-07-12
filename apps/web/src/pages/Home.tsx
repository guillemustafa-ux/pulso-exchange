import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PulsoLogo } from '../components/layout/Layout'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { PulseIcon } from '../components/icons/PulseIcon'
import { HowItWorksModal } from '../components/HowItWorksModal'
import { fetchTop100 } from '../services/api'
import type { CoinMarketItem } from '../services/api'
import { formatPercent, formatUsd } from '../lib/format'
import { cn } from '../lib/cn'

const PREVIEW_MODULES: { id: string; labelKey: string; descKey: string; path: string }[] = [
  { id: 'mercado', labelKey: 'home.modules.mercado', descKey: 'home.modules.mercadoDesc', path: '/market' },
  { id: 'defi', labelKey: 'home.modules.defi', descKey: 'home.modules.defiDesc', path: '/defi' },
  { id: 'staking', labelKey: 'home.modules.staking', descKey: 'home.modules.stakingDesc', path: '/staking' },
]

/** Mini-fila del preview de Mercado: logo, símbolo, precio y 24h% coloreado. */
function PreviewRow({ coin }: { coin: CoinMarketItem }): JSX.Element {
  const pct = coin.price_change_percentage_24h_in_currency ?? coin.price_change_percentage_24h
  const positive = (pct ?? 0) >= 0
  return (
    <li className="flex items-center gap-2 text-sm">
      {coin.image ? <img src={coin.image} alt="" className="h-5 w-5 rounded-full" loading="lazy" /> : null}
      <span className="font-medium uppercase text-text-primary">{coin.symbol}</span>
      <span className="ml-auto tabular-nums text-text-secondary">{formatUsd(coin.current_price)}</span>
      {pct === null || pct === undefined || Number.isNaN(pct) ? (
        <span className="text-text-muted">—</span>
      ) : (
        <span className={cn('inline-flex items-center gap-1 tabular-nums', positive ? 'text-positive' : 'text-negative')}>
          <span aria-hidden="true">{positive ? '▲' : '▼'}</span>
          {formatPercent(pct)}
        </span>
      )}
    </li>
  )
}

export function Home(): JSX.Element {
  const navigate = useNavigate()
  const { t } = useTranslation()
  // Preview one-shot del top 3 (sin polling: la landing es un teaser, el dato
  // vivo está en /market). Si falla, la card degrada al texto descriptivo.
  const [top3, setTop3] = useState<CoinMarketItem[] | null>(null)
  const [previewFailed, setPreviewFailed] = useState(false)
  const [howOpen, setHowOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchTop100()
      .then((coins) => {
        if (!cancelled) setTop3(coins.slice(0, 3))
      })
      .catch(() => {
        if (!cancelled) setPreviewFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-16">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center gap-6 pb-4 pt-10 text-center md:pt-16"
      >
        <PulsoLogo className="scale-125 md:scale-[1.6]" iconClassName="h-6 w-11" />

        <h1 className="font-display max-w-2xl text-3xl font-semibold tracking-tight text-text-primary md:text-5xl">
          {t('home.title')}
        </h1>
        <p className="max-w-xl text-balance text-sm text-text-secondary md:text-base">{t('home.subtitle')}</p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant="info" size="md" live>
            {t('home.badgeLiveData')}
          </Badge>
          <Badge variant="neutral" size="md">
            {t('home.badgeSepolia')}
          </Badge>
          <Badge variant="success" size="md">
            {t('home.badgePaperTrading')}
          </Badge>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" size="lg" onClick={() => navigate('/market')}>
            {t('home.ctaExplore')}
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setHowOpen(true)}>
            {t('home.ctaHowItWorks')}
          </Button>
        </div>
      </motion.section>

      <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {PREVIEW_MODULES.map((module, i) => {
          const label = t(module.labelKey)
          const isMarketPreview = module.id === 'mercado'
          return (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card glow="violet" onClick={() => navigate(module.path)} className="cursor-pointer">
                <CardHeader>
                  <CardTitle>{label}</CardTitle>
                </CardHeader>
                {isMarketPreview && top3 ? (
                  <ul className="flex flex-col gap-2.5">
                    {top3.map((coin) => (
                      <PreviewRow key={coin.id} coin={coin} />
                    ))}
                  </ul>
                ) : isMarketPreview && !previewFailed ? (
                  <Skeleton lines={3} />
                ) : (
                  <p className="text-sm text-text-secondary">{t(module.descKey)}</p>
                )}
              </Card>
            </motion.div>
          )
        })}
      </section>

      <footer className="flex items-center justify-center gap-2 pb-10 text-text-muted">
        <PulseIcon variant="flat" className="h-4 w-10" />
        <span className="text-xs">{t('home.footerTag')}</span>
      </footer>

      <HowItWorksModal
        open={howOpen}
        onClose={() => setHowOpen(false)}
        onExplore={() => {
          setHowOpen(false)
          navigate('/market')
        }}
      />
    </div>
  )
}

export default Home
