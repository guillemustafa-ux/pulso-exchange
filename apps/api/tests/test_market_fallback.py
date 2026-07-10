"""Tests del fallback CoinGecko -> CoinPaprika de /api/market/top100.

CoinGecko free rechaza requests desde IPs de datacenter (429/451 en Render),
así que el router cae a CoinPaprika sin key. Acá se testea el mapeo de shape
(Paprika -> CoinGecko) contra el modelo pydantic REAL, y la decisión de
fallback — sin red (upstreams monkeypatcheados).
"""

from __future__ import annotations

import httpx
import pytest

from app.routers import market
from app.schemas.market import CoinMarketItem

PAPRIKA_TICKER = {
    "id": "btc-bitcoin",
    "name": "Bitcoin",
    "symbol": "BTC",
    "rank": 1,
    "circulating_supply": 19_700_000,
    "total_supply": 19_700_000,
    "max_supply": 21_000_000,
    "last_updated": "2026-07-08T00:00:00Z",
    "quotes": {
        "USD": {
            "price": 50_000.0,
            "market_cap": 985_000_000_000,
            "volume_24h": 30_000_000_000,
            "percent_change_24h": 2.5,
            "percent_change_7d": -1.2,
            "market_cap_change_24h": 2.4,
        }
    },
}


def test_map_paprika_ticker_produce_shape_coingecko():
    mapped = market._map_paprika_ticker(PAPRIKA_TICKER)
    # El contrato importante: valida contra el MISMO modelo que usa el endpoint.
    item = CoinMarketItem(**mapped)
    assert item.id == "btc-bitcoin"
    assert item.symbol == "btc"  # CoinGecko usa símbolos en minúscula
    assert item.current_price == pytest.approx(50_000.0)
    assert item.market_cap_rank == 1
    assert item.price_change_percentage_24h == pytest.approx(2.5)
    assert item.price_change_percentage_7d_in_currency == pytest.approx(-1.2)
    # El logo se arma desde el CDN estático de Paprika (keyed por coin id).
    assert item.image == "https://static.coinpaprika.com/coin/btc-bitcoin/logo.png"
    # Lo que Paprika no tiene queda null y el frontend ya lo guardea.
    assert item.sparkline_in_7d is None


def test_map_paprika_ticker_sin_quotes_no_explota():
    mapped = market._map_paprika_ticker({"id": "x", "symbol": "X", "name": "X"})
    item = CoinMarketItem(**mapped)
    assert item.current_price is None
    assert item.market_cap is None


def test_map_paprika_ticker_sin_id_no_inventa_logo():
    mapped = market._map_paprika_ticker({"symbol": "X", "name": "X"})
    assert mapped["image"] is None  # sin id no hay URL que armar


async def test_fetch_top100_usa_coingecko_si_responde(monkeypatch):
    async def gecko_ok():
        return [{"fuente": "coingecko"}]

    async def paprika_no_deberia_llamarse():
        raise AssertionError("no debería caer al fallback si CoinGecko respondió")

    monkeypatch.setattr(market, "_fetch_top100_coingecko", gecko_ok)
    monkeypatch.setattr(market, "_fetch_top100_paprika", paprika_no_deberia_llamarse)
    assert await market._fetch_top100() == [{"fuente": "coingecko"}]


async def test_fetch_top100_cae_a_paprika_ante_error_http(monkeypatch):
    async def gecko_bloqueado():
        raise httpx.HTTPStatusError(
            "451", request=httpx.Request("GET", "http://x"), response=httpx.Response(451)
        )

    async def paprika_ok():
        return [market._map_paprika_ticker(PAPRIKA_TICKER)]

    monkeypatch.setattr(market, "_fetch_top100_coingecko", gecko_bloqueado)
    monkeypatch.setattr(market, "_fetch_top100_paprika", paprika_ok)
    result = await market._fetch_top100()
    assert result[0]["id"] == "btc-bitcoin"


async def test_fetch_top100_tambien_cae_ante_error_de_red(monkeypatch):
    async def gecko_caido():
        raise httpx.ConnectError("boom")

    async def paprika_ok():
        return [{"fuente": "paprika"}]

    monkeypatch.setattr(market, "_fetch_top100_coingecko", gecko_caido)
    monkeypatch.setattr(market, "_fetch_top100_paprika", paprika_ok)
    assert await market._fetch_top100() == [{"fuente": "paprika"}]
