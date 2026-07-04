export const meta = {
  name: 'pulso-dia-5',
  description: 'PULSO Día 5: educación+quiz, README+deploy prep, refactor cache backend → i18n ES/EN → pulido final → verificación',
  phases: [
    { title: 'Paralelo: Educación / README+Deploy / Backend-refactor' },
    { title: 'i18n ES/EN' },
    { title: 'Pulido final' },
    { title: 'Verificación' },
  ],
}

const ENTORNO = `
ENTORNO WINDOWS (restricciones duras):
- PowerShell 5.1: NO usar && para encadenar comandos. Usar ; o comandos separados.
- Directorio raíz del proyecto: C:\\Users\\Cript\\pulso-exchange
- Backend FastAPI en apps/api (puerto 8000, venv en apps/api/.venv). Frontend Vite+React en apps/web (puerto 5173).
- Design system en apps/web/src/components/ui/ y tokens en apps/web/src/tokens/.
- Contratos v2 verificados en Sepolia: PulsoToken 0xe8D2f470b0f2F79D025658f825dF1F2aBA3ADB75, PulsoStaking 0x6006EA579603439e22fb090bD5233f1f6fba06df.
- DESIGN.md en la raíz documenta las decisiones de diseño — leelo si necesitás contexto de trade-offs.
`

const RESULTADO_SCHEMA = {
  type: 'object',
  properties: {
    modulo: { type: 'string' },
    estado: { enum: ['ok', 'parcial', 'fallo'] },
    archivosCreados: { type: 'array', items: { type: 'string' } },
    issues: { type: 'array', items: { type: 'string' } },
    resumen: { type: 'string' },
  },
  required: ['modulo', 'estado', 'archivosCreados', 'issues', 'resumen'],
}

const VERIFICACION_SCHEMA = {
  type: 'object',
  properties: {
    modulo: { type: 'string' },
    aprobado: { type: 'boolean' },
    hallazgos: { type: 'array', items: { type: 'string' } },
    accionesCorrectivas: { type: 'array', items: { type: 'string' } },
  },
  required: ['modulo', 'aprobado', 'hallazgos', 'accionesCorrectivas'],
}

// ── FASE 1: 3 pistas sin archivos compartidos ────────────────────────────────
phase('Paralelo: Educación / README+Deploy / Backend-refactor')

const [educacion, readmeDeploy, backendRefactor] = await parallel([

  // ── A) Módulo Educación ──────────────────────────────────────────────────
  () => agent(`
${ENTORNO}

TAREA: Módulo Educación completo.

1. Crear 8 lecciones en apps/web/src/content/lessons/ (archivos .md):
   01-wallets-y-seeds.md, 02-que-es-staking.md, 03-riesgos-defi.md,
   04-stablecoins-y-dolar-ar.md, 05-como-leer-graficos.md,
   06-smart-contracts.md, 07-custodial-vs-noncustodial.md, 08-como-detectar-scams.md
   Cada lección: título, 3-4 párrafos educativos con información real y actual (podés
   referenciar los propios módulos de PULSO como ejemplos), y 4 preguntas de quiz con
   una respuesta correcta cada una (formato estructurado parseable — frontmatter YAML
   o sección JSON al final del .md, elegí uno y usalo consistente).
   La lección 08 (scams) DEBE incluir el scam del "demo project" (cliente que pide
   descargar y correr un repo para "testearlo" = malware roba-wallets) — es real y actual.
2. Crear apps/web/src/pages/Education.tsx:
   - Índice de lecciones con barra de progreso del curso.
   - Vista de lección: markdown renderizado (react-markdown), quiz interactivo al
     final con feedback inmediato (verde/rojo), navegación entre lecciones.
   - Progreso en localStorage (lecciones completadas + quiz aprobados).
3. Ruta /education en el router y conectar el ítem "Educación" del nav (ya existe).
4. Instalar react-markdown si no está. Verificar 'npm run build' sin errores de TS.
`, { model: 'sonnet', label: 'dia5:educacion', phase: 'Paralelo: Educación / README+Deploy / Backend-refactor', schema: RESULTADO_SCHEMA }),

  // ── B) README + deploy prep + página security ────────────────────────────
  () => agent(`
${ENTORNO}

TAREA: README profesional + preparación de deploy + página /security. NO ejecutes
ningún deploy real (no hay credenciales de Vercel/Render en este entorno) — dejá todo
listo y documentado para que el deploy sea un paso de 10 minutos.

1. README.md raíz (reemplazar el placeholder):
   - Qué es PULSO (3 líneas, ES + EN).
   - Badge del CI de GitHub Actions (.github/workflows/ci.yml ya existe; repo será
     guillemustafa-ux/pulso-exchange).
   - Arquitectura: diagrama ASCII frontend → backend → [CoinGecko|Binance|DefiLlama|CriptoYa|Groq] + contratos Sepolia.
   - Módulos (lista con 1 línea cada uno).
   - Contratos en Sepolia (tabla con links a Etherscan de PulsoToken y PulsoStaking v2 — direcciones en el ENTORNO arriba) + mención del post-mortem v1 con link a DESIGN.md.
   - Cómo correr local (pasos exactos para apps/web y apps/api, Windows y Unix).
   - Link a DESIGN.md ("decisiones de diseño y trade-offs").
   - Disclaimer de seguridad (testnet, paper trading, no consejo financiero).
2. contracts/README.md: reemplazar el stock de Foundry (todavía menciona Counter.s.sol)
   por uno propio: los 2 contratos, cómo correr los tests (20 tests: unit+fuzz+invariantes),
   cómo deployar con Deploy.s.sol, link a DESIGN.md para los trade-offs.
3. Deploy prep:
   - apps/web/vercel.json con rewrites SPA + build config.
   - render.yaml en la raíz (servicio web apps/api, startCommand con --proxy-headers,
     env vars a configurar listadas: GROQ_API_KEY, ALLOWED_ORIGINS, TRUST_PROXY=1).
   - Sección "Deploy" en el README con los pasos exactos de ambos.
4. Crear apps/web/src/pages/Security.tsx: página /security explicando el modelo
   non-custodial en lenguaje claro (qué firma el usuario, qué nunca pide PULSO, cómo
   verificar los contratos en Etherscan, los disclaimers de bots/IA/earn). Conectar el
   ítem "Seguridad" del nav (ya existe). Verificar build.
`, { model: 'sonnet', label: 'dia5:readme-deploy', phase: 'Paralelo: Educación / README+Deploy / Backend-refactor', schema: RESULTADO_SCHEMA }),

  // ── C) Backend: refactor de cache + pins ─────────────────────────────────
  () => agent(`
${ENTORNO}

TAREA: Refactor de deuda técnica del backend señalada en auditoría (B4/B5). NO toques
el frontend.

1. Crear apps/api/app/cache.py: UNA clase TTLCache compartida (la actual está
   triplicada carácter por carácter en routers/market.py, defi.py y earn.py, y
   duplicada parcialmente en trends.py). Mantener la semántica single-flight existente.
2. Agregarle stale-on-error: si el fetch falla y hay un valor viejo en memoria,
   servir el valor viejo (loggeando warning) en vez de propagar 502 — resiliencia
   gratis que hoy no existe. Flag por-get opcional para deshabilitar si algún endpoint
   no lo quiere.
3. Migrar market.py, defi.py, earn.py y trends.py a importar de app/cache.py. Los TTLs
   actuales se conservan (top100 60s, global/trending 300s, klines 30s, defi 300s,
   earn 600s, fear-greed 3600s).
4. requirements.txt: pinnear TODAS las versiones (formato paquete==versión, usar las
   instaladas en el venv actual: pip freeze como referencia, pero solo los paquetes
   directos que ya están listados, no todo el árbol).
5. Verificar: la app importa ('python -c "from app.main import app"'), el servidor
   arranca, y GET /api/market/top100 + /api/defi/protocols + /api/earn/ar responden
   con datos reales. Si el servidor del puerto 8000 está corriendo, reinicialo al final
   para que tome los cambios.
`, { model: 'sonnet', label: 'dia5:backend-refactor', phase: 'Paralelo: Educación / README+Deploy / Backend-refactor', schema: RESULTADO_SCHEMA }),

])

log(`Fase 1: educacion=${educacion?.estado}, readme=${readmeDeploy?.estado}, backend=${backendRefactor?.estado}`)

// ── FASE 2: i18n (toca todas las páginas — corre SOLO) ───────────────────────
phase('i18n ES/EN')

const i18n = await agent(`
${ENTORNO}

TAREA: Internacionalización ES/EN con react-i18next. Corre DESPUÉS de que otros
agentes terminaron — tenés el árbol para vos solo, pero igual re-leé cada archivo
antes de editarlo.

1. Instalar react-i18next i18next (npm). Configurar en apps/web/src/i18n.ts con
   detección por localStorage ('pulso-lang') y default 'es'.
2. Archivos apps/web/src/locales/es.json y en.json. Traducir: ítems del nav, títulos
   y descripciones de página, labels de botones (Conectar wallet, Stakear, Aprobar,
   Reclamar, Crear bot...), disclaimers (PAPER TRADING, IA educativa, Earn), mensajes
   de error y estados vacíos, textos del wizard de bots.
   NO traducir: el contenido de las lecciones de Educación (quedan en ES — anotar la
   decisión en el README con 1 línea) ni las respuestas de la IA (ya responde en el
   idioma de la pregunta).
3. Selector de idioma ES | EN en el header del Layout (discreto, junto al botón de wallet).
4. Migrar los strings de TODAS las páginas y componentes a t('...'). Cuidado con
   strings interpolados (usar la interpolación de i18next, no template literals).
5. Verificar: 'npm run build' sin errores TS, y las páginas renderizan en ambos
   idiomas (cambiar el localStorage y verificar 2-3 páginas con el dev server).
`, { model: 'sonnet', label: 'dia5:i18n', phase: 'i18n ES/EN', schema: RESULTADO_SCHEMA })

log(`i18n: ${i18n?.estado}`)

// ── FASE 3: Pulido final (después de i18n para no pisarse) ───────────────────
phase('Pulido final')

const pulido = await agent(`
${ENTORNO}

TAREA: Pulido final de calidad visual y accesibilidad. Los strings ya están
internacionalizados (react-i18next) — al tocar textos usá las keys de
apps/web/src/locales/*.json, no strings sueltos.

1. Estados de error y vacíos: revisar TODAS las páginas (Market, CoinDetail, DeFi,
   Earn, Staking, Bots, Trends, Education, Security) — ningún spinner infinito, ningún
   crash de datos undefined, todo error con mensaje claro y botón retry donde aplique,
   todo estado vacío con mensaje amigable (no una tabla en blanco).
2. Responsive mobile (380px): navegar con el dev server + Playwright o revisar el CSS
   a mano — nav colapsada usable, tablas con overflow-x horizontal contenido (la página
   nunca scrollea de costado), cards apiladas, gauge y charts que no desborden.
3. prefers-reduced-motion: verificar que TODAS las animaciones de framer-motion lo
   respetan (ya existe el hook usePrefersReducedMotion — aplicarlo donde falte,
   incluido el gauge de Trends y el typewriter del AIAssistant).
4. Bundle: code-splitting con React.lazy por página (el bundle pasa los 500kB por
   RainbowKit). Verificar que el chunk principal baja y las páginas cargan on-demand.
5. Accesibilidad básica: focus visible en botones/links/inputs, aria-labels en los
   botones de solo-ícono (nav, AIAssistant flotante, cerrar drawer).
6. Verificación final: 'npm run build' limpio + captura Playwright de /market, /staking,
   /bots y /education en desktop y en 380px de ancho.
`, { model: 'sonnet', label: 'dia5:pulido', phase: 'Pulido final', schema: RESULTADO_SCHEMA })

log(`Pulido: ${pulido?.estado}`)

// ── FASE 4: Verificación de cierre ───────────────────────────────────────────
phase('Verificación')

const [calidad, seguridad] = await parallel([

  () => agent(`
Verificá el cierre del MVP PULSO en C:\\Users\\Cript\\pulso-exchange (post Día 5).

CHECKLIST:
1. README.md raíz: completo (arquitectura, contratos v2 con links correctos
   0xe8D2f470b0f2F79D025658f825dF1F2aBA3ADB75 / 0x6006EA579603439e22fb090bD5233f1f6fba06df,
   cómo correr local, deploy, disclaimer) y contracts/README.md ya NO es el stock de Foundry.
2. Las 9 páginas existen y están ruteadas: /market, /defi, /earn, /staking, /bots,
   /trends, /education, /security + home.
3. Educación: 8 lecciones .md reales (no lorem), quiz funcional, progreso en localStorage.
4. i18n: selector ES|EN en el header, es.json y en.json con cobertura de nav + botones
   + disclaimers; cambiar idioma no rompe ninguna página.
5. Backend: app/cache.py compartido reemplazó las copias triplicadas; requirements.txt
   pinneado; la app importa y los endpoints principales responden.
6. 'npm run build' limpio; bundle principal por debajo de lo que estaba (code-splitting activo).
7. vercel.json y render.yaml existen y son coherentes con el README.

Por cada criterio que falle: acción correctiva exacta.
`, { model: 'sonnet', label: 'verify:dia5-calidad', phase: 'Verificación', schema: VERIFICACION_SCHEMA }),

  () => agent(`
Revisión de seguridad de cierre de PULSO en C:\\Users\\Cript\\pulso-exchange.

CHECKLIST:
1. Ningún .env commiteado ni commiteable (git status + .gitignore); ninguna key
   hardcodeada en frontend ni backend (grep de GROQ, PRIVATE_KEY, API_KEY en src).
2. render.yaml no contiene valores de secrets (solo nombres de env vars a configurar).
3. La página /security existe y es honesta (no promete custodia ni seguridad absoluta).
4. Los disclaimers siguen visibles tras el i18n: PAPER TRADING en /bots, 'no es consejo
   financiero' en Earn y AIAssistant, non-custodial en Staking.
5. El scam del 'demo project' está en la lección 08 de Educación.
6. CORS del backend sigue restringido (no '*').

Por cada problema: archivo, línea aproximada y corrección.
`, { model: 'sonnet', label: 'verify:dia5-seguridad', phase: 'Verificación', schema: VERIFICACION_SCHEMA }),

])

const completados = [educacion, readmeDeploy, backendRefactor, i18n, pulido]
  .filter(r => r && r.estado !== 'fallo')
  .map(r => r.modulo)
const issues = [educacion, readmeDeploy, backendRefactor, i18n, pulido].flatMap(r => r ? r.issues : [])
const verIssues = [calidad, seguridad].filter(Boolean).filter(v => !v.aprobado).flatMap(v => v.accionesCorrectivas)

log(`✅ Completados: ${completados.join(', ')}`)
if (issues.length) log(`⚠️  Issues: ${issues.join(' | ')}`)
if (verIssues.length) log(`🔧 Acciones correctivas: ${verIssues.join(' | ')}`)

return {
  dia: 5,
  completados,
  issues: [...issues, ...verIssues],
  listo: completados.length >= 5 && verIssues.length === 0,
}
