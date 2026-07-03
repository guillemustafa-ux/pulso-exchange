export const meta = {
  name: 'pulso-master',
  description: 'PULSO exchange: orquesta los 5 días de construcción secuencialmente, acumula estado entre días',
  phases: [
    { title: 'Día 1 — Scaffold + Mercado' },
    { title: 'Día 2 — Contratos Solidity' },
    { title: 'Día 3 — Wallet + Staking UI + DeFi + Earn AR' },
    { title: 'Día 4 — Bots + Tendencias + IA' },
    { title: 'Día 5 — Educación + Deploy + QA' },
  ],
}

// Estado acumulado entre días: cada día lo lee y lo extiende
let estado = {
  diasCompletados: [],
  issues: [],          // issues que bloquean días siguientes
  contractAddresses: {},
  deployUrls: {},
  modulosListos: [],
}

// ── DÍA 1 ────────────────────────────────────────────────────────────────────
phase('Día 1 — Scaffold + Mercado')

const dia1 = (await workflow({ scriptPath: 'C:/Users/Cript/pulso-exchange/workflows/dia-1.js' })) || {}

estado.diasCompletados.push(1)
estado.modulosListos.push(...(dia1.completados || []))
if (dia1.issues) estado.issues.push(...dia1.issues)

log(`Día 1 terminado. Módulos: ${estado.modulosListos.join(', ')}`)

if (!dia1.listo) {
  log('⚠️  Día 1 tiene issues críticos. Revisá antes de continuar.')
  // El master NO aborta: continúa para que los agentes del Día 2 también detecten y corrijan.
}

// ── DÍA 2 ────────────────────────────────────────────────────────────────────
phase('Día 2 — Contratos Solidity')

const dia2 = (await workflow({ scriptPath: 'C:/Users/Cript/pulso-exchange/workflows/dia-2.js' })) || {}

estado.diasCompletados.push(2)
estado.modulosListos.push(...(dia2.completados || []))
if (dia2.issues) estado.issues.push(...dia2.issues)
if (dia2.contractAddresses) Object.assign(estado.contractAddresses, dia2.contractAddresses)

log(`Día 2 terminado. Deploy info: ${dia2.deployInfo || 'ver contracts/deployments/sepolia.json'}`)

// ── DÍA 3 ────────────────────────────────────────────────────────────────────
phase('Día 3 — Wallet + Staking UI + DeFi + Earn AR')

const dia3 = await agent(`
CONTEXTO ACUMULADO DEL PROYECTO PULSO:
- Día 1 completado: ${estado.modulosListos.filter(m => ['scaffold','design-system','backend','mercado'].includes(m)).join(', ')}
- Contratos deployados en Sepolia: ${JSON.stringify(estado.contractAddresses)}
- Issues pendientes: ${estado.issues.join(' | ') || 'ninguno'}

BASE DEL CÓDIGO: C:\\Users\\Cript\\pulso-exchange

TAREA DÍA 3 — ejecutar en paralelo:

A) WALLET CONNECT + UI STAKING:
1. Configurar RainbowKit en apps/web/src/main.tsx: WagmiConfig + QueryClientProvider + RainbowKitProvider con tema darkTheme + accentColor violeta.
2. Crear src/components/WalletButton.tsx: botón Connect Wallet con estado conectado (muestra address truncada + ENS si existe).
3. Crear src/pages/Staking.tsx:
   - Panel de conexión de wallet (si no está conectado).
   - Sección Faucet: botón "Reclamar 100 PULSO", estado de cooldown con countdown, estado pending/confirmed/error.
   - Sección Stake: input de monto + botón Stake, balance disponible, balance stakeado.
   - Sección Claim: rewards pendientes con APR estimado, botón Claim.
   - Botón Exit (unstake total + claim).
   - Todos los estados de tx: spinner pending, link a Etherscan al confirmar, mensaje de error.
   - Addresses de contratos desde apps/web/src/contracts/addresses.ts (leer de contracts/deployments/sepolia.json).
   - ABIs en apps/web/src/contracts/abi/.

B) MÓDULO DEFI:
1. Crear router GET /api/defi/protocols en el backend: consume https://api.llama.fi/protocols, retorna top 50 por TVL con campos: name, tvl, category, chains, change_7d, logo. Cache 5 min.
2. Crear src/pages/DeFi.tsx:
   - Cards de protocolos (usar Card.tsx), no tabla (hay logos y muchos datos).
   - Filtros por categoría (DEX, Lending, Liquid Staking, Bridge...) y por cadena (Ethereum, Arbitrum, etc.).
   - Badge de riesgo relativo: TVL > $1B + antigüedad > 2 años = "Establecido", < $100M = "Alto Riesgo".
   - Estado de carga con Skeleton, estado de error con retry.

C) MÓDULO EARN ARGENTINA:
1. Crear apps/api/data/earn_ar.json: tabla curada con al menos 8 entradas.
   Campos por entrada: nombre, tipo (exchange_ar|fintech|defi), moneda (ARS|USDT|USDC|BTC), apy_aprox, url, ultima_actualizacion.
   Incluir: Lemon, Belo, Buenbit, Ripio, Bitso, Cocos Capital, Aave (USDC), dYdX.
   Agregar disclaimer: "Tasas aproximadas al [fecha]. Verificá siempre antes de invertir. Esto no es asesoramiento financiero."
2. GET /api/earn/ar: devuelve esa tabla + cotizaciones de CriptoYa (dólar MEP, CCL, USDT-ARS). Cache 10 min.
3. Crear src/pages/Earn.tsx: tabla comparativa ordenada por APY, con badge de moneda, disclaimer destacado.

Corré el servidor de dev de React (npm run dev en apps/web) y verificá que las tres páginas renderizan sin errores de consola.
Al final, commiteá con: "feat: wallet connect, staking UI, DeFi protocols, Earn Argentina"
`, {
  model: 'sonnet',
  label: 'dia3:wallet+defi+earn',
  phase: 'Día 3 — Wallet + Staking UI + DeFi + Earn AR',
  schema: {
    type: 'object',
    properties: {
      completados: { type: 'array', items: { type: 'string' } },
      issues: { type: 'array', items: { type: 'string' } },
      listo: { type: 'boolean' },
    },
    required: ['completados', 'issues', 'listo'],
  },
})

estado.diasCompletados.push(3)
estado.modulosListos.push(...((dia3 && dia3.completados) || []))
if (dia3 && dia3.issues) estado.issues.push(...dia3.issues)

// ── DÍA 4 ────────────────────────────────────────────────────────────────────
phase('Día 4 — Bots + Tendencias + IA')

const [bots, tendencias, ia] = await parallel([

  () => agent(`
CONTEXTO: Proyecto PULSO en C:\\Users\\Cript\\pulso-exchange. Backend FastAPI en apps/api, frontend Vite+React en apps/web.

TAREA: Motor de bots paper trading (backend + frontend).

BACKEND (apps/api/routers/bots.py + motor/):
- Base de datos SQLite (aiosqlite) con tablas: bots, positions, trades.
- Modelo Bot: id, nombre, estrategia (DCA|GRID|SMA), par (ej: BTCUSDT), capital_inicial, capital_actual, params (JSON), estado (activo|pausado), creado_at.
- Motor de simulación: loop asyncio cada 60s. Obtiene precio de data-api.binance.vision/api/v3/ticker/price.
  - DCA: compra cada N segundos (configurable). Capital fijo por orden.
  - GRID: coloca órdenes a niveles de precio fijos por encima y debajo del precio actual.
  - SMA: cruza SMA corta y larga sobre últimas N velas, compra en cruce alcista, vende en bajista.
- Calcular PnL: (precio_actual * cantidad_total) - capital_invertido.
- Endpoints:
  POST /api/bots/ — crear bot (wizard params)
  GET /api/bots/ — listar con PnL en tiempo real
  GET /api/bots/{id}/trades — historial de trades
  PATCH /api/bots/{id}/estado — pausar/activar
  DELETE /api/bots/{id} — eliminar

FRONTEND (apps/web/src/pages/Bots.tsx):
- Wizard de creación: 3 pasos (estrategia → par + capital → parámetros de estrategia).
- Lista de bots activos: nombre, estrategia, par, PnL en USD y %, equity curve mini (recharts LineChart).
- Detalle de bot: equity curve completa, historial de trades en tabla, botón pausar/eliminar.
- Banner permanente en rojo: "PAPER TRADING — Fondos y operaciones completamente simulados".
- Polling de datos cada 15s (no WebSocket por simplicidad).

PROHIBIDO: conectar a ningún exchange real, ejecutar órdenes reales.
`, {
    model: 'sonnet',
    label: 'dia4:bots',
    phase: 'Día 4 — Bots + Tendencias + IA',
    schema: {
      type: 'object',
      properties: {
        completados: { type: 'array', items: { type: 'string' } },
        issues: { type: 'array', items: { type: 'string' } },
        listo: { type: 'boolean' },
      },
      required: ['completados', 'issues', 'listo'],
    },
  }),

  () => agent(`
CONTEXTO: Proyecto PULSO en C:\\Users\\Cript\\pulso-exchange.

TAREA: Módulo Tendencias.

BACKEND (apps/api/routers/trends.py):
- GET /api/trends/fear-greed: proxy a https://api.alternative.me/fng/?limit=30. Cache 1h.
- GET /api/trends/summary: combina en un solo endpoint:
  - Fear & Greed actual (valor 0-100 + label).
  - Trending coins de CoinGecko /search/trending (top 7).
  - Ganadores y perdedores 24h: top 5 de cada uno del top 100 ya en caché.
  - Market cap global y dominancia BTC de CoinGecko /global.

FRONTEND (apps/web/src/pages/Trends.tsx):
- Gauge animado de Fear & Greed: SVG semicircular, aguja animada con framer-motion, color según valor (0-25 rojo, 26-50 naranja, 51-75 verde claro, 76-100 verde intenso). Histórico de 30 días con recharts AreaChart.
- Sección Trending: cards con logo, nombre, precio y rank de trending. Fondo con glow violeta.
- Tablas Ganadores / Perdedores: top 5 cada una, compactas, con % en color.
- Dominancia BTC: donut chart simple con recharts PieChart (BTC vs resto).
`, {
    model: 'sonnet',
    label: 'dia4:tendencias',
    phase: 'Día 4 — Bots + Tendencias + IA',
    schema: {
      type: 'object',
      properties: {
        completados: { type: 'array', items: { type: 'string' } },
        issues: { type: 'array', items: { type: 'string' } },
        listo: { type: 'boolean' },
      },
      required: ['completados', 'issues', 'listo'],
    },
  }),

  () => agent(`
CONTEXTO: Proyecto PULSO en C:\\Users\\Cript\\pulso-exchange. IA usa Groq (GROQ_API_KEY en apps/api/.env).

TAREA: Asistente de IA contextual integrado en toda la app.

BACKEND (apps/api/routers/ai.py):
- POST /api/ai/ask con body: { pregunta: string, seccion: string, contexto: object }
  - contexto: snapshot de los datos visibles (precios, protocolo seleccionado, config del bot, etc.)
  - Llamar a Groq con modelo llama-3.3-70b-versatile.
  - System prompt:
    "Sos un asistente educativo de finanzas crypto para la plataforma PULSO.
     REGLAS: 1) Solo educativo, nunca consejo financiero. 2) No inventés precios ni datos: usá solo los datos del campo 'contexto' provisto. Si no tenés el dato, decilo. 3) Respondé en el mismo idioma que la pregunta. 4) Respuestas concisas (máx 3 párrafos). 5) Siempre aclarás que los bots son paper trading y que nada es consejo de inversión."
  - Contexto del sistema se pasa como primer mensaje de rol 'user' con los datos del campo contexto.
  - Rate limit: máx 20 requests por IP por hora (middleware manual con dict en memoria).
  - Si se supera el límite: 429 con mensaje amigable.

FRONTEND:
- src/components/AIAssistant.tsx: botón flotante (esquina inferior derecha), ícono de chat con glow magenta.
  Al abrirse: panel lateral (drawer) con:
  - Campo de texto para la pregunta.
  - Selector de pregunta rápida según la sección actual:
    /market → "¿Qué significa market cap?", "¿Cómo leer el gráfico de velas?"
    /staking → "¿Qué es el APR?", "¿Qué riesgo tiene el staking?"
    /defi → "¿Qué es TVL?", "¿Qué es un rug pull?"
    /bots → "¿Qué riesgo tiene esta config?", "¿Qué es DCA?"
    /trends → "¿Qué significa Fear & Greed?"
  - Respuesta con efecto de typewriter (framer-motion stagger).
  - Disclaimer fijo al pie: "IA educativa. No es consejo financiero."
- Hook src/hooks/useSection.ts: devuelve la sección actual según la ruta.
- El contexto se arma en cada página y se pasa al AIAssistant via prop o context.
`, {
    model: 'sonnet',
    label: 'dia4:ia',
    phase: 'Día 4 — Bots + Tendencias + IA',
    schema: {
      type: 'object',
      properties: {
        completados: { type: 'array', items: { type: 'string' } },
        issues: { type: 'array', items: { type: 'string' } },
        listo: { type: 'boolean' },
      },
      required: ['completados', 'issues', 'listo'],
    },
  }),
])

estado.diasCompletados.push(4)
const dia4completados = [bots, tendencias, ia].filter(Boolean).flatMap(r => r.completados || [])
estado.modulosListos.push(...dia4completados)
const dia4issues = [bots, tendencias, ia].filter(Boolean).flatMap(r => r.issues || [])
if (dia4issues.length) estado.issues.push(...dia4issues)

// ── DÍA 5 ────────────────────────────────────────────────────────────────────
phase('Día 5 — Educación + Deploy + QA')

const dia5 = await agent(`
CONTEXTO FINAL DEL PROYECTO PULSO:
- Días completados: ${estado.diasCompletados.join(', ')}
- Módulos listos: ${estado.modulosListos.join(', ')}
- Issues pendientes: ${estado.issues.join(' | ') || 'ninguno'}
- Contratos: ${JSON.stringify(estado.contractAddresses)}

BASE: C:\\Users\\Cript\\pulso-exchange

TAREA DÍA 5 — ejecutar secuencialmente:

1. MÓDULO EDUCACIÓN (apps/web/src/pages/Education.tsx):
   Crear 8 lecciones en apps/web/src/content/lessons/ (archivos .md):
   01-wallets-y-seeds.md, 02-que-es-staking.md, 03-riesgos-defi.md,
   04-stablecoins-y-dolar-ar.md, 05-como-leer-graficos.md,
   06-smart-contracts.md, 07-custodial-vs-noncustodial.md, 08-como-detectar-scams.md

   Cada lección: título, 3-4 párrafos educativos con info real y actual, 4 preguntas de quiz con una respuesta correcta.
   Renderizar con react-markdown. Quiz interactivo: feedback inmediato (verde/rojo), progreso en localStorage.
   Nav entre lecciones. Barra de progreso del curso.

2. I18N ES/EN:
   Usar react-i18next. Archivos en apps/web/src/locales/es.json y en.json.
   Traducir: nav items, labels de botones, disclaimers, nombres de secciones, mensajes de error.
   (El contenido de las lecciones puede quedar solo en español por ahora — agregar una nota en el README).
   Selector de idioma en el header (ES | EN).

3. PULIDO VISUAL FINAL:
   - Revisar que TODOS los estados de error sean elegantes (no pantallas rotas, no spinner infinito).
   - Verificar que los estados vacíos tengan ilustración/mensaje amigable.
   - Revisar responsive en mobile (380px) en todas las páginas.
   - Asegurar que prefers-reduced-motion deshabilita todas las animaciones de framer-motion.
   - Página /security: explicar en texto claro qué es non-custodial y por qué PULSO nunca toca fondos del usuario.

4. DEPLOY:
   A) Frontend en Vercel:
      - vercel.json en apps/web/ con rewrites para SPA.
      - Variables de entorno: VITE_API_URL=URL-del-backend-en-Render.
      - Correr: vercel --prod (si Vercel CLI está disponible) o indicar los pasos exactos.

   B) Backend en Render:
      - Crear render.yaml en la raíz del proyecto con el servicio web (apps/api, startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT).
      - Variables de entorno a configurar en el dashboard de Render (listarlas).
      - Verificar que GET y HEAD en /health responden 200.

5. README.md (raíz del proyecto):
   Secciones:
   - ¿Qué es PULSO? (3 líneas, ES+EN)
   - Arquitectura (diagrama ASCII: frontend → backend → [CoinGecko|Binance|DefiLlama|CriptoYa|Groq])
   - Módulos (lista con bullets)
   - Contratos en Sepolia (links a Etherscan de PulsoToken y PulsoStaking)
   - Deploy en vivo (link Vercel)
   - Cómo correr local (pasos para apps/web y apps/api)
   - Disclaimer de seguridad

6. COMMIT FINAL:
   git add (archivos específicos, nunca -A para evitar commitear .env).
   git commit -m "feat: Día 5 — Educación, i18n, pulido, deploy. MVP PULSO completo."
   git remote add origin https://github.com/guillemustafa-ux/pulso-exchange.git (si no existe)
   Indicar al usuario que debe hacer el push a mano después de revisar.

7. QA FINAL:
   Listá qué funciona, qué quedó parcial y qué NO se pudo completar en los 5 días.
   Sé honesto, no exageres lo completado.
`, {
  model: 'sonnet',
  label: 'dia5:educacion+deploy+qa',
  phase: 'Día 5 — Educación + Deploy + QA',
  schema: {
    type: 'object',
    properties: {
      completados: { type: 'array', items: { type: 'string' } },
      issues: { type: 'array', items: { type: 'string' } },
      deployUrls: { type: 'object' },
      qaResumen: { type: 'string' },
      listo: { type: 'boolean' },
    },
    required: ['completados', 'issues', 'qaResumen', 'listo'],
  },
})

estado.diasCompletados.push(5)
if (dia5 && dia5.deployUrls) Object.assign(estado.deployUrls, dia5.deployUrls)

// ── RESUMEN FINAL ─────────────────────────────────────────────────────────────
log('🚀 PULSO MVP — Build completado')
log(`Días: ${estado.diasCompletados.join(', ')}`)
log(`Módulos: ${estado.modulosListos.join(', ')}`)
log(`Deploy: ${JSON.stringify(estado.deployUrls)}`)
if (dia5 && dia5.qaResumen) log(`QA: ${dia5.qaResumen}`)

return {
  proyecto: 'PULSO',
  diasCompletados: estado.diasCompletados,
  modulosListos: estado.modulosListos,
  contractAddresses: estado.contractAddresses,
  deployUrls: estado.deployUrls,
  issuesPendientes: estado.issues.slice(-10), // últimos 10 para no saturar
  qaResumen: (dia5 && dia5.qaResumen) || 'sin QA — el agente del Día 5 no devolvió resultado',
}
