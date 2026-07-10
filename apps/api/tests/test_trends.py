"""Tests del router Trends (app/routers/trends.py).

Cubren: /fear-greed (happy + 502), la lógica pura de gainers/losers
(`_top_movers`), y /summary combinando 4 fuentes con degradación amable
(si una cae, esa parte queda vacía y el resto se sirve). Sin red.
"""

from __future__ import annotations

import httpx

from app.routers import market, trends
from app.schemas.trends import FearGreedResponse, TrendsSummaryResponse
from tests.conftest import clear_cache

FNG_RAW = {
    "name": "Fear and Greed Index",
    "data": [
        {"value": "72", "value_classification": "Greed", "timestamp": 1700000000},
        {"value": "50", "value_classification": "Neutral", "timestamp": 1699913600},
    ],
}

GLOBAL_RAW = {
    "total_market_cap": {"usd": 2_500_000_000_000},
    "market_cap_change_percentage_24h_usd": 1.8,
    "market_cap_percentage": {"btc": 54.2},
}


def _coin(cid, pct):
    return {
        "id": cid,
        "symbol": cid[:3],
        "name": cid.title(),
        "image": None,
        "current_price": 100.0,
        "price_change_percentage_24h_in_currency": pct,
        "market_cap_rank": 1,
    }


def _reset_all():
    for c in (trends._fng_cache, trends._trending_cache, trends._global_cache, market._top100_cache):
        clear_cache(c)


# ---------------------------------------------------------------------------
# _top_movers (pura)
# ---------------------------------------------------------------------------


def test_top_movers_ordena_y_filtra_sin_pct():
    coins = [_coin("aaa", 10), _coin("bbb", -8), _coin("ccc", 3), _coin("ddd", None)]
    gainers, losers = trends._top_movers(coins, top_n=2)
    assert [g["id"] for g in gainers] == ["aaa", "ccc"]  # desc
    assert [l["id"] for l in losers] == ["bbb", "ccc"]  # asc
    # 'ddd' (pct None) quedó fuera de ambos
    assert all(m["id"] != "ddd" for m in gainers + losers)


def test_pct_24h_usa_in_currency_y_cae_al_generico():
    # Prioriza el campo _in_currency; si falta, usa el genérico; si faltan ambos, None.
    assert trends._pct_24h({"price_change_percentage_24h_in_currency": 5.0}) == 5.0
    assert trends._pct_24h({"price_change_percentage_24h": -3.0}) == -3.0
    assert trends._pct_24h({}) is None


# ---------------------------------------------------------------------------
# /fear-greed
# ---------------------------------------------------------------------------


async def test_fear_greed_happy(monkeypatch):
    _reset_all()

    async def fake(limit=30):
        return FNG_RAW

    monkeypatch.setattr(trends, "_fetch_fear_greed", fake)
    result = await trends.get_fear_greed()
    model = FearGreedResponse(**result)
    assert model.data[0].value == 72


async def test_fear_greed_upstream_caido_502(monkeypatch):
    _reset_all()

    async def fake(limit=30):
        raise httpx.ConnectError("fng down")

    monkeypatch.setattr(trends, "_fetch_fear_greed", fake)
    try:
        await trends.get_fear_greed()
        raise AssertionError("debería haber levantado 502")
    except trends.HTTPException as exc:
        assert exc.status_code == 502


async def test_fear_greed_cachea_sin_refetch(monkeypatch):
    _reset_all()
    calls = {"n": 0}

    async def fake(limit=30):
        calls["n"] += 1
        return FNG_RAW

    monkeypatch.setattr(trends, "_fetch_fear_greed", fake)
    await trends.get_fear_greed()
    await trends.get_fear_greed()
    assert calls["n"] == 1  # el segundo request sale de la cache (TTL 1h)


# ---------------------------------------------------------------------------
# /summary
# ---------------------------------------------------------------------------


async def test_summary_combina_las_cuatro_fuentes(monkeypatch):
    _reset_all()

    async def fng(limit=30):
        return FNG_RAW

    async def trending():
        return []

    async def top100():
        return [_coin("aaa", 20), _coin("bbb", -15), _coin("ccc", 5)]

    async def glob():
        return GLOBAL_RAW

    monkeypatch.setattr(trends, "_fetch_fear_greed", fng)
    monkeypatch.setattr(trends, "_fetch_trending_raw", trending)
    monkeypatch.setattr(trends, "_fetch_top100", top100)
    monkeypatch.setattr(trends, "_fetch_global_raw", glob)

    result = await trends.get_summary()
    model = TrendsSummaryResponse(**result)
    assert model.fear_greed.value == 72
    assert model.fear_greed.label == "Greed"
    assert [g.id for g in model.gainers] == ["aaa", "ccc", "bbb"]  # top_n=5 -> los 3
    assert model.losers[0].id == "bbb"
    assert model.market_cap_usd == 2_500_000_000_000
    assert model.btc_dominance == 54.2


async def test_summary_degrada_si_una_fuente_cae(monkeypatch):
    _reset_all()

    async def fng(limit=30):
        raise httpx.ConnectError("fng down")  # esta fuente cae

    async def trending():
        return []

    async def top100():
        return [_coin("aaa", 20)]

    async def glob():
        return GLOBAL_RAW

    monkeypatch.setattr(trends, "_fetch_fear_greed", fng)
    monkeypatch.setattr(trends, "_fetch_trending_raw", trending)
    monkeypatch.setattr(trends, "_fetch_top100", top100)
    monkeypatch.setattr(trends, "_fetch_global_raw", glob)

    result = await trends.get_summary()
    model = TrendsSummaryResponse(**result)
    assert model.fear_greed is None  # la fuente caída degrada a None
    assert model.market_cap_usd == 2_500_000_000_000  # el resto se sirve igual
    assert len(model.gainers) == 1


async def test_summary_las_cuatro_caen_devuelve_200_vacio(monkeypatch):
    _reset_all()

    async def down(*a, **k):
        raise httpx.ConnectError("todo caído")

    monkeypatch.setattr(trends, "_fetch_fear_greed", down)
    monkeypatch.setattr(trends, "_fetch_trending_raw", down)
    monkeypatch.setattr(trends, "_fetch_top100", down)
    monkeypatch.setattr(trends, "_fetch_global_raw", down)

    # asyncio.gather(return_exceptions=True) -> no propaga, degrada todo a vacío.
    result = await trends.get_summary()
    model = TrendsSummaryResponse(**result)
    assert model.fear_greed is None
    assert model.trending == []
    assert model.gainers == [] and model.losers == []
    assert model.market_cap_usd is None
    assert model.btc_dominance is None


async def test_summary_trunca_trending_a_siete(monkeypatch):
    _reset_all()

    async def fng(limit=30):
        return FNG_RAW

    async def trending():
        # 10 trending crudos; el summary debe recortar a 7.
        return [{"id": f"c{i}", "name": f"Coin {i}", "symbol": f"c{i}"} for i in range(10)]

    async def top100():
        return []

    async def glob():
        return GLOBAL_RAW

    monkeypatch.setattr(trends, "_fetch_fear_greed", fng)
    monkeypatch.setattr(trends, "_fetch_trending_raw", trending)
    monkeypatch.setattr(trends, "_fetch_top100", top100)
    monkeypatch.setattr(trends, "_fetch_global_raw", glob)

    result = await trends.get_summary()
    model = TrendsSummaryResponse(**result)
    assert len(model.trending) == 7
