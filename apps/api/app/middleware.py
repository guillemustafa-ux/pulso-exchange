"""Lightweight ASGI middlewares: manual rate limiting + request logging.

No external dependency (no slowapi): a simple in-memory sliding-window
counter per client IP is enough for Día 1 scope (single process, no Redis).
"""

from __future__ import annotations

import logging
import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

logger = logging.getLogger("pulso.api")

WINDOW_SECONDS = 60.0


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rejects with 429 once a client IP exceeds `max_requests` per 60s window.

    Note: the per-IP bucket dict is unbounded for the lifetime of the
    process. That's an acceptable trade-off for Día 1 (single small
    instance); revisit with a periodic sweep or a bounded LRU if traffic
    from many distinct IPs grows large.
    """

    def __init__(
        self,
        app,
        max_requests: int = 60,
        exempt_paths: frozenset[str] = frozenset({"/health"}),
    ) -> None:
        super().__init__(app)
        self.max_requests = max_requests
        self.exempt_paths = exempt_paths
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next):
        if request.url.path in self.exempt_paths:
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        bucket = self._hits[client_ip]

        while bucket and (now - bucket[0]) > WINDOW_SECONDS:
            bucket.popleft()

        if len(bucket) >= self.max_requests:
            retry_after = max(1, int(WINDOW_SECONDS - (now - bucket[0])))
            logger.warning("rate limit exceeded ip=%s path=%s", client_ip, request.url.path)
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Max 60 requests per minute."},
                headers={"Retry-After": str(retry_after)},
            )

        bucket.append(now)
        return await call_next(request)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Structured-ish access log line per request (method, path, status, ms)."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.monotonic()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.monotonic() - start) * 1000
            logger.exception(
                "request failed method=%s path=%s duration_ms=%.1f",
                request.method,
                request.url.path,
                duration_ms,
            )
            raise
        duration_ms = (time.monotonic() - start) * 1000
        logger.info(
            "method=%s path=%s status=%s duration_ms=%.1f client=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request.client.host if request.client else "unknown",
        )
        return response
