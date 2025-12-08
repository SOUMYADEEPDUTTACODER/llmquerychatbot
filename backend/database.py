"""
database.py
------------
Handles MongoDB connection setup using environment variables
from config.py. Ensures a single global client connection and
graceful error handling for production.
"""

import pymongo
from pymongo.errors import ConnectionFailure, ConfigurationError
from config import MONGO_URI, MONGO_DB
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)

# Global client instance
mongo_client = None
db_instance = None


def get_database():
    """
    Returns the MongoDB database instance.
    Creates connection if not already established.
    """
    global mongo_client, db_instance

    if mongo_client is not None and db_instance is not None:
        return db_instance

    try:
        logging.info("🔗 Connecting to MongoDB...")
        mongo_client = pymongo.MongoClient(
            MONGO_URI,
            serverSelectionTimeoutMS=5050,  # 5 seconds timeout
        )

        # Check connection
        mongo_client.admin.command("ping")
        db_instance = mongo_client[MONGO_DB]

        logging.info(f"✅ Connected to MongoDB database: {MONGO_DB}")
        return db_instance

    except (ConnectionFailure, ConfigurationError) as e:
        logging.error("❌ MongoDB connection failed: %s", str(e))
        raise RuntimeError("Database connection failed") from e


def close_connection():
    """
    Closes the MongoDB connection (optional for cleanup).
    """
    global mongo_client
    if mongo_client is not None:
        mongo_client.close()
        logging.info("🔒 MongoDB connection closed.")


# Initialize automatically
try:
    get_database()
except Exception as e:
    logging.error("⚠️ Could not initialize MongoDB: %s", e)
