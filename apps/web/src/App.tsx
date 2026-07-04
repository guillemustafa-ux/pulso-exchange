import { Suspense, lazy } from 'react'
import type { JSX } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Layout } from './components/layout/Layout'
import { NAV_ITEMS } from './components/layout/nav-items'
import { AIContextProvider } from './context/AIContext'
import { Spinner } from './components/ui/Spinner'
import { Home } from './pages/Home'

// Code-splitting por página: Home (landing) va en el bundle principal, el
// resto se carga on-demand -- evita que RainbowKit/wagmi/lightweight-charts/
// recharts de páginas que el usuario nunca visita infle el chunk inicial.
const Market = lazy(() => import('./pages/Market'))
const Earn = lazy(() => import('./pages/Earn'))
const DeFi = lazy(() => import('./pages/DeFi'))
const Staking = lazy(() => import('./pages/Staking'))
const Trends = lazy(() => import('./pages/Trends'))
const Bots = lazy(() => import('./pages/Bots'))
const Security = lazy(() => import('./pages/Security'))
const Education = lazy(() => import('./pages/Education'))

/** Fallback de `<Suspense>` mientras baja el chunk de la página -- mismo
 * Spinner de marca que el resto de la app, nunca un blank screen. */
function PageFallback(): JSX.Element {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner size="lg" color="violet" label={t('common.loading')} />
    </div>
  )
}

/** Nav item cuyo `path` matchea el pathname actual (incluye subrutas, ej. `/market/:id`). */
function resolveActiveId(pathname: string): string {
  const match = NAV_ITEMS.find(
    (item) => item.path && (pathname === item.path || pathname.startsWith(`${item.path}/`)),
  )
  return match?.id ?? ''
}

function App(): JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const activeId = resolveActiveId(location.pathname)

  function handleNavigate(id: string): void {
    const item = NAV_ITEMS.find((i) => i.id === id)
    // Módulos sin página propia todavía (DeFi, Earn, etc.) vuelven a Home, donde
    // aparecen como cards "Próximamente".
    navigate(item?.path ?? '/')
  }

  return (
    <AIContextProvider>
      <Layout activeId={activeId} onNavigate={handleNavigate}>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/market/:id?" element={<Market />} />
            <Route path="/earn" element={<Earn />} />
            <Route path="/defi" element={<DeFi />} />
            <Route path="/staking" element={<Staking />} />
            <Route path="/trends" element={<Trends />} />
            <Route path="/bots" element={<Bots />} />
            <Route path="/security" element={<Security />} />
            <Route path="/education/:lessonId?" element={<Education />} />
          </Routes>
        </Suspense>
      </Layout>
    </AIContextProvider>
  )
}

export default App
