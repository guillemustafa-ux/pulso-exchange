"""Asistente de IA contextual: proxya chat completions a Groq (API HTTP
compatible con OpenAI) para responder preguntas educativas sobre la sección
de PULSO que el usuario está mirando.

- Nunca da consejo financiero (lo fuerza el system prompt).
- Nunca inventa precios/datos: solo usa lo que llega en `contexto`.
- Rate limit propio de 20 req/IP/hora, además del límite global de
  RateLimitMiddleware (60/min) que ya cubre toda la API.
"""

from __future__ import annotations

import logging
import os
import time
from collections import defaultdict, deque

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request

from app.middleware import client_ip
from app.schemas.ai import AskRequest, AskResponse

logger = logging.getLogger("pulso.ai")

router = APIRouter(prefix="/api/ai", tags=["ai"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"

_HTTP_TIMEOUT = httpx.Timeout(30.0, connect=5.0)

SYSTEM_PROMPT = (
    "Sos un asistente educativo de finanzas crypto para la plataforma PULSO. "
    "REGLAS: "
    "1) Solo educativo, nunca consejo financiero. "
    "2) No inventés precios ni datos: usá solo los datos del campo 'contexto' provisto. "
    "Si no tenés el dato, decilo. "
    "3) Respondé en el mismo idioma que la pregunta. "
    "4) Respuestas concisas (máx 3 párrafos). "
    "5) Siempre aclarás que los bots son paper trading y que nada es consejo de inversión."
)


# ---------------------------------------------------------------------------
# Rate limiting: 20 req/IP/hora, dict en memoria -- mismo patrón sliding-
# window que RateLimitMiddleware (app/middleware.py), pero scoped a este
# router: el consumo de tokens de Groq es lo que hay que cuidar acá, no el
# tráfico general de la API (ese ya lo cubre el middleware global).
# ---------------------------------------------------------------------------

AI_RATE_LIMIT_MAX = int(os.getenv("AI_RATE_LIMIT_PER_HOUR", "20"))
AI_RATE_LIMIT_WINDOW_SECONDS = 3600.0

_ai_hits: dict[str, deque[float]] = defaultdict(deque)


def ai_rate_limiter(request: Request) -> None:
    ip = client_ip(request)  # IP real (respeta TRUST_PROXY) -- ver app/middleware.py
    now = time.monotonic()
    bucket = _ai_hits[ip]

    while bucket and (now - bucket[0]) > AI_RATE_LIMIT_WINDOW_SECONDS:
        bucket.popleft()

    if len(bucket) >= AI_RATE_LIMIT_MAX:
        retry_after = max(1, int(AI_RATE_LIMIT_WINDOW_SECONDS - (now - bucket[0])))
        logger.warning("AI rate limit exceeded ip=%s", ip)
        raise HTTPException(
            status_code=429,
            detail=(
                f"Llegaste al límite de {AI_RATE_LIMIT_MAX} preguntas por hora "
                "al asistente de IA. Probá de nuevo en un rato."
            ),
            headers={"Retry-After": str(retry_after)},
        )

    bucket.append(now)


def _build_user_message(payload: AskRequest) -> str:
    return (
        f"Sección actual de la app: {payload.seccion or 'desconocida'}\n"
        f"Contexto (únicos datos reales disponibles, no inventes nada fuera de esto): "
        f"{payload.contexto}\n\n"
        f"Pregunta del usuario: {payload.pregunta}"
    )


@router.post("/ask", response_model=AskResponse, dependencies=[Depends(ai_rate_limiter)])
async def ask(payload: AskRequest) -> AskResponse:
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="El asistente de IA no está configurado (falta GROQ_API_KEY).",
        )

    body = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": _build_user_message(payload)},
        ],
        "temperature": 0.4,
        "max_tokens": 600,
    }

    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT) as client:
            resp = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=body,
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPStatusError as exc:
        logger.warning(
            "Groq request failed: status=%s body=%s", exc.response.status_code, exc.response.text[:300]
        )
        raise HTTPException(
            status_code=502, detail="El asistente de IA no está disponible en este momento."
        ) from exc
    except httpx.HTTPError as exc:
        logger.warning("Groq request failed: %s", exc)
        raise HTTPException(
            status_code=502, detail="El asistente de IA no está disponible en este momento."
        ) from exc

    try:
        content = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        logger.error("Unexpected Groq response shape: %s", data)
        raise HTTPException(status_code=502, detail="Respuesta inesperada del asistente de IA.") from exc

    return AskResponse(respuesta=content)
