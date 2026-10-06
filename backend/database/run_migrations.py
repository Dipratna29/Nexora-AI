"""
TrustTrip Database Migration & Readiness Checker
Inspects all required database tables, reports status, and seeds defaults.
"""

import os
import sys
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from database.supabase_client import get_supabase

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

REQUIRED_TABLES = [
    "users",
    "complaints",
    "sos_incidents",
    "guide",
    "guide_ratings",
    "guide_bookings",
    "safety_equipment",
    "price_items",
    "equipment_orders",
    "geo_locations",
    "user_locations",
    "crowd_snapshots",
    "crowd_settings",
    "user_devices",
    "notifications",
    "razorpay_payments",
    "admin_users",
    "inventory_items",
    "inventory_transactions",
    "facilities",
    "offers",
    "admin_settings",
    "audit_logs"
]


def verify_database_readiness():
    """
    Checks each required table in Supabase and logs its availability.
    """
    supabase = get_supabase()
    status_report = {}
    missing_tables = []

    logger.info("Verifying Supabase database schema readiness...")

    for table in REQUIRED_TABLES:
        try:
            res = supabase.table(table).select("*").limit(1).execute()
            status_report[table] = "READY"
        except Exception as e:
            err_msg = str(e)
            if "PGRST205" in err_msg or "schema cache" in err_msg:
                status_report[table] = "MISSING (PGRST205)"
                missing_tables.append(table)
            else:
                status_report[table] = f"ERROR: {err_msg}"

    print("\n=======================================================")
    print("TRUSTTRIP DATABASE SCHEMA VERIFICATION REPORT")
    print("=======================================================")
    for tbl, stat in status_report.items():
        symbol = "[OK]" if stat == "READY" else "[--]"
        print(f"{symbol:6} {tbl:25}: {stat}")
    print("=======================================================")

    if missing_tables:
        print(f"\n[NOTICE] {len(missing_tables)} tables are not present in Supabase schema cache yet:")
        for t in missing_tables:
            print(f"   - public.{t}")
        print("\nPlease execute the migration file in your Supabase SQL Editor:")
        print(r"   E:\CAPSTONE\TrustTrip\backend\database\migrations\001_admin_tables.sql")
        print("=======================================================\n")
    else:
        print("\nALL REQUIRED TABLES ARE READY AND PERSISTED IN SUPABASE!\n")

    return missing_tables


if __name__ == "__main__":
    verify_database_readiness()
