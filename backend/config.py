import os
from dotenv import load_dotenv

# ---------------------------------------------------------
# Load environment variables safely
# ---------------------------------------------------------
base_dir = os.path.abspath(os.path.dirname(__file__))
env_path = os.path.join(base_dir, '.env')

# Force override system variables with .env
load_dotenv(env_path, override=True)

# ---------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------
def safe_key(api_key: str) -> str:
    """Return a partially masked API key for logging."""
    if not api_key:
        return "NOT SET"
    if len(api_key) < 8:
        return "******"
    return api_key[:4] + "..." + api_key[-4:]

# ---------------------------------------------------------
# MongoDB Configuration
# ---------------------------------------------------------
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "llm_chatbot_db")

# ---------------------------------------------------------
# Groq LLM Configuration
# ---------------------------------------------------------
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SERPAPI_API_KEY = os.getenv("SERPAPI_API_KEY")

# ✅ Use base Groq endpoint — don't duplicate /openai/v1
GROQ_BASE_URL = os.getenv("GROQ_BASE_URL", "https://api.groq.com")

# Recommended model options:
#   - llama-3.1-70b-versatile (best for reasoning)
#   - llama-3.1-8b-instant (fast and cheaper)
LLAMA_MODEL = os.getenv("LLAMA_MODEL", "llama-3.1-8b-instant")

# ---------------------------------------------------------
# Flask Configuration
# ---------------------------------------------------------
FLASK_ENV = os.getenv("FLASK_ENV", "development")
FLASK_DEBUG = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "yes")
PORT = int(os.getenv("PORT", 5000))

# ---------------------------------------------------------
# CSV Logging Configuration
# ---------------------------------------------------------
LOG_CSV_PATH = os.getenv("LOG_CSV_PATH", os.path.join(base_dir, "csv", "llm_logs.csv"))

# ---------------------------------------------------------
# Validation
# ---------------------------------------------------------
if not GROQ_API_KEY:
    print("⚠️ WARNING: Missing GROQ_API_KEY in .env file!")

# ---------------------------------------------------------
# Startup summary for visibility
# ---------------------------------------------------------
print("✅ Loaded configuration:")
print(f" - MongoDB URI: {MONGO_URI}")
print(f" - Database: {MONGO_DB}")
print(f" - LLM Model: {LLAMA_MODEL}")
print(f" - Groq Key: {safe_key(GROQ_API_KEY)}")
print(f" - SerpAPI Key: {safe_key(SERPAPI_API_KEY)}")
print(f" - Log CSV Path: {LOG_CSV_PATH}")
