"""Tests del streaming SSE de precios (app/routers/stream.py).

Cubren: los helpers puros (filtro de pares USDT, diff entre ticks, framing
SSE), y el PriceStreamHub completo con el fetch de Binance mockeado -- ciclo
snapshot->diff, broadcast a N suscriptores, cliente lento salteado sin
bloquear, poller lazy (arranca con el primero, se cancela con el último),
tolerancia a Binance caído, y el heartbeat del generador SSE. Sin red.

Cada test crea SU PROPIO PriceStreamHub (no el singleton `hub` del módulo):
el task del poller queda atado al event loop del test y así no se filtra
entre tests ni loops.
"""

from __future__ import annotations

import asyncio
import json

import httpx

from app.routers import stream

RAW_TICKER = [
    {"symbol": "BTCUSDT", "price": "50000.00"},
    {"symbol": "ETHUSDT", "price": "3000.50"},
    {"symbol": "BTCEUR", "price": "46000.00"},  # no-USDT -> se filtra
    {"symbol": "BADUSDT", "price": "no-numerico"},  # precio roto -> se filtra
    {"price": "1.0"},  # sin symbol -> se filtra
]


# ---------------------------------------------------------------------------
# Helpers puros
# ---------------------------------------------------------------------------


def test_filter_usdt_prices_solo_pares_usdt_parseables():
    prices = stream._filter_usdt_prices(RAW_TICKER)
    assert prices == {"BTCUSDT": 50000.0, "ETHUSDT": 3000.5}


def test_diff_prices_solo_cambios_y_nuevos():
    old = {"BTCUSDT": 50000.0, "ETHUSDT": 3000.0}
    new = {"BTCUSDT": 50000.0, "ETHUSDT": 3001.0, "SOLUSDT": 150.0}
    # BTC sin cambio queda afuera; ETH cambió y SOL es nuevo.
    assert stream._diff_prices(old, new) == {"ETHUSDT": 3001.0, "SOLUSDT": 150.0}


def test_sse_event_framing():
    text = stream._sse_event({"type": "update", "prices": {"BTCUSDT": 1.0}})
    assert text.startswith("data: ")
    assert text.endswith("\n\n")
    assert json.loads(text[len("data: ") : -2]) == {"type": "update", "prices": {"BTCUSDT": 1.0}}


# ---------------------------------------------------------------------------
# PriceStreamHub -- ciclo completo con fetch mockeado
# ---------------------------------------------------------------------------


def _prices_fetcher(ticks: list[dict[str, float]]):
    """Fetch fake que devuelve cada tick en orden y repite el último."""
    state = {"i": 0}

    async def fake() -> dict[str, float]:
        i = min(state["i"], len(ticks) - 1)
        state["i"] += 1
        return ticks[i]

    return fake


async def _drain(q: asyncio.Queue, timeout: float = 1.0) -> dict:
    return await asyncio.wait_for(q.get(), timeout=timeout)


async def test_hub_snapshot_y_luego_diffs(monkeypatch):
    monkeypatch.setattr(
        stream,
        "_fetch_all_prices",
        _prices_fetcher([{"BTCUSDT": 50000.0}, {"BTCUSDT": 50001.0}]),
    )
    hub = stream.PriceStreamHub(poll_interval=0.01)
    q = hub.subscribe()
    try:
        first = await _drain(q)
        assert first == {"type": "snapshot", "prices": {"BTCUSDT": 50000.0}}
        second = await _drain(q)
        assert second == {"type": "update", "prices": {"BTCUSDT": 50001.0}}
    finally:
        hub.unsubscribe(q)


async def test_hub_broadcast_a_varios_suscriptores(monkeypatch):
    monkeypatch.setattr(
        stream,
        "_fetch_all_prices",
        _prices_fetcher([{"BTCUSDT": 50000.0}, {"BTCUSDT": 50002.0}]),
    )
    hub = stream.PriceStreamHub(poll_interval=0.01)
    a, b = hub.subscribe(), hub.subscribe()
    try:
        # Ambos reciben el snapshot y el mismo diff.
        assert (await _drain(a))["type"] == "snapshot"
        assert (await _drain(b))["type"] == "snapshot"
        assert (await _drain(a))["prices"] == {"BTCUSDT": 50002.0}
        assert (await _drain(b))["prices"] == {"BTCUSDT": 50002.0}
    finally:
        hub.unsubscribe(a)
        hub.unsubscribe(b)


async def test_hub_suscriptor_tardio_recibe_snapshot_inmediato(monkeypatch):
    monkeypatch.setattr(stream, "_fetch_all_prices", _prices_fetcher([{"BTCUSDT": 50000.0}]))
    hub = stream.PriceStreamHub(poll_interval=0.01)
    primero = hub.subscribe()
    try:
        await _drain(primero)  # el hub ya tiene _last_prices
        tardio = hub.subscribe()
        # Sin esperar ningún tick: el snapshot ya está encolado al suscribirse.
        assert tardio.get_nowait() == {"type": "snapshot", "prices": {"BTCUSDT": 50000.0}}
        hub.unsubscribe(tardio)
    finally:
        hub.unsubscribe(primero)


async def test_hub_cliente_lento_no_bloquea_el_broadcast(monkeypatch):
    hub = stream.PriceStreamHub(poll_interval=0.01)
    lento = hub.subscribe()
    rapido = hub.subscribe()
    try:
        # Llenamos la cola del lento a mano hasta el tope.
        for _ in range(stream.SUBSCRIBER_QUEUE_SIZE):
            lento.put_nowait({"type": "update", "prices": {}})
        # El broadcast NO levanta QueueFull: saltea al lento y entrega al rápido.
        hub._broadcast({"type": "update", "prices": {"BTCUSDT": 1.0}})
        assert rapido.get_nowait()["prices"] == {"BTCUSDT": 1.0}
        assert lento.qsize() == stream.SUBSCRIBER_QUEUE_SIZE  # sigue lleno, sin el nuevo
    finally:
        hub.unsubscribe(lento)
        hub.unsubscribe(rapido)


async def test_hub_poller_lazy_arranca_y_se_cancela(monkeypatch):
    monkeypatch.setattr(stream, "_fetch_all_prices", _prices_fetcher([{"BTCUSDT": 50000.0}]))
    hub = stream.PriceStreamHub(poll_interval=0.01)
    assert hub._task is None  # sin suscriptores no hay poller

    q = hub.subscribe()
    assert hub._task is not None and not hub._task.done()

    hub.unsubscribe(q)
    assert hub._task is None  # último cliente afuera -> poller cancelado
    assert hub.subscriber_count == 0


async def test_hub_binance_caido_saltea_el_tick_y_sigue(monkeypatch):
    calls = {"n": 0}

    async def flaky() -> dict[str, float]:
        calls["n"] += 1
        if calls["n"] == 1:
            raise httpx.ConnectError("binance down")
        return {"BTCUSDT": 50000.0}

    monkeypatch.setattr(stream, "_fetch_all_prices", flaky)
    hub = stream.PriceStreamHub(poll_interval=0.01)
    q = hub.subscribe()
    try:
        # El primer tick falló, pero el segundo entrega el snapshot igual.
        msg = await _drain(q)
        assert msg == {"type": "snapshot", "prices": {"BTCUSDT": 50000.0}}
        assert calls["n"] >= 2
    finally:
        hub.unsubscribe(q)


# ---------------------------------------------------------------------------
# Generador SSE
# ---------------------------------------------------------------------------


async def test_event_stream_emite_mensajes_y_desuscribe_al_cerrar(monkeypatch):
    # Hub propio también para el generador (usa hub.unsubscribe en el finally).
    test_hub = stream.PriceStreamHub(poll_interval=999)
    monkeypatch.setattr(stream, "hub", test_hub)

    q = test_hub.subscribe()
    q.put_nowait({"type": "snapshot", "prices": {"BTCUSDT": 50000.0}})

    gen = stream._event_stream(q)
    first = await asyncio.wait_for(gen.__anext__(), timeout=1.0)
    assert first.startswith("data: ")
    assert '"BTCUSDT":50000.0' in first

    await gen.aclose()  # simula la desconexión del cliente (Starlette cancela igual)
    assert test_hub.subscriber_count == 0  # el finally des-suscribió


async def test_event_stream_heartbeat_sin_datos(monkeypatch):
    monkeypatch.setattr(stream, "HEARTBEAT_SECONDS", 0.01)
    test_hub = stream.PriceStreamHub(poll_interval=999)
    monkeypatch.setattr(stream, "hub", test_hub)

    q = test_hub.subscribe()
    gen = stream._event_stream(q)
    try:
        # Cola vacía -> a los HEARTBEAT_SECONDS sale el comentario de ping.
        beat = await asyncio.wait_for(gen.__anext__(), timeout=1.0)
        assert beat == ": ping\n\n"
    finally:
        await gen.aclose()
