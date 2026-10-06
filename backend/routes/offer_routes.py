from flask import Blueprint, request, jsonify
from services.offer_service import list_active_offers, list_public_facilities

offer_bp = Blueprint("public_offers", __name__)


@offer_bp.route("/offers", methods=["GET"])
def get_offers():
    """
    Returns active promotional offers for mobile app home screen.
    """
    offers = list_active_offers()
    return jsonify(offers)


@offer_bp.route("/facilities", methods=["GET"])
def get_facilities():
    """
    Returns public verified safety facilities.
    """
    category = request.args.get("category")
    facilities = list_public_facilities(category)
    return jsonify(facilities)
