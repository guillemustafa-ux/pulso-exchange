"""Tests del motor de paper trading (app/motor/engine.py).

Cubren la aritmética de posición (buy/sell con costo promedio), y la lógica de
decisión de las tres estrategias (DCA por tiempo, GRID por cruce de niveles,
SMA por crossover) contra una DB real en tmp_path — sin red: el precio llega
por parámetro y las klines de SMA se monkeypatchean.
"""

from __future__ import annotations

import pytest

from app.motor import engine
from tests.conftest import fetch_capital, fetch_trades

TS = "2026-01-01T02:00:00+00:00"


# ---------------------------------------------------------------------------
# sma_series (pura)
# ---------------------------------------------------------------------------


def test_sma_series_valores_conocidos():
    assert engine.sma_series([1, 2, 3, 4, 5], 3) == [2.0, 3.0, 4.0]


def test_sma_series_periodo_igual_al_largo():
    assert engine.sma_series([2, 4, 6], 3) == [4.0]


@pytest.mark.parametrize("period", [0, -1, 4])
def test_sma_series_degenerada_devuelve_vacio(period):
    # periodo <= 0 o mayor que la cantidad de datos: no hay ventana posible.
    assert engine.sma_series([1, 2, 3], period) == []


# ---------------------------------------------------------------------------
# execute_buy / execute_sell
# ---------------------------------------------------------------------------


async def test_buy_descuenta_capital_y_abre_posicion(db, mk_bot):
    bot = await mk_bot(capital=1000.0)
    ok = await engine.execute_buy(db, bot["id"], monto_usd=100.0, precio=10.0, ts=TS)
    assert ok is True
    assert await fetch_capital(db, bot["id"]) == pytest.approx(900.0)
    cantidad, invertido = await engine.get_position(db, bot["id"])
    assert cantidad == pytest.approx(10.0)
    assert invertido == pytest.approx(100.0)
    trades = await fetch_trades(db, bot["id"])
    assert [t["tipo"] for t in trades] == ["compra"]


async def test_buy_clampea_al_cash_disponible(db, mk_bot):
    bot = await mk_bot(capital=15.0)
    assert await engine.execute_buy(db, bot["id"], monto_usd=100.0, precio=10.0, ts=TS)
    assert await fetch_capital(db, bot["id"]) == pytest.approx(0.0)
    cantidad, invertido = await engine.get_position(db, bot["id"])
    assert cantidad == pytest.approx(1.5)
    assert invertido == pytest.approx(15.0)
    # Sin cash: la siguiente orden se saltea, no es error.
    assert await engine.execute_buy(db, bot["id"], monto_usd=10.0, precio=10.0, ts=TS) is False


async def test_buy_rechaza_precio_invalido(db, mk_bot):
    bot = await mk_bot()
    assert await engine.execute_buy(db, bot["id"], monto_usd=10.0, precio=0.0, ts=TS) is False
    assert await fetch_trades(db, bot["id"]) == []


async def test_sell_sin_posicion_devuelve_false(db, mk_bot):
    bot = await mk_bot()
    assert await engine.execute_sell(db, bot["id"], cantidad_deseada=1.0, precio=10.0, ts=TS) is False


async def test_roundtrip_buy_sell_costo_promedio(db, mk_bot):
    """Vender parte de la posición remueve costo a precio PROMEDIO, no al de mercado."""
    bot = await mk_bot(capital=1000.0)
    await engine.execute_buy(db, bot["id"], monto_usd=100.0, precio=10.0, ts=TS)  # 10 u @ 10

    ok = await engine.execute_sell(db, bot["id"], cantidad_deseada=4.0, precio=12.0, ts=TS)
    assert ok is True
    # proceeds = 4*12 = 48; costo removido = 4*10 = 40
    assert await fetch_capital(db, bot["id"]) == pytest.approx(900.0 + 48.0)
    cantidad, invertido = await engine.get_position(db, bot["id"])
    assert cantidad == pytest.approx(6.0)
    assert invertido == pytest.approx(60.0)


async def test_sell_clampea_al_holding(db, mk_bot):
    bot = await mk_bot(capital=100.0)
    await engine.execute_buy(db, bot["id"], monto_usd=50.0, precio=5.0, ts=TS)  # 10 u
    assert await engine.execute_sell(db, bot["id"], cantidad_deseada=999.0, precio=5.0, ts=TS)
    cantidad, invertido = await engine.get_position(db, bot["id"])
    assert cantidad == pytest.approx(0.0)
    assert invertido == pytest.approx(0.0)


# ---------------------------------------------------------------------------
# Estrategia DCA — compra cada N segundos
# ---------------------------------------------------------------------------


async def test_dca_compra_cuando_paso_el_intervalo(db, mk_bot):
    bot = await mk_bot(
        estrategia="DCA",
        params={"intervalo_segundos": 3600, "monto_por_orden": 10},
        creado_at="2026-01-01T00:00:00+00:00",
    )
    await engine._process_dca(db, bot, precio=100.0, ts=TS)  # 2 h después de creado
    trades = await fetch_trades(db, bot["id"])
    assert len(trades) == 1 and trades[0]["tipo"] == "compra"


async def test_dca_no_repite_dentro_del_intervalo(db, mk_bot):
    bot = await mk_bot(
        estrategia="DCA",
        params={"intervalo_segundos": 3600, "monto_por_orden": 10},
        creado_at="2026-01-01T00:00:00+00:00",
    )
    await engine._process_dca(db, bot, precio=100.0, ts=TS)
    # Mismo timestamp: elapsed desde la última compra = 0 < intervalo.
    await engine._process_dca(db, bot, precio=100.0, ts=TS)
    assert len(await fetch_trades(db, bot["id"])) == 1


async def test_dca_timestamp_corrupto_no_traba_el_bot(db, mk_bot):
    bot = await mk_bot(
        estrategia="DCA",
        params={"intervalo_segundos": 3600, "monto_por_orden": 10},
        creado_at="esto-no-es-una-fecha",
    )
    await engine._process_dca(db, bot, precio=100.0, ts=TS)
    assert len(await fetch_trades(db, bot["id"])) == 1  # forzó la compra en vez de trabarse


# ---------------------------------------------------------------------------
# Estrategia GRID — cruces de niveles vs el precio del tick anterior
# ---------------------------------------------------------------------------

GRID_PARAMS = {"niveles": 5, "spread_pct": 1.0, "capital_por_nivel": 10, "precio_base": 100.0}


async def _grid_tick(db, bot, precio):
    """Corre un tick de grid releyendo params de la DB (como hace el motor real)."""
    cur = await db.execute("SELECT * FROM bots WHERE id = ?", (bot["id"],))
    fresh = dict(await cur.fetchone())
    await engine._process_grid(db, fresh, precio=precio, ts=TS)


async def test_grid_primer_tick_solo_registra_precio(db, mk_bot):
    bot = await mk_bot(estrategia="GRID", params=dict(GRID_PARAMS))
    await _grid_tick(db, bot, 100.0)
    assert await fetch_trades(db, bot["id"]) == []


async def test_grid_compra_al_cruzar_nivel_hacia_abajo(db, mk_bot):
    bot = await mk_bot(estrategia="GRID", params=dict(GRID_PARAMS))
    await _grid_tick(db, bot, 100.0)
    await _grid_tick(db, bot, 98.9)  # cruza el nivel de compra 99, no el 98
    trades = await fetch_trades(db, bot["id"])
    assert [t["tipo"] for t in trades] == ["compra"]
    assert trades[0]["precio"] == pytest.approx(98.9)


async def test_grid_cruce_de_varios_niveles_compra_en_cada_uno(db, mk_bot):
    bot = await mk_bot(estrategia="GRID", params=dict(GRID_PARAMS))
    await _grid_tick(db, bot, 100.0)
    await _grid_tick(db, bot, 96.5)  # cruza 99, 98 y 97 en un solo tick
    assert [t["tipo"] for t in await fetch_trades(db, bot["id"])] == ["compra"] * 3


async def test_grid_vende_al_cruzar_nivel_hacia_arriba_con_holding(db, mk_bot):
    bot = await mk_bot(estrategia="GRID", params=dict(GRID_PARAMS))
    await _grid_tick(db, bot, 100.0)
    await _grid_tick(db, bot, 98.9)  # compra
    await _grid_tick(db, bot, 101.5)  # cruza el nivel de venta 101 -> vende
    tipos = [t["tipo"] for t in await fetch_trades(db, bot["id"])]
    assert tipos == ["compra", "venta"]


async def test_grid_sin_holding_no_vende(db, mk_bot):
    bot = await mk_bot(estrategia="GRID", params=dict(GRID_PARAMS))
    await _grid_tick(db, bot, 100.0)
    await _grid_tick(db, bot, 101.5)  # cruce de venta pero nunca compró
    assert await fetch_trades(db, bot["id"]) == []


# ---------------------------------------------------------------------------
# Estrategia SMA — crossover corta/larga sobre klines (mockeadas)
# ---------------------------------------------------------------------------

SMA_PARAMS = {"sma_corta": 2, "sma_larga": 3, "monto_por_orden": 20}


def _mock_klines(monkeypatch, closes):
    async def fake(par, interval, limit):
        return list(closes)

    monkeypatch.setattr(engine, "fetch_klines_closes", fake)


async def _sma_tick(db, bot, precio):
    cur = await db.execute("SELECT * FROM bots WHERE id = ?", (bot["id"],))
    fresh = dict(await cur.fetchone())
    await engine._process_sma(db, fresh, precio=precio, ts=TS)


async def test_sma_cruce_alcista_compra(db, mk_bot, monkeypatch):
    bot = await mk_bot(estrategia="SMA", params=dict(SMA_PARAMS))
    # sma2: [10, 10, 20] / sma3: [10, 16.67] -> corta cruza de <= a > : alcista
    _mock_klines(monkeypatch, [10, 10, 10, 30])
    await _sma_tick(db, bot, 30.0)
    trades = await fetch_trades(db, bot["id"])
    assert [t["tipo"] for t in trades] == ["compra"]


async def test_sma_misma_senal_no_repite_orden(db, mk_bot, monkeypatch):
    bot = await mk_bot(estrategia="SMA", params=dict(SMA_PARAMS))
    _mock_klines(monkeypatch, [10, 10, 10, 30])
    await _sma_tick(db, bot, 30.0)
    await _sma_tick(db, bot, 30.0)  # mismas klines -> misma señal -> no duplica
    assert len(await fetch_trades(db, bot["id"])) == 1


async def test_sma_cruce_bajista_vende_todo(db, mk_bot, monkeypatch):
    bot = await mk_bot(estrategia="SMA", params=dict(SMA_PARAMS))
    _mock_klines(monkeypatch, [10, 10, 10, 30])
    await _sma_tick(db, bot, 30.0)  # abre posición
    # sma2: [30, 30, 17.5] / sma3: [30, 21.67] -> corta cruza de >= a < : bajista
    _mock_klines(monkeypatch, [30, 30, 30, 5])
    await _sma_tick(db, bot, 5.0)
    tipos = [t["tipo"] for t in await fetch_trades(db, bot["id"])]
    assert tipos == ["compra", "venta"]
    cantidad, _ = await engine.get_position(db, bot["id"])
    assert cantidad == pytest.approx(0.0)


async def test_sma_historial_insuficiente_no_opera(db, mk_bot, monkeypatch):
    bot = await mk_bot(estrategia="SMA", params=dict(SMA_PARAMS))
    _mock_klines(monkeypatch, [10, 10])  # < larga + 1
    await _sma_tick(db, bot, 10.0)
    assert await fetch_trades(db, bot["id"]) == []
