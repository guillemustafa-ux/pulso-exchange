"""Pydantic response models for the /api/earn endpoints.

`cotizaciones` queda como pass-through (`dict[str, Any]`) porque el payload de
CriptoYa es un JSON anidado y variable entre monedas/exchanges -- igual que
`GlobalMarketResponse` en `market.py`, no vale la pena mapear cada subcampo
upstream a un modelo estricto.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel


class EarnOption(BaseModel):
    nombre: str
    tipo: Literal["exchange_ar", "fintech", "defi"]
    moneda: Literal["ARS", "USDT", "USDC", "BTC"]
    apy_aprox: float
    url: str
    ultima_actualizacion: str


class EarnArResponse(BaseModel):
    disclaimer: str
    updated_at: str
    opciones: list[EarnOption]
    # None cuando CriptoYa no respondió a tiempo -- la tabla curada se sirve igual.
    cotizaciones: dict[str, Any] | None = None
    cotizaciones_error: str | None = None
