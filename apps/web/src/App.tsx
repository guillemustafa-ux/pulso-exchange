import type { JSX } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { NAV_ITEMS } from './components/layout/nav-items'
import { Home } from './pages/Home'
import { Market } from './pages/Market'

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
    <Layout activeId={activeId} onNavigate={handleNavigate}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/market/:id?" element={<Market />} />
      </Routes>
    </Layout>
  )
}

export default App
