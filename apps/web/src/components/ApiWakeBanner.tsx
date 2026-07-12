import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { Spinner } from './ui/Spinner'
import { API_SLOW_EVENT, API_AWAKE_EVENT } from '../services/api'

/**
 * Banner honesto de cold start: aparece cuando algún GET a la API supera el
 * umbral de lentitud (free tier despertando) y se esconde con la primera
 * respuesta del servidor. Sin esto el usuario mira skeletons mudos ~1 minuto
 * y asume que la app está rota.
 */
export function ApiWakeBanner(): JSX.Element | null {
  const { t } = useTranslation()
  const [waking, setWaking] = useState(false)

  useEffect(() => {
    const onSlow = (): void => setWaking(true)
    const onAwake = (): void => setWaking(false)
    window.addEventListener(API_SLOW_EVENT, onSlow)
    window.addEventListener(API_AWAKE_EVENT, onAwake)
    return () => {
      window.removeEventListener(API_SLOW_EVENT, onSlow)
      window.removeEventListener(API_AWAKE_EVENT, onAwake)
    }
  }, [])

  if (!waking) return null

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-border-subtle bg-surface-1/90 px-4 py-2 text-xs text-text-secondary backdrop-blur-xl"
    >
      <Spinner size="sm" color="violet" label={t('common.apiWaking')} />
      <span>{t('common.apiWaking')}</span>
    </div>
  )
}
