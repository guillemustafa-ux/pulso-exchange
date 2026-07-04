import { useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { IconChevronLeft, IconChevronRight, IconEducation } from '../components/icons/Icon'
import { cn } from '../lib/cn'
import { useSetPageContext } from '../context/AIContext'
import { useEducationProgress } from '../hooks/useEducationProgress'
import type { ProgressState } from '../hooks/useEducationProgress'
import { LESSONS, getAdjacentLessons, getLessonById } from '../content/lessons'
import type { Lesson, QuizQuestion } from '../content/lessons'

/** Aprueba con 75% o más (3 de 4 preguntas) -- debe coincidir con useEducationProgress. */
const PASS_THRESHOLD = 0.75

/**
 * No hay plugin de tipografía (@tailwindcss/typography) instalado, así que
 * cada elemento markdown se mapea a mano a clases de PULSO -- mismo criterio
 * que el resto del design system (tokens vía clases Tailwind, nunca hex suelto).
 */
const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="font-display text-2xl font-semibold text-text-primary md:text-3xl">{children}</h1>
  ),
  h2: ({ children }) => <h2 className="mt-8 font-display text-lg font-semibold text-text-primary">{children}</h2>,
  p: ({ children }) => (
    <p className="mt-4 text-sm leading-relaxed text-text-secondary md:text-base">{children}</p>
  ),
  strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
  ul: ({ children }) => (
    <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-text-secondary md:text-base">
      {children}
    </ul>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-violet underline-offset-2 hover:underline"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[0.85em] text-text-primary">
      {children}
    </code>
  ),
}

function overallPercent(progress: ProgressState): number {
  if (LESSONS.length === 0) return 0
  const done = LESSONS.filter((lesson) => progress[lesson.id]?.quizPassed).length
  return Math.round((done / LESSONS.length) * 100)
}

function ProgressBar({ percent }: { percent: number }): JSX.Element {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-3">
      <div
        className="h-full rounded-full bg-brand-gradient transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

function lessonStatus(
  lesson: Lesson,
  progress: ProgressState,
): { labelKey: string; variant: 'success' | 'info' | 'neutral' } {
  const entry = progress[lesson.id]
  if (entry?.quizPassed) return { labelKey: 'education.status.completed', variant: 'success' }
  if (entry?.read) return { labelKey: 'education.status.inProgress', variant: 'info' }
  return { labelKey: 'education.status.notStarted', variant: 'neutral' }
}

function EducationIndex({
  progress,
  onOpenLesson,
}: {
  progress: ProgressState
  onOpenLesson: (id: string) => void
}): JSX.Element {
  const { t } = useTranslation()
  const percent = overallPercent(progress)
  const completedCount = LESSONS.filter((lesson) => progress[lesson.id]?.quizPassed).length

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <div className="flex items-center gap-2 text-text-tertiary">
          <IconEducation className="h-5 w-5" />
          <span className="text-xs uppercase tracking-wide">{t('education.moduleLabel')}</span>
        </div>
        <h1 className="mt-1 font-display text-2xl font-semibold text-text-primary">{t('education.title')}</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-tertiary">{t('education.subtitle')}</p>
      </div>

      <Card glow="none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium text-text-primary">{t('education.progressLabel')}</span>
          <span className="font-display text-sm font-semibold tabular-nums text-text-primary">
            {t('education.lessonsApproved', { done: completedCount, total: LESSONS.length })}
          </span>
        </div>
        <div className="mt-3">
          <ProgressBar percent={percent} />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {LESSONS.map((lesson) => {
          const status = lessonStatus(lesson, progress)
          return (
            <Card
              key={lesson.id}
              glow="violet"
              className="flex cursor-pointer flex-col"
              onClick={() => onOpenLesson(lesson.id)}
            >
              <CardHeader>
                <div className="min-w-0">
                  <span className="text-xs text-text-muted">{t('education.lessonN', { order: lesson.order })}</span>
                  <CardTitle className="mt-0.5">{lesson.title}</CardTitle>
                </div>
                <Badge variant={status.variant} size="sm">
                  {t(status.labelKey)}
                </Badge>
              </CardHeader>
              <CardDescription className="mt-0 flex-1">{lesson.summary}</CardDescription>
              <div className="mt-4 flex items-center justify-end gap-1 text-sm font-medium text-violet">
                {status.variant === 'success' ? t('education.review') : t('education.start')}
                <IconChevronRight className="h-4 w-4" />
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

type QuizAnswers = Record<number, number>

function QuizOption({
  option,
  isSelected,
  isCorrectOption,
  answered,
  onSelect,
}: {
  option: string
  isSelected: boolean
  isCorrectOption: boolean
  answered: boolean
  onSelect: () => void
}): JSX.Element {
  const state = !answered ? 'idle' : isCorrectOption ? 'correct' : isSelected ? 'incorrect' : 'idle'

  return (
    <button
      type="button"
      disabled={answered}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center justify-between gap-3 rounded-md border px-4 py-2.5 text-left text-sm transition-colors duration-200',
        state === 'idle' &&
          'border-border-default bg-surface-2/40 text-text-primary hover:border-border-emphasis',
        state === 'correct' && 'border-positive/50 bg-positive/10 text-positive',
        state === 'incorrect' && 'border-negative/50 bg-negative/10 text-negative',
        answered && 'cursor-default',
      )}
    >
      <span>{option}</span>
      {state === 'correct' && <span aria-hidden="true">✓</span>}
      {state === 'incorrect' && <span aria-hidden="true">✕</span>}
    </button>
  )
}

function QuizQuestionCard({
  question,
  index,
  selected,
  onSelect,
}: {
  question: QuizQuestion
  index: number
  selected: number | undefined
  onSelect: (optionIndex: number) => void
}): JSX.Element {
  const { t } = useTranslation()
  const answered = selected !== undefined
  const isCorrect = selected === question.correctIndex

  return (
    <Card glow="none">
      <p className="text-sm font-medium text-text-primary">
        {index + 1}. {question.question}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {question.options.map((option, optIndex) => (
          <QuizOption
            key={optIndex}
            option={option}
            isSelected={selected === optIndex}
            isCorrectOption={optIndex === question.correctIndex}
            answered={answered}
            onSelect={() => onSelect(optIndex)}
          />
        ))}
      </div>
      {answered && (
        <p className={cn('mt-3 text-xs leading-relaxed', isCorrect ? 'text-positive' : 'text-text-tertiary')}>
          {isCorrect ? t('education.quiz.correct') : t('education.quiz.incorrect')}
          {question.explanation}
        </p>
      )}
    </Card>
  )
}

function LessonQuiz({
  lesson,
  onResult,
}: {
  lesson: Lesson
  onResult: (score: number, total: number) => void
}): JSX.Element | null {
  const { t } = useTranslation()
  const [answers, setAnswers] = useState<QuizAnswers>({})
  const [reported, setReported] = useState<{ score: number; total: number } | null>(null)

  // Reinicia el quiz al navegar a otra lección (el componente se re-usa, no se desmonta).
  useEffect(() => {
    setAnswers({})
    setReported(null)
  }, [lesson.id])

  const total = lesson.quiz.length
  const answeredCount = Object.keys(answers).length
  const allAnswered = total > 0 && answeredCount === total
  const score = useMemo(
    () => lesson.quiz.reduce((acc, question, i) => acc + (answers[i] === question.correctIndex ? 1 : 0), 0),
    [answers, lesson.quiz],
  )

  useEffect(() => {
    if (!allAnswered) return
    if (reported && reported.score === score && reported.total === total) return
    onResult(score, total)
    setReported({ score, total })
    // Se reporta una sola vez por intento -- onResult recrea identidad en cada render del padre.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAnswered, score, total])

  if (total === 0) return null

  const passed = allAnswered && score / total >= PASS_THRESHOLD

  function handleSelect(questionIndex: number, optionIndex: number): void {
    setAnswers((prev) => {
      if (prev[questionIndex] !== undefined) return prev
      return { ...prev, [questionIndex]: optionIndex }
    })
  }

  function handleRetry(): void {
    setAnswers({})
    setReported(null)
  }

  return (
    <div className="mt-10 flex flex-col gap-4 border-t border-border-subtle pt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-text-primary">{t('education.quiz.title')}</h2>
        <span className="text-xs text-text-tertiary">
          {t('education.quiz.answered', { answered: answeredCount, total })}
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {lesson.quiz.map((question, i) => (
          <QuizQuestionCard
            key={i}
            question={question}
            index={i}
            selected={answers[i]}
            onSelect={(optIndex) => handleSelect(i, optIndex)}
          />
        ))}
      </div>

      {allAnswered && (
        <Card
          glow="none"
          className={cn(
            'flex flex-wrap items-center justify-between gap-3',
            passed ? 'border-positive/30' : 'border-negative/30',
          )}
        >
          <div>
            <p className="font-display text-base font-semibold text-text-primary">
              {t('education.quiz.result', { score, total })}
            </p>
            <p className="mt-1 text-sm text-text-tertiary">
              {passed ? t('education.quiz.passed') : t('education.quiz.failed')}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleRetry}>
            {t('education.quiz.retry')}
          </Button>
        </Card>
      )}
    </div>
  )
}

function LessonView({
  lesson,
  progress,
  onRead,
  onQuizResult,
  onNavigate,
}: {
  lesson: Lesson
  progress: ProgressState
  onRead: (id: string) => void
  onQuizResult: (id: string, score: number, total: number) => void
  onNavigate: (id: string | null) => void
}): JSX.Element {
  const { t } = useTranslation()
  useEffect(() => {
    onRead(lesson.id)
    window.scrollTo({ top: 0 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.id])

  const { prev, next } = getAdjacentLessons(lesson.id)
  const status = lessonStatus(lesson, progress)

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onNavigate(null)}
          className="flex items-center gap-1.5 text-sm text-text-tertiary transition-colors hover:text-text-primary"
        >
          <IconChevronLeft className="h-4 w-4" /> {t('education.backLink')}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">
            {t('education.lessonCounter', { order: lesson.order, total: LESSONS.length })}
          </span>
          <Badge variant={status.variant} size="sm">
            {t(status.labelKey)}
          </Badge>
        </div>
      </div>

      <Card glow="none">
        <ReactMarkdown components={markdownComponents}>{lesson.markdown}</ReactMarkdown>
        <LessonQuiz lesson={lesson} onResult={(score, total) => onQuizResult(lesson.id, score, total)} />
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" onClick={() => prev && onNavigate(prev.id)} disabled={!prev}>
          <IconChevronLeft className="h-4 w-4" /> {t('education.prev')}
        </Button>
        <Button variant="primary" onClick={() => next && onNavigate(next.id)} disabled={!next}>
          {t('education.next')} <IconChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export function Education(): JSX.Element {
  const { t } = useTranslation()
  const { lessonId } = useParams<{ lessonId?: string }>()
  const navigate = useNavigate()
  const { progress, markRead, recordQuizResult } = useEducationProgress()

  const completedCount = LESSONS.filter((lesson) => progress[lesson.id]?.quizPassed).length
  const lesson = lessonId ? getLessonById(lessonId) : undefined

  useSetPageContext({
    seccion: 'educacion',
    lecciones_totales: LESSONS.length,
    lecciones_completadas: completedCount,
    leccion_actual: lesson?.title ?? null,
  })

  function goToLesson(id: string | null): void {
    navigate(id ? `/education/${id}` : '/education')
  }

  if (lessonId && !lesson) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center">
        <IconEducation className="h-6 w-6 text-text-muted" />
        <div>
          <h2 className="font-display text-lg font-medium text-text-primary">{t('education.notFoundTitle')}</h2>
          <p className="mt-1 text-sm text-text-tertiary">{t('education.notFoundDesc')}</p>
        </div>
        <Button variant="primary" onClick={() => goToLesson(null)}>
          {t('education.backToIndex')}
        </Button>
      </div>
    )
  }

  if (lesson) {
    return (
      <LessonView
        lesson={lesson}
        progress={progress}
        onRead={markRead}
        onQuizResult={recordQuizResult}
        onNavigate={goToLesson}
      />
    )
  }

  return <EducationIndex progress={progress} onOpenLesson={(id) => goToLesson(id)} />
}

export default Education
