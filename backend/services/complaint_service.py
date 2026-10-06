# complaint_service.py

import logging
from database import get_supabase

logger = logging.getLogger(__name__)


def get_user_id_by_username(username):
    """Get user_id from username."""
    try:
        supabase = get_supabase()
        res = supabase.table("users").select("user_id").eq("username", username).limit(1).execute()
        if res.data:
            return res.data[0]["user_id"]
        return None
    except Exception as e:
        logger.error("Error getting user_id: %s", e)
        return None


def create_complaint(data):
    """
    Create a new complaint and return the complaint ID.
    
    Args:
        data: Dictionary with username, category, description, latitude, longitude
        
    Returns:
        int: The complaint ID
    """
    supabase = get_supabase()

    payload = {
        "username": data.get("username"),
        "category": data.get("category"),
        "description": data.get("description"),
        "latitude": data.get("latitude"),
        "longitude": data.get("longitude"),
        "status": "Pending"
    }

    res = supabase.table("complaints").insert(payload).execute()
    if not res.data:
        raise RuntimeError("Failed to insert complaint")

    return res.data[0]["id"]


def get_complaints(username):
    """Fetch all complaints submitted by a given username ordered by created_at DESC."""
    supabase = get_supabase()
    res = (
        supabase.table("complaints")
        .select("id, username, category, description, latitude, longitude, status, admin_response, priority, created_at")
        .eq("username", username)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data or []