import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './locales/es.json'
import en from './locales/en.json'
import pt from './locales/pt.json'

export const LANGUAGE_STORAGE_KEY = 'pulso-lang'

/** Idiomas soportados por la UI. Fuente única de verdad para el selector y la persistencia. */
export const SUPPORTED_LANGUAGES = ['es', 'en', 'pt'] as const
export type Language = (typeof SUPPORTED_LANGUAGES)[number]

function isSupported(value: string | null): value is Language {
  return value === 'es' || value === 'en' || value === 'pt'
}

/** Idioma persistido por el usuario, o 'es' por defecto (público objetivo: Argentina). */
function readStoredLanguage(): Language {
  if (typeof window === 'undefined') return 'es'
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isSupported(stored) ? stored : 'es'
  } catch {
    return 'es'
  }
}

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
    pt: { translation: pt },
  },
  lng: readStoredLanguage(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  returnEmptyString: false,
})

/** Cambia el idioma activo y lo persiste en localStorage bajo la misma key que la detección inicial. */
export function setLanguage(lang: Language): void {
  void i18n.changeLanguage(lang)
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
  } catch {
    // Storage lleno o deshabilitado (modo privado) -- el idioma sigue activo en memoria.
  }
}

export default i18n
