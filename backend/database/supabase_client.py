"""
Supabase client initialization module for TrustTrip.
Provides a singleton Supabase client instance and connection check utility.
"""

import os
import logging
from typing import Optional
from dotenv import load_dotenv
from supabase import create_client, Client

# Ensure we always load the backend .env regardless of CWD
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path=ENV_PATH, override=True)

logger = logging.getLogger(__name__)

_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Returns a singleton instance of the Supabase Client.
    Initializes the client using SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
    Guarantees postgrest auth is always maintained with the server-side service role key.
    """
    global _supabase_client

    supabase_url = os.environ.get("SUPABASE_URL", "").strip()
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    # Fallback to direct reading from .env if environment variable was somehow empty
    if not supabase_url or not supabase_key:
        if os.path.exists(ENV_PATH):
            with open(ENV_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("SUPABASE_URL=") and not supabase_url:
                        supabase_url = line.split("=", 1)[1].strip().strip('"').strip("'")
                    elif line.startswith("SUPABASE_SERVICE_ROLE_KEY=") and not supabase_key:
                        supabase_key = line.split("=", 1)[1].strip().strip('"').strip("'")

    if not supabase_url:
        raise RuntimeError("SUPABASE_URL environment variable is missing or empty")
    if not supabase_key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY environment variable is missing or empty")

    if _supabase_client is None:
        try:
            _supabase_client = create_client(supabase_url, supabase_key)
        except Exception as exc:
            logger.error("Failed to initialize Supabase client: %s", exc)
            raise RuntimeError(f"Could not connect to Supabase: {exc}") from exc

    # Always ensure the PostgREST client retains the service role key authorization
    if _supabase_client is not None and hasattr(_supabase_client, "postgrest"):
        try:
            _supabase_client.postgrest.auth(supabase_key)
        except Exception:
            pass

    return _supabase_client


def get_supabase() -> Client:
    """Convenience alias for get_supabase_client()."""
    return get_supabase_client()


def check_supabase_connection() -> bool:
    """
    Checks whether Supabase is reachable and properly configured.
    Performs a lightweight query against the database.
    """
    try:
        client = get_supabase_client()
        client.table("users").select("user_id").limit(1).execute()
        return True
    except Exception as exc:
        logger.warning("Supabase connection check failed: %s", exc)
        return False
