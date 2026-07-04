"""Pydantic models for the /api/bots endpoints (motor de paper trading).

Todo lo que representan estos modelos es 100% simulado: capital, trades y
PnL viven solo en la SQLite de PULSO, nunca en un exchange real.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

Estrategia = Literal["DCA", "GRID", "SMA"]
Estado = Literal["activo", "pausado"]
TipoTrade = Literal["compra", "venta"]


class BotCreate(BaseModel):
    nombre: str = Field(min_length=1, max_length=80)
    estrategia: Estrategia
    par: str = Field(min_length=5, max_length=20, description="Símbolo estilo Binance, ej. BTCUSDT")
    capital_inicial: float = Field(gt=0)
    params: dict[str, Any] = Field(default_factory=dict)


class BotEstadoUpdate(BaseModel):
    estado: Estado


class EquityPoint(BaseModel):
    timestamp: str
    equity: float


class BotOut(BaseModel):
    id: int
    nombre: str
    estrategia: Estrategia
    par: str
    capital_inicial: float
    capital_actual: float
    cantidad_total: float
    capital_invertido: float
    precio_actual: float | None
    pnl_usd: float
    pnl_pct: float
    estado: Estado
    creado_at: str
    params: dict[str, Any]
    equity_curve: list[EquityPoint] = Field(default_factory=list)


class TradeOut(BaseModel):
    id: int
    bot_id: int
    tipo: TipoTrade
    precio: float
    cantidad: float
    timestamp: str
