"""Pydantic models for the /api/ai endpoints."""

from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel, Field, field_validator

# Tope del snapshot de contexto serializado: el endpoint es público y paga tokens
# de Groq — sin esto, un POST directo puede inflar el prompt a voluntad.
MAX_CONTEXT_JSON_CHARS = 4000


class AskRequest(BaseModel):
    pregunta: str = Field(..., min_length=1, max_length=2000)
    seccion: str = Field(default="", max_length=100)
    # Snapshot libre de datos visibles en la UI (precios, protocolo seleccionado,
    # config del bot, etc.) -- shape ancho a propósito, cada página arma el suyo.
    contexto: dict[str, Any] = Field(default_factory=dict)

    @field_validator("contexto")
    @classmethod
    def contexto_size_cap(cls, v: dict[str, Any]) -> dict[str, Any]:
        if len(json.dumps(v, ensure_ascii=False, default=str)) > MAX_CONTEXT_JSON_CHARS:
            raise ValueError(
                f"contexto demasiado grande (máx {MAX_CONTEXT_JSON_CHARS} caracteres serializado)"
            )
        return v


class AskResponse(BaseModel):
    respuesta: str
