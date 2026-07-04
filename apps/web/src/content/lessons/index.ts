import lesson01 from './01-wallets-y-seeds.md?raw'
import lesson02 from './02-que-es-staking.md?raw'
import lesson03 from './03-riesgos-defi.md?raw'
import lesson04 from './04-stablecoins-y-dolar-ar.md?raw'
import lesson05 from './05-como-leer-graficos.md?raw'
import lesson06 from './06-smart-contracts.md?raw'
import lesson07 from './07-custodial-vs-noncustodial.md?raw'
import lesson08 from './08-como-detectar-scams.md?raw'

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

const RAW_LESSONS: ReadonlyArray<{ id: string; raw: string }> = [
  { id: 'wallets-y-seeds', raw: lesson01 },
  { id: 'que-es-staking', raw: lesson02 },
  { id: 'riesgos-defi', raw: lesson03 },
  { id: 'stablecoins-y-dolar-ar', raw: lesson04 },
  { id: 'como-leer-graficos', raw: lesson05 },
  { id: 'smart-contracts', raw: lesson06 },
  { id: 'custodial-vs-noncustodial', raw: lesson07 },
  { id: 'como-detectar-scams', raw: lesson08 },
]

/** Las 8 lecciones del módulo Educación, en orden de curso. */
export const LESSONS: Lesson[] = RAW_LESSONS.map((entry, i) => parseLesson(entry.id, i + 1, entry.raw))

export function getLessonById(id: string): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.id === id)
}

export function getAdjacentLessons(id: string): { prev: Lesson | undefined; next: Lesson | undefined } {
  const index = LESSONS.findIndex((lesson) => lesson.id === id)
  if (index === -1) return { prev: undefined, next: undefined }
  return { prev: LESSONS[index - 1], next: LESSONS[index + 1] }
}
