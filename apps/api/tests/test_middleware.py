"""Tests del rate limiter global y la resolución de IP (app/middleware.py).

Es la barrera que protege TODA la API (60 req/IP/min por defecto). Se testea
la ventana deslizante, la exención de /health, la independencia por IP y la
lógica de client_ip con y sin TRUST_PROXY. Sin red: se llama `dispatch`
directo con un `call_next` falso.
"""

from __future__ import annotations

import pytest
from starlette.requests import Request
from starlette.responses import Response

from app import middleware
from app.middleware import RateLimitMiddleware, client_ip


def _request(path: str = "/api/market/top100", ip: str = "1.2.3.4", forwarded: str | None = None):
    headers = []
    if forwarded is not None:
        headers.append((b"x-forwarded-for", forwarded.encode()))
    return Request(
        {"type": "http", "method": "GET", "path": path, "headers": headers, "client": (ip, 5555)}
    )


async def _ok_call_next(request):
    return Response("ok", status_code=200)


# ---------------------------------------------------------------------------
# client_ip
# ---------------------------------------------------------------------------


def test_client_ip_sin_proxy_usa_la_conexion(monkeypatch):
    monkeypatch.setattr(middleware, "TRUST_PROXY", False)
    assert client_ip(_request(ip="9.9.9.9", forwarded="1.1.1.1")) == "9.9.9.9"


def test_client_ip_con_proxy_usa_el_primer_hop(monkeypatch):
    monkeypatch.setattr(middleware, "TRUST_PROXY", True)
    assert client_ip(_request(ip="10.0.0.1", forwarded="203.0.113.5, 10.0.0.1")) == "203.0.113.5"


def test_client_ip_sin_client_devuelve_unknown(monkeypatch):
    monkeypatch.setattr(middleware, "TRUST_PROXY", False)
    req = Request({"type": "http", "method": "GET", "path": "/", "headers": [], "client": None})
    assert client_ip(req) == "unknown"


# ---------------------------------------------------------------------------
# RateLimitMiddleware
# ---------------------------------------------------------------------------


async def test_permite_hasta_el_maximo_y_luego_429(monkeypatch):
    monkeypatch.setattr(middleware, "TRUST_PROXY", False)
    mw = RateLimitMiddleware(app=None, max_requests=3)
    req = _request(ip="10.0.0.10")

    for _ in range(3):
        resp = await mw.dispatch(req, _ok_call_next)
        assert resp.status_code == 200

    blocked = await mw.dispatch(req, _ok_call_next)
    assert blocked.status_code == 429
    assert "Retry-After" in blocked.headers


async def test_health_esta_exento(monkeypatch):
    monkeypatch.setattr(middleware, "TRUST_PROXY", False)
    mw = RateLimitMiddleware(app=None, max_requests=1)
    health = _request(path="/health", ip="10.0.0.11")

    # Muchos más requests que el límite, pero /health nunca se limita.
    for _ in range(5):
        resp = await mw.dispatch(health, _ok_call_next)
        assert resp.status_code == 200


async def test_buckets_independientes_por_ip(monkeypatch):
    monkeypatch.setattr(middleware, "TRUST_PROXY", False)
    mw = RateLimitMiddleware(app=None, max_requests=1)
    a = _request(ip="10.0.0.20")
    b = _request(ip="10.0.0.21")

    assert (await mw.dispatch(a, _ok_call_next)).status_code == 200
    assert (await mw.dispatch(a, _ok_call_next)).status_code == 429  # A al tope
    assert (await mw.dispatch(b, _ok_call_next)).status_code == 200  # B independiente
