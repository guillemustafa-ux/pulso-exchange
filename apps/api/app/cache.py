"""Shared single-flight in-memory TTL cache with stale-on-error fallback.

Used by `app.routers.market`, `defi`, `earn` y `trends` para no pegarle
directo a las APIs upstream (CoinGecko, Binance, DefiLlama, CriptoYa,
alternative.me) en cada request. Antes esta clase estaba triplicada
carácter por carácter en market.py/defi.py/earn.py (y duplicada
parcialmente en trends.py) -- ahora vive en un solo lugar.

- Single-flight: llamadas concurrentes que pisan una key vencida esperan
  el mismo fetch en vuelo en lugar de disparar cada una su propio pedido
  upstream.
- Stale-on-error: si el fetch falla y hay un valor previo (aunque esté
  vencido) todavía en memoria, se sirve ese valor viejo en lugar de
  propagar el error -- se loguea como warning. Se puede desactivar por
  llamada con `stale_on_error=False` para los endpoints que prefieran que
  la falla se note en vez de servir un dato desactualizado.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Awaitable, Callable, TypeVar

logger = logging.getLogger("pulso.cache")

T = TypeVar("T")

# Sentinel propio (no None) para poder distinguir "nunca se cacheó nada"
# de "se cacheó un None legítimo" en _fresh()/get_or_fetch().
_MISSING = object()


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

    def _fresh(self, key: str) -> Any:
        ts = self._timestamp.get(key)
        if ts is None or (time.monotonic() - ts) > self.ttl:
            return _MISSING
        return self._data.get(key, _MISSING)

    def set(self, key: str, value: Any) -> None:
        self._data[key] = value
        self._timestamp[key] = time.monotonic()

    async def get_or_fetch(
        self,
        key: str,
        fetch_fn: Callable[[], Awaitable[T]],
        *,
        stale_on_error: bool = True,
    ) -> T:
        cached = self._fresh(key)
        if cached is not _MISSING:
            return cached
        async with self._lock_for(key):
            cached = self._fresh(key)  # re-check: another request may have refreshed it
            if cached is not _MISSING:
                return cached
            try:
                value = await fetch_fn()
            except Exception as exc:
                if stale_on_error and key in self._data:
                    stale = self._data[key]
                    age = time.monotonic() - self._timestamp[key]
                    logger.warning(
                        "fetch failed for cache key %r (%s: %s), sirviendo valor stale (age=%.0fs)",
                        key,
                        type(exc).__name__,
                        exc,
                        age,
                    )
                    return stale
                raise
            self.set(key, value)
            return value
