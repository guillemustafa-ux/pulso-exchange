import { useEffect, useRef, useState } from 'react'
import type { FormEvent, JSX, KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/cn'
import { useAIContext } from '../context/AIContext'
import { useSection } from '../hooks/useSection'
import type { Section } from '../hooks/useSection'
import { useTypewriter } from '../hooks/useTypewriter'
import { ApiError, askAI } from '../services/api'
import { Button } from './ui/Button'
import { Spinner } from './ui/Spinner'
import { IconChat, IconClose } from './icons/Icon'

/** Keys de traducción de las preguntas rápidas sugeridas por sección (PROMPT.md) -- las
 * secciones sin preguntas propias (`earn`, `general`) no tienen key y caen al array vacío. */
const QUICK_QUESTIONS_KEY: Partial<Record<Section, string>> = {
  market: 'aiAssistant.quickQuestions.market',
  staking: 'aiAssistant.quickQuestions.staking',
  defi: 'aiAssistant.quickQuestions.defi',
  bots: 'aiAssistant.quickQuestions.bots',
  trends: 'aiAssistant.quickQuestions.trends',
}

type ChatRole = 'user' | 'assistant' | 'error'

interface ChatMessage {
  id: string
  role: ChatRole
  content: string
}

let messageSeq = 0
function nextMessageId(): string {
  messageSeq += 1
  return `msg-${messageSeq}`
}

function ChatBubble({ message }: { message: ChatMessage }): JSX.Element {
  const isUser = message.role === 'user'
  const isError = message.role === 'error'
  const typed = useTypewriter(message.content, message.role === 'assistant')
  const shown = isUser || isError ? message.content : typed

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm leading-relaxed',
          isUser && 'bg-violet/15 text-text-primary',
          isError && 'border border-negative/25 bg-negative/5 text-negative',
          !isUser && !isError && 'bg-surface-2/70 text-text-secondary',
        )}
      >
        {shown}
      </div>
    </div>
  )
}

/**
 * Asistente de IA contextual: botón flotante + drawer lateral. Montado una
 * sola vez en el Layout (ver `components/layout/Layout.tsx`) para estar
 * disponible en toda la app. Lee la sección actual (`useSection`) y el
 * snapshot de datos de la página (`useAIContext`, publicado por cada página
 * con `useSetPageContext`) para pasarlos como `contexto` a `POST /api/ai/ask`.
 */
export function AIAssistant(): JSX.Element {
  const { t } = useTranslation()
  const { contexto } = useAIContext()
  const section = useSection()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const quickQuestionsKey = QUICK_QUESTIONS_KEY[section]
  const quickQuestions = quickQuestionsKey ? (t(quickQuestionsKey, { returnObjects: true }) as string[]) : []

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function handleAsk(pregunta: string): Promise<void> {
    const trimmed = pregunta.trim()
    if (!trimmed || loading) return

    setMessages((prev) => [...prev, { id: nextMessageId(), role: 'user', content: trimmed }])
    setInputValue('')
    setLoading(true)
    try {
      const res = await askAI(trimmed, section, contexto)
      setMessages((prev) => [...prev, { id: nextMessageId(), role: 'assistant', content: res.respuesta }])
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t('aiAssistant.connectionError')
      setMessages((prev) => [...prev, { id: nextMessageId(), role: 'error', content: message }])
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: FormEvent): void {
    e.preventDefault()
    void handleAsk(inputValue)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleAsk(inputValue)
    }
  }

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="ai-fab"
            type="button"
            onClick={() => setOpen(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            aria-label={t('aiAssistant.openAria')}
            className={cn(
              'fixed bottom-20 right-4 z-modal flex h-14 w-14 items-center justify-center rounded-full',
              'bg-brand-gradient text-white shadow-glow-magenta',
              'transition-[filter] duration-200 hover:brightness-110 active:brightness-95',
              'focus-visible:outline-none focus-visible:shadow-focus-ring',
              'md:bottom-6 md:right-8',
            )}
          >
            <IconChat className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="ai-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-modal bg-surface-overlay"
            />
            <motion.div
              key="ai-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              role="dialog"
              aria-modal="true"
              aria-label={t('aiAssistant.panelAria')}
              className="fixed inset-y-0 right-0 z-modal flex w-full flex-col border-l border-border-subtle bg-surface-1/95 backdrop-blur-xl sm:max-w-sm"
            >
              <header className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet/10 text-violet">
                    <IconChat className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-medium text-text-primary">{t('aiAssistant.headerTitle')}</p>
                    <p className="truncate text-xs text-text-tertiary">
                      {t('aiAssistant.headerSubtitle', { section: t(`aiAssistant.sectionLabel.${section}`) })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={t('aiAssistant.closeAria')}
                  className="shrink-0 rounded-md p-1.5 text-text-tertiary hover:text-text-primary"
                >
                  <IconClose className="h-5 w-5" />
                </button>
              </header>

              <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4">
                {messages.length === 0 ? (
                  <p className="text-sm text-text-tertiary">{t('aiAssistant.emptyMessage')}</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {messages.map((msg) => (
                      <ChatBubble key={msg.id} message={msg} />
                    ))}
                  </div>
                )}
                {loading && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-text-tertiary">
                    <Spinner size="sm" color="magenta" label={t('aiAssistant.thinking')} />
                    {t('aiAssistant.thinkingDots')}
                  </div>
                )}
              </div>

              {quickQuestions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 border-t border-border-subtle px-4 py-3">
                  {quickQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      disabled={loading}
                      onClick={() => void handleAsk(q)}
                      className={cn(
                        'rounded-full border border-border-subtle px-3 py-1.5 text-xs text-text-secondary',
                        'transition-colors duration-150 hover:border-border-default hover:text-text-primary',
                        'disabled:pointer-events-none disabled:opacity-40',
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-border-subtle px-4 py-3">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={t('aiAssistant.inputPlaceholder')}
                  disabled={loading}
                  className={cn(
                    'h-10 max-h-24 flex-1 resize-none rounded-md border border-border-default bg-surface-2/60 px-3 py-2',
                    'text-sm text-text-primary placeholder:text-text-muted',
                    'focus:border-border-focus focus:outline-none disabled:opacity-40',
                  )}
                />
                <Button type="submit" size="md" loading={loading} disabled={!inputValue.trim()}>
                  {t('aiAssistant.submit')}
                </Button>
              </form>

              <p className="border-t border-border-subtle px-4 py-2 text-center text-[11px] text-text-muted">
                {t('aiAssistant.footerDisclaimer')}
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default AIAssistant
