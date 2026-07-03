import type { JSX } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { PulsoLogo } from '../components/layout/Layout'
import { Card, CardHeader, CardTitle } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Skeleton } from '../components/ui/Skeleton'
import { Spinner } from '../components/ui/Spinner'
import { PulseIcon } from '../components/icons/PulseIcon'

const PREVIEW_MODULES = [
  { id: 'mercado', label: 'Mercado — Top 100', sync: true, path: '/market' },
  { id: 'defi', label: 'DeFi — mejores protocolos', sync: false },
  { id: 'staking', label: 'Staking on-chain', sync: false },
]

export function Home(): JSX.Element {
  const navigate = useNavigate()

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
          El pulso del mercado cripto, en tu wallet.
        </h1>
        <p className="max-w-xl text-balance text-sm text-text-secondary md:text-base">
          Exchange non-custodial de demostración: precios en vivo, staking on-chain en Sepolia y
          bots de paper trading. Nunca custodiamos fondos ni pedimos tu seed.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant="info" size="md" live>
            Datos en vivo
          </Badge>
          <Badge variant="neutral" size="md">
            Sepolia Testnet
          </Badge>
          <Badge variant="success" size="md">
            Paper trading
          </Badge>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" size="lg" onClick={() => navigate('/market')}>
            Explorar el mercado
          </Button>
          <Button variant="secondary" size="lg">
            Cómo funciona
          </Button>
        </div>
      </motion.section>

      <section className="grid gap-4 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {PREVIEW_MODULES.map((module, i) => (
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
                <CardTitle>{module.label}</CardTitle>
                {module.sync ? (
                  <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
                    <Spinner size="sm" color="violet" label={`Sincronizando ${module.label}`} />
                    sincronizando
                  </span>
                ) : (
                  <Badge variant="neutral" size="sm">
                    Próximamente
                  </Badge>
                )}
              </CardHeader>
              <Skeleton lines={3} />
            </Card>
          </motion.div>
        ))}
      </section>

      <footer className="flex items-center justify-center gap-2 pb-10 text-text-muted">
        <PulseIcon variant="flat" className="h-4 w-10" />
        <span className="text-xs">Design system — Día 1</span>
      </footer>
    </div>
  )
}

export default Home
