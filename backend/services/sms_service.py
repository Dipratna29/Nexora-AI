"""
TrustTrip SMS Service Provider Integration
Supports:
1. Twilio SMS Provider (when configured with TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)
2. Safe Development Simulation Mode (logs SMS dispatch clearly without failing when credentials are not configured)
3. Welcome registration message dispatch
4. One-Time Password (OTP) generation, dispatch, and verification
"""

import os
import logging
import random
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, Dict, Any

logger = logging.getLogger(__name__)

# Environment configurations
SMS_PROVIDER = os.environ.get("SMS_PROVIDER", "auto").lower()
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER", "").strip()


def _is_twilio_configured() -> bool:
    """Checks whether valid Twilio credentials are provided."""
    return bool(TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN and TWILIO_PHONE_NUMBER)


def send_sms(to_phone: str, message: str) -> Tuple[bool, str]:
    """
    Sends an SMS message to an international phone number (e.g. +919876543210).
    
    Returns:
        (success: bool, status_or_error_message: str)
    """
    if not to_phone:
        return False, "Destination phone number is required"

    to_phone = to_phone.strip()
    if not to_phone.startswith("+"):
        to_phone = f"+{to_phone}"

    # Check if Twilio is configured
    if _is_twilio_configured():
        try:
            from twilio.rest import Client
            client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
            message_instance = client.messages.create(
                body=message,
                from_=TWILIO_PHONE_NUMBER,
                to=to_phone
            )
            logger.info("Twilio SMS sent to %s (SID: %s)", to_phone, message_instance.sid)
            return True, f"Delivered via Twilio (SID: {message_instance.sid})"
        except Exception as e:
            logger.error("Twilio SMS delivery error for %s: %s", to_phone, str(e))
            print(f"\n[SMS ERROR] Twilio delivery failed for {to_phone}: {e}\n")
            return False, f"SMS delivery failed: {str(e)}"
    else:
        # Development / Unconfigured Mode
        print(f"\n=======================================================")
        print(f"[SMS PROVIDER NOT CONFIGURED] SMS would be sent to: {to_phone}")
        print(f"MESSAGE: {message}")
        print(f"=======================================================\n")
        logger.info("[SMS PROVIDER NOT CONFIGURED] Message to %s", to_phone)
        return False, "SMS provider not configured (development mode)"


def send_welcome_sms(to_phone: str, user_name: str) -> Tuple[bool, str]:
    """
    Sends a friendly welcome SMS to newly registered travelers after database insertion.
    """
    first_name = user_name.split()[0] if user_name else "Traveler"
    message = (
        f"Welcome to TrustTrip, {first_name}! Your account has been created successfully. "
        "Stay safe and travel smart with TrustTrip."
    )
    return send_sms(to_phone, message)


def generate_otp(length: int = 6) -> str:
    """Generates a secure numeric OTP."""
    return "".join(str(random.randint(0, 9)) for _ in range(length))


def hash_otp(otp_code: str) -> str:
    """Hashes an OTP code with SHA-256 for secure database storage."""
    return hashlib.sha256(otp_code.strip().encode("utf-8")).hexdigest()


def send_otp_sms(to_phone: str, user_name: Optional[str] = None) -> Tuple[bool, str, str, datetime]:
    """
    Generates and sends an OTP verification code.
    
    Returns:
        (success, message, hashed_otp, expires_at)
    """
    otp = generate_otp(6)
    hashed = hash_otp(otp)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    greeting = f"Hi {user_name.split()[0]}, " if user_name else ""
    message = f"{greeting}Your TrustTrip verification code is: {otp}. Valid for 10 minutes. Do not share this code."

    success, status_msg = send_sms(to_phone, message)
    return success, status_msg, hashed, expires_at


def verify_otp_hash(candidate_otp: str, stored_hash: str, expires_at: Optional[Any]) -> Tuple[bool, str]:
    """
    Verifies a user-supplied OTP against the stored SHA-256 hash and expiration timestamp.
    """
    if not candidate_otp or not stored_hash:
        return False, "OTP code and hash are required"

    # Check expiration if provided
    if expires_at:
        try:
            if isinstance(expires_at, str):
                from dateutil import parser
                expires_dt = parser.isoparse(expires_at)
            else:
                expires_dt = expires_at

            if expires_dt.tzinfo is None:
                expires_dt = expires_dt.replace(tzinfo=timezone.utc)

            if datetime.now(timezone.utc) > expires_dt:
                return False, "Verification code has expired. Please request a new code."
        except Exception as e:
            logger.warning("Could not parse OTP expiration timestamp: %s", e)

    candidate_hash = hash_otp(candidate_otp)
    if candidate_hash == stored_hash:
        return True, "Phone number verified successfully"

    return False, "Invalid verification code"
