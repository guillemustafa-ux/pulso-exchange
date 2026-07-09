"""Tests del router del asistente de IA (app/routers/ai.py).

Cubren: happy path (con `_call_groq` mockeado — nunca se pega a Groq real),
manejo de errores (sin API key, upstream caído, shape inesperada), el rate
limiter por IP, y el tope de tamaño del contexto en el schema. Sin red.
"""

from __future__ import annotations

import httpx
import pytest
from pydantic import ValidationError
from starlette.requests import Request

from app.routers import ai
from app.schemas.ai import MAX_CONTEXT_JSON_CHARS, AskRequest

GROQ_OK = {"choices": [{"message": {"content": "El staking bloquea tokens como garantía."}}]}


def _payload(**over) -> AskRequest:
    base = {"pregunta": "¿Qué es el staking?", "seccion": "staking", "contexto": {"apr": 5}}
    base.update(over)
    return AskRequest(**base)


def _fake_request(ip: str = "1.2.3.4") -> Request:
    # Scope ASGI mínimo: client_ip (TRUST_PROXY off por defecto) lee request.client.host.
    return Request({"type": "http", "headers": [], "client": (ip, 12345)})


# ---------------------------------------------------------------------------
# /ask — happy path y errores
# ---------------------------------------------------------------------------


async def test_ask_happy_path(monkeypatch):
    monkeypatch.setattr(ai, "GROQ_API_KEY", "test-key")

    async def fake_call(body):
        return GROQ_OK

    monkeypatch.setattr(ai, "_call_groq", fake_call)
    resp = await ai.ask(_payload())
    assert resp.respuesta == "El staking bloquea tokens como garantía."


async def test_ask_sin_api_key_devuelve_503(monkeypatch):
    monkeypatch.setattr(ai, "GROQ_API_KEY", "")
    with pytest.raises(ai.HTTPException) as exc:
        await ai.ask(_payload())
    assert exc.value.status_code == 503


async def test_ask_groq_http_status_error_devuelve_502(monkeypatch):
    monkeypatch.setattr(ai, "GROQ_API_KEY", "test-key")

    async def fake_call(body):
        raise httpx.HTTPStatusError(
            "500", request=httpx.Request("POST", ai.GROQ_URL), response=httpx.Response(500)
        )

    monkeypatch.setattr(ai, "_call_groq", fake_call)
    with pytest.raises(ai.HTTPException) as exc:
        await ai.ask(_payload())
    assert exc.value.status_code == 502


async def test_ask_groq_error_de_red_devuelve_502(monkeypatch):
    monkeypatch.setattr(ai, "GROQ_API_KEY", "test-key")

    async def fake_call(body):
        raise httpx.ConnectError("boom")

    monkeypatch.setattr(ai, "_call_groq", fake_call)
    with pytest.raises(ai.HTTPException) as exc:
        await ai.ask(_payload())
    assert exc.value.status_code == 502


async def test_ask_shape_inesperada_devuelve_502(monkeypatch):
    monkeypatch.setattr(ai, "GROQ_API_KEY", "test-key")

    async def fake_call(body):
        return {"no": "choices"}  # falta la estructura esperada

    monkeypatch.setattr(ai, "_call_groq", fake_call)
    with pytest.raises(ai.HTTPException) as exc:
        await ai.ask(_payload())
    assert exc.value.status_code == 502


async def test_ask_pasa_seccion_y_contexto_al_prompt(monkeypatch):
    monkeypatch.setattr(ai, "GROQ_API_KEY", "test-key")
    captured: dict = {}

    async def fake_call(body):
        captured["body"] = body
        return GROQ_OK

    monkeypatch.setattr(ai, "_call_groq", fake_call)
    await ai.ask(_payload(seccion="defi", contexto={"tvl": 123}))
    user_msg = captured["body"]["messages"][1]["content"]
    assert "defi" in user_msg
    assert "123" in user_msg  # el contexto real viaja al modelo


# ---------------------------------------------------------------------------
# Rate limiter por IP
# ---------------------------------------------------------------------------


def test_rate_limiter_permite_hasta_el_maximo_y_luego_429(monkeypatch):
    monkeypatch.setattr(ai, "AI_RATE_LIMIT_MAX", 3)
    ai._ai_hits.clear()
    req = _fake_request("10.0.0.1")

    for _ in range(3):
        ai.ai_rate_limiter(req)  # 3 permitidas, no levantan

    with pytest.raises(ai.HTTPException) as exc:
        ai.ai_rate_limiter(req)  # la 4ta supera el límite
    assert exc.value.status_code == 429
    assert "Retry-After" in exc.value.headers


def test_rate_limiter_buckets_independientes_por_ip(monkeypatch):
    monkeypatch.setattr(ai, "AI_RATE_LIMIT_MAX", 2)
    ai._ai_hits.clear()
    a, b = _fake_request("10.0.0.2"), _fake_request("10.0.0.3")

    ai.ai_rate_limiter(a)
    ai.ai_rate_limiter(a)
    # A ya está al tope, pero B arranca limpio
    ai.ai_rate_limiter(b)
    with pytest.raises(ai.HTTPException):
        ai.ai_rate_limiter(a)


# ---------------------------------------------------------------------------
# Schema: tope de tamaño del contexto
# ---------------------------------------------------------------------------


def test_contexto_dentro_del_limite_es_valido():
    AskRequest(pregunta="q", contexto={"x": "a" * 100})  # no levanta


def test_contexto_demasiado_grande_es_rechazado():
    with pytest.raises(ValidationError):
        AskRequest(pregunta="q", contexto={"blob": "x" * (MAX_CONTEXT_JSON_CHARS + 100)})
