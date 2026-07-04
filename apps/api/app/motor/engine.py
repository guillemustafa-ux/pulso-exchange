"""Motor de simulación de bots de paper trading.

100% simulado: NUNCA se conecta a un exchange con API keys ni ejecuta
órdenes reales. Solo lee precios públicos de Binance (data-api, sin auth) y
mueve saldos dentro de la propia base SQLite de PULSO.

- Arranca como un asyncio.Task en el lifespan de FastAPI (`start_engine`) y
  se cancela prolijamente en el shutdown (`stop_engine`); nunca bloquea el
  resto de la API.
- Cada `TICK_INTERVAL_SECONDS` (60s) recorre los bots `activo` y aplica la
  lógica de su estrategia (DCA / GRID / SMA), siempre con su propia
  conexión aiosqlite (no comparte conexión con los requests HTTP).
- `get_price` (cache TTL corto) también la usa el router `bots.py` para el
  PnL "en vivo" de GET /api/bots/ -- así el tick de trading y el precio que
  ve el usuario en la lista salen de la misma fuente.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from datetime import datetime, timezone
from typing import Any, Awaitable, Callable, TypeVar

import aiosqlite
import httpx

from app.db import DB_PATH

logger = logging.getLogger("pulso.motor")

TICK_INTERVAL_SECONDS = 60

BINANCE_BASE = "https://data-api.binance.vision/api/v3"
_HTTP_TIMEOUT = httpx.Timeout(10.0, connect=5.0)

T = TypeVar("T")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# Cache TTL corto de precio (single-flight) -- copia deliberada del patrón de
# market.py/earn.py: cada módulo queda autocontenido. TTL bajo (10s) porque
# el router lo usa para mostrar PnL "en vivo", no para servir un dato viejo.
# ---------------------------------------------------------------------------


class TTLCache:
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
            cached = self._fresh(key)
            if cached is not None:
                return cached
            value = await fetch_fn()
            self.set(key, value)
            return value


_price_cache = TTLCache(ttl_seconds=10)


async def _fetch_price_raw(par: str) -> float:
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(f"{BINANCE_BASE}/ticker/price", params={"symbol": par})
        resp.raise_for_status()
        data = resp.json()
    return float(data["price"])


async def get_price(par: str) -> float:
    """Precio spot actual de `par` (ej. BTCUSDT) vía Binance data-api, cacheado 10s."""
    par_upper = par.upper()
    return await _price_cache.get_or_fetch(par_upper, lambda: _fetch_price_raw(par_upper))


async def fetch_klines_closes(par: str, interval: str, limit: int) -> list[float]:
    """Cierres de las últimas `limit` velas de `par` (usadas por la estrategia SMA).

    Llamado directo a Binance (sin cache): el router `market.py` ya expone
    /klines pero no cachea esa respuesta, así que no hay nada que reusar --
    pedir directo acá mantiene el motor desacoplado del router.
    """
    params = {"symbol": par.upper(), "interval": interval, "limit": limit}
    async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
        resp = await client.get(f"{BINANCE_BASE}/klines", params=params)
        resp.raise_for_status()
        raw = resp.json()
    return [float(row[4]) for row in raw]


def sma_series(values: list[float], period: int) -> list[float]:
    """Media móvil simple, una por cada ventana de `period` valores consecutivos."""
    if period <= 0 or len(values) < period:
        return []
    return [sum(values[i - period + 1 : i + 1]) / period for i in range(period - 1, len(values))]


# ---------------------------------------------------------------------------
# Acceso a positions / trades -- compartido con app/routers/bots.py para que
# el cálculo de PnL en la API use exactamente los mismos números que el motor.
# ---------------------------------------------------------------------------


async def get_position(db: aiosqlite.Connection, bot_id: int) -> tuple[float, float]:
    """(cantidad_total, capital_invertido) de la posición abierta de un bot. (0, 0) si no compró nunca."""
    cur = await db.execute(
        "SELECT cantidad_total, capital_invertido FROM positions WHERE bot_id = ?", (bot_id,)
    )
    row = await cur.fetchone()
    if row is None:
        return 0.0, 0.0
    return float(row["cantidad_total"]), float(row["capital_invertido"])


async def _upsert_position(
    db: aiosqlite.Connection, bot_id: int, cantidad_total: float, capital_invertido: float
) -> None:
    await db.execute(
        """
        INSERT INTO positions (bot_id, cantidad_total, capital_invertido, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(bot_id) DO UPDATE SET
            cantidad_total = excluded.cantidad_total,
            capital_invertido = excluded.capital_invertido,
            updated_at = excluded.updated_at
        """,
        (bot_id, cantidad_total, capital_invertido, now_iso()),
    )


async def _record_trade(
    db: aiosqlite.Connection, bot_id: int, tipo: str, precio: float, cantidad: float, ts: str
) -> None:
    await db.execute(
        "INSERT INTO trades (bot_id, tipo, precio, cantidad, timestamp) VALUES (?, ?, ?, ?, ?)",
        (bot_id, tipo, precio, cantidad, ts),
    )


async def execute_buy(db: aiosqlite.Connection, bot_id: int, monto_usd: float, precio: float, ts: str) -> bool:
    """Compra simulada: gasta hasta `monto_usd` (clamped al cash disponible). False si no hubo fondos/precio válido."""
    if precio <= 0:
        return False
    cur = await db.execute("SELECT capital_actual FROM bots WHERE id = ?", (bot_id,))
    row = await cur.fetchone()
    if row is None:
        return False
    capital_actual = float(row["capital_actual"])
    monto = min(monto_usd, capital_actual)
    if monto <= 1e-9:
        return False  # sin cash disponible -- se saltea la orden, no es un error

    cantidad = monto / precio
    await db.execute("UPDATE bots SET capital_actual = ? WHERE id = ?", (capital_actual - monto, bot_id))

    cantidad_total, capital_invertido = await get_position(db, bot_id)
    await _upsert_position(db, bot_id, cantidad_total + cantidad, capital_invertido + monto)
    await _record_trade(db, bot_id, "compra", precio, cantidad, ts)
    return True


async def execute_sell(
    db: aiosqlite.Connection, bot_id: int, cantidad_deseada: float, precio: float, ts: str
) -> bool:
    """Venta simulada: vende hasta `cantidad_deseada` (clamped al holding actual). False si no había posición."""
    if precio <= 0 or cantidad_deseada <= 0:
        return False
    cantidad_total, capital_invertido = await get_position(db, bot_id)
    cantidad = min(cantidad_deseada, cantidad_total)
    if cantidad <= 1e-12:
        return False  # nada para vender

    proceeds = cantidad * precio
    costo_promedio = (capital_invertido / cantidad_total) if cantidad_total > 0 else 0.0
    costo_removido = costo_promedio * cantidad

    cur = await db.execute("SELECT capital_actual FROM bots WHERE id = ?", (bot_id,))
    row = await cur.fetchone()
    capital_actual = float(row["capital_actual"]) if row else 0.0

    await db.execute("UPDATE bots SET capital_actual = ? WHERE id = ?", (capital_actual + proceeds, bot_id))
    await _upsert_position(
        db, bot_id, cantidad_total - cantidad, max(0.0, capital_invertido - costo_removido)
    )
    await _record_trade(db, bot_id, "venta", precio, cantidad, ts)
    return True


def _parse_params(bot: dict[str, Any]) -> dict[str, Any]:
    try:
        return json.loads(bot.get("params") or "{}")
    except json.JSONDecodeError:
        return {}


async def _save_params(db: aiosqlite.Connection, bot_id: int, params: dict[str, Any]) -> None:
    await db.execute("UPDATE bots SET params = ? WHERE id = ?", (json.dumps(params), bot_id))


# ---------------------------------------------------------------------------
# Estrategias
# ---------------------------------------------------------------------------


async def _process_dca(db: aiosqlite.Connection, bot: dict[str, Any], precio: float, ts: str) -> None:
    """DCA: compra un monto fijo cada N segundos, sin importar el precio."""
    params = _parse_params(bot)
    intervalo = float(params.get("intervalo_segundos", 3600))
    monto = float(params.get("monto_por_orden", 10))

    cur = await db.execute(
        "SELECT timestamp FROM trades WHERE bot_id = ? AND tipo = 'compra' ORDER BY id DESC LIMIT 1",
        (bot["id"],),
    )
    row = await cur.fetchone()
    referencia = row["timestamp"] if row else bot["creado_at"]

    try:
        elapsed = (datetime.fromisoformat(ts) - datetime.fromisoformat(referencia)).total_seconds()
    except ValueError:
        elapsed = intervalo  # timestamp corrupto -- forzar compra en vez de trabarse

    if elapsed >= intervalo:
        await execute_buy(db, bot["id"], monto, precio, ts)


async def _process_grid(db: aiosqlite.Connection, bot: dict[str, Any], precio: float, ts: str) -> None:
    """GRID: niveles fijos por encima/debajo de `precio_base` (seteado al crear el bot).

    Detecta cruces comparando el precio de este tick contra el anterior
    (`_ultimo_precio`, guardado en `params`): si el precio cruzó hacia abajo
    un nivel de compra, compra; si cruzó hacia arriba un nivel de venta y
    hay holding, vende.
    """
    params = _parse_params(bot)
    niveles = int(params.get("niveles", 5))
    spread_pct = float(params.get("spread_pct", 1.0))
    capital_por_nivel = float(params.get("capital_por_nivel", 10))
    precio_base = float(params.get("precio_base", precio))
    ultimo_precio_raw = params.get("_ultimo_precio")

    if ultimo_precio_raw is not None:
        ultimo_precio = float(ultimo_precio_raw)
        for i in range(1, niveles + 1):
            nivel_compra = precio_base * (1 - spread_pct / 100 * i)
            nivel_venta = precio_base * (1 + spread_pct / 100 * i)

            if ultimo_precio > nivel_compra >= precio:
                await execute_buy(db, bot["id"], capital_por_nivel, precio, ts)

            if ultimo_precio < nivel_venta <= precio and nivel_venta > 0:
                cantidad_deseada = capital_por_nivel / nivel_venta
                await execute_sell(db, bot["id"], cantidad_deseada, precio, ts)

    params["_ultimo_precio"] = precio
    await _save_params(db, bot["id"], params)


async def _process_sma(db: aiosqlite.Connection, bot: dict[str, Any], precio: float, ts: str) -> None:
    """SMA crossover: compra en cruce alcista (corta cruza arriba de la larga), vende todo en el bajista."""
    params = _parse_params(bot)
    corta = int(params.get("sma_corta", 9))
    larga = int(params.get("sma_larga", 21))
    interval = str(params.get("interval", "1h"))
    monto = float(params.get("monto_por_orden", 20))

    try:
        closes = await fetch_klines_closes(bot["par"], interval, larga + 2)
    except httpx.HTTPError as exc:
        logger.warning("motor: no se pudieron obtener klines de %s: %s", bot["par"], exc)
        return

    if len(closes) < larga + 1:
        return  # todavía no hay historial suficiente para las dos SMA

    sma_corta_serie = sma_series(closes, corta)
    sma_larga_serie = sma_series(closes, larga)
    if len(sma_corta_serie) < 2 or len(sma_larga_serie) < 2:
        return

    sc_prev, sc_curr = sma_corta_serie[-2], sma_corta_serie[-1]
    sl_prev, sl_curr = sma_larga_serie[-2], sma_larga_serie[-1]

    senal: str | None = None
    if sc_prev <= sl_prev and sc_curr > sl_curr:
        senal = "alcista"
    elif sc_prev >= sl_prev and sc_curr < sl_curr:
        senal = "bajista"

    if senal is None or senal == params.get("_ultima_senal"):
        return  # sin cruce nuevo -- no repetir la orden en cada tick

    if senal == "alcista":
        await execute_buy(db, bot["id"], monto, precio, ts)
    else:
        cantidad_total, _ = await get_position(db, bot["id"])
        if cantidad_total > 0:
            await execute_sell(db, bot["id"], cantidad_total, precio, ts)

    params["_ultima_senal"] = senal
    await _save_params(db, bot["id"], params)


_STRATEGY_HANDLERS: dict[str, Callable[[aiosqlite.Connection, dict[str, Any], float, str], Awaitable[None]]] = {
    "DCA": _process_dca,
    "GRID": _process_grid,
    "SMA": _process_sma,
}


async def _process_bot(db: aiosqlite.Connection, bot: dict[str, Any]) -> None:
    ts = now_iso()
    try:
        precio = await get_price(bot["par"])
    except httpx.HTTPError as exc:
        logger.warning("motor: no se pudo obtener precio de %s (bot=%s): %s", bot["par"], bot["id"], exc)
        return

    handler = _STRATEGY_HANDLERS.get(bot["estrategia"])
    if handler is not None:
        await handler(db, bot, precio, ts)

    # Snapshot de equity para la equity curve del frontend -- se registra
    # siempre (haya o no trade) para que la curva tenga resolución de 60s.
    cantidad_total, _ = await get_position(db, bot["id"])
    cur = await db.execute("SELECT capital_actual FROM bots WHERE id = ?", (bot["id"],))
    row = await cur.fetchone()
    capital_actual = float(row["capital_actual"]) if row else float(bot["capital_actual"])
    equity = capital_actual + cantidad_total * precio
    await db.execute(
        "INSERT INTO equity_snapshots (bot_id, timestamp, equity, precio) VALUES (?, ?, ?, ?)",
        (bot["id"], ts, equity, precio),
    )


async def _tick_once() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("PRAGMA foreign_keys = ON")
        cur = await db.execute("SELECT * FROM bots WHERE estado = 'activo'")
        bots = [dict(r) for r in await cur.fetchall()]

        for bot in bots:
            try:
                await _process_bot(db, bot)
            except Exception:
                # Un bot roto (par inválido, params corruptos, etc.) no debe
                # tumbar el tick de los demás.
                logger.exception("motor: fallo procesando bot id=%s", bot["id"])

        await db.commit()


async def _run_forever() -> None:
    logger.info("Motor de bots arrancando (tick cada %ss)", TICK_INTERVAL_SECONDS)
    while True:
        try:
            await _tick_once()
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("motor: fallo en el tick")
        await asyncio.sleep(TICK_INTERVAL_SECONDS)


_task: asyncio.Task[None] | None = None


def start_engine() -> asyncio.Task[None]:
    """Arranca el loop del motor como background task. Idempotente."""
    global _task
    if _task is None or _task.done():
        _task = asyncio.create_task(_run_forever(), name="pulso-bots-engine")
    return _task


async def stop_engine() -> None:
    """Cancela el loop prolijamente (usado en el shutdown del lifespan)."""
    global _task
    if _task is None:
        return
    _task.cancel()
    try:
        await _task
    except asyncio.CancelledError:
        pass
    _task = None
