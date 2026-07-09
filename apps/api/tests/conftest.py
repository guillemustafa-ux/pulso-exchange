"""Fixtures compartidas: DB SQLite temporaria con el schema real de PULSO.

Cada test recibe una base NUEVA (archivo en tmp_path) creada con el MISMO
`init_db()` de producción — si el schema cambia, los tests lo siguen sin
duplicar CREATE TABLEs.
"""

from __future__ import annotations

import json
from typing import Any

import aiosqlite
import pytest_asyncio

from app import db as app_db


@pytest_asyncio.fixture
async def db(tmp_path, monkeypatch):
    path = tmp_path / "pulso-test.db"
    # init_db/aiosqlite leen DB_PATH en tiempo de llamada -> monkeypatch alcanza.
    monkeypatch.setattr(app_db, "DB_PATH", path)
    await app_db.init_db()
    conn = await aiosqlite.connect(path)
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA foreign_keys = ON")
    yield conn
    await conn.close()


@pytest_asyncio.fixture
async def mk_bot(db):
    """Factory de bots: inserta y devuelve la fila como dict (igual que _tick_once)."""

    async def _mk(
        estrategia: str = "DCA",
        params: dict[str, Any] | None = None,
        capital: float = 1000.0,
        par: str = "BTCUSDT",
        creado_at: str = "2026-01-01T00:00:00+00:00",
    ) -> dict[str, Any]:
        cur = await db.execute(
            """
            INSERT INTO bots (nombre, estrategia, par, capital_inicial, capital_actual, params, estado, creado_at)
            VALUES (?, ?, ?, ?, ?, ?, 'activo', ?)
            """,
            ("test-bot", estrategia, par, capital, capital, json.dumps(params or {}), creado_at),
        )
        await db.commit()
        row_cur = await db.execute("SELECT * FROM bots WHERE id = ?", (cur.lastrowid,))
        row = await row_cur.fetchone()
        return dict(row)

    return _mk


async def fetch_trades(db: aiosqlite.Connection, bot_id: int) -> list[dict[str, Any]]:
    cur = await db.execute("SELECT * FROM trades WHERE bot_id = ? ORDER BY id", (bot_id,))
    return [dict(r) for r in await cur.fetchall()]


async def fetch_capital(db: aiosqlite.Connection, bot_id: int) -> float:
    cur = await db.execute("SELECT capital_actual FROM bots WHERE id = ?", (bot_id,))
    row = await cur.fetchone()
    return float(row["capital_actual"])
