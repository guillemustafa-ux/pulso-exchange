"""Pydantic response models for the /api/market endpoints.

Field names mirror the upstream CoinGecko / Binance payloads as closely as
possible so the frontend can consume them without extra remapping. Unknown
upstream fields are ignored (pydantic v2 default `extra="ignore"`), so these
models double as a light validation/allowlist layer.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, computed_field


# ---------------------------------------------------------------------------
# GET /api/market/top100
# ---------------------------------------------------------------------------


class SparklineData(BaseModel):
    price: list[float] = Field(default_factory=list)


class CoinMarketItem(BaseModel):
    id: str
    symbol: str
    name: str
    image: str | None = None
    current_price: float | None = None
    market_cap: float | None = None
    market_cap_rank: int | None = None
    total_volume: float | None = None
    high_24h: float | None = None
    low_24h: float | None = None
    price_change_24h: float | None = None
    price_change_percentage_24h: float | None = None
    market_cap_change_24h: float | None = None
    market_cap_change_percentage_24h: float | None = None
    circulating_supply: float | None = None
    total_supply: float | None = None
    max_supply: float | None = None
    ath: float | None = None
    ath_change_percentage: float | None = None
    atl: float | None = None
    atl_change_percentage: float | None = None
    last_updated: str | None = None
    price_change_percentage_24h_in_currency: float | None = None
    price_change_percentage_7d_in_currency: float | None = None
    sparkline_in_7d: SparklineData | None = None


# ---------------------------------------------------------------------------
# GET /api/market/klines/{symbol}
# ---------------------------------------------------------------------------


class KlineItem(BaseModel):
    open_time: int
    open: float
    high: float
    low: float
    close: float
    volume: float | None = None
    close_time: int | None = None
    quote_volume: float | None = None
    trades: int | None = None


class KlinesResponse(BaseModel):
    source: Literal["binance", "coingecko"]
    symbol: str
    interval: str
    coingecko_id: str | None = None
    klines: list[KlineItem]


# ---------------------------------------------------------------------------
# GET /api/market/global
# ---------------------------------------------------------------------------


class GlobalMarketResponse(BaseModel):
    active_cryptocurrencies: int | None = None
    markets: int | None = None
    total_market_cap: dict[str, float] = Field(default_factory=dict)
    total_volume: dict[str, float] = Field(default_factory=dict)
    market_cap_percentage: dict[str, float] = Field(default_factory=dict)
    market_cap_change_percentage_24h_usd: float | None = None
    updated_at: int | None = None

    @computed_field  # type: ignore[misc]
    @property
    def btc_dominance(self) -> float | None:
        return self.market_cap_percentage.get("btc")


# ---------------------------------------------------------------------------
# GET /api/market/trending
# ---------------------------------------------------------------------------


class TrendingCoin(BaseModel):
    id: str
    coin_id: int | None = None
    name: str
    symbol: str
    market_cap_rank: int | None = None
    thumb: str | None = None
    slug: str | None = None
    price_btc: float | None = None
    score: int | None = None
    data: dict[str, Any] | None = None
