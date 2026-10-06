"""
TrustTrip Mobile Offers & Facilities Public Service
Fetches published promotional deals and verified public emergency facilities directly from Supabase.
"""

import logging
from typing import List, Dict, Any, Optional
from database import get_supabase

logger = logging.getLogger(__name__)


def list_active_offers() -> List[Dict[str, Any]]:
    """
    Returns published promotional offers directly from Supabase.
    """
    supabase = get_supabase()
    try:
        res = supabase.table("offers").select("*").eq("status", "PUBLISHED").order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        logger.error("Error fetching active offers from Supabase: %s", e)
        raise RuntimeError(f"Could not load offers from database: {e}")


def list_public_facilities(category: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Returns verified tourist facilities (hospitals, police stations, pharmacies, women safe zones) from Supabase.
    """
    supabase = get_supabase()
    try:
        query = supabase.table("facilities").select("*").eq("status", "ACTIVE")
        if category and category.lower() != "all":
            query = query.ilike("category", f"%{category}%")

        res = query.order("id", desc=False).execute()
        return res.data or []
    except Exception as e:
        logger.error("Error fetching facilities from Supabase: %s", e)
        raise RuntimeError(f"Could not load facilities from database: {e}")

