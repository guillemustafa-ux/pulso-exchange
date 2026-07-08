#!/usr/bin/env node
/**
 * i18n key-parity guard.
 *
 * Every locale under src/locales/*.json must expose the EXACT same set of keys.
 * A missing key means a UI string falls back to the default language for that
 * user — a silent regression that neither `tsc` nor `vite build` can catch,
 * because translations are plain JSON, not typed. This script makes the drift
 * loud: it fails CI listing precisely which keys are missing (or extra) in
 * which locale, using the first file alphabetically as the reference set.
 *
 * SCOPE (documented on purpose): this checks key PRESENCE and shape (object vs
 * leaf vs array), NOT translation freshness. Changing an English string without
 * updating its Portuguese value leaves the key present, so this guard stays
 * green — that is an accepted limitation for a demo/portfolio, not a bug.
 *
 * Usage: node scripts/check-i18n-parity.mjs
 * Exits 0 when all locales match, 1 otherwise.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const localesDir = join(here, '..', 'src', 'locales')

/** Flattens a translation object into a sorted set of `a.b.c` (and `a.b[i]` for arrays) paths. */
function flatten(node, prefix, out) {
  if (Array.isArray(node)) {
    node.forEach((item, i) => flatten(item, `${prefix}[${i}]`, out))
    return
  }
  if (node !== null && typeof node === 'object') {
    for (const key of Object.keys(node)) {
      flatten(node[key], prefix ? `${prefix}.${key}` : key, out)
    }
    return
  }
  out.add(prefix) // leaf (string / number / boolean)
}

function keySet(filePath) {
  const parsed = JSON.parse(readFileSync(filePath, 'utf8'))
  const out = new Set()
  flatten(parsed, '', out)
  return out
}

const files = readdirSync(localesDir)
  .filter((f) => f.endsWith('.json'))
  .sort()

if (files.length < 2) {
  console.log(`i18n parity: only ${files.length} locale file(s), nothing to compare.`)
  process.exit(0)
}

const [refFile, ...rest] = files
const refKeys = keySet(join(localesDir, refFile))

let failed = false
for (const file of rest) {
  const keys = keySet(join(localesDir, file))
  const missing = [...refKeys].filter((k) => !keys.has(k)).sort()
  const extra = [...keys].filter((k) => !refKeys.has(k)).sort()

  if (missing.length === 0 && extra.length === 0) {
    console.log(`✓ ${file} — ${keys.size} keys, matches ${refFile}`)
    continue
  }

  failed = true
  console.error(`✗ ${file} diverges from ${refFile}:`)
  if (missing.length) console.error(`  missing (${missing.length}): ${missing.join(', ')}`)
  if (extra.length) console.error(`  extra   (${extra.length}): ${extra.join(', ')}`)
}

if (failed) {
  console.error('\ni18n parity check FAILED — locales are out of sync.')
  process.exit(1)
}

console.log(`\ni18n parity OK — ${files.length} locales, ${refKeys.size} keys each.`)
