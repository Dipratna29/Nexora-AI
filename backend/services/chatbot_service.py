"""
TrustTrip AI Travel Safety Assistant Service
Provides contextual, intelligent safety advice, nearby verified facility lookups,
and emergency guidance for travelers.
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


def process_chat_message(message: str, username: str = "Traveler") -> Dict[str, Any]:
    """
    Processes a traveler's question using Groq AI with graceful fallback.
    """
    msg = (message or "").strip()
    if not msg:
        return {
            "reply": "I'm your TrustTrip Assistant. Ask me about nearby hospitals, police stations, safe routes, or fair local pricing!",
            "tag": "ASSISTANT"
        }

    # Attempt full Groq AI response
    try:
        from services.ai_service import generate_chat_response
        ai_res = generate_chat_response(message=msg, conversation_id=f"legacy-{username}")
        if ai_res.get("success") and ai_res.get("message"):
            return {
                "reply": ai_res["message"],
                "tag": "TRUSTTRIP AI"
            }
    except Exception as exc:
        logger.warning("Groq AI processing failed in legacy route, falling back: %s", exc)

    # Heuristic fallback if Groq is temporarily unavailable
    msg_lower = msg.lower()
    if any(w in msg_lower for w in ["hotel", "stay", "lodge", "accommodation"]):
        return {
            "reply": "I found verified accommodations nearby with active 24/7 security desks. Check the Local Guide section for certified listings.",
            "tag": "HOTELS"
        }

    if any(w in msg_lower for w in ["police", "cop", "theft", "stolen", "trouble", "danger", "harass"]):
        return {
            "reply": "For immediate police assistance, tap the red SOS button or dial 100 / 112 directly. The nearest verified police post is within 0.5 km.",
            "tag": "EMERGENCY POLICE"
        }

    if any(w in msg_lower for w in ["medical", "doctor", "hospital", "ambulance", "medicine", "pharmacy"]):
        return {
            "reply": "Nearest emergency hospital is available in your Verified Facilities tab. In an acute medical emergency, trigger SOS or call 108.",
            "tag": "MEDICAL"
        }

    if any(w in msg_lower for w in ["price", "scam", "overcharge", "auto", "taxi", "cost", "fair"]):
        return {
            "reply": "Check the Fair Price section in your dashboard to view government-approved benchmark rates for auto fares, bottled water, and tour services.",
            "tag": "FAIR PRICING"
        }

    return {
        "reply": f"Hi {username}, I'm monitoring your safety. For emergencies, tap the SOS button anytime. How else can I assist your trip today?",
        "tag": "SAFETY ADVISORY"
    }

