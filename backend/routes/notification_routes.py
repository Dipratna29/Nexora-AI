"""
TrustTrip Mobile Notification Routes
Provides endpoints for retrieving user in-app notifications,
counting unread notifications, and updating read statuses.
"""

import logging
from flask import Blueprint, request, jsonify
from services.notification_service import (
    get_user_notifications,
    get_unread_notification_count,
    mark_notification_as_read,
    mark_all_notifications_as_read
)

logger = logging.getLogger(__name__)

notification_bp = Blueprint("notifications", __name__)


def _extract_user_id():
    """Extract user_id from query params, body, or headers."""
    uid = request.args.get("user_id") or request.headers.get("X-User-Id")
    if not uid and request.is_json:
        data = request.get_json(silent=True) or {}
        uid = data.get("user_id")
    if uid:
        try:
            return int(uid)
        except (ValueError, TypeError):
            return None
    return None


@notification_bp.route("/notifications", methods=["GET"])
@notification_bp.route("/api/notifications", methods=["GET"])
def list_user_notifications():
    """
    Get paginated notifications for the requesting user.
    Query parameters:
      - user_id (required)
      - category (optional: all, unread, emergency, safety, system, offers)
      - page (default: 1)
      - page_size (default: 20)
    """
    user_id = _extract_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id is required"}), 400

    category = request.args.get("category", "all")
    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 20))

    result = get_user_notifications(user_id=user_id, category=category, page=page, page_size=page_size)
    return jsonify(result), (200 if result.get("success") else 500)


@notification_bp.route("/notifications/unread-count", methods=["GET"])
@notification_bp.route("/api/notifications/unread-count", methods=["GET"])
def get_unread_count():
    """
    Get unread notification count for a user (powers mobile notification bell badge).
    Query parameter:
      - user_id (required)
    """
    user_id = _extract_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id is required", "unread_count": 0}), 400

    count = get_unread_notification_count(user_id)
    return jsonify({"success": True, "user_id": user_id, "unread_count": count}), 200


@notification_bp.route("/notifications/<int:notification_id>/read", methods=["PATCH", "POST"])
@notification_bp.route("/api/notifications/<int:notification_id>/read", methods=["PATCH", "POST"])
def mark_read(notification_id: int):
    """
    Mark a specific notification as read.
    """
    user_id = _extract_user_id()
    success = mark_notification_as_read(notification_id=notification_id, user_id=user_id)
    if success:
        return jsonify({"success": True, "message": "Notification marked as read"}), 200
    return jsonify({"success": False, "message": "Notification not found or already read"}), 404


@notification_bp.route("/notifications/read-all", methods=["PATCH", "POST"])
@notification_bp.route("/api/notifications/read-all", methods=["PATCH", "POST"])
def mark_all_read():
    """
    Mark all notifications for the given user as read.
    """
    user_id = _extract_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id is required"}), 400

    updated_count = mark_all_notifications_as_read(user_id)
    return jsonify({
        "success": True,
        "message": f"All notifications marked as read ({updated_count} updated)",
        "updated_count": updated_count
    }), 200
