from flask import Blueprint, request, jsonify
from services.sos_service import trigger_sos_alert, get_active_user_sos, cancel_user_sos

sos_bp = Blueprint("sos", __name__, url_prefix="/sos")


@sos_bp.route("/trigger", methods=["POST"])
def trigger_sos():
    """
    Handles distress beacon from Android mobile client.
    """
    data = request.get_json(silent=True) or {}
    try:
        incident = trigger_sos_alert(data)
        return jsonify({
            "success": True,
            "message": "Emergency SOS broadcast dispatched. Authorities and local responders alerted.",
            "incident": incident
        }), 201
    except Exception as exc:
        return jsonify({
            "success": False,
            "message": str(exc)
        }), 500


@sos_bp.route("/status/<identifier>", methods=["GET"])
def get_sos_status(identifier):
    """
    Returns active SOS incident status for a user.
    """
    incident = get_active_user_sos(identifier)
    return jsonify({
        "success": True,
        "active_incident": incident
    })


@sos_bp.route("/cancel", methods=["POST"])
def cancel_sos():
    """
    Cancels an active SOS alert.
    """
    data = request.get_json(silent=True) or {}
    incident_id = data.get("incident_id")
    username = data.get("username", "user")

    if not incident_id:
        return jsonify({"success": False, "message": "Incident ID is required"}), 400

    success = cancel_user_sos(int(incident_id), username)
    return jsonify({
        "success": success,
        "message": "SOS incident cancelled" if success else "Failed to cancel incident"
    })
