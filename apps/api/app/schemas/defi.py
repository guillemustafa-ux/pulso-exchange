"""Pydantic response models for the /api/defi endpoints.

A thin, normalized slice of the upstream DefiLlama `/protocols` payload --
just the fields the frontend protocol cards need (see PROMPT.md módulo DeFi).
"""

from __future__ import annotations

from pydantic import BaseModel, Field


class DefiProtocolItem(BaseModel):
    id: str
    name: str
    logo: str | None = None
    category: str | None = None
    chains: list[str] = Field(default_factory=list)
    tvl: float | None = None
    change_7d: float | None = None
    # Unix timestamp (segundos) de cuándo DefiLlama empezó a trackear el
    # protocolo -- proxy de "antigüedad" para el badge de riesgo en el
    # frontend. Puede faltar en el upstream (queda None).
    listed_at: int | None = None
