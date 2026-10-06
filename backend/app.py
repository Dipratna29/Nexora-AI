import logging
import os

from flask import Flask, jsonify
from flask_cors import CORS
from config import Config

# Import blueprints from the routes package
from routes.auth_routes import auth_bp
from routes.profile_routes import profile_bp
from routes.complaint_routes import complaint_bp
from routes.guide_routes import guide_bp
from routes.equipment_routes import equipment_bp
from routes.translate import translate_bp
from routes.crowd_routes import crowd_bp
from routes.device_routes import device_bp
from routes.payment_routes import payment_bp
from routes.admin_routes import admin_bp
from routes.sos_routes import sos_bp
from routes.offer_routes import offer_bp
from routes.chatbot_routes import chatbot_bp
from routes.ai_routes import ai_bp
from routes.notification_routes import notification_bp

from database.supabase_client import check_supabase_connection

# Initialize Flask app
logging.basicConfig(level=getattr(logging, Config.LOG_LEVEL, logging.INFO), format="%(asctime)s %(levelname)s %(name)s %(message)s")
if Config.ENVIRONMENT in {"production", "staging"}:
    Config.validate()
app = Flask(__name__)
CORS(app, origins=os.environ.get("CORS_ORIGINS", "").split(",") if os.environ.get("CORS_ORIGINS") else "*")

# Register all Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(profile_bp)
app.register_blueprint(complaint_bp)
app.register_blueprint(guide_bp)
app.register_blueprint(equipment_bp)
app.register_blueprint(translate_bp)
app.register_blueprint(crowd_bp)
app.register_blueprint(device_bp)
app.register_blueprint(payment_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(sos_bp)
app.register_blueprint(offer_bp)
app.register_blueprint(chatbot_bp)
app.register_blueprint(ai_bp)
app.register_blueprint(notification_bp)

@app.route("/", methods=["GET"])
def index():
    """Welcome index route for status checks."""
    return jsonify({
        "status": "online",
        "app": "TrustTrip API",
        "version": "1.0.0"
    })

@app.route("/health", methods=["GET"])
def health():
    """Health check verifying API operational status and Supabase connectivity."""
    db_connected = check_supabase_connection()
    return jsonify({
        "status": "ok" if db_connected else "degraded",
        "database": "supabase",
        "connected": db_connected
    }), (200 if db_connected else 503)

if __name__ == "__main__":
    # Start Flask API using configurations loaded from environment
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
