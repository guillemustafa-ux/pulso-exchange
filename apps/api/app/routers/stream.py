"""Streaming de precios en vivo por Server-Sent Events (SSE).

- GET /api/stream/prices -> stream `text/event-stream` con los precios spot
  de TODOS los pares USDT de Binance (data-api, público, sin auth).

Arquitectura (hub de broadcast, un solo poller para N clientes):

- `PriceStreamHub` mantiene una Queue por suscriptor. Un ÚNICO task de fondo
  pollea Binance cada `POLL_INTERVAL_SECONDS` y hace broadcast a todas las
  colas -- el costo upstream es constante sin importar cuántos clientes haya.
- El poller es LAZY: arranca con el primer suscriptor y se cancela cuando se
  va el último. Sin clientes conectados, PULSO no le pega a Binance por esto.
- Primer mensaje a cada cliente = snapshot completo; después viajan solo
  DIFFS (pares cuyo precio cambió desde el tick anterior) -- menos bytes por
  tick y el cliente reconstruye el estado con un simple merge.
- Cliente lento (cola llena): el diff se descarta para ESE cliente en vez de
  bloquear el broadcast; el precio siguiente lo supera de todos modos.
- Heartbeat (comentario SSE `: ping`) cada `HEARTBEAT_SECONDS` sin datos,
  para que proxies/load balancers no corten la conexión por idle.

Sin dependencias nuevas: SSE es un StreamingResponse con el framing correcto.
El frontend degrada solo a su polling de 60s si este stream no está.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, AsyncIterator

import httpx
from fastapi import APIRouter
from fastapi.responses import StreamingResponse

logger = logging.getLogger("pulso.stream")

router = APIRouter(prefix="/api/stream", tags=["stream"])

BINANCE_BASE = "https://data-api.binance.vision/api/v3"
_HTTP_TIMEOUT = httpx.Timeout(10.0, connect=5.0)

POLL_INTERVAL_SECONDS = 5.0
HEARTBEAT_SECONDS = 15.0
# Diffs que puede acumular un cliente antes de considerarlo lento (y saltearlo).
SUBSCRIBER_QUEUE_SIZE = 10


def _filter_usdt_prices(raw: list[dict[str, Any]]) -> dict[str, float]:
    """{'BTCUSDT': 50000.0, ...} a partir del ticker/price crudo de Binance.

    Solo pares *USDT con precio parseable -- son los que el frontend puede
    mapear desde los símbolos del top100 (BTC -> BTCUSDT).
    """
    prices: dict[str, float] = {}
    for item in raw:
        symbol = item.get("symbol")
        if not isinstance(symbol, str) or not symbol.endswith("USDT"):
            continue
        try:
            prices[symbol] = float(item["price"])
        except (KeyError, TypeError, ValueError):
            continue
    return prices


def _diff_prices(old: dict[str, float], new: dict[str, float]) -> dict[str, float]:
    """Solo los pares cuyo precio cambió (o son nuevos) respecto del tick anterior."""
    return {symbol: price for symbol, price in new.items() if old.get(symbol) != price}


def _sse_event(payload: dict[str, Any]) -> str:
    """Framing SSE de un mensaje de datos (una sola línea JSON, sin \\n internos)."""
    return f"data: {json.dumps(payload, separators=(',', ':'))}\n\n"


async def _fetch_all_prices() -> dict[str, float]:
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(f"{BINANCE_BASE}/ticker/price")
        resp.raise_for_status()
        return _filter_usdt_prices(resp.json())


class PriceStreamHub:
    """Broadcast de precios: un poller de Binance, N suscriptores con Queue propia."""

    def __init__(self, poll_interval: float = POLL_INTERVAL_SECONDS):
        self._poll_interval = poll_interval
        self._subscribers: set[asyncio.Queue[dict[str, Any]]] = set()
        self._last_prices: dict[str, float] = {}
        self._task: asyncio.Task[None] | None = None

    @property
    def subscriber_count(self) -> int:
        return len(self._subscribers)

    def subscribe(self) -> asyncio.Queue[dict[str, Any]]:
        q: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=SUBSCRIBER_QUEUE_SIZE)
        self._subscribers.add(q)
        if self._last_prices:
            # El cliente nuevo no espera al próximo tick: snapshot inmediato.
            q.put_nowait({"type": "snapshot", "prices": self._last_prices})
        if self._task is None or self._task.done():
            self._task = asyncio.create_task(self._run())
        return q

    def unsubscribe(self, q: asyncio.Queue[dict[str, Any]]) -> None:
        self._subscribers.discard(q)
        if not self._subscribers and self._task is not None:
            # Último cliente afuera -> el poller para; no se pollea Binance de fondo.
            self._task.cancel()
            self._task = None

    def _broadcast(self, message: dict[str, Any]) -> None:
        for q in list(self._subscribers):
            try:
                q.put_nowait(message)
            except asyncio.QueueFull:
                # Cliente lento: se descarta este diff para él (el próximo tick
                # trae el precio vigente igual); nunca se bloquea el broadcast.
                logger.debug("stream: cliente lento, diff descartado")

    async def _run(self) -> None:
        while True:
            try:
                prices = await _fetch_all_prices()
                if not self._last_prices:
                    self._last_prices = prices
                    self._broadcast({"type": "snapshot", "prices": prices})
                else:
                    diff = _diff_prices(self._last_prices, prices)
                    self._last_prices = prices
                    if diff:
                        self._broadcast({"type": "update", "prices": diff})
            except httpx.HTTPError as exc:
                # Binance caído no mata el stream: se saltea el tick y se reintenta.
                logger.warning("stream: fetch de Binance falló, se reintenta: %s", exc)
            await asyncio.sleep(self._poll_interval)


hub = PriceStreamHub()


async def _event_stream(q: asyncio.Queue[dict[str, Any]]) -> AsyncIterator[str]:
    """Genera el stream SSE de una suscripción; libera la Queue al desconectar.

    Starlette cancela este generador cuando el cliente corta -> el `finally`
    des-suscribe SIEMPRE (sin fugas de colas ni poller huérfano).
    """
    try:
        while True:
            try:
                message = await asyncio.wait_for(q.get(), timeout=HEARTBEAT_SECONDS)
            except asyncio.TimeoutError:
                yield ": ping\n\n"  # heartbeat: mantiene viva la conexión en proxies
                continue
            yield _sse_event(message)
    finally:
        hub.unsubscribe(q)


@router.get("/prices")
async def stream_prices() -> StreamingResponse:
    q = hub.subscribe()
    return StreamingResponse(
        _event_stream(q),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            # Render/nginx: sin esto el proxy bufferea y los eventos llegan en tandas.
            "X-Accel-Buffering": "no",
        },
    )
