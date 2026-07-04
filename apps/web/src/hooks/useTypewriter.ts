import { useEffect, useState } from 'react'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

const MS_PER_CHAR = 12
/** Tope de duración total -- para respuestas largas, no queremos que tipear se sienta lento. */
const MAX_DURATION_MS = 2500

/**
 * Revela `text` de a poco (efecto máquina de escribir) para las respuestas
 * del AIAssistant. Respeta `prefers-reduced-motion`: si está activo, muestra
 * el texto completo de una sin animar.
 */
export function useTypewriter(text: string, active: boolean): string {
  const reducedMotion = usePrefersReducedMotion()
  const [display, setDisplay] = useState(() => (active && !reducedMotion ? '' : text))

  useEffect(() => {
    if (!active || reducedMotion) {
      setDisplay(text)
      return
    }
    if (!text) {
      setDisplay('')
      return
    }

    setDisplay('')
    const stepMs = Math.min(MS_PER_CHAR, MAX_DURATION_MS / text.length)
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setDisplay(text.slice(0, i))
      if (i >= text.length) window.clearInterval(id)
    }, stepMs)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, active, reducedMotion])

  return display
}
