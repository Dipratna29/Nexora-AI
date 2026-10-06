# crowd_service.py

import math
from datetime import datetime, timedelta, timezone
from database import get_supabase


def haversine(lat1, lon1, lat2, lon2):
    """Returns distance in meters between two lat/lon coordinates."""
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def get_update_interval_minutes():
    """Fetches crowd monitoring update interval in minutes from settings."""
    supabase = get_supabase()
    res = supabase.table("crowd_settings").select("value").eq("key", "update_interval_minutes").limit(1).execute()
    if res.data:
        try:
            return int(res.data[0]["value"])
        except Exception:
            return 30
    return 30


def set_crowd_setting(key: str, value: str):
    """Sets or updates a crowd monitoring configuration setting."""
    supabase = get_supabase()
    supabase.table("crowd_settings").upsert({"key": key, "value": str(value)}, on_conflict="key").execute()


def get_locations_with_counts():
    """
    Returns monitored geo locations with real-time crowd metrics and occupancy status.
    """
    supabase = get_supabase()
    loc_res = supabase.table("geo_locations").select("*").order("location_id").execute()
    locations = loc_res.data or []

    interval = get_update_interval_minutes()
    cutoff_dt = datetime.now(timezone.utc) - timedelta(minutes=interval)
    cutoff_iso = cutoff_dt.isoformat()

    # Fetch recent user locations to aggregate active users per location
    seen_res = (
        supabase.table("user_locations")
        .select("user_id, location_id")
        .gte("seen_at", cutoff_iso)
        .execute()
    )

    # Group distinct user_ids by location_id
    users_by_loc = {}
    for entry in seen_res.data or []:
        loc_id = entry.get("location_id")
        uid = entry.get("user_id")
        if loc_id is not None and uid is not None:
            if loc_id not in users_by_loc:
                users_by_loc[loc_id] = set()
            users_by_loc[loc_id].add(uid)

    results = []
    for loc in locations:
        loc_id = loc["location_id"]
        cnt = len(users_by_loc.get(loc_id, set()))
        capacity = loc.get("capacity") or 1000

        try:
            occupancy = round((cnt / max(1, capacity)) * 100)
        except Exception:
            occupancy = 0

        status = "LOW"
        if occupancy >= 100:
            status = "OVERCROWDED"
        elif occupancy >= 80:
            status = "HIGH"
        elif occupancy >= 40:
            status = "MODERATE"

        results.append({
            "location_id": loc_id,
            "location_name": loc["location_name"],
            "latitude": float(loc["latitude"]),
            "longitude": float(loc["longitude"]),
            "radius_meters": int(loc.get("radius_meters", 500)),
            "capacity": int(capacity),
            "crowd_count": int(cnt),
            "occupancy_percentage": int(occupancy),
            "crowd_status": status,
            "last_updated": cutoff_iso,
        })

    return results


def record_user_location(user_id, lat, lon):
    """
    Records a user GPS ping, checks for geofence overlap, and records a snapshot if inside.
    """
    user_id = int(user_id)
    lat = float(lat)
    lon = float(lon)

    supabase = get_supabase()
    loc_res = supabase.table("geo_locations").select("*").execute()
    locations = loc_res.data or []

    matched_location = None
    for loc in locations:
        dist = haversine(lat, lon, float(loc["latitude"]), float(loc["longitude"]))
        if dist <= float(loc.get("radius_meters", 500)):
            matched_location = loc
            break

    matched_location_id = matched_location["location_id"] if matched_location else None
    now_iso = datetime.now(timezone.utc).isoformat()

    # Insert into user_locations
    supabase.table("user_locations").insert({
        "user_id": user_id,
        "latitude": lat,
        "longitude": lon,
        "location_id": matched_location_id,
        "seen_at": now_iso
    }).execute()

    # If matched, create crowd snapshot
    if matched_location:
        interval = get_update_interval_minutes()
        cutoff_iso = (datetime.now(timezone.utc) - timedelta(minutes=interval)).isoformat()

        recent_res = (
            supabase.table("user_locations")
            .select("user_id")
            .eq("location_id", matched_location_id)
            .gte("seen_at", cutoff_iso)
            .execute()
        )
        unique_users = {r["user_id"] for r in (recent_res.data or []) if r.get("user_id") is not None}
        cnt = len(unique_users)
        capacity = matched_location.get("capacity") or 1000
        occupancy = int(round((cnt / max(1, capacity)) * 100))

        status = "LOW"
        if occupancy >= 100:
            status = "OVERCROWDED"
        elif occupancy >= 80:
            status = "HIGH"
        elif occupancy >= 40:
            status = "MODERATE"

        supabase.table("crowd_snapshots").insert({
            "location_id": matched_location_id,
            "crowd_count": int(cnt),
            "capacity": int(capacity),
            "occupancy_percentage": occupancy,
            "crowd_status": status,
            "created_at": now_iso
        }).execute()


def get_location_history(location_id, limit=100):
    """Fetch crowd snapshot history for a location."""
    supabase = get_supabase()
    res = (
        supabase.table("crowd_snapshots")
        .select("location_id, crowd_count, capacity, occupancy_percentage, crowd_status, created_at")
        .eq("location_id", int(location_id))
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []
