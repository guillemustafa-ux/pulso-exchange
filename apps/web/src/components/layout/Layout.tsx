import { useState } from 'react'
import type { JSX, ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/cn'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { PulseIcon } from '../icons/PulseIcon'
import { IconMore, IconWallet, IconClose } from '../icons/Icon'
import { NAV_ITEMS, MOBILE_PRIMARY_IDS } from './nav-items'
import type { NavItem } from './nav-items'

export interface LayoutProps {
  children: ReactNode
  /** Id del NavItem activo. Sin router todavía (Día 1): estado controlado por quien use Layout. */
  activeId?: string
  onNavigate?: (id: string) => void
  className?: string
}

/**
 * Isotipo de marca: PulseIcon (traza de latido) + wordmark en gradiente
 * violeta→magenta. Reusado en el sidebar, el header mobile y la pantalla
 * de inicio.
 */
export function PulsoLogo({ className, iconClassName }: { className?: string; iconClassName?: string }): JSX.Element {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <PulseIcon className={cn('h-5 w-9 text-violet', iconClassName)} />
      <span className="font-display bg-brand-gradient bg-clip-text text-lg font-bold tracking-tight text-transparent">
        PULSO
      </span>
    </div>
  )
}

function NavButton({
  item,
  active,
  onClick,
  compact = false,
}: {
  item: NavItem
  active: boolean
  onClick: () => void
  compact?: boolean
}): JSX.Element {
  const Icon = item.icon
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center rounded-md text-sm font-medium transition-colors duration-150',
        compact
          ? 'flex-col justify-center gap-1 px-2 py-1.5 text-[11px]'
          : 'gap-3 px-3 py-2.5',
        active ? 'text-text-primary' : 'text-text-tertiary hover:text-text-secondary',
      )}
    >
      {active && !compact && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-brand-gradient" />
      )}
      {active && (
        <span
          className={cn(
            'absolute inset-0 -z-10 rounded-md bg-surface-2/70',
            !compact && 'ml-0',
          )}
        />
      )}
      <Icon className={cn(compact ? 'h-5 w-5' : 'h-[18px] w-[18px]', active && 'text-violet')} />
      <span className={compact ? '' : undefined}>{item.label}</span>
    </button>
  )
}

function Sidebar({ activeId, onNavigate }: { activeId: string; onNavigate: (id: string) => void }): JSX.Element {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[220px] shrink-0 flex-col border-r border-border-subtle bg-bg-void/40 backdrop-blur-xl md:flex">
      <div className="px-5 py-6">
        <PulsoLogo />
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        {NAV_ITEMS.map((item) => (
          <NavButton key={item.id} item={item} active={activeId === item.id} onClick={() => onNavigate(item.id)} />
        ))}
      </nav>
      <div className="border-t border-border-subtle p-4">
        <p className="px-1 text-[11px] leading-snug text-text-muted">
          Non-custodial · vos guardás tus claves. PULSO nunca las pide.
        </p>
      </div>
    </aside>
  )
}

function Header({ activeLabel }: { activeLabel: string | undefined }): JSX.Element {
  return (
    <header className="sticky top-0 z-sticky flex h-16 items-center justify-between gap-3 border-b border-border-subtle bg-bg-void/60 px-4 backdrop-blur-xl md:px-8">
      <div className="flex items-center gap-3 md:hidden">
        <PulsoLogo />
      </div>
      <h1 className="font-display hidden text-sm font-medium text-text-secondary md:block">{activeLabel}</h1>
      <div className="flex items-center gap-2">
        <Badge variant="neutral" size="sm" className="hidden sm:inline-flex">
          Sepolia Testnet
        </Badge>
        <Button variant="secondary" size="sm" className="gap-1.5">
          <IconWallet className="h-4 w-4" />
          <span className="hidden sm:inline">Conectar wallet</span>
        </Button>
      </div>
    </header>
  )
}

function BottomNav({ activeId, onNavigate }: { activeId: string; onNavigate: (id: string) => void }): JSX.Element {
  const [moreOpen, setMoreOpen] = useState(false)
  const primary = NAV_ITEMS.filter((item) => MOBILE_PRIMARY_IDS.includes(item.id))
  const rest = NAV_ITEMS.filter((item) => !MOBILE_PRIMARY_IDS.includes(item.id))
  const moreActive = rest.some((item) => item.id === activeId)

  return (
    <>
      <nav
        className={cn(
          'fixed inset-x-0 bottom-0 z-sticky flex items-stretch justify-around border-t border-border-subtle',
          'bg-bg-void/85 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden',
        )}
      >
        {primary.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            active={activeId === item.id}
            onClick={() => onNavigate(item.id)}
            compact
          />
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex flex-col items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium',
            moreActive ? 'text-violet' : 'text-text-tertiary',
          )}
        >
          <IconMore className="h-5 w-5" />
          <span>Más</span>
        </button>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-modal bg-surface-overlay md:hidden"
            />
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-0 bottom-0 z-modal rounded-t-xl border-t border-border-default bg-surface-1 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:hidden"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display text-sm font-medium text-text-primary">Más módulos</span>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="rounded-md p-1 text-text-tertiary hover:text-text-primary"
                  aria-label="Cerrar"
                >
                  <IconClose className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {rest.map((item) => {
                  const Icon = item.icon
                  const active = activeId === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onNavigate(item.id)
                        setMoreOpen(false)
                      }}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-md border border-border-subtle px-2 py-3 text-[11px] font-medium transition-colors',
                        active ? 'border-border-emphasis text-violet bg-surface-2/60' : 'text-text-tertiary hover:bg-surface-2/40',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

/**
 * Shell de la app: sidebar en desktop, bottom nav en mobile, header sticky
 * y fondo ambient (grid + starfield) compartido por todas las secciones.
 */
export function Layout({ children, activeId = 'mercado', onNavigate, className }: LayoutProps): JSX.Element {
  const [internalActive, setInternalActive] = useState(activeId)
  const currentActive = onNavigate ? activeId : internalActive
  const handleNavigate = onNavigate ?? setInternalActive
  const activeLabel = NAV_ITEMS.find((item) => item.id === currentActive)?.label

  return (
    <div className={cn('pulso-ambient flex min-h-dvh bg-transparent', className)}>
      <Sidebar activeId={currentActive} onNavigate={handleNavigate} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header activeLabel={activeLabel} />
        <main className="flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">{children}</main>
      </div>
      <BottomNav activeId={currentActive} onNavigate={handleNavigate} />
    </div>
  )
}
