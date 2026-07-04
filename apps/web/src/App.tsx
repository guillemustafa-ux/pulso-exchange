import type { JSX } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { NAV_ITEMS } from './components/layout/nav-items'
import { AIContextProvider } from './context/AIContext'
import { Home } from './pages/Home'
import { Market } from './pages/Market'
import { Earn } from './pages/Earn'
import { DeFi } from './pages/DeFi'
import { Staking } from './pages/Staking'
import { Trends } from './pages/Trends'
import { Bots } from './pages/Bots'

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
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/market/:id?" element={<Market />} />
          <Route path="/earn" element={<Earn />} />
          <Route path="/defi" element={<DeFi />} />
          <Route path="/staking" element={<Staking />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/bots" element={<Bots />} />
        </Routes>
      </Layout>
    </AIContextProvider>
  )
}

export default App
