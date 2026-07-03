# PULSO

Monorepo del exchange PULSO (plataforma tipo exchange non-custodial).

## Estructura

```
pulso-exchange/
  apps/
    web/        # Vite + React 18 + TypeScript + Tailwind + framer-motion + wagmi v2 + viem + RainbowKit
    api/        # FastAPI (Python 3.11+) + SQLite (aiosqlite)
  contracts/    # Foundry (Solidity)
```

## Desarrollo

### Web (`apps/web`)

```bash
cd apps/web
npm install
npm run dev
```

### API (`apps/api`)

```bash
cd apps/api
py -3 -m venv .venv
./.venv/Scripts/pip install -r requirements.txt
copy .env.example .env
./.venv/Scripts/python -m uvicorn app.main:app --reload
```

### Contracts (`contracts`)

```bash
cd contracts
forge build
forge test
```

> En Windows correr `forge`/`cast` desde Git Bash (PATH `~/.foundry/bin`).

## Variables de entorno

Ver `apps/api/.env.example`:

- `GROQ_API_KEY` — LLM (Groq, no Gemini: quota=0 en Argentina)
- `COINGECKO_API_KEY` — opcional
- `PORT` — puerto del API (default 8000)

## Notas de entorno (Windows)

- PowerShell 5.1: no usar `&&` para encadenar comandos.
- Binance: usar `data-api.binance.vision` (`api.binance.com` da 451 desde algunos hosts).
