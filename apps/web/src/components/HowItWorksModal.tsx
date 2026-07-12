import { useEffect } from 'react'
import type { JSX } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Button } from './ui/Button'
import { IconClose } from './icons/Icon'

/**
 * Onboarding de la landing ("Cómo funciona"): qué es PULSO, qué hace cada
 * grupo de módulos y — con el mismo peso — qué NO es. La honestidad
 * non-custodial es parte del producto, no letra chica.
 */
export function HowItWorksModal({
  open,
  onClose,
  onExplore,
}: {
  open: boolean
  onClose: () => void
  onExplore: () => void
}): JSX.Element {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="hiw"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-modal flex items-center justify-center bg-surface-overlay p-4"
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hiw-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-xl border border-border-default bg-surface-1 p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 id="hiw-title" className="font-display text-lg font-semibold text-text-primary">
                {t('howItWorks.title')}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-text-tertiary hover:text-text-primary"
                aria-label={t('layout.close')}
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-5 text-sm text-text-secondary">{t('howItWorks.intro')}</p>

            <div className="flex flex-col gap-4">
              <section>
                <h3 className="mb-1 text-sm font-semibold text-text-primary">{t('howItWorks.realTimeTitle')}</h3>
                <p className="text-sm text-text-secondary">{t('howItWorks.realTimeBody')}</p>
              </section>
              <section>
                <h3 className="mb-1 text-sm font-semibold text-text-primary">{t('howItWorks.yourDataTitle')}</h3>
                <p className="text-sm text-text-secondary">{t('howItWorks.yourDataBody')}</p>
              </section>
              <section>
                <h3 className="mb-1 text-sm font-semibold text-text-primary">{t('howItWorks.learnTitle')}</h3>
                <p className="text-sm text-text-secondary">{t('howItWorks.learnBody')}</p>
              </section>
              <section className="rounded-lg border border-border-subtle bg-surface-2/50 p-3">
                <h3 className="mb-1 text-sm font-semibold text-text-primary">{t('howItWorks.notTitle')}</h3>
                <p className="text-sm text-text-secondary">{t('howItWorks.notBody')}</p>
              </section>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="primary" size="md" onClick={onExplore}>
                {t('home.ctaExplore')}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
