"""Tests del router Earn AR (app/routers/earn.py).

Cubren: la tabla curada real (earn_ar.json) validada contra el schema, la
combinación con cotizaciones CriptoYa (mockeadas), y la degradación amable
cuando CriptoYa cae (cotizaciones=null + error, tabla igual servida). Sin red.
"""

from __future__ import annotations

import httpx

from app.routers import earn
from app.schemas.earn import EarnArResponse
from tests.conftest import clear_cache

FAKE_COTIZACIONES = {
    "dolar": {"mep": {"al30": {"ci": {"price": 1200}}}},
    "usdt_ars": {"binance": {"ask": 1300}},
}


def _reset():
    clear_cache(earn._cotizaciones_cache)


async def test_earn_ar_combina_tabla_y_cotizaciones(monkeypatch):
    _reset()

    async def fake_fetch():
        return FAKE_COTIZACIONES

    monkeypatch.setattr(earn, "_fetch_cotizaciones", fake_fetch)
    result = await earn.get_earn_ar()

    # Valida el shape completo contra el modelo real del endpoint.
    model = EarnArResponse(**result)
    assert len(model.opciones) > 0  # la tabla curada real se cargó de disco
    assert model.cotizaciones == FAKE_COTIZACIONES
    assert model.cotizaciones_error is None


async def test_earn_ar_degrada_si_criptoya_cae(monkeypatch):
    _reset()

    async def fake_fetch():
        raise httpx.ConnectError("criptoya down")

    monkeypatch.setattr(earn, "_fetch_cotizaciones", fake_fetch)
    result = await earn.get_earn_ar()

    model = EarnArResponse(**result)
    assert model.cotizaciones is None
    assert model.cotizaciones_error is not None
    assert len(model.opciones) > 0  # la tabla curada se sirve igual


async def test_earn_ar_cachea_las_cotizaciones(monkeypatch):
    _reset()
    calls = {"n": 0}

    async def fake_fetch():
        calls["n"] += 1
        return FAKE_COTIZACIONES

    monkeypatch.setattr(earn, "_fetch_cotizaciones", fake_fetch)
    await earn.get_earn_ar()
    await earn.get_earn_ar()
    assert calls["n"] == 1  # el segundo request sale de la cache (TTL 10 min)


async def test_earn_ar_500_si_el_archivo_estatico_falla(monkeypatch):
    _reset()

    def boom():
        raise OSError("earn_ar.json ilegible")

    monkeypatch.setattr(earn, "_load_opciones", boom)
    try:
        await earn.get_earn_ar()
        raise AssertionError("debería haber levantado 500")
    except earn.HTTPException as exc:
        assert exc.status_code == 500


def test_tabla_curada_real_valida_contra_schema():
    # La tabla estática de disco no debe romper el modelo (guardia de datos).
    opciones = earn._load_opciones()
    assert isinstance(opciones, list) and len(opciones) > 0
    EarnArResponse(
        disclaimer="x",
        updated_at="2026-07-09T00:00:00+00:00",
        opciones=opciones,
        cotizaciones=None,
        cotizaciones_error=None,
    )
