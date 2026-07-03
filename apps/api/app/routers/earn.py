"""Earn Argentina: tabla curada de rendimientos + cotizaciones CriptoYa.

- GET /api/earn/ar -> tabla curada (app/data/earn_ar.json: exchanges AR,
  fintechs y DeFi) combinada con cotizaciones de CriptoYa:
    - https://criptoya.com/api/dolar          (oficial/blue/MEP/CCL/cripto)
    - https://criptoya.com/api/usdt/ars/1     (USDT-ARS por exchange)
  Cotizaciones cacheadas 10 min (mismo patrón single-flight TTL de market.py).
  Si CriptoYa no responde, la tabla curada se sirve igual (degradación
  amable) con `cotizaciones: null` y el detalle en `cotizaciones_error`.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Awaitable, Callable, TypeVar

import httpx
from fastapi import APIRouter, HTTPException

from app.schemas.earn import EarnArResponse

logger = logging.getLogger("pulso.earn")

router = APIRouter(prefix="/api/earn", tags=["earn"])

CRIPTOYA_DOLAR_URL = "https://criptoya.com/api/dolar"
CRIPTOYA_USDT_ARS_URL = "https://criptoya.com/api/usdt/ars/1"
DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "earn_ar.json"

DISCLAIMER = "Tasas aproximadas. Verificá siempre antes de invertir. Esto no es asesoramiento financiero."

_HTTP_TIMEOUT = httpx.Timeout(10.0, connect=5.0)

T = TypeVar("T")


# ---------------------------------------------------------------------------
# Tabla curada (estática, se lee de disco -- barata, no hace falta cachear)
# ---------------------------------------------------------------------------


def _load_opciones() -> list[dict[str, Any]]:
    with DATA_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Cotizaciones CriptoYa (cache 10 min, mismo TTLCache single-flight de market.py)
# ---------------------------------------------------------------------------


class TTLCache:
    """Single-flight in-memory TTL cache (asyncio, no Redis).

    Copia deliberada de la clase homónima en `market.py`: cada router queda
    autocontenido en vez de compartir un util cruzado para este alcance.
    """

    def __init__(self, ttl_seconds: float):
        self.ttl = ttl_seconds
        self._data: dict[str, Any] = {}
        self._timestamp: dict[str, float] = {}
        self._locks: dict[str, asyncio.Lock] = {}

    def _lock_for(self, key: str) -> asyncio.Lock:
        lock = self._locks.get(key)
        if lock is None:
            lock = asyncio.Lock()
            self._locks[key] = lock
        return lock

    def _fresh(self, key: str) -> Any | None:
        ts = self._timestamp.get(key)
        if ts is None or (time.monotonic() - ts) > self.ttl:
            return None
        return self._data.get(key)

    def set(self, key: str, value: Any) -> None:
        self._data[key] = value
        self._timestamp[key] = time.monotonic()

    async def get_or_fetch(self, key: str, fetch_fn: Callable[[], Awaitable[T]]) -> T:
        cached = self._fresh(key)
        if cached is not None:
            return cached
        async with self._lock_for(key):
            cached = self._fresh(key)  # re-check: otro request pudo haber refrescado
            if cached is not None:
                return cached
            value = await fetch_fn()
            self.set(key, value)
            return value


_cotizaciones_cache = TTLCache(ttl_seconds=600)  # 10 min


async def _fetch_dolar() -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(CRIPTOYA_DOLAR_URL)
        resp.raise_for_status()
        return resp.json()


async def _fetch_usdt_ars() -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(CRIPTOYA_USDT_ARS_URL)
        resp.raise_for_status()
        return resp.json()


async def _fetch_cotizaciones() -> dict[str, Any]:
    dolar, usdt_ars = await asyncio.gather(_fetch_dolar(), _fetch_usdt_ars())
    return {"dolar": dolar, "usdt_ars": usdt_ars}


@router.get("/ar", response_model=EarnArResponse)
async def get_earn_ar() -> dict[str, Any]:
    try:
        opciones = _load_opciones()
    except (OSError, json.JSONDecodeError) as exc:
        logger.exception("No se pudo leer earn_ar.json")
        raise HTTPException(
            status_code=500, detail="No se pudo cargar la tabla de rendimientos"
        ) from exc

    cotizaciones: dict[str, Any] | None = None
    cotizaciones_error: str | None = None
    try:
        cotizaciones = await _cotizaciones_cache.get_or_fetch("cotizaciones", _fetch_cotizaciones)
    except httpx.HTTPError as exc:
        logger.warning("CriptoYa request failed: %s", exc)
        cotizaciones_error = f"CriptoYa unavailable: {exc}"

    return {
        "disclaimer": DISCLAIMER,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "opciones": opciones,
        "cotizaciones": cotizaciones,
        "cotizaciones_error": cotizaciones_error,
    }
