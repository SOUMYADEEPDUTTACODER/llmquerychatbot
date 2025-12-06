"""
llm_service.py
---------------
Natural language to MongoDB query generator using Groq LLaMA model.
Executes queries safely, converts results to JSON-safe format,
and logs question/query/result into CSV.
"""

import os
import json
import csv
import datetime
import logging
from typing import Any, Dict, List

from groq import Groq
from bson import ObjectId

from config import GROQ_API_KEY, LLAMA_MODEL, LOG_CSV_PATH
from database import get_database

# ---------------------- CONFIG ------------------------
os.makedirs(os.path.dirname(LOG_CSV_PATH), exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s"
)

# Initialize Groq client
client = Groq(api_key=GROQ_API_KEY)

# Get MongoDB connection
db = get_database()

# ---------------------- UTILITIES ------------------------

def make_json_safe(data):
    """Recursively convert ObjectId and other non-JSON types."""
    if isinstance(data, list):
        return [make_json_safe(i) for i in data]
    elif isinstance(data, dict):
        return {k: make_json_safe(v) for k, v in data.items()}
    elif isinstance(data, ObjectId):
        return str(data)
    else:
        return data


def get_collection_names() -> List[str]:
    """Return list of valid collection names in the current DB."""
    return db.list_collection_names()


def summarize_result(result: Any, max_items: int = 3) -> str:
    """Return a concise summary of query result for CSV logging."""
    if isinstance(result, list):
        return f"{len(result)} documents (showing {min(len(result), max_items)})"
    elif isinstance(result, dict):
        return f"Single document with {len(result.keys())} fields"
    else:
        return str(result)


def log_interaction(question: str, query_obj: dict, result: Any, csv_path=LOG_CSV_PATH):
    """Log user interaction (question, query, result) into CSV."""
    os.makedirs(os.path.dirname(csv_path), exist_ok=True)
    safe_result = make_json_safe(result)

    row = {
        'timestamp': datetime.datetime.utcnow().isoformat(),
        'question': question,
        'mongo_query': json.dumps(query_obj, ensure_ascii=False),
        'result_summary': summarize_result(result),
        'full_result': json.dumps(safe_result, ensure_ascii=False)
    }

    file_exists = os.path.isfile(csv_path)
    with open(csv_path, 'a', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=row.keys())
        if not file_exists:
            writer.writeheader()
        writer.writerow(row)
    logging.info("🧾 Logged interaction to CSV.")


# ---------------------- CORE LLM HANDLER ------------------------

def generate_mongo_query(user_question: str) -> Dict[str, Any]:
    """Use Groq LLaMA model to convert a user question into a MongoDB query."""
    schema_context = "\n".join(
        [f"- {c}: {list(db[c].find_one().keys()) if db[c].count_documents({}) > 0 else 'empty'}"
         for c in get_collection_names()]
    )

    system_prompt = f"""
You are a MongoDB query generator. Given the database schema context below,
convert the user's natural language question into a valid MongoDB JSON query object ONLY, with no explanation.

You may assume the user only needs to query a single collection.

Database Context:
{schema_context}

Natural Language Question:
{user_question}

Output JSON format exactly:
{{
  "collection": "name_of_collection",
  "operation": "find" | "aggregate" | "count",
  "filter": {{ }},
  "projection": {{ }} (optional),
  "pipeline": [ ] (only for aggregate)
}}
"""

    response = client.chat.completions.create(
        model=LLAMA_MODEL,
        messages=[
            {"role": "system", "content": "You are a helpful MongoDB query generator."},
            {"role": "user", "content": system_prompt},
        ],
        temperature=0.2,
        max_tokens=500,
    )

    raw_output = response.choices[0].message.content.strip()

    # Parse JSON safely
    try:
        mongo_query = json.loads(raw_output)
    except json.JSONDecodeError:
        raise ValueError(f"❌ LLM returned invalid JSON: {raw_output}")

    # Validate query structure
    valid_collections = get_collection_names()
    if mongo_query.get("collection") not in valid_collections:
        raise ValueError(f"Invalid collection in query: {mongo_query.get('collection')}")
    if mongo_query.get("operation") not in {"find", "count", "aggregate"}:
        raise ValueError(f"Invalid operation: {mongo_query.get('operation')}")

    # Validate structure based on operation
    if mongo_query["operation"] in {"find", "count"}:
        if not isinstance(mongo_query.get("filter"), dict):
            raise ValueError("Filter must be a JSON object for find/count.")
    elif mongo_query["operation"] == "aggregate":
        if not isinstance(mongo_query.get("pipeline"), list):
            raise ValueError("Pipeline must be a list for aggregate.")

    return mongo_query


def execute_mongo_query(query_obj: Dict[str, Any]):
    """Execute validated MongoDB query and return result."""
    collection = db[query_obj["collection"]]
    operation = query_obj["operation"]

    if operation == "find":
        cursor = collection.find(query_obj.get("filter", {}), query_obj.get("projection"))
        return list(cursor)
    elif operation == "count":
        return collection.count_documents(query_obj.get("filter", {}))
    elif operation == "aggregate":
        return list(collection.aggregate(query_obj.get("pipeline", [])))
    else:
        raise ValueError(f"Unsupported operation: {operation}")


def answer_user_question(user_question: str) -> Dict[str, Any]:
    """Main entrypoint: handles question → query → result → log."""
    logging.info(f"🧠 Processing question: {user_question}")

    # Step 1: Generate query from LLM
    mongo_query = generate_mongo_query(user_question)
    logging.info(f"📝 Generated MongoDB query: {mongo_query}")

    # Step 2: Execute safely
    result = execute_mongo_query(mongo_query)
    logging.info(f"✅ Query executed successfully.")

    # Step 3: Convert to JSON-safe format
    safe_result = make_json_safe(result)

    # Step 4: Log everything
    log_interaction(user_question, mongo_query, safe_result)

    # Step 5: Return clean data to frontend
    return {
        "question": user_question,
        "query": mongo_query,
        "result_summary": summarize_result(result),
        "sample_result": safe_result[:3] if isinstance(safe_result, list) else safe_result,
    }


# ---------------------- CLI TEST MODE ------------------------

if __name__ == "__main__":
    print("🔹 Welcome to the MongoDB LLM Query Assistant 🔹")
    while True:
        q = input("\nAsk your question (or 'exit'): ").strip()
        if q.lower() in {"exit", "quit"}:
            break
        try:
            answer = answer_user_question(q)
            print("\n=== Result Summary ===")
            print(json.dumps(answer, indent=2, ensure_ascii=False))
        except Exception as e:
            print(f"❌ Error: {e}")
