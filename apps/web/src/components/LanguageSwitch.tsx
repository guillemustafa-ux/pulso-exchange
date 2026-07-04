import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/cn'
import { setLanguage } from '../i18n'

/**
 * Selector ES | EN discreto para el header -- persiste en localStorage
 * (`pulso-lang`, ver `src/i18n.ts`) y cambia el idioma activo de i18next.
 * No traduce: el contenido de las lecciones de Educación queda en español
 * (ver nota en el README) y las respuestas del asistente de IA responden en
 * el idioma de la pregunta, no del selector.
 */
export function LanguageSwitch(): JSX.Element {
  const { i18n, t } = useTranslation()
  const current = i18n.resolvedLanguage === 'en' ? 'en' : 'es'

  return (
    <div className="flex items-center rounded-md border border-border-default p-0.5 text-xs font-medium">
      {(['es', 'en'] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLanguage(lang)}
          aria-pressed={current === lang}
          aria-label={lang === 'es' ? t('langSwitch.switchToEs') : t('langSwitch.switchToEn')}
          className={cn(
            'rounded-sm px-2 py-1 transition-colors duration-150',
            current === lang ? 'bg-violet/15 text-text-primary' : 'text-text-tertiary hover:text-text-secondary',
          )}
        >
          {lang === 'es' ? t('langSwitch.es') : t('langSwitch.en')}
        </button>
      ))}
    </div>
  )
}

export default LanguageSwitch
