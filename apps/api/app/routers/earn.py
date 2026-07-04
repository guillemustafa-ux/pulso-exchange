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
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException

from app.cache import TTLCache
from app.schemas.earn import EarnArResponse

logger = logging.getLogger("pulso.earn")

router = APIRouter(prefix="/api/earn", tags=["earn"])

CRIPTOYA_DOLAR_URL = "https://criptoya.com/api/dolar"
CRIPTOYA_USDT_ARS_URL = "https://criptoya.com/api/usdt/ars/1"
DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "earn_ar.json"

DISCLAIMER = "Tasas aproximadas. Verificá siempre antes de invertir. Esto no es asesoramiento financiero."

_HTTP_TIMEOUT = httpx.Timeout(10.0, connect=5.0)


# ---------------------------------------------------------------------------
# Tabla curada (estática, se lee de disco -- barata, no hace falta cachear)
# ---------------------------------------------------------------------------


def _load_opciones() -> list[dict[str, Any]]:
    with DATA_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# Cotizaciones CriptoYa (cache 10 min, TTLCache single-flight compartido de app.cache)
# ---------------------------------------------------------------------------


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
