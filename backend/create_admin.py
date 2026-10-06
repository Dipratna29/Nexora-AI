"""
CLI Tool to Create or Update an Administrator in TrustTrip (Supabase Auth + admin_users table)
Usage:
    python create_admin.py <email> <password> [name] [role]
Example:
    python create_admin.py dip@minip.com 123456 "Dip" SUPER_ADMIN
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from database.supabase_client import get_supabase

def create_or_update_admin(email: str, password: str, name: str = "Admin", role: str = "SUPER_ADMIN"):
    if len(password) < 6:
        print("ERROR: Supabase password must be at least 6 characters.")
        return False

    supabase = get_supabase()
    email = email.strip().lower()

    print(f"Provisioning Admin account: {email} with role: {role}...")

    # 1. Check if user already exists in Supabase Auth
    try:
        users = supabase.auth.admin.list_users()
        user_list = getattr(users, "users", users) if not isinstance(users, list) else users
        existing_user = next((u for u in user_list if getattr(u, "email", None) == email), None)

        if existing_user:
            user_uuid = existing_user.id
            print(f"User exists in Supabase Auth (ID: {user_uuid}). Updating password...")
            supabase.auth.admin.update_user_by_id(user_uuid, {
                "password": password,
                "email_confirm": True
            })
        else:
            print("Creating new user in Supabase Auth...")
            created = supabase.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True
            })
            user_uuid = created.user.id

        # 2. Record in admin_users table if available
        try:
            supabase.table("admin_users").upsert({
                "user_id": user_uuid,
                "email": email,
                "name": name,
                "role": role,
                "status": "ACTIVE"
            }, on_conflict="email").execute()
            print("admin_users table updated successfully.")
        except Exception as e:
            print("admin_users record sync note:", e)

        print("\n=======================================================")
        print("SUCCESS! Admin credentials configured:")
        print(f"  Email:    {email}")
        print(f"  Password: {password}")
        print(f"  Role:     {role}")
        print("=======================================================\n")
        return True

    except Exception as exc:
        print("Failed to provision admin account:", exc)
        return False

if __name__ == "__main__":
    if len(sys.argv) >= 3:
        email_arg = sys.argv[1]
        pass_arg = sys.argv[2]
        name_arg = sys.argv[3] if len(sys.argv) > 3 else "Admin"
        role_arg = sys.argv[4] if len(sys.argv) > 4 else "SUPER_ADMIN"
        create_or_update_admin(email_arg, pass_arg, name_arg, role_arg)
    else:
        # Default creation for convenience
        create_or_update_admin("dip@minip.com", "Admin@123456", "Dip", "SUPER_ADMIN")
