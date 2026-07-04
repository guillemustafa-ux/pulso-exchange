import { useCallback, useState } from 'react'

const STORAGE_KEY = 'pulso:education:progress:v1'

/** Aprueba el quiz con 3 de 4 correctas (75%) -- ver PROMPT.md "Quiz de 3-5 preguntas con feedback". */
const PASS_THRESHOLD = 0.75

export interface LessonProgress {
  /** El usuario abrió y vio el contenido de la lección. */
  read: boolean
  /** Alcanzó el umbral de aprobación del quiz al menos una vez. */
  quizPassed: boolean
  /** Mejor puntaje logrado (para mostrarlo aunque no haya aprobado). */
  bestScore: number
  bestTotal: number
}

export type ProgressState = Record<string, LessonProgress>

function readProgress(): ProgressState {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as ProgressState
  } catch {
    return {}
  }
}

function writeProgress(state: ProgressState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage lleno o deshabilitado (modo privado) -- el progreso no persiste,
    // pero la lección se puede seguir usando en memoria durante la sesión.
  }
}

/**
 * Progreso del curso de Educación, persistido en localStorage (no es dato
 * sensible: solo qué lecciones se vieron y qué quizzes se aprobaron).
 */
export function useEducationProgress(): {
  progress: ProgressState
  markRead: (lessonId: string) => void
  recordQuizResult: (lessonId: string, score: number, total: number) => boolean
} {
  const [progress, setProgress] = useState<ProgressState>(readProgress)

  const markRead = useCallback((lessonId: string) => {
    setProgress((prev) => {
      const existing = prev[lessonId]
      if (existing?.read) return prev
      const next: ProgressState = {
        ...prev,
        [lessonId]: {
          read: true,
          quizPassed: existing?.quizPassed ?? false,
          bestScore: existing?.bestScore ?? 0,
          bestTotal: existing?.bestTotal ?? 0,
        },
      }
      writeProgress(next)
      return next
    })
  }, [])

  const recordQuizResult = useCallback((lessonId: string, score: number, total: number): boolean => {
    const passed = total > 0 && score / total >= PASS_THRESHOLD
    setProgress((prev) => {
      const existing = prev[lessonId]
      const next: ProgressState = {
        ...prev,
        [lessonId]: {
          read: true,
          quizPassed: passed || (existing?.quizPassed ?? false),
          bestScore: Math.max(score, existing?.bestScore ?? 0),
          bestTotal: total,
        },
      }
      writeProgress(next)
      return next
    })
    return passed
  }, [])

  return { progress, markRead, recordQuizResult }
}
