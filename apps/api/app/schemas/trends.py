"""Pydantic response models for the /api/trends endpoints.

`TrendingCoin` is reused as-is from `app.schemas.market` -- the trending item
shape returned by CoinGecko's `/search/trending` is identical whether it's
served from `/api/market/trending` or embedded in `/api/trends/summary`.
"""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.market import TrendingCoin

# ---------------------------------------------------------------------------
# GET /api/trends/fear-greed
# ---------------------------------------------------------------------------


class FearGreedItem(BaseModel):
    value: int
    value_classification: str
    timestamp: int


class FearGreedResponse(BaseModel):
    name: str = "Fear and Greed Index"
    data: list[FearGreedItem] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# GET /api/trends/summary
# ---------------------------------------------------------------------------


class FearGreedCurrent(BaseModel):
    value: int
    label: str


class MoverItem(BaseModel):
    id: str
    symbol: str
    name: str
    image: str | None = None
    current_price: float | None = None
    price_change_percentage_24h: float | None = None
    market_cap_rank: int | None = None


class TrendsSummaryResponse(BaseModel):
    # `None` cuando alternative.me/CoinGecko no responden a tiempo -- el resto
    # del summary se sirve igual (degradación amable, mismo criterio que
    # `cotizaciones` en earn.py).
    fear_greed: FearGreedCurrent | None = None
    trending: list[TrendingCoin] = Field(default_factory=list)
    gainers: list[MoverItem] = Field(default_factory=list)
    losers: list[MoverItem] = Field(default_factory=list)
    market_cap_usd: float | None = None
    market_cap_change_percentage_24h: float | None = None
    btc_dominance: float | None = None
