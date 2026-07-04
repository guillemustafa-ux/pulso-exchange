"""Motor de bots de paper trading -- CRUD + lectura de PnL en vivo.

PROHIBIDO conectar a un exchange real o ejecutar órdenes reales: todo bot
creado acá opera sobre saldos simulados en la SQLite de PULSO (ver
`app/motor/engine.py`), leyendo únicamente precios públicos de Binance.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import aiosqlite
import httpx
from fastapi import APIRouter, Depends, HTTPException, Response

from app.db import get_db
from app.motor.engine import get_position, get_price, now_iso
from app.schemas.bots import BotCreate, BotEstadoUpdate, BotOut, TradeOut

logger = logging.getLogger("pulso.bots")

router = APIRouter(prefix="/api/bots", tags=["bots"])

# Cuántos puntos recientes de equity viajan embebidos en GET /api/bots/ (mini
# equity curve de la lista). El detalle completo vive en GET /{id}/equity.
EQUITY_PREVIEW_POINTS = 60


# ---------------------------------------------------------------------------
# Validación de params por estrategia + defaults razonables
# ---------------------------------------------------------------------------


def _validar_params(
    estrategia: str, capital_inicial: float, params: dict[str, Any], precio_actual: float
) -> dict[str, Any]:
    p = dict(params)

    if estrategia == "DCA":
        p.setdefault("intervalo_segundos", 3600)
        p.setdefault("monto_por_orden", round(min(capital_inicial * 0.1, capital_inicial), 8))
        if float(p["intervalo_segundos"]) <= 0:
            raise HTTPException(400, "intervalo_segundos debe ser mayor a 0")
        if float(p["monto_por_orden"]) <= 0:
            raise HTTPException(400, "monto_por_orden debe ser mayor a 0")

    elif estrategia == "GRID":
        p.setdefault("niveles", 5)
        p.setdefault("spread_pct", 1.0)
        niveles = int(p["niveles"])
        if niveles <= 0:
            raise HTTPException(400, "niveles debe ser mayor a 0")
        p.setdefault("capital_por_nivel", round(capital_inicial / (niveles * 2), 8))
        if float(p["spread_pct"]) <= 0:
            raise HTTPException(400, "spread_pct debe ser mayor a 0")
        if float(p["capital_por_nivel"]) <= 0:
            raise HTTPException(400, "capital_por_nivel debe ser mayor a 0")
        # Niveles fijos al precio de creación del bot -- el motor los lee de acá.
        p["precio_base"] = precio_actual
        p["_ultimo_precio"] = precio_actual

    elif estrategia == "SMA":
        p.setdefault("sma_corta", 9)
        p.setdefault("sma_larga", 21)
        p.setdefault("interval", "1h")
        p.setdefault("monto_por_orden", round(capital_inicial * 0.2, 8))
        corta = int(p["sma_corta"])
        larga = int(p["sma_larga"])
        if corta <= 0 or larga <= 0:
            raise HTTPException(400, "sma_corta y sma_larga deben ser mayores a 0")
        if corta >= larga:
            raise HTTPException(400, "sma_corta debe ser menor que sma_larga")
        if float(p["monto_por_orden"]) <= 0:
            raise HTTPException(400, "monto_por_orden debe ser mayor a 0")

    return p


# ---------------------------------------------------------------------------
# Helpers de acceso a datos
# ---------------------------------------------------------------------------


async def _fetch_bot_row(db: aiosqlite.Connection, bot_id: int) -> aiosqlite.Row | None:
    cur = await db.execute("SELECT * FROM bots WHERE id = ?", (bot_id,))
    return await cur.fetchone()


async def _get_bot_or_404(db: aiosqlite.Connection, bot_id: int) -> aiosqlite.Row:
    row = await _fetch_bot_row(db, bot_id)
    if row is None:
        raise HTTPException(status_code=404, detail=f"Bot {bot_id} no encontrado")
    return row


async def _bot_to_out(
    db: aiosqlite.Connection, bot_row: aiosqlite.Row, precio_actual: float | None = None
) -> dict[str, Any]:
    bot = dict(bot_row)

    if precio_actual is None:
        try:
            precio_actual = await get_price(bot["par"])
        except httpx.HTTPError as exc:
            logger.warning("bots: no se pudo obtener precio en vivo de %s: %s", bot["par"], exc)
            precio_actual = None

    cantidad_total, capital_invertido = await get_position(db, bot["id"])

    if precio_actual is not None:
        equity = bot["capital_actual"] + cantidad_total * precio_actual
        pnl_usd = equity - bot["capital_inicial"]
        pnl_pct = (pnl_usd / bot["capital_inicial"] * 100) if bot["capital_inicial"] else 0.0
    else:
        pnl_usd = 0.0
        pnl_pct = 0.0

    cur = await db.execute(
        "SELECT timestamp, equity FROM equity_snapshots WHERE bot_id = ? ORDER BY id DESC LIMIT ?",
        (bot["id"], EQUITY_PREVIEW_POINTS),
    )
    rows = await cur.fetchall()
    equity_curve = [{"timestamp": r["timestamp"], "equity": r["equity"]} for r in reversed(rows)]

    return {
        "id": bot["id"],
        "nombre": bot["nombre"],
        "estrategia": bot["estrategia"],
        "par": bot["par"],
        "capital_inicial": bot["capital_inicial"],
        "capital_actual": bot["capital_actual"],
        "cantidad_total": cantidad_total,
        "capital_invertido": capital_invertido,
        "precio_actual": precio_actual,
        "pnl_usd": pnl_usd,
        "pnl_pct": pnl_pct,
        "estado": bot["estado"],
        "creado_at": bot["creado_at"],
        "params": json.loads(bot["params"] or "{}"),
        "equity_curve": equity_curve,
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/", response_model=BotOut, status_code=201)
async def crear_bot(payload: BotCreate, db: aiosqlite.Connection = Depends(get_db)) -> dict[str, Any]:
    par = payload.par.strip().upper()

    try:
        precio_actual = await get_price(par)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=400, detail=f"No se pudo validar el par {par} en Binance: {exc}"
        ) from exc

    params = _validar_params(payload.estrategia, payload.capital_inicial, payload.params, precio_actual)
    ts = now_iso()

    cur = await db.execute(
        """
        INSERT INTO bots (nombre, estrategia, par, capital_inicial, capital_actual, params, estado, creado_at)
        VALUES (?, ?, ?, ?, ?, ?, 'activo', ?)
        """,
        (
            payload.nombre.strip(),
            payload.estrategia,
            par,
            payload.capital_inicial,
            payload.capital_inicial,
            json.dumps(params),
            ts,
        ),
    )
    bot_id = cur.lastrowid

    # Punto inicial de la equity curve -- así el gráfico arranca en t0 sin
    # esperar al primer tick del motor (hasta 60s de espera si no).
    await db.execute(
        "INSERT INTO equity_snapshots (bot_id, timestamp, equity, precio) VALUES (?, ?, ?, ?)",
        (bot_id, ts, payload.capital_inicial, precio_actual),
    )
    await db.commit()

    bot_row = await _fetch_bot_row(db, bot_id)
    assert bot_row is not None
    return await _bot_to_out(db, bot_row, precio_actual=precio_actual)


@router.get("/", response_model=list[BotOut])
async def listar_bots(db: aiosqlite.Connection = Depends(get_db)) -> list[dict[str, Any]]:
    cur = await db.execute("SELECT * FROM bots ORDER BY id DESC")
    rows = await cur.fetchall()

    # Los bots que comparten par (ej. dos bots en BTCUSDT) reusan el mismo
    # fetch de precio en este request en vez de pegarle a Binance por cada uno.
    price_cache: dict[str, float | None] = {}
    result: list[dict[str, Any]] = []
    for row in rows:
        par = row["par"]
        if par not in price_cache:
            try:
                price_cache[par] = await get_price(par)
            except httpx.HTTPError as exc:
                logger.warning("bots: no se pudo obtener precio en vivo de %s: %s", par, exc)
                price_cache[par] = None
        result.append(await _bot_to_out(db, row, precio_actual=price_cache[par]))
    return result


@router.get("/{bot_id}/trades", response_model=list[TradeOut])
async def listar_trades(bot_id: int, db: aiosqlite.Connection = Depends(get_db)) -> list[dict[str, Any]]:
    await _get_bot_or_404(db, bot_id)
    cur = await db.execute(
        "SELECT * FROM trades WHERE bot_id = ? ORDER BY timestamp ASC, id ASC", (bot_id,)
    )
    rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.get("/{bot_id}/equity")
async def historial_equity(bot_id: int, db: aiosqlite.Connection = Depends(get_db)) -> list[dict[str, Any]]:
    """Equity curve completa del bot (todos los snapshots), para el detalle en el frontend."""
    await _get_bot_or_404(db, bot_id)
    cur = await db.execute(
        "SELECT timestamp, equity FROM equity_snapshots WHERE bot_id = ? ORDER BY id ASC", (bot_id,)
    )
    rows = await cur.fetchall()
    return [dict(r) for r in rows]


@router.patch("/{bot_id}/estado", response_model=BotOut)
async def cambiar_estado(
    bot_id: int, payload: BotEstadoUpdate, db: aiosqlite.Connection = Depends(get_db)
) -> dict[str, Any]:
    await _get_bot_or_404(db, bot_id)
    await db.execute("UPDATE bots SET estado = ? WHERE id = ?", (payload.estado, bot_id))
    await db.commit()
    bot_row = await _fetch_bot_row(db, bot_id)
    assert bot_row is not None
    return await _bot_to_out(db, bot_row)


@router.delete("/{bot_id}", status_code=204)
async def eliminar_bot(bot_id: int, db: aiosqlite.Connection = Depends(get_db)) -> Response:
    await _get_bot_or_404(db, bot_id)
    await db.execute("DELETE FROM bots WHERE id = ?", (bot_id,))
    await db.commit()
    return Response(status_code=204)
