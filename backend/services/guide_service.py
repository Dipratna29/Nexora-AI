# guide_service.py

import datetime
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


def fetch_guides(username=None):
    """
    Fetch all guides with their average rating.
    If username is provided, also returns whether the current user
    has an active booking for each guide (booked_by_user flag).
    """
    supabase = get_supabase()
    res = supabase.table("guide").select("*").order("g_id").execute()
    guides = res.data or []

    booked_guide_ids = set()
    if username:
        bookings_res = (
            supabase.table("guide_bookings")
            .select("guide_id")
            .eq("username", username)
            .in_("status", ["Booked", "Confirmed", "booked", "confirmed"])
            .execute()
        )
        for b in bookings_res.data or []:
            booked_guide_ids.add(b["guide_id"])

    for g in guides:
        g["booked_by_user"] = bool(g.get("g_id") in booked_guide_ids)

        # Normalize status text for frontend consistency
        raw_status = (g.get("status") or "").strip().lower()
        if raw_status in ("available", "avail", "open"):
            g["status"] = "Available"
        elif "busy" in raw_status:
            g["status"] = "Busy"
        elif raw_status in ("booked", "confirmed"):
            g["status"] = "Booked"
        elif raw_status in ("not available", "not_available", "notavailable"):
            g["status"] = "Not Available"
        else:
            g["status"] = g.get("status") and str(g.get("status")).title() or "Unknown"

        # Ensure rating is a numeric value (float)
        try:
            g["rating"] = round(float(g.get("rating") or 0.0), 1)
        except Exception:
            g["rating"] = 0.0

    return guides


def submit_guide_rating(data):
    """
    Insert or update a user's rating for a guide, then recalculate and
    persist the average so fetch_guides always returns the current average.
    """
    guide_id = int(data["guide_id"])
    username = str(data["username"]).strip()
    rating = float(data["rating"])

    supabase = get_supabase()

    # Check if a rating already exists for this (username, guide_id) pair
    existing = (
        supabase.table("guide_ratings")
        .select("id")
        .eq("username", username)
        .eq("guide_id", guide_id)
        .limit(1)
        .execute()
    )

    if existing.data:
        rating_id = existing.data[0]["id"]
        supabase.table("guide_ratings").update({"rating": rating}).eq("id", rating_id).execute()
    else:
        supabase.table("guide_ratings").insert({
            "username": username,
            "guide_id": guide_id,
            "rating": rating
        }).execute()

    # Recalculate average rating for this guide
    all_ratings_res = supabase.table("guide_ratings").select("rating").eq("guide_id", guide_id).execute()
    ratings_list = [r["rating"] for r in (all_ratings_res.data or []) if r.get("rating") is not None]
    new_avg = round(sum(ratings_list) / max(1, len(ratings_list)), 1) if ratings_list else 0.0

    supabase.table("guide").update({"rating": new_avg}).eq("g_id", guide_id).execute()


def create_guide_booking(data):
    """
    Create a booking record and flip the guide's status to 'Booked'.
    If the user already has an active booking for this guide, this becomes a no-op.
    Raises an exception if the guide is not available.
    
    Returns:
        int: The booking ID, or None if already booked
    """
    username = str(data.get("username", "")).strip()
    guide_id = int(data.get("guide_id"))
    booking_date = data.get("booking_date") or datetime.date.today().strftime("%Y-%m-%d")
    status = "Booked"

    supabase = get_supabase()

    # If the user already has an active booking for this guide, do nothing
    existing_res = (
        supabase.table("guide_bookings")
        .select("id")
        .eq("username", username)
        .eq("guide_id", guide_id)
        .in_("status", ["Booked", "Confirmed", "booked", "confirmed"])
        .limit(1)
        .execute()
    )
    if existing_res.data:
        return None

    # Check current guide status before booking
    guide_res = supabase.table("guide").select("status").eq("g_id", guide_id).limit(1).execute()
    if not guide_res.data:
        raise ValueError("Guide not found")

    guide = guide_res.data[0]
    current_status = (guide.get("status") or "").strip().lower()
    if current_status != "available":
        raise ValueError(f"Guide is not available (current status: {guide.get('status')})")

    # Insert the booking record
    insert_res = supabase.table("guide_bookings").insert({
        "username": username,
        "guide_id": guide_id,
        "booking_date": booking_date,
        "status": status
    }).execute()

    if not insert_res.data:
        raise RuntimeError("Failed to create guide booking")

    booking_id = insert_res.data[0]["id"]

    # Update the guide's public status to "Booked"
    supabase.table("guide").update({"status": "Booked"}).eq("g_id", guide_id).execute()

    return booking_id


def cancel_guide_booking(data):
    """
    Cancel a user's booking for a guide and set guide status back to 'Available'.
    Only cancels if this user actually has an active booking for this guide.
    """
    username = str(data.get("username", "")).strip()
    guide_id = int(data.get("guide_id"))

    supabase = get_supabase()

    # Verify active booking exists for this user
    existing_res = (
        supabase.table("guide_bookings")
        .select("id")
        .eq("username", username)
        .eq("guide_id", guide_id)
        .in_("status", ["Booked", "Confirmed", "booked", "confirmed"])
        .limit(1)
        .execute()
    )

    if not existing_res.data:
        raise ValueError("No active booking found for this guide by this user")

    booking_id = existing_res.data[0]["id"]

    # Mark booking as cancelled
    supabase.table("guide_bookings").update({"status": "Cancelled"}).eq("id", booking_id).execute()

    # Check if any other active bookings exist for this guide
    remaining_res = (
        supabase.table("guide_bookings")
        .select("id")
        .eq("guide_id", guide_id)
        .in_("status", ["Booked", "Confirmed", "booked", "confirmed"])
        .execute()
    )
    remaining_count = len(remaining_res.data or [])

    # Only set guide back to Available if no other active bookings exist
    if remaining_count == 0:
        supabase.table("guide").update({"status": "Available"}).eq("g_id", guide_id).execute()
