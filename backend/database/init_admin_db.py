import os
import sys
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.supabase_client import get_supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def init_admin_database():
    """
    Initializes admin settings, seeds default data if tables are ready,
    and synchronizes safety_equipment catalog into inventory_items.
    """
    supabase = get_supabase()
    logger.info("Checking and initializing admin data in Supabase...")

    # 1. Sync safety_equipment into inventory_items if inventory_items exists
    try:
        inv_check = supabase.table("inventory_items").select("id").limit(1).execute()
        if not inv_check.data:
            # Table is empty, let's sync from safety_equipment
            eq_res = supabase.table("safety_equipment").select("*").execute()
            eq_items = eq_res.data or []
            if eq_items:
                synced_items = []
                for item in eq_items:
                    synced_items.append({
                        "name": item.get("name"),
                        "category": item.get("category") or "General",
                        "sku": f"EQ-{item.get('id', 1):04d}",
                        "current_stock": 25,
                        "minimum_stock": 5,
                        "unit": "units",
                        "price": float(item.get("price", 0.0)),
                        "supplier": "TrustTrip Safety Gear Ltd.",
                        "status": "IN_STOCK",
                        "image_url": item.get("image_url"),
                        "description": item.get("description")
                    })
                supabase.table("inventory_items").insert(synced_items).execute()
                logger.info("Successfully synced %d safety equipment items into inventory_items.", len(synced_items))
    except Exception as e:
        logger.warning("inventory_items sync notice: %s", e)

    # 2. Seed initial facilities if table exists and empty
    try:
        fac_check = supabase.table("facilities").select("id").limit(1).execute()
        if not fac_check.data:
            sample_facilities = [
                {
                    "name": "Colaba Police Station",
                    "category": "Police Station",
                    "latitude": 18.9168,
                    "longitude": 72.8277,
                    "address": "Shaheed Bhagat Singh Road, Colaba, Mumbai",
                    "phone": "022-22852737",
                    "opening_hours": "24/7",
                    "is_verified": True,
                    "status": "ACTIVE"
                },
                {
                    "name": "St. George's Hospital & Trauma Care",
                    "category": "Hospital",
                    "latitude": 18.9398,
                    "longitude": 72.8368,
                    "address": "P D'Mello Road, Fort, Mumbai",
                    "phone": "022-22620242",
                    "opening_hours": "24/7",
                    "is_verified": True,
                    "status": "ACTIVE"
                },
                {
                    "name": "Apollo 24/7 Emergency Pharmacy",
                    "category": "Pharmacy",
                    "latitude": 18.9280,
                    "longitude": 72.8320,
                    "address": "Mahatma Gandhi Road, Fort, Mumbai",
                    "phone": "1860-500-0101",
                    "opening_hours": "24/7",
                    "is_verified": True,
                    "status": "ACTIVE"
                },
                {
                    "name": "Mumbai Tourist Facilitation Centre",
                    "category": "Tourist Assistance",
                    "latitude": 18.9220,
                    "longitude": 72.8340,
                    "address": "Opp. Gateway of India, Apollo Bandar, Mumbai",
                    "phone": "022-22845678",
                    "opening_hours": "08:00 AM - 10:00 PM",
                    "is_verified": True,
                    "status": "ACTIVE"
                }
            ]
            supabase.table("facilities").insert(sample_facilities).execute()
            logger.info("Successfully seeded default safety facilities.")
    except Exception as e:
        logger.warning("facilities seed notice: %s", e)

    # 3. Seed sample offers if table exists and empty
    try:
        offer_check = supabase.table("offers").select("id").limit(1).execute()
        if not offer_check.data:
            sample_offers = [
                {
                    "title": "20% Off Safety Equipment Kits",
                    "description": "Exclusive seasonal traveler discount on compact first aid and safety siren kits.",
                    "discount": "20% OFF",
                    "vendor": "TrustTrip Safety Supply",
                    "start_date": "2026-08-01",
                    "end_date": "2026-12-31",
                    "status": "PUBLISHED",
                    "image_url": "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500"
                },
                {
                    "title": "Certified City Guide Weekend Special",
                    "description": "Book a top-rated multilingual tour guide with verified safety credentials for 15% off.",
                    "discount": "15% OFF",
                    "vendor": "Maharashtra Tourism Alliance",
                    "start_date": "2026-08-15",
                    "end_date": "2026-10-31",
                    "status": "PUBLISHED",
                    "image_url": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500"
                }
            ]
            supabase.table("offers").insert(sample_offers).execute()
            logger.info("Successfully seeded sample offers.")
    except Exception as e:
        logger.warning("offers seed notice: %s", e)

    # 4. Seed admin settings if table exists
    try:
        set_check = supabase.table("admin_settings").select("id").eq("key", "general_settings").execute()
        if not set_check.data:
            supabase.table("admin_settings").insert({
                "key": "general_settings",
                "value": {
                    "app_name": "TrustTrip",
                    "support_email": "support@trusttrip.com",
                    "support_phone": "+91 800 123 4567",
                    "default_minimum_stock": 10,
                    "session_timeout_minutes": 120,
                    "sos_alert_sound": True
                }
            }).execute()
            logger.info("Successfully seeded admin platform settings.")
    except Exception as e:
        logger.warning("admin_settings seed notice: %s", e)


if __name__ == "__main__":
    init_admin_database()
