from flask import Blueprint, request, jsonify
from services.profile_service import get_profile_data, update_profile

profile_bp = Blueprint("profile", __name__)


@profile_bp.route("/profile/<username>", methods=["GET"])
def get_profile(username):
    user = get_profile_data(username)
    return jsonify(user)


@profile_bp.route("/profile/<username>", methods=["PUT", "PATCH"])
def update_user_profile(username):
    data = request.get_json(silent=True) or {}
    updated = update_profile(username, data)
    return jsonify({
        "success": True,
        "message": "Profile updated successfully",
        "user": updated
    })