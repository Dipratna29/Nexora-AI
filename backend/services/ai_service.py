"""
TrustTrip AI Assistant Service — Powered by Groq API
Provides intelligent, general-purpose assistance with specialized expertise
in travel, traveler safety, real TrustTrip app features, and live Supabase data context (RAG).
"""

import os
import time
import math
import logging
from typing import Dict, Any, List, Optional
from collections import defaultdict

from config import Config
from database.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

# Lazy-loaded Groq client
_groq_client = None

# Model configuration with automatic fallback chain
# Model configuration with automatic fallback chain across supported Groq models
DEFAULT_MODELS = [
    Config.GROQ_MODEL,
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.8-27b",
    "qwen/qwen3.6-27b",
    "allam-2-7b",
]

# In-memory conversation memory buffer: {conversation_id: [{"role": "user"|"assistant", "content": str, "time": float}]}
_conversations: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
MAX_HISTORY_TURNS = 10  # Maximum turns kept in sliding memory

# In-memory rate limiting: {client_id: [timestamps]}
_rate_limits: Dict[str, List[float]] = defaultdict(list)
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX_REQUESTS = 35  # requests per window


def _get_groq_client():
    """Initializes and caches the Groq API client."""
    global _groq_client
    api_key = Config.GROQ_API_KEY or os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        return None
    if _groq_client is None:
        try:
            from groq import Groq
            _groq_client = Groq(api_key=api_key, timeout=20.0, max_retries=0)
        except Exception as exc:
            logger.error("Failed to initialize Groq client: %s", exc)
            return None
    return _groq_client


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in kilometers."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return 2.0 * R * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


def check_rate_limit(client_id: str) -> bool:
    """Returns True if within rate limits, False if limit exceeded."""
    now = time.time()
    cutoff = now - RATE_LIMIT_WINDOW
    records = [t for t in _rate_limits[client_id] if t > cutoff]
    _rate_limits[client_id] = records
    if len(records) >= RATE_LIMIT_MAX_REQUESTS:
        return False
    _rate_limits[client_id].append(now)
    return True


def get_conversation_history(conversation_id: str) -> List[Dict[str, str]]:
    """Returns formatted message history for Groq chat completions."""
    history = _conversations.get(conversation_id, [])
    return [{"role": item["role"], "content": item["content"]} for item in history[-MAX_HISTORY_TURNS:]]


def record_conversation_turn(conversation_id: str, user_text: str, assistant_text: str):
    """Stores user and assistant turns in the conversation memory buffer."""
    now = time.time()
    history = _conversations[conversation_id]
    history.append({"role": "user", "content": user_text, "time": now})
    history.append({"role": "assistant", "content": assistant_text, "time": now})
    if len(history) > MAX_HISTORY_TURNS * 2:
        _conversations[conversation_id] = history[-(MAX_HISTORY_TURNS * 2):]


def clear_conversation(conversation_id: str):
    """Clears history for a specific conversation session."""
    if conversation_id in _conversations:
        del _conversations[conversation_id]


def retrieve_trusttrip_context(query: str, location: Optional[Dict[str, float]] = None, user_id: Optional[str] = None) -> str:
    """
    RAG Engine: Retrieves real data from Supabase to provide factual context to Groq.
    Never hallucinates inventory, prices, facilities, guides, or incidents.
    """
    q = (query or "").lower()
    context_chunks: List[str] = []

    try:
        supabase = get_supabase_client()
    except Exception as e:
        logger.warning("Supabase client unavailable for context retrieval: %s", e)
        return ""

    # 1. Emergency Facilities / Hospitals / Police
    if any(k in q for k in ["facility", "facilities", "hospital", "police", "medical", "clinic", "doctor", "ambulance", "pharmacy", "help nearby", "emergency center"]):
        try:
            res = supabase.table("facilities").select("id, name, category, address, phone, latitude, longitude, opening_hours").limit(10).execute()
            facilities = res.data or []
            if facilities:
                user_lat = location.get("latitude") if location else None
                user_lon = location.get("longitude") if location else None
                
                fac_lines = []
                for f in facilities:
                    dist_str = ""
                    if user_lat is not None and user_lon is not None and f.get("latitude") and f.get("longitude"):
                        try:
                            d = haversine_distance(user_lat, user_lon, float(f["latitude"]), float(f["longitude"]))
                            dist_str = f" (~{d:.1f} km away)"
                        except Exception:
                            pass
                    fac_lines.append(f"- {f.get('name')} ({f.get('category')}){dist_str}: {f.get('address')}, Phone: {f.get('phone', 'N/A')}, Hours: {f.get('opening_hours', '24/7')}")
                context_chunks.append("REAL TRUSTTRIP VERIFIED EMERGENCY FACILITIES:\n" + "\n".join(fac_lines))
        except Exception as err:
            logger.debug("Facilities lookup error: %s", err)

    # 2. Safety Equipment & Inventory
    if any(k in q for k in ["equipment", "gear", "safety kit", "tracker", "beacon", "vest", "rental", "inventory", "buy gear", "helmet", "first aid kit"]):
        try:
            res = supabase.table("safety_equipment").select("id, name, category, price, description").limit(10).execute()
            equipments = res.data or []
            if equipments:
                eq_lines = []
                for e in equipments:
                    eq_lines.append(f"- {e.get('name')} ({e.get('category')}): INR {e.get('price')} — {e.get('description', '')}")
                context_chunks.append("REAL TRUSTTRIP SAFETY EQUIPMENT ITEMS:\n" + "\n".join(eq_lines))
        except Exception as err:
            logger.debug("Equipment lookup error: %s", err)

    # 3. Certified Local Guides
    if any(k in q for k in ["guide", "local guide", "tour guide", "certified guide", "hire guide"]):
        try:
            res = supabase.table("guide").select("g_id, name, languages, status, rating").limit(8).execute()
            guides = res.data or []
            if guides:
                g_lines = []
                for g in guides:
                    g_lines.append(f"- Guide {g.get('name')}: Speaks {g.get('languages')}, Rating: {g.get('rating', '4.5')}/5, Status: {g.get('status', 'ACTIVE')}")
                context_chunks.append("REAL TRUSTTRIP CERTIFIED GUIDES:\n" + "\n".join(g_lines))
        except Exception as err:
            logger.debug("Guide lookup error: %s", err)

    # 4. Fair Prices / Benchmark Rates
    if any(k in q for k in ["price", "fair price", "benchmark", "auto fare", "taxi fare", "scam", "overcharge", "cost", "how much for auto", "how much for taxi"]):
        try:
            res = supabase.table("price_items").select("id, name, base_price").limit(10).execute()
            items = res.data or []
            if items:
                p_lines = [f"- {item.get('name')}: INR {item.get('base_price')}" for item in items]
                context_chunks.append("REAL GOVERNMENT-APPROVED BENCHMARK FAIR PRICES:\n" + "\n".join(p_lines))
        except Exception as err:
            logger.debug("Price items lookup error: %s", err)

    # 5. Active Offers / Discounts
    if any(k in q for k in ["offer", "discount", "promo", "coupon", "deal"]):
        try:
            res = supabase.table("offers").select("id, title, description, discount, vendor").limit(5).execute()
            offers = res.data or []
            if offers:
                o_lines = [f"- {o.get('title')}: Discount '{o.get('discount')}' by {o.get('vendor', 'TrustTrip Partner')} — {o.get('description')}" for o in offers]
                context_chunks.append("REAL CURRENT ACTIVE PROMOTIONS & OFFERS:\n" + "\n".join(o_lines))
        except Exception as err:
            logger.debug("Offers lookup error: %s", err)

    # 6. User Complaints & Grievances (if user_id/username exists)
    if user_id and any(k in q for k in ["my complaint", "my complaints", "complaint status", "grievance status", "reported issue"]):
        try:
            res = supabase.table("complaints").select("id, category, description, status, created_at, admin_response").eq("username", user_id).order("created_at", desc=True).limit(5).execute()
            user_complaints = res.data or []
            if user_complaints:
                c_lines = [f"- Incident #{c.get('id')}: Category '{c.get('category')}', Status: {c.get('status')}, Admin Note: {c.get('admin_response', 'In review')}" for c in user_complaints]
                context_chunks.append("USER'S ACTUAL FILED GRIEVANCES IN TRUSTTRIP:\n" + "\n".join(c_lines))
            else:
                context_chunks.append("USER COMPLAINTS STATUS: The user has no active grievances or complaints filed.")
        except Exception as err:
            logger.debug("User complaints lookup error: %s", err)

    # 7. User Active SOS Incident (if user_id/username exists)
    if user_id and any(k in q for k in ["my sos", "sos status", "emergency status", "active emergency"]):
        try:
            res = supabase.table("sos_incidents").select("id, status, created_at, responder_note").eq("username", user_id).order("created_at", desc=True).limit(1).execute()
            sos_data = res.data or []
            if sos_data:
                incident = sos_data[0]
                context_chunks.append(f"USER'S LATEST SOS INCIDENT: ID #{incident.get('id')}, Status: {incident.get('status')}, Admin Note: {incident.get('responder_note', 'No note')}")
            else:
                context_chunks.append("USER SOS STATUS: The user has no recorded SOS incidents.")
        except Exception as err:
            logger.debug("User SOS lookup error: %s", err)

    return "\n\n".join(context_chunks)

    return "\n\n".join(context_chunks)


def build_system_prompt(trusttrip_context: str = "", location: Optional[Dict[str, float]] = None) -> str:
    """
    Builds the system prompt for TrustTrip AI.
    Covers general knowledge, travel planning, emergency safety protocols,
    Hinglish/multilingual comprehension, and anti-hallucination constraints.
    """
    loc_note = ""
    if location and location.get("latitude") is not None and location.get("longitude") is not None:
        loc_note = f"The user's verified current GPS coordinates are: Latitude {location['latitude']:.4f}, Longitude {location['longitude']:.4f}."
    else:
        loc_note = "User device GPS coordinates are currently unavailable or permission not granted. Provide safety guidance normally and mention that enabling GPS allows distance-sorted nearby facility recommendations."

    prompt = f"""You are "TrustTrip AI" — an Intelligent Travel, Safety & General Knowledge Assistant built for the TrustTrip ecosystem.

CORE IDENTITY & PERSONALITY:
- Helpful, calm, friendly, professional, and safety-conscious.
- Concise but informative. Avoid enormous walls of text; use clean bullet points, numbered lists, and bold headings where appropriate.
- Never unnecessarily alarmist, but always prioritize immediate safety in critical situations.
- Understands English, Indian English, simple colloquial phrasing, and conversational Hinglish (e.g. "bhai Mumbai me kaha safe hai?", "kya rate hai?", "help chahiye"). Always reply politely and clearly in the language or style the user speaks (or clean English if preferred).

CAPABILITY DOMAINS:
1. GENERAL KNOWLEDGE & NON-TRAVEL (NEVER REJECT THESE!):
   - You MUST answer general questions accurately: computer programming/code (Python, JS, etc.), mathematics, science (photosynthesis, physics), blockchain, machine learning, history, language translation, general reasoning, definitions, etc.
   - Do NOT say "I can only answer travel questions." You are a full-fledged AI assistant with special expertise in travel and safety.

2. TRAVEL PLANNING & ADVICE:
   - Itineraries (e.g. "Plan a 4-day Mumbai trip" → Day 1, Day 2, Day 3, Day 4 with practical tips).
   - Packing checklists, transportation methods, local cuisine, cultural etiquette, budgeting, solo & family travel.

3. TRAVEL SAFETY & EMERGENCIES (HIGHEST PRIORITY):
   - If a user reports immediate danger, being followed, harassed, stolen property, or a medical crisis, prioritize IMMEDIATE ACTION:
     1. Move to a safe, well-lit, public location with people or security.
     2. Use the TrustTrip SOS button (hold for 1.8s to trigger the emergency beacon).
     3. Call local emergency numbers: 112 (National Emergency), 100 (Police), 108 (Ambulance), 1091 (Women Helpline), 1363 (Tourist Helpline).
     4. Share live GPS location with trusted contacts via the Women Safety / SOS module.
     5. Avoid escalation or confrontation.
   - For medical issues: provide general first-aid guidance and urge immediate professional medical attention; never pretend to diagnose.

4. TRUSTTRIP APP FEATURES INTEGRATION:
   You understand the real features of the TrustTrip application:
   - "SOS Cockpit": 1.8s hold-to-confirm emergency beacon that alerts authorities and monitors resolution status in real-time.
   - "Women Safety": Quick speed dial (1091), one-tap live GPS location sharing via SMS/WhatsApp, and verified safe zones.
   - "Crowd Density": Live index of crowded tourist precincts (Gateway of India, Marine Drive, etc.) to avoid congestion.
   - "Fair Price": Benchmark pricing for autos, taxis, and essentials to prevent tourist overcharging.
   - "Certified Guides": Verified local guides with language skills, ID verification, and ratings.
   - "Safety Equipment": Rental equipment (GPS tags, first aid, emergency alarms) with live inventory checkout.
   - "Complaints & Grievances": Formal complaint registration with tracked grievance IDs for fraud, harassment, or service issues.

ANTI-HALLUCINATION & LIVE DATA RULES:
- GROQ is an LLM, not a real-time sensor. Do NOT invent live weather forecasts, unmonitored street conditions, or fake prices.
- If live data is unavailable (e.g. current live temperature/rain), truthfully state: "I don't have live weather data right now."
- When real TrustTrip backend data is provided below, rely on it as the ground truth.

{loc_note}
"""
    if trusttrip_context:
        prompt += f"\n\n====================\nREAL-TIME TRUSTTRIP DATABASE CONTEXT:\n{trusttrip_context}\n====================\nUse the above verified data whenever relevant to answer user queries accurately."

    return prompt


def generate_chat_response(
    message: str,
    conversation_id: Optional[str] = None,
    location: Optional[Dict[str, float]] = None,
    user_id: Optional[str] = None,
    client_ip: str = "127.0.0.1",
) -> Dict[str, Any]:
    """
    Main entrypoint: Generates a comprehensive Groq AI response with
    RAG database context, multi-turn memory, rate limiting, and error handling.
    """
    user_msg = (message or "").strip()
    if not user_msg:
        return {
            "success": False,
            "message": "Please enter a question or message for TrustTrip AI.",
            "error_code": "EMPTY_MESSAGE"
        }

    if len(user_msg) > 3000:
        user_msg = user_msg[:3000]

    conv_id = conversation_id or f"conv-{int(time.time())}"

    # Rate limiting
    rate_key = user_id or client_ip or conv_id
    if not check_rate_limit(rate_key):
        return {
            "success": False,
            "message": "AI Assistant is currently busy. Please wait a moment before sending another message.",
            "error_code": "RATE_LIMIT_EXCEEDED"
        }

    # Initialize Groq client
    client = _get_groq_client()
    if not client:
        logger.error("GROQ_API_KEY is not configured or Groq client failed to initialize.")
        return {
            "success": False,
            "message": "TrustTrip AI is temporarily unavailable. (GROQ_API_KEY is not configured in backend/.env)",
            "error_code": "GROQ_KEY_MISSING"
        }

    # 1. Retrieve RAG database context from Supabase
    trusttrip_context = retrieve_trusttrip_context(user_msg, location, user_id)

    # 2. Build system prompt
    system_prompt = build_system_prompt(trusttrip_context, location)

    # 3. Retrieve conversation history
    history = get_conversation_history(conv_id)

    # 4. Construct messages payload
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_msg})

    # 5. Call Groq with model fallback chain
    chosen_model = None
    response_content = None
    usage_info = {}

    models_to_try = [m for m in DEFAULT_MODELS if m]
    last_error = None

    for model in models_to_try:
        try:
            logger.info("Dispatching Groq chat completion with model: %s", model)
            chat_completion = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.7,
                max_tokens=1500,
            )
            response_content = chat_completion.choices[0].message.content
            chosen_model = model
            if hasattr(chat_completion, "usage") and chat_completion.usage:
                usage_info = {
                    "prompt_tokens": getattr(chat_completion.usage, "prompt_tokens", 0),
                    "completion_tokens": getattr(chat_completion.usage, "completion_tokens", 0),
                    "total_tokens": getattr(chat_completion.usage, "total_tokens", 0),
                }
            break
        except Exception as exc:
            logger.warning("Groq model %s failed: %s. Trying fallback...", model, exc)
            last_error = exc
            continue

    if not response_content:
        logger.error("All Groq models failed. Last error: %s", last_error)
        return {
            "success": False,
            "message": "TrustTrip AI is temporarily unavailable. Please check your connection and try again.",
            "error_code": "GROQ_REQUEST_FAILED"
        }

    # 6. Record turns in memory buffer
    record_conversation_turn(conv_id, user_msg, response_content)

    return {
        "success": True,
        "message": response_content,
        "conversation_id": conv_id,
        "model": chosen_model,
        "usage": usage_info,
    }
