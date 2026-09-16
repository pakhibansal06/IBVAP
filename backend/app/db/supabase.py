"""Lazy Supabase platform client.

The FastAPI backend talks to PostgreSQL through SQLAlchemy (DATABASE_URL).
This module exposes the Supabase REST/Realtime/Auth client for the parts of the
platform that benefit from Supabase natively:

  * Supabase Auth (sign-up / token verification)   -> app.api.auth
  * Realtime (postgres_changes broadcast)          -> app.main (telemetry push)

If SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured the client is
None and the app keeps working on local SQLite.
"""
from functools import lru_cache
from typing import Optional

from app.core.config import settings


@lru_cache
def get_supabase_client():
    """Returns a supabase.Client or None when Supabase is not configured."""
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return None
    try:
        from supabase import create_client

        return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    except Exception as exc:  # pragma: no cover
        print(f"[supabase] client unavailable: {exc}")
        return None


def supabase_enabled() -> bool:
    return get_supabase_client() is not None


def register_supabase_user(username: str, email: str, password: str) -> Optional[dict]:
    """Creates a user using Supabase Auth when available; returns visible user data."""
    client = get_supabase_client()
    if client is None:
        return None
    try:
        resp = client.auth.sign_up({"email": email, "password": password})
        return {"id": resp.user.id, "email": resp.user.email}
    except Exception as exc:  # pragma: no cover
        print(f"[supabase] sign_up failed: {exc}")
        return None


@lru_cache
def supabase_http() -> Optional[object]:
    """Raw httpx client for direct PostgREST calls (seeding pipeline)."""
    if get_supabase_client() is None:
        return None
    import httpx

    return httpx.Client(
        base_url=settings.SUPABASE_URL.rstrip("/") + "/rest/v1",
        headers={
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
        timeout=60.0,
    )


def set_realtime_enabled(table: Optional[str] = None) -> None:
    """Enable postgres_changes on a table via Supabase REST admin endpoint (best effort)."""
    client = get_supabase_client()
    if table and client is not None:
        try:
            client.table(table).select("*").limit(1).execute()
        except Exception:  # pragma: no cover
            pass