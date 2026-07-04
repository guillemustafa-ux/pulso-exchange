# PULSO

[![CI](https://github.com/guillemustafa-ux/pulso-exchange/actions/workflows/ci.yml/badge.svg)](https://github.com/guillemustafa-ux/pulso-exchange/actions/workflows/ci.yml)

**ES** — PULSO es un exchange cripto *non-custodial* de demostración: mercado en vivo,
ranking DeFi, comparador Earn Argentina, staking on-chain en Sepolia, bots de paper
trading y un asistente de IA — todo servido por un backend propio que nunca expone tus
claves ni pide tu seed.

**EN** — PULSO is a non-custodial crypto exchange demo: live market data, DeFi
rankings, an Argentina "Earn" comparator, on-chain staking on Sepolia, paper-trading
bots and an AI assistant — all served through our own backend that never touches your
keys or asks for your seed phrase.

## Arquitectura

```
                        ┌────────────────────────────┐
                        │   apps/web                 │
                        │   Vite + React + TS        │
                        │   wagmi v2 + viem + RK      │
                        └──────────────┬─────────────┘
                                        │ HTTPS (fetch, VITE_API_URL)
                                        ▼
                        ┌────────────────────────────┐
                        │   apps/api                 │
                        │   FastAPI — cache TTL +     │
                        │   rate-limit + CORS         │
                        └──────────────┬─────────────┘
                                        │
              ┌───────────┬────────────┼────────────┬───────────┐
              ▼           ▼            ▼            ▼           ▼
         CoinGecko    Binance    DefiLlama      CriptoYa       Groq
        (mercado,   (klines,   (protocolos     (cotizaciones  (asistente
      trending,     precios     DeFi, TVL)      ARS/USD,        IA, llama-
      global)       spot bots)                  Earn AR)      3.3-70b)

                        ┌────────────────────────────┐
        apps/web  ────► │   Contratos — Sepolia       │
    (wagmi/viem,        │   PulsoToken · PulsoStaking │
     RPC público)       └────────────────────────────┘
```

El frontend **nunca** llama a estas APIs externas directo: todo pasa por `apps/api`,
que centraliza cache, rate limiting y manejo de errores (y evita exponer keys en el
cliente). La única excepción es la lectura/escritura on-chain, que va directo del
navegador a Sepolia vía wagmi/viem con la wallet del usuario.

## Módulos

1. **Mercado** — Top 100 (CoinGecko) con tabla ordenable, sparkline 7d y detalle con velas (Binance).
2. **DeFi** — ranking de protocolos por TVL (DefiLlama), filtros por categoría y cadena.
3. **Earn Argentina** — comparador de rendimientos ARS/USD (exchanges, fintechs, DeFi) + cotizaciones dólar cripto/MEP.
4. **Staking on-chain** — stake/unstake/claim reales contra `PulsoStaking` en Sepolia, con faucet y estados de tx.
5. **Bots de trading** — paper trading (DCA, Grid, cruce de SMA) sobre precios reales, sin órdenes reales ni promesas de rentabilidad.
6. **Tendencias** — Fear & Greed Index, trending, ganadores/perdedores 24h, dominancia BTC.
7. **Educación** — lecciones + quizzes sobre seguridad de wallets, staking, riesgos DeFi y detección de scams.
8. **Asistente de IA** — widget flotante contextual (Groq) presente en toda la app, con guardrails: solo educativo, nunca inventa datos ni da consejo financiero.

## Contratos en Sepolia

| Contrato | Address | Estado |
|---|---|---|
| `PulsoToken` | [`0xe8D2f470b0f2F79D025658f825dF1F2aBA3ADB75`](https://sepolia.etherscan.io/address/0xe8D2f470b0f2F79D025658f825dF1F2aBA3ADB75) | Verificado, activo (v2) |
| `PulsoStaking` | [`0x6006EA579603439e22fb090bD5233f1f6fba06df`](https://sepolia.etherscan.io/address/0x6006EA579603439e22fb090bD5233f1f6fba06df) | Verificado, activo (v2) |

La v1 quedó deprecada tras una auditoría interna que encontró un bug económico
(recompensas huérfanas por un edge case del patrón Synthetix) — post-mortem completo,
cuantificación on-chain y el fix de dos capas en [`DESIGN.md`](./DESIGN.md#post-mortem-v1-el-edge-case-del-patrón-synthetix-encontrado-en-casa).

## Cómo correr local

### Frontend (`apps/web`)

Igual en Windows y Unix (npm no cambia entre plataformas):

```bash
cd apps/web
npm install
npm run dev
```

Abre `http://localhost:5173`. Por defecto apunta al backend en `http://localhost:8000`
(`VITE_API_URL` sobreescribe el origin — ver `.env`/deploy más abajo).

### Backend (`apps/api`)

**Windows (PowerShell):**

```powershell
cd apps/api
py -3 -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
copy .env.example .env
.\.venv\Scripts\python -m uvicorn app.main:app --reload
```

**Unix (bash/zsh):**

```bash
cd apps/api
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
cp .env.example .env
./.venv/bin/python -m uvicorn app.main:app --reload
```

Completar `.env` con `GROQ_API_KEY` (ver [`apps/api/.env.example`](./apps/api/.env.example)
para el resto de las variables). API en `http://localhost:8000`.

### Contratos (`contracts`)

```bash
cd contracts
forge build
forge test -vv
```

> En Windows correr `forge`/`cast` desde Git Bash (PATH `~/.foundry/bin`) — ver
> [`contracts/README.md`](./contracts/README.md).

## Deploy

No hay credenciales de Vercel/Render cargadas en este entorno — queda todo preparado
para que el deploy real sea un paso de ~10 minutos.

### Frontend → Vercel

`apps/web/vercel.json` ya trae el build config y los rewrites de SPA.

1. Importar el repo en Vercel, **Root Directory** = `apps/web`.
2. Vercel detecta Vite automáticamente (build `npm run build`, output `dist`) — ya
   queda explícito en `vercel.json` por si el auto-detect falla.
3. Variables de entorno (Project Settings → Environment Variables):
   - `VITE_API_URL` — URL del backend en Render (ej. `https://pulso-api.onrender.com`).
   - `VITE_WALLETCONNECT_PROJECT_ID` — opcional (sin esto, WalletConnect corre en modo
     demo compartido; ver `apps/web/src/lib/wagmi.ts`).
4. Deploy.

### Backend → Render

`render.yaml` en la raíz define el servicio (`apps/api`, Python, `--proxy-headers`).

1. New → **Blueprint**, apuntar al repo (Render lee `render.yaml` solo). Alternativa
   manual: New → Web Service, root `apps/api`.
2. Variables de entorno a configurar en el dashboard de Render (no van en `render.yaml`
   por ser secretas o dependientes del dominio final):
   - `GROQ_API_KEY` — key del asistente de IA.
   - `ALLOWED_ORIGINS` — dominio de Vercel una vez asignado (ej.
     `https://pulso-exchange.vercel.app`).
   - `TRUST_PROXY=1` — Render corre detrás de proxy; sin esto el rate limit por IP
     colapsa en un único bucket global (ver `apps/api/app/middleware.py`).
3. Health check: `/health` (ya lo expone `apps/api/app/routers/health.py`, con `HEAD`
   explícito para el probe de Render).
4. Una vez desplegado, volver a Vercel y setear `VITE_API_URL` con la URL final de
   Render, luego redeploy del frontend.

## Internacionalización (i18n)

El frontend soporta **español (default) e inglés** con `react-i18next` — selector ES | EN
en el header, persistido en `localStorage` (`pulso-lang`). Todo el chrome de la UI (nav,
títulos, botones, disclaimers, errores, wizard de bots) está traducido vía `t('...')`
(`apps/web/src/locales/{es,en}.json`). **Decisión deliberada:** el contenido de las 8
lecciones del módulo Educación queda **solo en español** (son piezas largas de prosa +
quiz, no chrome de interfaz — traducirlas es trabajo editorial, no i18n de UI) y las
respuestas del asistente de IA no se traducen porque el modelo ya responde en el idioma
en que se le pregunta.

## Diseño

Las decisiones de diseño y sus trade-offs (contratos, backend, frontend) están
documentadas en [`DESIGN.md`](./DESIGN.md) — por qué el sistema está construido así,
no solo cómo correrlo.

## Aviso de seguridad

PULSO corre **enteramente en testnet (Sepolia)**: los tokens no tienen valor real y el
staking es una demo educativa (incluye un faucet sybileable a propósito — ver
[`DESIGN.md`](./DESIGN.md#faucet-sybileable--limitación-conocida-y-aceptada)). Los bots
de trading operan en **paper trading**: ninguna orden toca un exchange real. Nada en
esta app es consejo financiero. Más detalle en la página **`/security`** de la app y en
[`DESIGN.md`](./DESIGN.md).
