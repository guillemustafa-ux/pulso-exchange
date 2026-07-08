import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/cn'
import { setLanguage, SUPPORTED_LANGUAGES, type Language } from '../i18n'

/** Etiqueta y aria-label por idioma, resueltos por clave i18n (misma en todos los locales). */
const LANG_KEYS: Record<Language, { label: string; aria: string }> = {
  es: { label: 'langSwitch.es', aria: 'langSwitch.switchToEs' },
  en: { label: 'langSwitch.en', aria: 'langSwitch.switchToEn' },
  pt: { label: 'langSwitch.pt', aria: 'langSwitch.switchToPt' },
}

/**
 * Selector ES | EN | PT discreto para el header -- persiste en localStorage
 * (`pulso-lang`, ver `src/i18n.ts`) y cambia el idioma activo de i18next.
 * No traduce: el contenido de las lecciones de Educación queda en español
 * (ver nota en el README) y las respuestas del asistente de IA responden en
 * el idioma de la pregunta, no del selector.
 */
export function LanguageSwitch(): JSX.Element {
  const { i18n, t } = useTranslation()
  const resolved = i18n.resolvedLanguage
  const current: Language = resolved === 'en' || resolved === 'pt' ? resolved : 'es'

  return (
    <div className="flex items-center rounded-md border border-border-default p-0.5 text-xs font-medium">
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLanguage(lang)}
          aria-pressed={current === lang}
          aria-label={t(LANG_KEYS[lang].aria)}
          className={cn(
            'rounded-sm px-2 py-1 transition-colors duration-150',
            current === lang ? 'bg-violet/15 text-text-primary' : 'text-text-tertiary hover:text-text-secondary',
          )}
        >
          {t(LANG_KEYS[lang].label)}
        </button>
      ))}
    </div>
  )
}

export default LanguageSwitch
