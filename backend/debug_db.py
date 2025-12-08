
import os
from dotenv import load_dotenv
import pymongo
import sys

# Load env
load_dotenv(override=True)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB = os.getenv("MONGO_DB", "llm_chatbot_db")

print(f"Connecting to {MONGO_URI}, DB: {MONGO_DB}")

try:
    client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    client.admin.command("ping")
    print("✅ Connected to MongoDB")
    
    db = client[MONGO_DB]
    collections = db.list_collection_names()
    print(f"Collections found: {collections}")
    
    if not collections:
        print("❌ No collections found in the database.")
    
    for col_name in collections:
        count = db[col_name].count_documents({})
        print(f" - Collection '{col_name}': {count} documents")
        if count > 0:
            one_doc = db[col_name].find_one()
            print(f"   Sample keys: {list(one_doc.keys())}")
        else:
            print("   (Empty collection)")

except Exception as e:
    print(f"❌ Error: {e}")
