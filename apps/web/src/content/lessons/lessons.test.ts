import { describe, expect, it } from 'vitest'
import { getAdjacentLessons, getLessonById, getLessons, LESSONS } from './index'
import { SUPPORTED_LANGUAGES } from '../../i18n'

describe('lessons loader multi-idioma', () => {
  it('los 3 idiomas exponen 8 lecciones con IDs idénticos', () => {
    const es = getLessons('es').map((l) => l.id)
    expect(es).toHaveLength(8)
    for (const lang of SUPPORTED_LANGUAGES) {
      expect(getLessons(lang).map((l) => l.id)).toEqual(es)
    }
  })

  it('cada lección tiene título, summary, markdown y quiz de 4 preguntas', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      for (const lesson of getLessons(lang)) {
        expect(lesson.title.length).toBeGreaterThan(0)
        expect(lesson.summary.length).toBeGreaterThan(0)
        expect(lesson.markdown.length).toBeGreaterThan(0)
        expect(lesson.quiz).toHaveLength(4)
        for (const q of lesson.quiz) {
          expect(q.options).toHaveLength(4)
          expect(q.correctIndex).toBeGreaterThanOrEqual(0)
          expect(q.correctIndex).toBeLessThan(q.options.length)
          expect(q.explanation.length).toBeGreaterThan(0)
        }
      }
    }
  })

  it('el contenido realmente difiere entre idiomas (no es el mismo texto)', () => {
    const first = 'wallets-y-seeds'
    const es = getLessonById('es', first)!
    const en = getLessonById('en', first)!
    const pt = getLessonById('pt', first)!
    expect(es.title).not.toEqual(en.title)
    expect(en.title).not.toEqual(pt.title)
    // El correctIndex sí debe ser idéntico (misma pregunta, opciones traducidas en el mismo orden).
    es.quiz.forEach((q, i) => {
      expect(en.quiz[i].correctIndex).toBe(q.correctIndex)
      expect(pt.quiz[i].correctIndex).toBe(q.correctIndex)
    })
  })

  it('un idioma no soportado no llega acá, pero getLessonById cae a ES por-lección', () => {
    // getLessons('es') como piso: un id inexistente devuelve undefined en cualquier idioma
    expect(getLessonById('en', 'no-existe')).toBeUndefined()
  })

  it('getAdjacentLessons respeta el orden del curso en cada idioma', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const lessons = getLessons(lang)
      const { prev, next } = getAdjacentLessons(lang, lessons[1].id)
      expect(prev?.id).toBe(lessons[0].id)
      expect(next?.id).toBe(lessons[2].id)
      // extremos
      expect(getAdjacentLessons(lang, lessons[0].id).prev).toBeUndefined()
      expect(getAdjacentLessons(lang, lessons[lessons.length - 1].id).next).toBeUndefined()
    }
  })

  it('el export LESSONS (compat) es el set en español', () => {
    expect(LESSONS.map((l) => l.id)).toEqual(getLessons('es').map((l) => l.id))
    expect(LESSONS[0].title).toBe(getLessons('es')[0].title)
  })
})
