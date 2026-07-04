import type { JSX } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { PulsoLogo } from '../components/layout/Layout'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { Spinner } from '../components/ui/Spinner'
import { PulseIcon } from '../components/icons/PulseIcon'

const PREVIEW_MODULES: { id: string; labelKey: string; sync: boolean; path?: string }[] = [
  { id: 'mercado', labelKey: 'home.modules.mercado', sync: true, path: '/market' },
  { id: 'defi', labelKey: 'home.modules.defi', sync: false },
  { id: 'staking', labelKey: 'home.modules.staking', sync: false },
]

export function Home(): JSX.Element {
  const navigate = useNavigate()
  const { t } = useTranslation()

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
          <Button variant="secondary" size="lg">
            {t('home.ctaHowItWorks')}
          </Button>
        </div>
      </motion.section>

      <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {PREVIEW_MODULES.map((module, i) => {
          const label = t(module.labelKey)
          return (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            >
              <Card
                glow="violet"
                onClick={module.path ? () => navigate(module.path!) : undefined}
                className={module.path ? 'cursor-pointer' : undefined}
              >
                <CardHeader>
                  <CardTitle>{label}</CardTitle>
                  {module.sync ? (
                    <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
                      <Spinner size="sm" color="violet" label={t('home.syncingLabel', { label })} />
                      {t('home.syncing')}
                    </span>
                  ) : (
                    <Badge variant="neutral" size="sm">
                      {t('home.comingSoon')}
                    </Badge>
                  )}
                </CardHeader>
                <Skeleton lines={3} />
              </Card>
            </motion.div>
          )
        })}
      </section>

      <footer className="flex items-center justify-center gap-2 pb-10 text-text-muted">
        <PulseIcon variant="flat" className="h-4 w-10" />
        <span className="text-xs">{t('home.footerTag')}</span>
      </footer>
    </div>
  )
}

export default Home
