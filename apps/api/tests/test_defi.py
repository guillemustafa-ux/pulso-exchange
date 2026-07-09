"""Tests del router DeFi (app/routers/defi.py).

Cubren: el mapeo DefiLlama -> DefiProtocolItem, el orden por TVL descendente,
el filtrado de protocolos sin TVL numérico, el cap a TOP_N, y el 502 ante
DefiLlama caído. Sin red (upstream mockeado).
"""

from __future__ import annotations

import httpx

from app.routers import defi
from app.schemas.defi import DefiProtocolItem
from tests.conftest import clear_cache


def _reset():
    clear_cache(defi._protocols_cache)


def _raw(name, tvl, **over):
    base = {
        "slug": name.lower(),
        "name": name,
        "logo": f"https://logo/{name}.png",
        "category": "Lending",
        "chains": ["Ethereum"],
        "tvl": tvl,
        "change_7d": 1.5,
        "listedAt": 1700000000,
    }
    base.update(over)
    return base


async def test_protocols_ordena_por_tvl_desc_y_filtra_sin_tvl(monkeypatch):
    _reset()
    raw = [
        _raw("Aave", 1000),
        _raw("SinTvl", None),  # tvl null -> se filtra
        _raw("Lido", 5000),
        _raw("Uniswap", 3000),
    ]

    async def fake_fetch():
        return raw

    monkeypatch.setattr(defi, "_fetch_protocols_raw", fake_fetch)
    result = await defi.get_protocols()

    names = [p["name"] for p in result]
    assert names == ["Lido", "Uniswap", "Aave"]  # ordenado desc, SinTvl afuera
    for item in result:
        DefiProtocolItem(**item)  # cada uno valida contra el schema


async def test_protocols_capea_a_top_n(monkeypatch):
    _reset()
    raw = [_raw(f"P{i}", float(i)) for i in range(1, 80)]  # 79 protocolos

    async def fake_fetch():
        return raw

    monkeypatch.setattr(defi, "_fetch_protocols_raw", fake_fetch)
    result = await defi.get_protocols()
    assert len(result) == defi.TOP_N  # 50


async def test_protocols_upstream_caido_devuelve_502(monkeypatch):
    _reset()

    async def fake_fetch():
        raise httpx.ConnectError("defillama down")

    monkeypatch.setattr(defi, "_fetch_protocols_raw", fake_fetch)
    try:
        await defi.get_protocols()
        raise AssertionError("debería haber levantado 502")
    except defi.HTTPException as exc:
        assert exc.status_code == 502


def test_map_protocol_fallbacks_de_id():
    # id sale de slug; si falta, de id; si falta, de name.
    assert defi._map_protocol({"slug": "aave", "name": "Aave"})["id"] == "aave"
    assert defi._map_protocol({"id": 42, "name": "X"})["id"] == "42"
    assert defi._map_protocol({"name": "OnlyName"})["id"] == "OnlyName"
    # chains ausente -> lista vacía (el schema exige lista)
    assert defi._map_protocol({"name": "X"})["chains"] == []
