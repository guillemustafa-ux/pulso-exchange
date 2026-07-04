"""Trends endpoints: Fear & Greed (alternative.me) + market summary.

- /fear-greed -> alternative.me `/fng/?limit=30` proxy (cache 1h)
- /summary    -> combina en un solo request:
    - Fear & Greed actual (valor + label)
    - Trending coins de CoinGecko `/search/trending` (top 7)
    - Ganadores / perdedores 24h (top 5 c/u), calculados sobre el top100 que
      YA cachea `market.py` -- reusamos esa misma cache (mismo TTLCache
      instance + misma key), no disparamos un pedido nuevo a CoinGecko.
    - Market cap global y dominancia BTC de CoinGecko `/global`

Cada fuente se resuelve en paralelo (`asyncio.gather(..., return_exceptions=True)`)
y degrada con gracia: si una falla, esa parte del summary queda en
None/lista vacía y el resto de la respuesta se sirve igual (mismo criterio
que `cotizaciones_error` en earn.py, pero sin exponer un string de error por
componente ya que acá son 4 fuentes independientes).
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from typing import Any, Awaitable, Callable, TypeVar

import httpx
from fastapi import APIRouter, HTTPException

from app.routers.market import _fetch_top100, _top100_cache
from app.schemas.trends import FearGreedResponse, TrendsSummaryResponse

logger = logging.getLogger("pulso.trends")

router = APIRouter(prefix="/api/trends", tags=["trends"])

FNG_BASE = "https://api.alternative.me/fng/"
COINGECKO_BASE = "https://api.coingecko.com/api/v3"
COINGECKO_API_KEY = os.getenv("COINGECKO_API_KEY", "").strip()

_HTTP_TIMEOUT = httpx.Timeout(10.0, connect=5.0)

T = TypeVar("T")


def _coingecko_headers() -> dict[str, str]:
    headers = {"Accept": "application/json"}
    if COINGECKO_API_KEY:
        headers["x-cg-demo-api-key"] = COINGECKO_API_KEY
    return headers


class TTLCache:
    """Single-flight in-memory TTL cache (asyncio, no Redis).

    Same pattern as `app.routers.market.TTLCache` (duplicated here, same
    convention as `defi.py`/`earn.py`, to keep this router self-contained)
    -- EXCEPT for the top100 data used by gainers/losers below, which is
    deliberately imported and reused from `market.py` per spec, instead of
    being refetched.
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


_fng_cache = TTLCache(ttl_seconds=3600)  # 1h, per spec
_trending_cache = TTLCache(ttl_seconds=300)  # 5min, mirrors market.py's own /trending TTL
_global_cache = TTLCache(ttl_seconds=300)  # 5min, mirrors market.py's own /global TTL


def _upstream_error(exc: httpx.HTTPError, upstream: str) -> HTTPException:
    logger.warning("%s request failed: %s", upstream, exc)
    return HTTPException(status_code=502, detail=f"{upstream} no disponible, reintentá en unos segundos")


# ---------------------------------------------------------------------------
# /fear-greed
# ---------------------------------------------------------------------------


async def _fetch_fear_greed(limit: int = 30) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(FNG_BASE, params={"limit": limit})
        resp.raise_for_status()
        return resp.json()


@router.get("/fear-greed", response_model=FearGreedResponse)
async def get_fear_greed() -> dict[str, Any]:
    try:
        return await _fng_cache.get_or_fetch("fng_30", lambda: _fetch_fear_greed(30))
    except httpx.HTTPError as exc:
        raise _upstream_error(exc, "alternative.me") from exc


# ---------------------------------------------------------------------------
# /summary
# ---------------------------------------------------------------------------


async def _fetch_trending_raw() -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(f"{COINGECKO_BASE}/search/trending", headers=_coingecko_headers())
        resp.raise_for_status()
        raw = resp.json()
    return [item["item"] for item in raw.get("coins", [])]


async def _fetch_global_raw() -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(f"{COINGECKO_BASE}/global", headers=_coingecko_headers())
        resp.raise_for_status()
        return resp.json()["data"]


def _pct_24h(coin: dict[str, Any]) -> float | None:
    value = coin.get("price_change_percentage_24h_in_currency")
    if value is None:
        value = coin.get("price_change_percentage_24h")
    return value


def _to_mover(coin: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": coin.get("id"),
        "symbol": coin.get("symbol"),
        "name": coin.get("name"),
        "image": coin.get("image"),
        "current_price": coin.get("current_price"),
        "price_change_percentage_24h": _pct_24h(coin),
        "market_cap_rank": coin.get("market_cap_rank"),
    }


def _top_movers(
    coins: list[dict[str, Any]], top_n: int = 5
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    ranked = [c for c in coins if _pct_24h(c) is not None]
    gainers = sorted(ranked, key=lambda c: _pct_24h(c), reverse=True)[:top_n]
    losers = sorted(ranked, key=lambda c: _pct_24h(c))[:top_n]
    return [_to_mover(c) for c in gainers], [_to_mover(c) for c in losers]


@router.get("/summary", response_model=TrendsSummaryResponse)
async def get_summary() -> dict[str, Any]:
    fear_greed: dict[str, Any] | None = None
    trending: list[dict[str, Any]] = []
    gainers: list[dict[str, Any]] = []
    losers: list[dict[str, Any]] = []
    market_cap_usd: float | None = None
    market_cap_change_percentage_24h: float | None = None
    btc_dominance: float | None = None

    fng_result, trending_result, top100_result, global_result = await asyncio.gather(
        _fng_cache.get_or_fetch("fng_30", lambda: _fetch_fear_greed(30)),
        _trending_cache.get_or_fetch("trending", _fetch_trending_raw),
        _top100_cache.get_or_fetch("top100", _fetch_top100),  # reused from market.py, not refetched
        _global_cache.get_or_fetch("global", _fetch_global_raw),
        return_exceptions=True,
    )

    if isinstance(fng_result, BaseException):
        logger.warning("alternative.me request failed: %s", fng_result)
    else:
        data = fng_result.get("data") or []
        if data:
            current = data[0]
            fear_greed = {
                "value": int(current["value"]),
                "label": current.get("value_classification", ""),
            }

    if isinstance(trending_result, BaseException):
        logger.warning("CoinGecko trending request failed: %s", trending_result)
    else:
        trending = trending_result[:7]

    if isinstance(top100_result, BaseException):
        logger.warning("CoinGecko top100 request failed: %s", top100_result)
    else:
        gainers, losers = _top_movers(top100_result, top_n=5)

    if isinstance(global_result, BaseException):
        logger.warning("CoinGecko global request failed: %s", global_result)
    else:
        market_cap_usd = (global_result.get("total_market_cap") or {}).get("usd")
        market_cap_change_percentage_24h = global_result.get("market_cap_change_percentage_24h_usd")
        btc_dominance = (global_result.get("market_cap_percentage") or {}).get("btc")

    return {
        "fear_greed": fear_greed,
        "trending": trending,
        "gainers": gainers,
        "losers": losers,
        "market_cap_usd": market_cap_usd,
        "market_cap_change_percentage_24h": market_cap_change_percentage_24h,
        "btc_dominance": btc_dominance,
    }
