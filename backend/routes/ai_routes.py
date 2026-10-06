"""
TrustTrip AI Assistant Routes — Powered by Groq API
Dedicated endpoints for general & travel safety chat, status, and session clearing.
"""

import logging
from flask import Blueprint, request, jsonify
from services.ai_service import generate_chat_response, clear_conversation, _get_groq_client
from config import Config

logger = logging.getLogger(__name__)

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")


@ai_bp.route("/chat", methods=["POST"])
def chat():
    """
    Main AI chat endpoint.
    Accepts:
      {
        "message": "User query",
        "conversation_id": "optional-uuid",
        "location": { "latitude": 19.0760, "longitude": 72.8777 },
        "user_id": "optional-user-id"
      }
    Returns:
      {
        "success": true,
        "message": "AI response",
        "conversation_id": "...",
        "model": "...",
        "usage": {...}
      }
    """
    data = request.get_json(silent=True) or {}
    message = data.get("message", "")
    conversation_id = data.get("conversation_id")
    location = data.get("location")
    user_id = data.get("user_id") or request.headers.get("X-User-Id")

    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr or "127.0.0.1").split(",")[0].strip()

    # Input validation
    if not isinstance(message, str) or not message.strip():
        return jsonify({
            "success": False,
            "message": "Please enter a question or message for TrustTrip AI.",
            "error_code": "EMPTY_MESSAGE"
        }), 400

    # Optional location validation
    valid_location = None
    if isinstance(location, dict):
        lat = location.get("latitude")
        lon = location.get("longitude")
        if lat is not None and lon is not None:
            try:
                valid_location = {
                    "latitude": float(lat),
                    "longitude": float(lon)
                }
            except (ValueError, TypeError):
                valid_location = None

    try:
        result = generate_chat_response(
            message=message.strip(),
            conversation_id=conversation_id,
            location=valid_location,
            user_id=user_id,
            client_ip=client_ip,
        )

        status_code = 200 if result.get("success") else (
            429 if result.get("error_code") == "RATE_LIMIT_EXCEEDED" else (
                503 if result.get("error_code") == "GROQ_KEY_MISSING" else 500
            )
        )
        return jsonify(result), status_code

    except Exception as exc:
        logger.exception("Unhandled error in /api/ai/chat: %s", exc)
        return jsonify({
            "success": False,
            "message": "TrustTrip AI is temporarily unavailable. Please try again.",
            "error_code": "INTERNAL_ERROR"
        }), 500


@ai_bp.route("/clear", methods=["POST"])
def clear():
    """
    Clears conversation history for a given conversation_id.
    """
    data = request.get_json(silent=True) or {}
    conversation_id = data.get("conversation_id")
    if conversation_id:
        clear_conversation(conversation_id)
        return jsonify({"success": True, "message": "Conversation history cleared."}), 200
    return jsonify({"success": False, "message": "conversation_id required."}), 400


@ai_bp.route("/status", methods=["GET"])
def status():
    """
    Returns AI Assistant status, model name, and Groq configuration state.
    """
    client = _get_groq_client()
    return jsonify({
        "success": True,
        "online": client is not None,
        "model": Config.GROQ_MODEL,
        "groq_configured": bool(Config.GROQ_API_KEY)
    }), 200
