"""SQLite (aiosqlite) connection helpers for PULSO API."""

import os
from pathlib import Path

import aiosqlite

DB_PATH = Path(os.getenv("PULSO_DB_PATH", Path(__file__).resolve().parent.parent / "pulso.db"))


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    try:
        yield db
    finally:
        await db.close()


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS _meta (
                key TEXT PRIMARY KEY,
                value TEXT
            )
            """
        )
        await db.commit()
