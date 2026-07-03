# PROMPT MAESTRO — PULSO: plataforma tipo exchange non-custodial (MVP en 5 días)

## ROL
Actuá como arquitecto de software senior especializado en Web3/DeFi con 10+ años construyendo productos financieros. Escribís Solidity nivel auditor (OpenZeppelin, Foundry, patrones de seguridad) y frontend de nivel producto (design systems, animaciones performantes). Tomás decisiones vos mismo, no preguntás salvo bloqueo real, y cada día termina con algo demoable y commiteado.

## QUÉ ES PULSO (alcance — leer primero)
- Plataforma tipo exchange **non-custodial**: el usuario conecta su wallet (MetaMask), nosotros NUNCA custodiamos fondos ni pedimos seeds/keys. La seguridad máxima es por diseño: sin custodia no hay honeypot.
- NO es un exchange custodial regulado (eso requiere licencia PSAV/CNV en Argentina). Es un producto demo-grade con datos reales de mercado + contratos reales en **Sepolia testnet**, pensado para Argentina y el mundo (i18n ES/EN).
- Objetivo dual: producto demoable en vivo + pieza de portfolio Web3 de primer nivel.
- Proyecto en `C:\Users\Cript\pulso-exchange` (monorepo: `/apps/web`, `/apps/api`, `/contracts`).

## ENTORNO (restricciones duras de esta máquina — NO ignorar)
- Windows 11, PowerShell 5.1: NO usar `&&` para encadenar comandos (usar `;` o comandos separados).
- **NO usar Next.js**: dev/build se cuelgan determinísticamente en esta máquina. Usar **Vite + React** (vite build sí funciona).
- Foundry ya instalado: correr `forge`/`cast` desde **Git Bash** (PATH `~/.foundry/bin`).
- API de Binance: usar `data-api.binance.vision` (api.binance.com devuelve HTTP 451 desde clouds).
- IA: usar **Groq** (gratis y funciona en Argentina; Gemini free tier tiene quota=0 acá). Key en `.env` del backend, jamás en el frontend.
- Archivos con secrets: cuidado con BOM al escribir `.env`/secrets desde PowerShell (usar `-Encoding utf8` o el tool Write).

## STACK
- **Frontend**: Vite + React 18 + TypeScript + Tailwind CSS + framer-motion + wagmi v2 + viem + RainbowKit. Gráficos con lightweight-charts (velas) y recharts o sparklines SVG propios.
- **Contratos**: Solidity 0.8.x + Foundry + OpenZeppelin. Red: Sepolia.
- **Backend**: FastAPI (Python 3.11+) — agregador de datos con cache + proxy de IA. SQLite para estado de bots.
- **Deploy**: frontend en Vercel (build estático), backend en Render (Web Service free tier: incluir health endpoint con soporte GET y HEAD).

## IDENTIDAD VISUAL (futurista neón)
- Tema oscuro: fondo `#0A0118` → `#0D0221`, superficies con glassmorphism (blur + borde 1px semitransparente).
- Paleta neón: violeta `#8B5CF6`, púrpura eléctrico `#A855F7`, magenta `#EC4899`, fucsia `#FF2E9F`. Verde/cian `#22D3EE` solo para variaciones positivas, rojo `#F43F5E` para negativas.
- Efectos: glow neón (box-shadow con color de acento), gradientes violeta→magenta en CTAs y títulos, bordes con brillo en hover, grid/starfield sutil de fondo.
- Animaciones (framer-motion): transiciones de página, counters animados en números, shimmer en skeletons, micro-interacciones en hover. Todo 60fps, respetar `prefers-reduced-motion`.
- Tipografía: Space Grotesk (display) + Inter (texto). Números tabulares (`font-variant-numeric: tabular-nums`) en toda cifra de precio.
- Contraste AA mínimo sobre fondo oscuro. Responsive mobile-first.
- Definir design tokens (colores, spacing, radios, sombras) en un solo lugar antes de escribir componentes.

## MÓDULOS

### 1. Mercado — Top 100
- CoinGecko `GET /api/v3/coins/markets?vs_currency=usd&per_page=100&sparkline=true&price_change_percentage=24h,7d`.
- Tabla: rank, logo, nombre, precio, 24h%, 7d%, sparkline 7d, market cap, volumen. Búsqueda y orden por columna.
- Detalle de moneda: gráfico de velas con klines de `data-api.binance.vision/api/v3/klines` (fallback: chart de CoinGecko si el par no existe en Binance).
- Cache de 60s en el backend (CoinGecko free es rate-limited). El frontend consume SIEMPRE el backend, nunca las APIs directo.

### 2. DeFi — mejores protocolos
- DefiLlama `GET https://api.llama.fi/protocols` (gratis, sin key): top por TVL, categoría, cadenas, cambio 7d.
- Filtros por categoría (DEX, Lending, Liquid Staking...) y por cadena. Badge de riesgo simple (TVL alto + antigüedad = menor riesgo relativo).

### 3. Earn Argentina — comparador de cuentas remuneradas ARS y USD
- Comparador de rendimientos: cuentas remuneradas en pesos de exchanges/fintechs locales, APY de stablecoins (USDT/USDC), y cotizaciones dólar cripto/MEP.
- Fuente: API de CriptoYa donde exista endpoint estable (documentar cuáles se usan); lo que no tenga endpoint va en una tabla curada en el backend, fácil de actualizar, con fecha de última actualización visible.
- Es un COMPARADOR informativo, no ofrecemos rendimientos nosotros. Disclaimer visible.

### 4. Staking on-chain (Solidity — el corazón del proyecto)
- `PulsoToken.sol`: ERC20 de prueba con faucet público (max claim por address por día).
- `PulsoStaking.sol`: stake/unstake/claim con recompensas por segundo proporcionales al stake (patrón rewardPerTokenStored estilo Synthetix). Sin loops unbounded.
- Seguridad obligatoria: checks-effects-interactions, ReentrancyGuard, SafeERC20, Ownable2Step, Pausable, custom errors, eventos en toda mutación de estado, sin delegatecall ni assembly.
- Foundry: tests unitarios + fuzz + al menos 1 test de invariante (totalStaked == suma de balances). Deploy + verify en Sepolia con script de forge.
- UI: conectar wallet, faucet, stake/unstake/claim con estados de tx (pending/confirmed/error), APR visible, link a Etherscan.

### 5. Bots de trading (spot y futuros) — PAPER TRADING
- Simulador contra precios reales de `data-api.binance.vision` (spot) y `fapi` equivalente vía data-api si está disponible; si no, simular futuros con precio spot + leverage matemático.
- Estrategias: DCA periódico, Grid, cruce de SMA (momentum). Parámetros configurables por bot.
- Backend: motor de simulación con estado en SQLite (posiciones, trades, PnL). Loop de evaluación cada 60s.
- UI: crear bot (wizard), lista con PnL en vivo, equity curve, historial de trades, pausar/eliminar. Etiqueta permanente "PAPER TRADING — fondos simulados".
- PROHIBIDO: órdenes reales contra cualquier exchange, y prometer rentabilidad en cualquier texto.

### 6. Tendencias
- Fear & Greed Index: `https://api.alternative.me/fng/` (gauge animado).
- Trending: CoinGecko `/search/trending`. Ganadores/perdedores 24h del top 100. Dominancia BTC y market cap global: CoinGecko `/global`.

### 7. Educación
- 8–10 lecciones en contenido estático (markdown renderizado): seguridad de wallets y seeds, qué es staking, riesgos DeFi (impermanent loss, rug pulls), stablecoins y el dólar en Argentina, cómo leer un gráfico, qué es un smart contract, non-custodial vs custodial, cómo detectar scams.
- Quiz de 3-5 preguntas por lección con feedback. Progreso guardado en localStorage (esto no es dato sensible).
- Tono educativo, cero promesas de retorno.

### 8. IA en todas las secciones (Groq)
- Asistente flotante contextual presente en toda la app: recibe la sección actual + un snapshot de los datos visibles (precios, protocolo seleccionado, config del bot) y responde vía backend → Groq (`llama-3.3-70b-versatile`).
- Acciones por sección: "explicame esta métrica", "resumí este protocolo y sus riesgos", "¿qué riesgo tiene esta config de bot?", glosario de términos en las lecciones.
- System prompt con guardrails: solo educativo, NO consejo financiero, NO inventar precios ni datos (usar exclusivamente los datos del contexto provisto; si no están, decirlo), responder en el idioma del usuario.
- Rate limit por IP en el backend para no quemar la key.

## SEGURIDAD (pilar del producto — aplicar en todo)
- **Contratos**: todo lo listado en módulo 4; correr `slither` si está disponible y arreglar findings de severidad media+.
- **Web/API**: keys solo en backend (`.env` + `.env.example` documentado), CORS restringido al dominio del front, rate limiting, validación de inputs con Pydantic, headers de seguridad (CSP, X-Frame-Options), HTTPS en producción.
- **Producto**: nunca pedir seed/private key en ningún flujo, el usuario firma solo transacciones explícitas que ve en su wallet, disclaimers visibles ("testnet", "paper trading", "no es consejo financiero"), página /security explicando el modelo non-custodial.

## PLAN DE 5 DÍAS
- **Día 1**: scaffolding del monorepo, design system completo (tokens + componentes base: Card, Table, Button, Badge, Skeleton, Layout con nav), backend FastAPI con endpoints de mercado, módulo Mercado top 100 funcionando con datos reales.
- **Día 2**: contratos PulsoToken + PulsoStaking, suite de tests Foundry (unit + fuzz + invariante), deploy y verificación en Sepolia, faucet operativo.
- **Día 3**: wallet connect (RainbowKit), UI de Staking completa contra Sepolia, módulos DeFi y Earn Argentina.
- **Día 4**: motor de bots paper trading + UI de bots, módulo Tendencias, asistente de IA integrado en todas las secciones.
- **Día 5**: Educación + quizzes, i18n ES/EN, pulido visual final (animaciones, estados vacíos, estados de error, responsive), deploy de front (Vercel) y API (Render), README con screenshots, QA de punta a punta.

## CRITERIOS DE CALIDAD
- Cada día cierra con la app corriendo y commit con mensaje descriptivo.
- Cero "lorem ipsum" y cero datos falsos hardcodeados donde exista API real; las tablas curadas (Earn AR) llevan fecha de actualización.
- API caída → estado de error elegante con retry, nunca pantalla rota ni spinner infinito.
- TypeScript estricto en el front, tipado Pydantic en el back.
- README (ES + EN corto): qué es, arquitectura, screenshots, links a contratos verificados en Etherscan y al deploy en vivo, cómo correr local.
- Git desde el Día 1; al final del Día 5 el repo se publica en GitHub (cuenta guillemustafa-ux, repo público `pulso-exchange`) — nunca commitear `.env` ni keys (verificar .gitignore antes del primer commit).

## QUÉ NO HACER
- No custodiar fondos, no mainnet, no KYC real, no órdenes reales, no prometer rentabilidad.
- No Next.js. No exponer keys en el frontend. No usar `&&` en PowerShell.
- No pedir confirmación para avanzar: ejecutá el plan día por día y reportá al final de cada día qué quedó demoable y qué sigue.

## EMPEZÁ AHORA
Arrancá por el Día 1. Al terminar cada día, entregá un resumen de estado: qué funciona, qué falta, y cualquier decisión técnica que hayas tomado distinta a este spec (con el porqué).
