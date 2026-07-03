export const meta = {
  name: 'pulso-dia-1',
  description: 'PULSO Día 1: scaffold monorepo, design system, backend FastAPI, módulo Mercado top 100',
  phases: [
    { title: 'Scaffold' },
    { title: 'Paralelo: Design System + Backend' },
    { title: 'Mercado' },
    { title: 'Verificación' },
  ],
}

const ENTORNO = `
ENTORNO WINDOWS (restricciones duras):
- PowerShell 5.1: NO usar && para encadenar comandos. Usar ; o comandos separados.
- NO crear proyectos con Next.js. Frontend: Vite + React 18 + TypeScript.
- Foundry: correr forge/cast desde Git Bash (PATH ~/.foundry/bin).
- Binance: usar data-api.binance.vision (api.binance.com da 451).
- IA/LLM: usar Groq (Gemini quota=0 en Argentina).
- BOM: al escribir .env desde PowerShell usar -Encoding utf8.
- Directorio raíz del proyecto: C:\\Users\\Cript\\pulso-exchange
`

const VISUAL = `
IDENTIDAD VISUAL PULSO:
- Fondo: #0A0118 → #0D0221. Glassmorphism en superficies.
- Neón: violeta #8B5CF6, púrpura #A855F7, magenta #EC4899, fucsia #FF2E9F.
- Positivo: cian #22D3EE. Negativo: rojo #F43F5E.
- Tipografía: Space Grotesk (display) + Inter (texto). Números: font-variant-numeric: tabular-nums.
- Animaciones con framer-motion. Respetar prefers-reduced-motion.
- Design tokens en un solo archivo antes de cualquier componente.
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

// ── FASE 1: Scaffold del monorepo ────────────────────────────────────────────
phase('Scaffold')

const scaffold = await agent(`
${ENTORNO}

TAREA: Crear el scaffold completo del monorepo PULSO en C:\\Users\\Cript\\pulso-exchange.

Estructura a crear:
pulso-exchange/
  apps/
    web/          ← Vite + React 18 + TypeScript + Tailwind + framer-motion + wagmi v2 + viem + RainbowKit
    api/          ← FastAPI Python 3.11+, SQLite
  contracts/      ← Foundry (ya hay forge disponible en Git Bash)
  .gitignore      ← incluir .env, node_modules, dist, __pycache__, out/, cache/
  README.md       ← placeholder con nombre PULSO

Pasos:
1. Crear apps/web con: npm create vite@latest web -- --template react-ts (desde PowerShell en apps/).
   Luego instalar: cd apps/web ; npm install tailwindcss @tailwindcss/vite framer-motion wagmi viem @rainbow-me/rainbowkit lightweight-charts recharts
2. Crear apps/api/: estructura FastAPI (main.py, requirements.txt con fastapi uvicorn httpx pydantic python-dotenv aiosqlite).
3. En contracts/: init con forge init --no-git (ya existe el repo git en la raíz).
4. Crear .env.example en apps/api/ con: GROQ_API_KEY=, COINGECKO_API_KEY= (opcional), PORT=8000
5. Git init en la raíz si no existe. Primer commit con mensaje "chore: scaffold monorepo PULSO".

Ejecutá todo. Reportá archivos creados y cualquier error.
`, { model: 'sonnet', label: 'scaffold:monorepo', phase: 'Scaffold', schema: RESULTADO_SCHEMA })

if (!scaffold) {
  log('❌ Scaffold sin resultado (agente caído) — las fases siguientes lo van a detectar')
} else if (scaffold.estado === 'fallo') {
  log(`❌ Scaffold falló: ${scaffold.issues.join(', ')}`)
}

// ── FASE 2: Design System + Backend en paralelo ──────────────────────────────
phase('Paralelo: Design System + Backend')

const [designSystem, backend] = await parallel([

  () => agent(`
${ENTORNO}
${VISUAL}

El scaffold de Vite+React ya existe en C:\\Users\\Cript\\pulso-exchange\\apps\\web.

TAREA: Crear el design system completo de PULSO.

1. Crear src/tokens/index.ts con los design tokens (colores, spacing, border-radius, shadows neón, z-index).
2. Configurar tailwind.config.ts extendiendo con esos tokens.
3. Crear src/components/ui/ con estos componentes (TypeScript estricto, export named):
   - Card.tsx: glassmorphism, borde semitransparente, glow en hover
   - Button.tsx: variantes primary (gradiente violeta→magenta), secondary (ghost), danger. Estados: loading spinner, disabled.
   - Badge.tsx: variantes success (cian), danger (rojo), neutral (gris), info (violeta). Tamaños sm/md.
   - Skeleton.tsx: shimmer animado con los colores del tema.
   - Table.tsx: columnas tipadas, ordenable por columna, búsqueda, paginación, estado vacío elegante.
   - Spinner.tsx: ring animado con color neón.
4. Crear src/components/layout/Layout.tsx: nav lateral (desktop) / bottom nav (mobile), header con logo PULSO (texto con gradiente violeta→magenta), slot para contenido.
5. Crear src/styles/globals.css: imports de Space Grotesk e Inter desde Google Fonts, variables CSS para los tokens, scrollbar estilizado.
6. Actualizar src/main.tsx y src/App.tsx para usar el Layout y mostrar una pantalla de inicio placeholder con el logo animado.

NO crear páginas de cada módulo todavía, solo los componentes base y el layout.
`, { model: 'sonnet', label: 'dia1:design-system', phase: 'Paralelo: Design System + Backend', schema: RESULTADO_SCHEMA }),

  () => agent(`
${ENTORNO}

El scaffold de FastAPI ya existe en C:\\Users\\Cript\\pulso-exchange\\apps\\api.

TAREA: Implementar el backend FastAPI con los endpoints del Día 1.

1. main.py con:
   - CORS restringido (origins desde env var ALLOWED_ORIGINS, default localhost:5173 para dev).
   - Rate limiting básico con slowapi o middleware manual (max 60 req/min por IP).
   - Health endpoint GET /health y HEAD /health (Render los necesita ambos).
   - Logging estructurado con nivel configurable por env.

2. Módulo routers/market.py:
   - GET /api/market/top100: llama a CoinGecko /coins/markets con vs_currency=usd, per_page=100, sparkline=true, price_change_percentage=24h,7d. Cache en memoria de 60 segundos (usar asyncio + timestamp, no Redis).
   - GET /api/market/klines/{symbol}: proxy a data-api.binance.vision/api/v3/klines con params interval y limit. Fallback a CoinGecko chart si Binance no tiene el par.
   - GET /api/market/global: CoinGecko /global (dominancia BTC, market cap total). Cache 5 min.
   - GET /api/market/trending: CoinGecko /search/trending. Cache 5 min.

3. Modelos Pydantic en schemas/market.py para las respuestas.

4. requirements.txt actualizado. Crear .env a partir de .env.example.

5. Verificar que el servidor arranca: uvicorn main:app --reload --port 8000
   y que GET http://localhost:8000/api/market/top100 responde con datos reales de CoinGecko.

Reportá si algún endpoint no responde con datos reales.
`, { model: 'sonnet', label: 'dia1:backend', phase: 'Paralelo: Design System + Backend', schema: RESULTADO_SCHEMA }),

])

// ── FASE 3: Módulo Mercado ───────────────────────────────────────────────────
phase('Mercado')

const mercado = await agent(`
${ENTORNO}
${VISUAL}

El design system base existe en apps/web/src/components/ui/ y el backend corre en :8000.

TAREA: Implementar el módulo Mercado completo en el frontend.

1. src/pages/Market.tsx:
   - Tabla con columnas: Rank, Logo+Nombre, Precio (USD), 24h%, 7d%, Sparkline 7d, Market Cap, Volumen.
   - Usar el componente Table.tsx ya creado.
   - Números con Intl.NumberFormat. Porcentajes con color cian (positivo) / rojo (negativo) + icono ▲▼.
   - Sparkline: SVG inline de 60x24px con los datos sparkline_in_7d de CoinGecko. Color según si subió o bajó.
   - Búsqueda por nombre/símbolo (filtrado local después de la primera carga).
   - Ordenar por columna al hacer click en el header.
   - Estado de carga: Skeleton en cada fila (usar Skeleton.tsx). Estado de error: mensaje con botón retry.
   - Al hacer click en una fila, abrir src/pages/CoinDetail.tsx (modal o página).

2. src/pages/CoinDetail.tsx:
   - Header: logo, nombre, precio actual, 24h%.
   - Gráfico de velas con lightweight-charts consumiendo GET /api/market/klines/{SYMBOL}USDT.
   - Selector de timeframe: 1h, 4h, 1d, 1w.
   - Si Binance no tiene el par (404 del backend), mostrar un chart de línea con los datos de CoinGecko.

3. Conectar al backend: src/services/api.ts con función fetchTop100() y fetchKlines(symbol, interval).
   Base URL desde import.meta.env.VITE_API_URL (default http://localhost:8000).

4. Agregar la ruta /market en el router (react-router-dom v6) y en el nav del Layout.

Verificar que la tabla carga con datos reales del backend y el gráfico de velas funciona para BTC.
`, { model: 'sonnet', label: 'dia1:mercado', phase: 'Mercado', schema: RESULTADO_SCHEMA })

// ── FASE 4: Verificación cruzada ─────────────────────────────────────────────
phase('Verificación')

const verificaciones = await parallel([

  () => agent(`
Verificá que el Día 1 de PULSO cumple estos criterios. Revisá los archivos en C:\\Users\\Cript\\pulso-exchange.

CHECKLIST:
1. Estructura monorepo: apps/web, apps/api, contracts existen con contenido real.
2. Design tokens definidos en un solo archivo (src/tokens/index.ts o equivalente).
3. Componentes Card, Button, Badge, Skeleton, Table, Spinner existen y tienen TypeScript estricto (sin any implícito).
4. Backend arranca y GET /api/market/top100 retorna datos reales de CoinGecko (verificar leyendo el código del cache y la llamada HTTP).
5. Health endpoint soporta HEAD (crítico para Render).
6. Tabla de mercado usa datos del backend, no llama a CoinGecko directamente desde el frontend.
7. .gitignore excluye .env, node_modules, dist, __pycache__.
8. No hay ningún .env commiteado (verificar git status).

Por cada criterio que falle, indicá la acción correctiva exacta.
`, { model: 'sonnet', label: 'verify:dia1-calidad', phase: 'Verificación', schema: VERIFICACION_SCHEMA }),

  () => agent(`
Revisá la seguridad del código del Día 1 de PULSO en C:\\Users\\Cript\\pulso-exchange.

CHECKLIST DE SEGURIDAD:
1. Ninguna API key (GROQ, CoinGecko) aparece hardcodeada en el código fuente del frontend (apps/web/src/).
2. La clave GROQ_API_KEY está solo en .env del backend (apps/api/.env) y en .env.example sin valor.
3. CORS del backend tiene origen restringido, no usa "*" en producción.
4. El frontend no hace fetch() directo a APIs externas (todo pasa por el backend).
5. No hay console.log con datos sensibles en el código del backend.

Por cada problema encontrado, indicá el archivo y la línea aproximada, y la corrección.
`, { model: 'sonnet', label: 'verify:dia1-seguridad', phase: 'Verificación', schema: VERIFICACION_SCHEMA }),

])

// ── Acumular y reportar ──────────────────────────────────────────────────────
const completados = [scaffold, designSystem, backend, mercado]
  .filter(r => r && r.estado !== 'fallo')
  .map(r => r.modulo)

const issues = [scaffold, designSystem, backend, mercado]
  .flatMap(r => r ? r.issues : [])
  .filter(Boolean)

const verIssues = verificaciones
  .filter(Boolean)
  .filter(v => !v.aprobado)
  .flatMap(v => v.accionesCorrectivas)

log(`✅ Módulos completados: ${completados.join(', ')}`)
if (issues.length) log(`⚠️  Issues de construcción: ${issues.join(' | ')}`)
if (verIssues.length) log(`🔧 Acciones correctivas pendientes: ${verIssues.join(' | ')}`)

return {
  dia: 1,
  completados,
  issues: [...issues, ...verIssues],
  listo: completados.length >= 3 && verIssues.length === 0,
}
