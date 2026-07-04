import { useLocation } from 'react-router-dom'

/**
 * Secciones que el asistente de IA reconoce para elegir preguntas rápidas
 * sugeridas y taggear el `contexto` que viaja a `POST /api/ai/ask`.
 * `general` es el fallback (home, o cualquier ruta sin preguntas propias).
 */
export type Section = 'market' | 'staking' | 'defi' | 'bots' | 'trends' | 'earn' | 'general'

const SECTION_BY_PREFIX: ReadonlyArray<{ prefix: string; section: Section }> = [
  { prefix: '/market', section: 'market' },
  { prefix: '/staking', section: 'staking' },
  { prefix: '/defi', section: 'defi' },
  { prefix: '/bots', section: 'bots' },
  { prefix: '/trends', section: 'trends' },
  { prefix: '/earn', section: 'earn' },
]

/** Sección actual según el pathname de react-router (incluye subrutas, ej. `/market/:id`). */
export function useSection(): Section {
  const { pathname } = useLocation()
  const match = SECTION_BY_PREFIX.find(
    (entry) => pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  )
  return match?.section ?? 'general'
}
