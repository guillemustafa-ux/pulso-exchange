import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

# Debe cargarse ANTES de importar app.routers.*: algunos routers (ej. ai.py)
# leen sus env vars (GROQ_API_KEY) a nivel de módulo, en el momento del
# import -- si load_dotenv() corriera después, esas lecturas verían el
# proceso todavía sin el .env cargado.
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.middleware import RateLimitMiddleware, RequestLoggingMiddleware
from app.motor.engine import start_engine, stop_engine
from app.routers import ai, bots, defi, earn, health, market, trends

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=LOG_LEVEL,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("pulso.api")

DEFAULT_ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"


def _parse_allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "").strip()
    if not raw:
        raw = DEFAULT_ALLOWED_ORIGINS
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


RATE_LIMIT_PER_MINUTE = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("PULSO API starting up (log_level=%s)", LOG_LEVEL)
    await init_db()
    start_engine()  # motor de bots paper trading -- background task, no bloquea el resto de la API
    yield
    await stop_engine()
    logger.info("PULSO API shutting down")


app = FastAPI(title="PULSO API", lifespan=lifespan)

allowed_origins = _parse_allowed_origins()
logger.info("CORS allowed origins: %s", allowed_origins)

# NOTE on order: Starlette makes the LAST-added middleware the OUTERMOST one.
# CORS must be outermost so that 429 (rate limit) and 5xx responses from the
# inner middlewares still carry CORS headers -- otherwise the browser reports
# a CORS failure instead of surfacing the real status code to the frontend.
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware, max_requests=RATE_LIMIT_PER_MINUTE)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(market.router)
app.include_router(earn.router)
app.include_router(defi.router)
app.include_router(ai.router)
app.include_router(trends.router)
app.include_router(bots.router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"name": "PULSO API", "status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", 8000)),
        reload=True,
    )
