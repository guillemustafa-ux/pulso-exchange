"""Tests del router de bots (app/routers/bots.py) -- CRUD de paper trading.

Cubren la lógica pura de defaults/validación por estrategia (`_validar_params`),
la validación pydantic del payload (`BotCreate`), y el ciclo de vida completo
vía llamadas directas a los endpoints contra la SQLite real del fixture `db`:
crear (201 + defaults + snapshot inicial), listar (dedupe de precio por par,
degradación a precio None), trades/equity (404 + orden), patch de estado y
delete (404 + desaparición). Nunca se pega a Binance: `bots.get_price` mockeado.

Gotcha de binding: `bots.py` hace `from app.motor.engine import get_price`, así
que monkeypatcheamos `bots.get_price` (el nombre en el namespace de bots), NO
`engine.get_price` -- patchear el origen no afecta la llamada dentro de bots.
"""

from __future__ import annotations

import httpx
import pytest
from pydantic import ValidationError

from app.routers import bots
from app.schemas.bots import BotCreate, BotEstadoUpdate, BotOut, TradeOut

PRECIO_STUB = 50_000.0


def _price(value: float = PRECIO_STUB):
    async def fake(par: str) -> float:
        return value

    return fake


def _price_boom(exc: Exception | None = None):
    async def fake(par: str) -> float:
        raise exc or httpx.ConnectError("binance down")

    return fake


def _payload(**over) -> BotCreate:
    base = {"nombre": "mi-bot", "estrategia": "DCA", "par": "BTCUSDT", "capital_inicial": 1000.0}
    base.update(over)
    return BotCreate(**base)


# ---------------------------------------------------------------------------
# _validar_params (pura) -- defaults + validaciones 400 por estrategia
# ---------------------------------------------------------------------------


def test_validar_params_dca_defaults():
    p = bots._validar_params("DCA", 1000.0, {}, PRECIO_STUB)
    assert p["intervalo_segundos"] == 3600
    assert p["monto_por_orden"] == 100.0  # 10% del capital


def test_validar_params_grid_defaults_fija_precio_base():
    p = bots._validar_params("GRID", 1000.0, {}, PRECIO_STUB)
    assert p["niveles"] == 5
    assert p["spread_pct"] == 1.0
    assert p["capital_por_nivel"] == 100.0  # 1000 / (5*2)
    assert p["precio_base"] == PRECIO_STUB
    assert p["_ultimo_precio"] == PRECIO_STUB


def test_validar_params_sma_defaults():
    p = bots._validar_params("SMA", 1000.0, {}, PRECIO_STUB)
    assert p["sma_corta"] == 9
    assert p["sma_larga"] == 21
    assert p["monto_por_orden"] == 200.0  # 20% del capital


@pytest.mark.parametrize(
    "estrategia,params,fragmento",
    [
        ("DCA", {"intervalo_segundos": 0}, "intervalo_segundos"),
        ("DCA", {"monto_por_orden": 0}, "monto_por_orden"),
        ("GRID", {"niveles": 0}, "niveles"),
        ("GRID", {"spread_pct": 0}, "spread_pct"),
        ("SMA", {"sma_corta": 0}, "sma_corta"),
        ("SMA", {"sma_corta": 21, "sma_larga": 9}, "menor"),  # corta >= larga
        ("SMA", {"monto_por_orden": 0}, "monto_por_orden"),
    ],
)
def test_validar_params_rechaza_valores_invalidos(estrategia, params, fragmento):
    with pytest.raises(bots.HTTPException) as exc:
        bots._validar_params(estrategia, 1000.0, params, PRECIO_STUB)
    assert exc.value.status_code == 400
    assert fragmento in exc.value.detail


# ---------------------------------------------------------------------------
# BotCreate (pydantic) -- validación del payload antes de tocar el router
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "over",
    [
        {"par": "BTC"},  # min_length=5
        {"capital_inicial": 0},  # gt=0
        {"capital_inicial": -5},
        {"estrategia": "HODL"},  # fuera del Literal
        {"nombre": ""},  # min_length=1
    ],
)
def test_botcreate_rechaza_payload_invalido(over):
    with pytest.raises(ValidationError):
        _payload(**over)


# ---------------------------------------------------------------------------
# crear_bot
# ---------------------------------------------------------------------------


async def test_crear_bot_dca_201_con_defaults_y_snapshot(db, monkeypatch):
    monkeypatch.setattr(bots, "get_price", _price())
    out = await bots.crear_bot(_payload(), db=db)
    model = BotOut(**out)  # valida contra el schema de respuesta

    assert model.id > 0
    assert model.estado == "activo"
    assert model.par == "BTCUSDT"
    assert model.precio_actual == PRECIO_STUB
    assert model.params["intervalo_segundos"] == 3600
    # El punto inicial de la equity curve se sembró en la creación (sin esperar al motor).
    assert len(model.equity_curve) == 1
    assert model.equity_curve[0].equity == 1000.0


async def test_crear_bot_grid_persiste_precio_base(db, monkeypatch):
    monkeypatch.setattr(bots, "get_price", _price())
    out = await bots.crear_bot(_payload(estrategia="GRID"), db=db)
    assert out["params"]["precio_base"] == PRECIO_STUB
    assert out["params"]["niveles"] == 5


async def test_crear_bot_normaliza_el_par_a_mayusculas(db, monkeypatch):
    monkeypatch.setattr(bots, "get_price", _price())
    out = await bots.crear_bot(_payload(par="ethusdt"), db=db)
    assert out["par"] == "ETHUSDT"


async def test_crear_bot_par_invalido_devuelve_400(db, monkeypatch):
    # get_price falla -> el par no existe en Binance -> 400 (no 502: es input del usuario).
    monkeypatch.setattr(bots, "get_price", _price_boom())
    with pytest.raises(bots.HTTPException) as exc:
        await bots.crear_bot(_payload(par="FAKEUSDT"), db=db)
    assert exc.value.status_code == 400


# ---------------------------------------------------------------------------
# listar_bots
# ---------------------------------------------------------------------------


async def test_listar_bots_vacio(db, monkeypatch):
    monkeypatch.setattr(bots, "get_price", _price())
    assert await bots.listar_bots(db=db) == []


async def test_listar_bots_dedupe_precio_por_par(db, monkeypatch):
    # Dos bots en el MISMO par: get_price debe llamarse UNA sola vez (dedupe intra-request).
    calls: list[str] = []

    async def counting(par: str) -> float:
        calls.append(par)
        return PRECIO_STUB

    monkeypatch.setattr(bots, "get_price", counting)
    await bots.crear_bot(_payload(nombre="a", par="BTCUSDT"), db=db)
    await bots.crear_bot(_payload(nombre="b", par="BTCUSDT"), db=db)
    calls.clear()  # ignoramos los fetches de la creación; medimos solo el listado

    result = await bots.listar_bots(db=db)
    assert len(result) == 2
    assert calls == ["BTCUSDT"]  # un solo fetch pese a los dos bots


async def test_listar_bots_degrada_precio_none_sin_romper(db, monkeypatch):
    monkeypatch.setattr(bots, "get_price", _price())
    await bots.crear_bot(_payload(), db=db)
    # Ahora Binance cae: el listado sigue devolviendo el bot, con precio_actual None.
    monkeypatch.setattr(bots, "get_price", _price_boom())
    result = await bots.listar_bots(db=db)
    assert len(result) == 1
    assert result[0]["precio_actual"] is None
    assert result[0]["pnl_usd"] == 0.0


# ---------------------------------------------------------------------------
# trades / equity
# ---------------------------------------------------------------------------


async def test_listar_trades_404_si_no_existe(db):
    with pytest.raises(bots.HTTPException) as exc:
        await bots.listar_trades(999, db=db)
    assert exc.value.status_code == 404


async def test_listar_trades_ordena_por_timestamp(db, monkeypatch):
    monkeypatch.setattr(bots, "get_price", _price())
    out = await bots.crear_bot(_payload(), db=db)
    bot_id = out["id"]
    # Insertamos fuera de orden temporal; el endpoint debe devolverlos ASC por timestamp.
    for ts, tipo in [
        ("2026-03-01T00:00:00+00:00", "venta"),
        ("2026-01-01T00:00:00+00:00", "compra"),
        ("2026-02-01T00:00:00+00:00", "compra"),
    ]:
        await db.execute(
            "INSERT INTO trades (bot_id, tipo, precio, cantidad, timestamp) VALUES (?, ?, ?, ?, ?)",
            (bot_id, tipo, PRECIO_STUB, 0.01, ts),
        )
    await db.commit()

    trades = await bots.listar_trades(bot_id, db=db)
    assert [t["timestamp"][:7] for t in trades] == ["2026-01", "2026-02", "2026-03"]
    for t in trades:
        TradeOut(**t)  # cada trade valida contra su schema


async def test_historial_equity_404_y_devuelve_snapshots(db, monkeypatch):
    monkeypatch.setattr(bots, "get_price", _price())
    with pytest.raises(bots.HTTPException) as exc:
        await bots.historial_equity(999, db=db)
    assert exc.value.status_code == 404

    out = await bots.crear_bot(_payload(), db=db)
    puntos = await bots.historial_equity(out["id"], db=db)
    assert len(puntos) == 1  # el snapshot inicial de la creación
    assert puntos[0]["equity"] == 1000.0


# ---------------------------------------------------------------------------
# cambiar_estado
# ---------------------------------------------------------------------------


async def test_cambiar_estado_404(db):
    with pytest.raises(bots.HTTPException) as exc:
        await bots.cambiar_estado(999, BotEstadoUpdate(estado="pausado"), db=db)
    assert exc.value.status_code == 404


async def test_cambiar_estado_actualiza(db, monkeypatch):
    monkeypatch.setattr(bots, "get_price", _price())
    out = await bots.crear_bot(_payload(), db=db)
    assert out["estado"] == "activo"
    actualizado = await bots.cambiar_estado(out["id"], BotEstadoUpdate(estado="pausado"), db=db)
    assert actualizado["estado"] == "pausado"


def test_botestadoupdate_rechaza_estado_invalido():
    with pytest.raises(ValidationError):
        BotEstadoUpdate(estado="borrado")  # fuera del Literal activo/pausado


# ---------------------------------------------------------------------------
# eliminar_bot
# ---------------------------------------------------------------------------


async def test_eliminar_bot_404(db):
    with pytest.raises(bots.HTTPException) as exc:
        await bots.eliminar_bot(999, db=db)
    assert exc.value.status_code == 404


async def test_eliminar_bot_204_y_desaparece(db, monkeypatch):
    monkeypatch.setattr(bots, "get_price", _price())
    out = await bots.crear_bot(_payload(), db=db)
    resp = await bots.eliminar_bot(out["id"], db=db)
    assert resp.status_code == 204
    # Ya no está: un segundo delete da 404.
    with pytest.raises(bots.HTTPException) as exc:
        await bots.eliminar_bot(out["id"], db=db)
    assert exc.value.status_code == 404
