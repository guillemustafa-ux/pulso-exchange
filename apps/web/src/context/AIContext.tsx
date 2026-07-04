import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { JSX, ReactNode } from 'react'

export interface AIContextValue {
  /** Snapshot de datos visibles en la página actual (precios, protocolo seleccionado, config del bot, etc.). */
  contexto: Record<string, unknown>
  setContexto: (ctx: Record<string, unknown>) => void
}

const AIContextContext = createContext<AIContextValue | null>(null)

/**
 * El AIAssistant se monta una sola vez en el Layout, pero el `contexto` que
 * viaja a `/api/ai/ask` lo arma cada página según lo que tiene en pantalla.
 * Este Provider es el canal entre ambos: las páginas escriben con
 * `useSetPageContext`, el AIAssistant lee con `useAIContext`.
 */
export function AIContextProvider({ children }: { children: ReactNode }): JSX.Element {
  const [contexto, setContextoState] = useState<Record<string, unknown>>({})

  const setContexto = useCallback((ctx: Record<string, unknown>) => {
    setContextoState(ctx)
  }, [])

  const value = useMemo<AIContextValue>(() => ({ contexto, setContexto }), [contexto, setContexto])

  return <AIContextContext.Provider value={value}>{children}</AIContextContext.Provider>
}

export function useAIContext(): AIContextValue {
  const ctx = useContext(AIContextContext)
  if (!ctx) throw new Error('useAIContext debe usarse dentro de <AIContextProvider>')
  return ctx
}

/**
 * Hook que usa cada página para publicar su snapshot de datos visibles.
 * Se serializa para no reaccionar a objetos literales recreados en cada
 * render (comparación por contenido, no por identidad), y limpia el
 * contexto al desmontar para no arrastrarlo a otra sección.
 */
export function useSetPageContext(ctx: Record<string, unknown>): void {
  const { setContexto } = useAIContext()
  const serialized = JSON.stringify(ctx)

  useEffect(() => {
    setContexto(JSON.parse(serialized) as Record<string, unknown>)
    return () => setContexto({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized])
}
