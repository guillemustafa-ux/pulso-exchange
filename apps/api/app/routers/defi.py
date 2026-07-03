"""DeFi endpoints: DefiLlama proxy with in-memory TTL caching.

- /protocols -> DefiLlama /protocols, top 50 by TVL (cache 5min)
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Awaitable, Callable, TypeVar

import httpx
from fastapi import APIRouter, HTTPException

from app.schemas.defi import DefiProtocolItem

logger = logging.getLogger("pulso.defi")

router = APIRouter(prefix="/api/defi", tags=["defi"])

DEFILLAMA_BASE = "https://api.llama.fi"

_HTTP_TIMEOUT = httpx.Timeout(15.0, connect=5.0)

TOP_N = 50

T = TypeVar("T")


class TTLCache:
    """Single-flight in-memory TTL cache (asyncio, no Redis).

    Same pattern as `app.routers.market.TTLCache`: concurrent callers racing
    on an expired key await the same in-flight fetch instead of each firing
    their own upstream request. Duplicated here (rather than imported from
    `market.py`) to keep each router module self-contained.
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
            cached = self._fresh(key)  # re-check: another request may have refreshed it
            if cached is not None:
                return cached
            value = await fetch_fn()
            self.set(key, value)
            return value


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
        raise HTTPException(status_code=502, detail=f"DefiLlama unavailable: {exc}") from exc
