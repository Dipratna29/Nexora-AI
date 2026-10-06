"""
Database initialization and seed data for TrustTrip Remote Supabase PostgreSQL database.
"""

import logging
from werkzeug.security import generate_password_hash
from database.supabase_client import get_supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def seed_defaults():
    """
    Seeds default crowd settings, sample locations, sample guides,
    safety equipment, price items, and default test user if tables are empty.
    """
    supabase = get_supabase()

    # 1. Seed crowd settings
    try:
        crowd_set_res = supabase.table("crowd_settings").select("id").eq("key", "update_interval_minutes").execute()
        if not crowd_set_res.data:
            supabase.table("crowd_settings").insert({"key": "update_interval_minutes", "value": "30"}).execute()
            logger.info("Seeded default crowd settings.")
    except Exception as e:
        logger.warning("Crowd settings check: %s", e)

    # 2. Seed geo locations
    try:
        loc_res = supabase.table("geo_locations").select("location_id").limit(1).execute()
        if not loc_res.data:
            sample_locs = [
                {"location_name": "Gateway of India", "latitude": 18.9220, "longitude": 72.8347, "radius_meters": 500, "capacity": 500, "status": "ACTIVE"},
                {"location_name": "Marine Drive", "latitude": 18.9433, "longitude": 72.8237, "radius_meters": 400, "capacity": 400, "status": "ACTIVE"},
                {"location_name": "Colaba Causeway", "latitude": 18.9126, "longitude": 72.8126, "radius_meters": 300, "capacity": 300, "status": "ACTIVE"},
                {"location_name": "Elephanta Caves", "latitude": 18.9630, "longitude": 72.9319, "radius_meters": 800, "capacity": 500, "status": "ACTIVE"},
                {"location_name": "Sanjay Gandhi Park", "latitude": 19.2075, "longitude": 72.9106, "radius_meters": 1000, "capacity": 1000, "status": "ACTIVE"},
            ]
            supabase.table("geo_locations").insert(sample_locs).execute()
            logger.info("Seeded sample geo locations.")
    except Exception as e:
        logger.warning("Geo locations check: %s", e)

    # 3. Seed guides
    try:
        guide_res = supabase.table("guide").select("g_id").limit(1).execute()
        if not guide_res.data:
            sample_guides = [
                {"name": "Rajesh Sharma", "languages": "English, Hindi, Marathi", "status": "Available", "rating": 4.8},
                {"name": "Amina Khan", "languages": "English, Hindi, Urdu", "status": "Available", "rating": 4.9},
                {"name": "David Miller", "languages": "English, French, German", "status": "Available", "rating": 4.7},
                {"name": "Priya Patel", "languages": "English, Gujarati, Hindi", "status": "Available", "rating": 4.6},
            ]
            supabase.table("guide").insert(sample_guides).execute()
            logger.info("Seeded sample guides.")
    except Exception as e:
        logger.warning("Guides check: %s", e)

    # 4. Seed safety equipment
    try:
        eq_res = supabase.table("safety_equipment").select("id").limit(1).execute()
        if not eq_res.data:
            sample_eq = [
                {"name": "Personal Safety Alarm & Whistle", "category": "Emergency", "price": 499.00, "description": "High-decibel emergency siren with LED flashlight", "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=300"},
                {"name": "Compact First Aid Kit", "category": "Medical", "price": 799.00, "description": "Comprehensive emergency medical supplies kit for travelers", "image_url": "https://images.unsplash.com/photo-1603398938378-e54eab446dde?w=300"},
                {"name": "GPS Smart Tracking Wristband", "category": "Electronics", "price": 1999.00, "description": "Real-time wearable location tracking device with SOS button", "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300"},
                {"name": "Pepper Spray Keychain", "category": "Self Defense", "price": 350.00, "description": "Quick-release max strength pepper spray for personal defense", "image_url": "https://images.unsplash.com/photo-1585435557343-3b092031a831?w=300"},
            ]
            supabase.table("safety_equipment").insert(sample_eq).execute()
            logger.info("Seeded sample safety equipment.")
    except Exception as e:
        logger.warning("Safety equipment check: %s", e)

    # 5. Seed price items
    try:
        price_res = supabase.table("price_items").select("id").limit(1).execute()
        if not price_res.data:
            sample_prices = [
                {"name": "Bottled Water (1L)", "base_price": 20.00},
                {"name": "Taxi / Auto Fare (per km)", "base_price": 15.00},
                {"name": "Local Tea / Chai", "base_price": 15.00},
                {"name": "Street Snack / Samosa", "base_price": 25.00},
                {"name": "Standard Meal / Thali", "base_price": 120.00},
            ]
            supabase.table("price_items").insert(sample_prices).execute()
            logger.info("Seeded sample price items.")
    except Exception as e:
        logger.warning("Price items check: %s", e)

    # 6. Seed test user
    try:
        user_res = supabase.table("users").select("user_id").limit(1).execute()
        if not user_res.data:
            pwd_hash = generate_password_hash("password123")
            supabase.table("users").insert({
                "username": "testuser",
                "password": pwd_hash,
                "name": "Test User",
                "mob": "+919876543210",
                "address": "Mumbai, India",
                "nationality": "Indian",
                "emergency_contact": "+919876543211"
            }).execute()
            logger.info("Seeded default test user (testuser / password123).")
    except Exception as e:
        logger.warning("Users check: %s", e)


if __name__ == "__main__":
    seed_defaults()
    print("Database seeding completed.")
