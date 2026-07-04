export const meta = {
  name: 'pulso-dia-4',
  description: 'PULSO Día 4: bots paper trading (DCA/Grid/SMA), módulo Tendencias, asistente IA con Groq (3 pistas en paralelo)',
  phases: [
    { title: 'Paralelo: Bots / Tendencias / IA' },
    { title: 'Verificación' },
  ],
}

const ENTORNO = `
ENTORNO WINDOWS (restricciones duras):
- PowerShell 5.1: NO usar && para encadenar comandos. Usar ; o comandos separados.
- Directorio raíz del proyecto: C:\\Users\\Cript\\pulso-exchange
- Backend FastAPI ya corre en apps/api (puerto 8000). Frontend Vite+React en apps/web (puerto 5173).
- Design system del Día 1 ya existe en apps/web/src/components/ui/ y tokens en apps/web/src/tokens/.
- GROQ_API_KEY ya está cargada en apps/api/.env.
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

// ── FASE 1: 3 pistas independientes en paralelo ──────────────────────────────
phase('Paralelo: Bots / Tendencias / IA')

const [bots, tendencias, ia] = await parallel([

  // ── A) Motor de bots paper trading ──────────────────────────────────────
  () => agent(`
${ENTORNO}

TAREA: Motor de bots paper trading (backend + frontend). PROHIBIDO conectar a un exchange real o ejecutar órdenes reales — todo es simulado.

BACKEND (apps/api/app/routers/bots.py + apps/api/app/motor/):
1. Base de datos SQLite (aiosqlite, mismo patrón de conexión que ya exista en apps/api/app/db.py).
2. Tablas: bots (id, nombre, estrategia DCA|GRID|SMA, par, capital_inicial, capital_actual, params JSON, estado activo|pausado, creado_at), trades (id, bot_id, tipo compra|venta, precio, cantidad, timestamp), positions si hace falta para el cálculo de PnL.
3. Motor de simulación (apps/api/app/motor/engine.py): loop asyncio en background (arrancado desde el lifespan de FastAPI, no bloqueante) cada 60s. Obtiene precio de https://data-api.binance.vision/api/v3/ticker/price?symbol={par}.
   - DCA: compra cada N segundos (configurable en params), capital fijo por orden.
   - GRID: niveles de precio fijos por encima/debajo del precio actual al crear el bot; compra/vende al cruzar niveles.
   - SMA: cruce de SMA corta y larga sobre las últimas N velas (usar klines de Binance ya cacheadas si existe la función, si no pedir directo); compra en cruce alcista, vende en bajista.
4. Calcular PnL: (precio_actual * cantidad_total) - capital_invertido.
5. Endpoints: POST /api/bots/ (crear), GET /api/bots/ (listar con PnL en vivo), GET /api/bots/{id}/trades (historial), PATCH /api/bots/{id}/estado (pausar/activar), DELETE /api/bots/{id}.
6. Registrar el router en apps/api/app/main.py.

FRONTEND (apps/web/src/pages/Bots.tsx):
1. Wizard de creación en 3 pasos: estrategia → par + capital → parámetros específicos de la estrategia elegida.
2. Lista de bots activos: nombre, estrategia, par, PnL en USD y %, mini equity curve (recharts LineChart).
3. Detalle de bot (modal o sub-página): equity curve completa, tabla de historial de trades, botón pausar/eliminar.
4. Banner PERMANENTE y bien visible (usar semantic.negative del design system, NO un color cualquiera): "PAPER TRADING — Fondos y operaciones completamente simulados".
5. Polling cada 15s (no WebSocket). Ruta /bots en el router y nav (el ítem "Bots" ya existe en el Layout, falta conectarlo).

Verificar que el motor arranca sin bloquear el resto del backend y que POST /api/bots/ + GET /api/bots/ funcionan end to end (crear un bot de prueba y confirmar que aparece con PnL calculado, aunque sea 0 al inicio).
`, { model: 'sonnet', label: 'dia4:bots', phase: 'Paralelo: Bots / Tendencias / IA', schema: RESULTADO_SCHEMA }),

  // ── B) Módulo Tendencias ─────────────────────────────────────────────────
  () => agent(`
${ENTORNO}

TAREA: Módulo Tendencias.

BACKEND (apps/api/app/routers/trends.py):
1. GET /api/trends/fear-greed: proxy a https://api.alternative.me/fng/?limit=30. Cache en memoria 1h (mismo patrón de cache que market.py).
2. GET /api/trends/summary: combina en un solo endpoint:
   - Fear & Greed actual (valor 0-100 + label).
   - Trending coins de CoinGecko /search/trending (top 7).
   - Ganadores y perdedores 24h: top 5 de cada uno, calculados sobre el top 100 ya cacheado por market.py (reusar esa cache, no volver a pedir a CoinGecko).
   - Market cap global y dominancia BTC de CoinGecko /global.
3. Registrar el router en apps/api/app/main.py.

FRONTEND (apps/web/src/pages/Trends.tsx):
1. Gauge de Fear & Greed: SVG semicircular, aguja animada con framer-motion (respetar prefers-reduced-motion), color según valor (0-25 rojo semantic.negative, 26-50 naranja, 51-75 verde claro, 76-100 semantic.positive). Histórico de 30 días con recharts AreaChart.
2. Sección Trending: cards con logo, nombre, precio y rank de trending (usar Card.tsx), glow violeta sutil en hover.
3. Tablas Ganadores / Perdedores: top 5 cada una, compactas, % con los colores semánticos ya establecidos (cian positivo, rojo negativo — igual que en Mercado).
4. Dominancia BTC: donut chart con recharts PieChart (BTC vs resto).
5. Ruta /trends en el router y nav (el ítem "Tendencias" ya existe en el Layout, falta conectarlo).

Verificar que GET /api/trends/summary responde con datos reales combinados y que el gauge renderiza sin errores de consola.
`, { model: 'sonnet', label: 'dia4:tendencias', phase: 'Paralelo: Bots / Tendencias / IA', schema: RESULTADO_SCHEMA }),

  // ── C) Asistente de IA (Groq) ────────────────────────────────────────────
  () => agent(`
${ENTORNO}

TAREA: Asistente de IA contextual integrado en toda la app. IA usa Groq (GROQ_API_KEY ya está en apps/api/.env).

BACKEND (apps/api/app/routers/ai.py):
1. POST /api/ai/ask con body: { pregunta: string, seccion: string, contexto: object }.
   - Llamar a Groq (modelo llama-3.3-70b-versatile) vía su API HTTP REST (https://api.groq.com/openai/v1/chat/completions, formato compatible OpenAI) usando httpx, con GROQ_API_KEY del entorno.
   - System prompt: "Sos un asistente educativo de finanzas crypto para la plataforma PULSO. REGLAS: 1) Solo educativo, nunca consejo financiero. 2) No inventés precios ni datos: usá solo los datos del campo 'contexto' provisto. Si no tenés el dato, decilo. 3) Respondé en el mismo idioma que la pregunta. 4) Respuestas concisas (máx 3 párrafos). 5) Siempre aclarás que los bots son paper trading y que nada es consejo de inversión."
   - El contexto (snapshot de datos visibles: precios, protocolo seleccionado, config del bot, etc.) se pasa como parte del primer mensaje de usuario, no inventado.
   - Rate limit: máx 20 requests por IP por hora (dict en memoria, mismo patrón que el rate limiter ya existente en apps/api/app/middleware.py si aplica, o uno nuevo específico).
   - Si se supera el límite: 429 con mensaje amigable en JSON.
2. Registrar el router en apps/api/app/main.py.

FRONTEND:
1. src/components/AIAssistant.tsx: botón flotante (esquina inferior derecha), ícono de chat con glow magenta (usar shadow.glowMagenta del design system). Al abrirse: panel lateral (drawer) con:
   - Campo de texto para la pregunta.
   - Preguntas rápidas sugeridas según la sección actual: /market → "¿Qué significa market cap?", "¿Cómo leer el gráfico de velas?"; /staking → "¿Qué es el APR?", "¿Qué riesgo tiene el staking?"; /defi → "¿Qué es TVL?", "¿Qué es un rug pull?"; /bots → "¿Qué riesgo tiene esta config?", "¿Qué es DCA?"; /trends → "¿Qué significa Fear & Greed?".
   - Respuesta con efecto de typewriter (framer-motion, respetar prefers-reduced-motion — sin el efecto si está activado).
   - Disclaimer fijo al pie: "IA educativa. No es consejo financiero."
2. Hook src/hooks/useSection.ts: devuelve la sección actual según la ruta (react-router).
3. El contexto se arma en cada página relevante y se pasa al AIAssistant vía prop o context de React. Montar AIAssistant una sola vez en el Layout para que esté disponible en todas las páginas.

Verificar POST /api/ai/ask con una pregunta de prueba real (ej. "¿qué es el APR?" con contexto vacío) y confirmar que Groq responde y el rate limit funciona (probar 2 llamadas seguidas, no debe bloquear antes de las 20).
`, { model: 'sonnet', label: 'dia4:ia', phase: 'Paralelo: Bots / Tendencias / IA', schema: RESULTADO_SCHEMA }),

])

log(`Pistas del Día 4 completadas: bots=${bots?.estado}, tendencias=${tendencias?.estado}, ia=${ia?.estado}`)

// ── FASE 2: Verificación cruzada ─────────────────────────────────────────────
phase('Verificación')

const [calidad, seguridad] = await parallel([

  () => agent(`
Verificá el Día 4 de PULSO en C:\\Users\\Cript\\pulso-exchange.

CHECKLIST:
1. src/pages/Bots.tsx, Trends.tsx existen con contenido real (no placeholders) y AIAssistant.tsx está montado en el Layout (no solo creado, sino usado).
2. El motor de bots (apps/api/app/motor/engine.py o equivalente) corre en background sin bloquear el event loop de FastAPI.
3. Las 3 rutas nuevas (/bots, /trends) están conectadas en el router y en el nav del Layout.
4. apps/web compila con 'npm run build' sin errores de TypeScript.
5. Los 3 routers nuevos del backend (bots.py, trends.py, ai.py) están registrados en main.py.
6. El banner "PAPER TRADING" en Bots.tsx es prominente, no un texto chico perdido.
7. AIAssistant tiene el disclaimer "No es consejo financiero" visible.
8. El rate limit de /api/ai/ask existe y es real (no solo mencionado en un comentario).

Por cada criterio que falle, indicá la acción correctiva exacta.
`, { model: 'sonnet', label: 'verify:dia4-calidad', phase: 'Verificación', schema: VERIFICACION_SCHEMA }),

  () => agent(`
Revisá seguridad del Día 4 de PULSO en C:\\Users\\Cript\\pulso-exchange.

CHECKLIST:
1. GROQ_API_KEY solo se usa desde el backend (apps/api), nunca expuesta al frontend ni hardcodeada en el código.
2. El motor de bots NUNCA firma ni envía transacciones reales a un exchange ni a una wallet — solo simula contra precios de lectura pública.
3. El endpoint /api/ai/ask no permite que el usuario inyecte instrucciones que rompan el system prompt de forma trivial (revisar si hay algún sanitizado mínimo o si el contexto del usuario se concatena de forma insegura al system prompt).
4. El rate limiter de IA no se puede bypassear fácilmente (ej. si solo mira una IP y el server está detrás de proxy, revisar si usa el header correcto o si es aceptable para este alcance).
5. No hay SQL injection en las queries de bots.py (uso de parámetros, no concatenación de strings en SQL).

Por cada problema, indicá archivo, línea aproximada y corrección.
`, { model: 'sonnet', label: 'verify:dia4-seguridad', phase: 'Verificación', schema: VERIFICACION_SCHEMA }),

])

const completados = [bots, tendencias, ia].filter(r => r && r.estado !== 'fallo').map(r => r.modulo)
const issues = [bots, tendencias, ia].flatMap(r => r ? r.issues : [])
const verIssues = [calidad, seguridad].filter(Boolean).filter(v => !v.aprobado).flatMap(v => v.accionesCorrectivas)

log(`✅ Completados: ${completados.join(', ')}`)
if (issues.length) log(`⚠️  Issues: ${issues.join(' | ')}`)
if (verIssues.length) log(`🔧 Acciones correctivas: ${verIssues.join(' | ')}`)

return {
  dia: 4,
  completados,
  issues: [...issues, ...verIssues],
  listo: completados.length >= 3 && verIssues.length === 0,
}
