"""DeFi endpoints: DefiLlama proxy with in-memory TTL caching.

- /protocols -> DefiLlama /protocols, top 50 by TVL (cache 5min)
"""

from __future__ import annotations

import logging
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException

from app.cache import TTLCache
from app.schemas.defi import DefiProtocolItem

logger = logging.getLogger("pulso.defi")

router = APIRouter(prefix="/api/defi", tags=["defi"])

DEFILLAMA_BASE = "https://api.llama.fi"

_HTTP_TIMEOUT = httpx.Timeout(15.0, connect=5.0)

TOP_N = 50


_protocols_cache = TTLCache(ttl_seconds=300)


# ---------------------------------------------------------------------------
# /protocols
# ---------------------------------------------------------------------------


def _map_protocol(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": raw.get("slug") or str(raw.get("id") or raw.get("name") or ""),
        "name": raw.get("name") or "",
        "logo": raw.get("logo"),
        "category": raw.get("category"),
        "chains": raw.get("chains") or [],
        "tvl": raw.get("tvl"),
        "change_7d": raw.get("change_7d"),
        "listed_at": raw.get("listedAt"),
    }


async def _fetch_protocols_raw() -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(f"{DEFILLAMA_BASE}/protocols", headers={"Accept": "application/json"})
        resp.raise_for_status()
        return resp.json()


async def _fetch_top_protocols() -> list[dict[str, Any]]:
    raw_list = await _fetch_protocols_raw()
    # Solo protocolos con TVL numérico válido entran al ranking (algunos
    # listados de DefiLlama traen tvl null/0 para proyectos sin adapter).
    valid = [p for p in raw_list if isinstance(p.get("tvl"), (int, float))]
    valid.sort(key=lambda p: p["tvl"], reverse=True)
    return [_map_protocol(p) for p in valid[:TOP_N]]


@router.get("/protocols", response_model=list[DefiProtocolItem])
async def get_protocols() -> list[dict[str, Any]]:
    try:
        return await _protocols_cache.get_or_fetch("protocols", _fetch_top_protocols)
    except httpx.HTTPError as exc:
        logger.warning("DefiLlama request failed: %s", exc)
        raise HTTPException(status_code=502, detail="DefiLlama no disponible, reintentá en unos segundos") from exc
