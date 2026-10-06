import os
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(dotenv_path=ENV_PATH, override=True)

class Config:
    ENVIRONMENT = os.environ.get("ENVIRONMENT", "development").lower()
    SECRET_KEY = os.environ.get("SECRET_KEY", "")

    SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

    PORT = int(os.environ.get("PORT", "5000"))
    DEBUG = os.environ.get("DEBUG", "false").lower() == "true"
    TRUST_PROXY = os.environ.get("TRUST_PROXY", "false").lower() == "true"
    REQUIRE_HTTPS_PAYMENTS = os.environ.get("REQUIRE_HTTPS_PAYMENTS", "false").lower() == "true"
    LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()

    EXPO_ACCESS_TOKEN = os.environ.get("EXPO_ACCESS_TOKEN", "")
    RAZORPAY_MODE = os.environ.get("RAZORPAY_MODE", "test").lower()
    RAZORPAY_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
    RAZORPAY_WEBHOOK_SECRET = os.environ.get("RAZORPAY_WEBHOOK_SECRET", "")

    GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
    GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")

    @classmethod
    def validate(cls):
        required = {
            "SECRET_KEY": cls.SECRET_KEY,
            "SUPABASE_URL": cls.SUPABASE_URL,
            "SUPABASE_SERVICE_ROLE_KEY": cls.SUPABASE_SERVICE_ROLE_KEY,
            "RAZORPAY_KEY_ID": cls.RAZORPAY_KEY_ID,
            "RAZORPAY_KEY_SECRET": cls.RAZORPAY_KEY_SECRET
        }
        missing = [name for name, value in required.items() if not value]
        if cls.RAZORPAY_MODE not in {"test", "live"}:
            raise RuntimeError("RAZORPAY_MODE must be 'test' or 'live'")
        if cls.ENVIRONMENT in {"production", "staging"} and missing:
            raise RuntimeError(f"Missing required production configuration: {', '.join(missing)}")
        if cls.ENVIRONMENT == "production" and cls.RAZORPAY_MODE != "live":
            raise RuntimeError("Production requires explicit live Razorpay mode")
        return missing
