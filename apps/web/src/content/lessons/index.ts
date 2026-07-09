import { SUPPORTED_LANGUAGES, type Language } from '../../i18n'

/** Marcador que separa el contenido markdown del bloque de quiz al final del `.md`. */
const QUIZ_MARKER = '<!-- quiz -->'

export interface QuizQuestion {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

export interface Lesson {
  id: string
  /** Posición en el índice del curso (1-based). */
  order: number
  title: string
  summary: string
  /** Markdown de la lección, ya sin el bloque de quiz. */
  markdown: string
  quiz: QuizQuestion[]
}

/**
 * Parsea un archivo `.md` de lección: todo lo que está antes de `<!-- quiz -->`
 * es contenido para react-markdown; el fence ```json después del marcador es
 * el quiz estructurado. Formato elegido para no depender de un parser YAML
 * en el browser (frontmatter) — un `JSON.parse` alcanza y sobra.
 */
function parseLesson(id: string, order: number, raw: string): Lesson {
  const markerIndex = raw.indexOf(QUIZ_MARKER)
  const markdown = (markerIndex === -1 ? raw : raw.slice(0, markerIndex)).trim()
  const rest = markerIndex === -1 ? '' : raw.slice(markerIndex + QUIZ_MARKER.length)
  const jsonMatch = rest.match(/```json\s*([\s\S]*?)```/)
  const quiz = jsonMatch ? (JSON.parse(jsonMatch[1]) as QuizQuestion[]) : []

  const titleMatch = markdown.match(/^#\s+(.+)$/m)
  const title = titleMatch ? titleMatch[1].trim() : id

  const firstParagraph = markdown
    .replace(/^#\s+.+$/m, '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .find((paragraph) => paragraph.length > 0)
  // El summary se muestra como texto plano (CardDescription), no vía react-markdown --
  // hay que sacarle el marcado (negrita/código/links) antes de recortarlo.
  const plainParagraph = firstParagraph
    ?.replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
  const summary = plainParagraph
    ? `${plainParagraph.slice(0, 140)}${plainParagraph.length > 140 ? '…' : ''}`
    : ''

  return { id, order, title, summary, markdown, quiz }
}

/**
 * Orden e IDs del curso, derivados del NOMBRE de archivo (`NN-slug.md`). Los
 * slugs son idénticos en los tres idiomas (los `.md` traducidos conservan el
 * nombre del original) — por eso el `id` sale del filename, no del contenido:
 * así las URLs `/education/:id` y el progreso en localStorage sobreviven el
 * cambio de idioma sin migración.
 */
function slugFromPath(path: string): string {
  const file = path.split('/').pop() ?? path
  return file.replace(/^\d+-/, '').replace(/\.md$/, '')
}

// Los tres sets de lecciones, importados en build-time. `eager` = sin lazy:
// son ~5KB de texto por lección, no justifican un chunk aparte.
const RAW_BY_LANG = import.meta.glob<string>('./{es,en,pt}/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
})

function buildLessonsFor(lang: Language): Lesson[] {
  const prefix = `./${lang}/`
  return Object.entries(RAW_BY_LANG)
    .filter(([path]) => path.startsWith(prefix))
    .sort(([a], [b]) => a.localeCompare(b)) // por nombre de archivo => orden de curso
    .map(([path, raw], i) => parseLesson(slugFromPath(path), i + 1, raw))
}

const LESSONS_BY_LANG: Record<Language, Lesson[]> = SUPPORTED_LANGUAGES.reduce(
  (acc, lang) => {
    acc[lang] = buildLessonsFor(lang)
    return acc
  },
  {} as Record<Language, Lesson[]>,
)

/** Idioma de fallback: espeja `fallbackLng: 'es'` de i18n. */
const FALLBACK_LANG: Language = 'es'

/** Las lecciones del curso en `lang`, con fallback a español si el set está vacío. */
export function getLessons(lang: Language): Lesson[] {
  const lessons = LESSONS_BY_LANG[lang]
  return lessons && lessons.length > 0 ? lessons : LESSONS_BY_LANG[FALLBACK_LANG]
}

export function getLessonById(lang: Language, id: string): Lesson | undefined {
  const inLang = getLessons(lang).find((lesson) => lesson.id === id)
  if (inLang) return inLang
  // Fallback por-lección: si una traducción puntual faltara, cae al español.
  return LESSONS_BY_LANG[FALLBACK_LANG].find((lesson) => lesson.id === id)
}

export function getAdjacentLessons(
  lang: Language,
  id: string,
): { prev: Lesson | undefined; next: Lesson | undefined } {
  const lessons = getLessons(lang)
  const index = lessons.findIndex((lesson) => lesson.id === id)
  if (index === -1) return { prev: undefined, next: undefined }
  return { prev: lessons[index - 1], next: lessons[index + 1] }
}

/** Set en español, para compatibilidad con consumidores que no pasan idioma. */
export const LESSONS: Lesson[] = LESSONS_BY_LANG[FALLBACK_LANG]
