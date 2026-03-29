"""
Database setup using sqlite3 (no Drizzle needed for this simple app).
"""

import sqlite3
from pathlib import Path
from contextlib import contextmanager

DB_PATH = Path(__file__).parent / "stellarlog.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def get_cursor():
    conn = get_connection()
    try:
        yield conn.cursor()
        conn.commit()
    finally:
        conn.close()


def init_db():
    from app.schema import ALL_TABLES

    conn = get_connection()
    cur = conn.cursor()
    for sql in ALL_TABLES:
        cur.executescript(sql)
    conn.commit()
    conn.close()


def dict_from_row(row: sqlite3.Row) -> dict:
    if row is None:
        return None
    return dict(zip(row.keys(), row))
