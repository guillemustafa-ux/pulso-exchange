from fastapi import APIRouter, Response

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.head("/health")
async def health_head() -> Response:
    # Render (and other platform health checks) probe with HEAD; return an
    # explicit empty-body 200 instead of relying on Starlette's implicit
    # GET->HEAD handling.
    return Response(status_code=200)
