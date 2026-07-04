import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function getInitial(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia(QUERY).matches
}

/**
 * Refleja `prefers-reduced-motion` en vivo (no solo al montar) -- usado por
 * el typewriter del AIAssistant para saltear la animación de tipeo cuando
 * el usuario la desactivó a nivel SO.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(getInitial)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(QUERY)
    const handler = (e: MediaQueryListEvent): void => setReduced(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return reduced
}
