"""Market data endpoints: CoinGecko + Binance proxies with in-memory TTL caching.

- /top100   -> CoinGecko /coins/markets (cache 60s)
- /klines   -> Binance data-api (proxy) with CoinGecko /coins/{id}/ohlc fallback
- /global   -> CoinGecko /global (cache 5min)
- /trending -> CoinGecko /search/trending (cache 5min)
"""

from __future__ import annotations

import asyncio
import logging
import os
import time
from typing import Any, Awaitable, Callable, TypeVar

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.schemas.market import (
    CoinMarketItem,
    GlobalMarketResponse,
    KlineItem,
    KlinesResponse,
    TrendingCoin,
)

logger = logging.getLogger("pulso.market")

router = APIRouter(prefix="/api/market", tags=["market"])

COINGECKO_BASE = "https://api.coingecko.com/api/v3"
BINANCE_BASE = "https://data-api.binance.vision/api/v3"
COINGECKO_API_KEY = os.getenv("COINGECKO_API_KEY", "").strip()

_HTTP_TIMEOUT = httpx.Timeout(10.0, connect=5.0)

T = TypeVar("T")


def _coingecko_headers() -> dict[str, str]:
    headers = {"Accept": "application/json"}
    if COINGECKO_API_KEY:
        # Demo-tier key header; CoinGecko also accepts x-cg-pro-api-key for paid plans.
        headers["x-cg-demo-api-key"] = COINGECKO_API_KEY
    return headers


class TTLCache:
    """Single-flight in-memory TTL cache (asyncio, no Redis).

    Concurrent callers racing on an expired key await the same in-flight
    fetch instead of each firing their own upstream request.
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


_top100_cache = TTLCache(ttl_seconds=60)
_global_cache = TTLCache(ttl_seconds=300)
# Klines es el hot path (cada apertura de CoinDetail + cada cambio de timeframe):
# sin cache pega directo a Binance y, en fallback, a CoinGecko (free tier ~30
# req/min) — con pocos usuarios simultáneos eso escala a 429/502 en cascada.
_klines_cache = TTLCache(ttl_seconds=30)
_trending_cache = TTLCache(ttl_seconds=300)


def _upstream_error(exc: httpx.HTTPError, upstream: str) -> HTTPException:
    # El detalle interno (URL con query params incluida) va SOLO al log; al
    # cliente le llega un mensaje genérico — no exponemos infraestructura.
    logger.warning("%s request failed: %s", upstream, exc)
    return HTTPException(status_code=502, detail=f"{upstream} no disponible, reintentá en unos segundos")


# ---------------------------------------------------------------------------
# /top100
# ---------------------------------------------------------------------------


async def _fetch_top100() -> list[dict[str, Any]]:
    params = {
        "vs_currency": "usd",
        "order": "market_cap_desc",
        "per_page": 100,
        "page": 1,
        "sparkline": "true",
        "price_change_percentage": "24h,7d",
    }
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(
            f"{COINGECKO_BASE}/coins/markets", params=params, headers=_coingecko_headers()
        )
        resp.raise_for_status()
        return resp.json()


@router.get("/top100", response_model=list[CoinMarketItem])
async def get_top100() -> list[dict[str, Any]]:
    try:
        return await _top100_cache.get_or_fetch("top100", _fetch_top100)
    except httpx.HTTPError as exc:
        raise _upstream_error(exc, "CoinGecko") from exc


# ---------------------------------------------------------------------------
# /klines/{symbol}
# ---------------------------------------------------------------------------

# Rough interval -> CoinGecko `days` mapping for the OHLC fallback (CoinGecko
# picks its own candle granularity based on the days window, it has no
# interval param like Binance).
_INTERVAL_TO_CG_DAYS: dict[str, int] = {
    "1m": 1,
    "3m": 1,
    "5m": 1,
    "15m": 1,
    "30m": 1,
    "1h": 7,
    "2h": 14,
    "4h": 30,
    "6h": 30,
    "8h": 30,
    "12h": 30,
    "1d": 90,
    "3d": 180,
    "1w": 365,
}


async def _fetch_binance_klines(symbol: str, interval: str, limit: int) -> list[dict[str, Any]]:
    params = {"symbol": symbol, "interval": interval, "limit": limit}
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(f"{BINANCE_BASE}/klines", params=params)
        resp.raise_for_status()
        raw = resp.json()
    return [
        {
            "open_time": row[0],
            "open": float(row[1]),
            "high": float(row[2]),
            "low": float(row[3]),
            "close": float(row[4]),
            "volume": float(row[5]),
            "close_time": row[6],
            "quote_volume": float(row[7]),
            "trades": int(row[8]),
        }
        for row in raw
    ]


async def _resolve_coingecko_id(base_symbol: str) -> str | None:
    """Best-effort symbol -> CoinGecko id lookup using the cached top100 list."""
    base_symbol = base_symbol.lower()
    try:
        coins = await _top100_cache.get_or_fetch("top100", _fetch_top100)
    except httpx.HTTPError:
        return None
    for coin in coins:
        if str(coin.get("symbol", "")).lower() == base_symbol:
            return coin.get("id")
    return None


async def _fetch_coingecko_ohlc(coin_id: str, days: int) -> list[dict[str, Any]]:
    params = {"vs_currency": "usd", "days": days}
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(
            f"{COINGECKO_BASE}/coins/{coin_id}/ohlc", params=params, headers=_coingecko_headers()
        )
        resp.raise_for_status()
        raw = resp.json()
    return [
        {"open_time": row[0], "open": row[1], "high": row[2], "low": row[3], "close": row[4]}
        for row in raw
    ]


def _strip_quote_asset(symbol: str) -> str:
    for quote in ("USDT", "USDC", "BUSD", "USD", "BTC", "ETH"):
        if symbol.endswith(quote) and len(symbol) > len(quote):
            return symbol[: -len(quote)]
    return symbol


async def _fetch_klines_any(symbol_upper: str, interval: str, limit: int) -> dict[str, Any]:
    try:
        klines = await _fetch_binance_klines(symbol_upper, interval, limit)
        return {
            "source": "binance",
            "symbol": symbol_upper,
            "interval": interval,
            "klines": klines,
        }
    except httpx.HTTPStatusError as exc:
        logger.info(
            "Binance klines unavailable for %s (%s), falling back to CoinGecko",
            symbol_upper,
            exc.response.status_code,
        )
    except httpx.HTTPError as exc:
        logger.warning("Binance klines request failed for %s: %s", symbol_upper, exc)

    base = _strip_quote_asset(symbol_upper)
    coin_id = await _resolve_coingecko_id(base)
    if not coin_id:
        raise HTTPException(
            status_code=404,
            detail=f"No klines data found for symbol {symbol_upper} on Binance or CoinGecko",
        )

    days = _INTERVAL_TO_CG_DAYS.get(interval, 30)
    try:
        ohlc = await _fetch_coingecko_ohlc(coin_id, days)
    except httpx.HTTPError as exc:
        raise _upstream_error(exc, "CoinGecko OHLC fallback") from exc

    return {
        "source": "coingecko",
        "symbol": symbol_upper,
        "coingecko_id": coin_id,
        "interval": interval,
        "klines": ohlc[-limit:],
    }


@router.get("/klines/{symbol}", response_model=KlinesResponse)
async def get_klines(
    symbol: str,
    interval: str = Query("1h", description="Binance-style interval, e.g. 1m,5m,1h,4h,1d"),
    limit: int = Query(100, ge=1, le=1000),
) -> dict[str, Any]:
    symbol_upper = symbol.upper()
    cache_key = f"{symbol_upper}:{interval}:{limit}"
    return await _klines_cache.get_or_fetch(
        cache_key, lambda: _fetch_klines_any(symbol_upper, interval, limit)
    )


# ---------------------------------------------------------------------------
# /global
# ---------------------------------------------------------------------------


async def _fetch_global() -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(f"{COINGECKO_BASE}/global", headers=_coingecko_headers())
        resp.raise_for_status()
        return resp.json()["data"]


@router.get("/global", response_model=GlobalMarketResponse)
async def get_global() -> dict[str, Any]:
    try:
        return await _global_cache.get_or_fetch("global", _fetch_global)
    except httpx.HTTPError as exc:
        raise _upstream_error(exc, "CoinGecko") from exc


# ---------------------------------------------------------------------------
# /trending
# ---------------------------------------------------------------------------


async def _fetch_trending() -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(f"{COINGECKO_BASE}/search/trending", headers=_coingecko_headers())
        resp.raise_for_status()
        raw = resp.json()
    return [item["item"] for item in raw.get("coins", [])]


@router.get("/trending", response_model=list[TrendingCoin])
async def get_trending() -> list[dict[str, Any]]:
    try:
        return await _trending_cache.get_or_fetch("trending", _fetch_trending)
    except httpx.HTTPError as exc:
        raise _upstream_error(exc, "CoinGecko") from exc
