/**
 * Guard de paridad del contenido de Educación entre idiomas (es/en/pt).
 *
 * El guard de i18n (`check-i18n-parity.mjs`) solo cubre `src/locales/*.json`;
 * las lecciones son archivos `.md` en `src/content/lessons/{es,en,pt}/`. Este
 * script verifica que las TRES traducciones estén estructuralmente alineadas —
 * mismos slugs, mismo formato, misma cantidad de preguntas/opciones y el MISMO
 * `correctIndex` (traducir NO debe reordenar las opciones ni mover la correcta).
 *
 * No valida calidad de traducción (eso es editorial), solo estructura.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const lessonsDir = join(here, '..', 'src', 'content', 'lessons')
const LANGS = ['es', 'en', 'pt']
const QUIZ_MARKER = '<!-- quiz -->'

function slug(file) {
  return file.replace(/^\d+-/, '').replace(/\.md$/, '')
}

/** Parsea un `.md`: título H1, presencia de quiz y su array de preguntas. */
function parse(path) {
  const raw = readFileSync(path, 'utf8')
  const markerIndex = raw.indexOf(QUIZ_MARKER)
  if (markerIndex === -1) throw new Error(`sin marcador de quiz (${QUIZ_MARKER})`)
  const md = raw.slice(0, markerIndex)
  const title = md.match(/^#\s+(.+)$/m)?.[1]?.trim()
  if (!title) throw new Error('sin título H1')
  const jsonMatch = raw.slice(markerIndex).match(/```json\s*([\s\S]*?)```/)
  if (!jsonMatch) throw new Error('sin bloque ```json del quiz')
  let quiz
  try {
    quiz = JSON.parse(jsonMatch[1])
  } catch (e) {
    throw new Error(`quiz JSON inválido: ${e.message}`)
  }
  if (!Array.isArray(quiz)) throw new Error('el quiz no es un array')
  return { title, quiz }
}

const filesByLang = {}
for (const lang of LANGS) {
  const dir = join(lessonsDir, lang)
  filesByLang[lang] = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
}

const errors = []

// 1) Mismos archivos (mismos slugs, misma cantidad) en los 3 idiomas.
const ref = filesByLang.es
for (const lang of LANGS.slice(1)) {
  const a = ref.map(slug).join(',')
  const b = filesByLang[lang].map(slug).join(',')
  if (a !== b) {
    errors.push(`Los slugs de '${lang}' no coinciden con 'es':\n  es: ${a}\n  ${lang}: ${b}`)
  }
}

// 2) Por lección: estructura del quiz idéntica entre idiomas.
for (const file of ref) {
  const parsed = {}
  for (const lang of LANGS) {
    try {
      parsed[lang] = parse(join(lessonsDir, lang, file))
    } catch (e) {
      errors.push(`[${lang}/${file}] ${e.message}`)
    }
  }
  if (Object.keys(parsed).length < LANGS.length) continue

  const refQuiz = parsed.es.quiz
  for (const lang of LANGS.slice(1)) {
    const q = parsed[lang].quiz
    if (q.length !== refQuiz.length) {
      errors.push(`[${file}] ${lang} tiene ${q.length} preguntas; es tiene ${refQuiz.length}`)
      continue
    }
    refQuiz.forEach((refQ, i) => {
      if (q[i].options.length !== refQ.options.length) {
        errors.push(`[${file}] ${lang} pregunta ${i + 1}: ${q[i].options.length} opciones vs ${refQ.options.length} en es`)
      }
      if (q[i].correctIndex !== refQ.correctIndex) {
        errors.push(`[${file}] ${lang} pregunta ${i + 1}: correctIndex ${q[i].correctIndex} vs ${refQ.correctIndex} en es (¿se reordenaron las opciones?)`)
      }
    })
  }
}

if (errors.length > 0) {
  console.error('✗ Paridad de lecciones FALLÓ:\n')
  for (const e of errors) console.error('  - ' + e)
  process.exit(1)
}

const count = ref.length
console.log(`✓ Paridad de lecciones OK — ${count} lecciones × ${LANGS.length} idiomas, misma estructura de quiz.`)
