# profile_service.py

import logging
from datetime import datetime, timezone
from database import get_supabase

logger = logging.getLogger(__name__)


def get_profile_data(username):
    """Fetch user profile details by username without returning password."""
    supabase = get_supabase()
    res = supabase.table("users").select("*").eq("username", username).limit(1).execute()
    users = res.data

    if not users:
        return None

    user = dict(users[0])
    user.pop("password", None)
    return user


def update_profile(username, data):
    """Update profile fields for a user and return the refreshed profile."""
    if not data:
        data = {}

    supabase = get_supabase()
    payload = {
        "name": data.get("name"),
        "mob": data.get("mob"),
        "phone_number": data.get("phone_number") or data.get("mob"),
        "country_code": data.get("country_code"),
        "full_phone_number": data.get("full_phone_number"),
        "country": data.get("country") or data.get("nationality"),
        "address": data.get("address"),
        "nationality": data.get("nationality") or data.get("country"),
        "emergency_contact": data.get("emergency_contact"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    clean_payload = {k: v for k, v in payload.items() if v is not None}
    if clean_payload:
        try:
            supabase.table("users").update(clean_payload).eq("username", username).execute()
        except Exception as e:
            logger.warning("Extended profile update notice (%s), falling back to standard fields", e)
            standard_payload = {
                "name": data.get("name"),
                "mob": data.get("mob"),
                "address": data.get("address"),
                "nationality": data.get("nationality"),
                "emergency_contact": data.get("emergency_contact"),
            }
            clean_std = {k: v for k, v in standard_payload.items() if v is not None}
            supabase.table("users").update(clean_std).eq("username", username).execute()

    return get_profile_data(username)