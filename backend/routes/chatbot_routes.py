from flask import Blueprint, request, jsonify
from services.chatbot_service import process_chat_message

chatbot_bp = Blueprint("chatbot", __name__, url_prefix="/chatbot")


@chatbot_bp.route("/message", methods=["POST"])
def chat_message():
    """
    Receives chat message from traveler and returns AI safety response.
    """
    data = request.get_json(silent=True) or {}
    message = data.get("message", "")
    username = data.get("username", "Traveler")

    result = process_chat_message(message, username)
    return jsonify({
        "success": True,
        "reply": result["reply"],
        "tag": result["tag"]
    })
