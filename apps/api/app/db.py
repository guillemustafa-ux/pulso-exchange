"""SQLite (aiosqlite) connection helpers for PULSO API."""

import os
from pathlib import Path

import aiosqlite

DB_PATH = Path(os.getenv("PULSO_DB_PATH", Path(__file__).resolve().parent.parent / "pulso.db"))


async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    # Necesario en CADA conexión (no es una propiedad persistida del archivo)
    # para que el ON DELETE CASCADE de trades/positions/equity_snapshots al
    # borrar un bot funcione.
    await db.execute("PRAGMA foreign_keys = ON")
    try:
        yield db
    finally:
        await db.close()


async def init_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        # WAL: lectores no bloquean al escritor -- el motor de bots (background
        # task) y los requests HTTP escriben/leen la misma DB concurrentemente.
        await db.execute("PRAGMA journal_mode = WAL")
        await db.execute("PRAGMA foreign_keys = ON")
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS _meta (
                key TEXT PRIMARY KEY,
                value TEXT
            )
            """
        )

        # ---------------------------------------------------------------
        # Motor de bots (paper trading) -- ver app/motor/engine.py y
        # app/routers/bots.py.
        # ---------------------------------------------------------------
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS bots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                estrategia TEXT NOT NULL CHECK (estrategia IN ('DCA', 'GRID', 'SMA')),
                par TEXT NOT NULL,
                capital_inicial REAL NOT NULL,
                capital_actual REAL NOT NULL,
                params TEXT NOT NULL DEFAULT '{}',
                estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'pausado')),
                creado_at TEXT NOT NULL
            )
            """
        )
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS trades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_id INTEGER NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
                tipo TEXT NOT NULL CHECK (tipo IN ('compra', 'venta')),
                precio REAL NOT NULL,
                cantidad REAL NOT NULL,
                timestamp TEXT NOT NULL
            )
            """
        )
        await db.execute("CREATE INDEX IF NOT EXISTS idx_trades_bot_id ON trades(bot_id)")
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS positions (
                bot_id INTEGER PRIMARY KEY REFERENCES bots(id) ON DELETE CASCADE,
                cantidad_total REAL NOT NULL DEFAULT 0,
                capital_invertido REAL NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL
            )
            """
        )
        await db.execute(
            """
            CREATE TABLE IF NOT EXISTS equity_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_id INTEGER NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
                timestamp TEXT NOT NULL,
                equity REAL NOT NULL,
                precio REAL NOT NULL
            )
            """
        )
        await db.execute("CREATE INDEX IF NOT EXISTS idx_equity_bot_id ON equity_snapshots(bot_id)")

        await db.commit()
