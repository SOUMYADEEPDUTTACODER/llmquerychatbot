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
    """Use Groq LLaMA model to convert a user question into a MongoDB query that can be applied to all collections."""
    collections = get_collection_names()
    if not collections:
        raise ValueError("No collections found in database. Please import CSV data or setup sample database first.")
    
    schema_context = "\n".join(
        [f"- {c}: {list(db[c].find_one().keys()) if db[c].count_documents({}) > 0 else 'empty'}"
         for c in collections]
    )

    system_prompt = f"""
You are a MongoDB query generator. Given the database schema context below,
convert the user's natural language question into a valid MongoDB JSON query object ONLY, with no explanation.

<<<<<<< HEAD
IMPORTANT:
1. You must choose the most relevant collection from the list provided.
2. If the user's request implies searching across ALL collections (e.g., "search everywhere", "find in all files"), set "collection" to "ALL_COLLECTIONS".
3. If the user does not specify a collection, infer the best one based on the schema fields.
=======
IMPORTANT: The query should be designed to search across ALL collections in the database. 
The query filter should be generic enough to work on any collection that might contain relevant data.

Available Collections: {', '.join(collections)}
>>>>>>> 84a9cedb5de96eafc7a8358e7348dfb4a1a3545d

Database Context:
{schema_context}

Natural Language Question:
{user_question}

Output JSON format exactly (do NOT include collection field, as it will be applied to all collections):
{{
<<<<<<< HEAD
  "collection": "name_of_collection" | "ALL_COLLECTIONS",
=======
>>>>>>> 84a9cedb5de96eafc7a8358e7348dfb4a1a3545d
  "operation": "find" | "aggregate" | "count",
  "filter": {{ }},
  "projection": {{ }} (optional),
  "pipeline": [ ] (only for aggregate)
}}
"""

    response = client.chat.completions.create(
        model=LLAMA_MODEL,
        messages=[
            {"role": "system", "content": "You are a helpful MongoDB query generator that searches across all collections."},
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

<<<<<<< HEAD
    # Validate query structure
    valid_collections = get_collection_names()
    target_col = mongo_query.get("collection")
    
    if target_col != "ALL_COLLECTIONS" and target_col not in valid_collections:
        # Fallback: if LLM hallucinates a name, try to find a partial match or default to first
        # For now, just raise error or maybe pick the first one?
        # Let's be strict but helpful in error message
        raise ValueError(f"Invalid collection in query: {target_col}. Available: {valid_collections}")

=======
    # Validate query structure (no collection field needed)
>>>>>>> 84a9cedb5de96eafc7a8358e7348dfb4a1a3545d
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
<<<<<<< HEAD
    """Execute validated MongoDB query and return result."""
    target_col = query_obj["collection"]
    operation = query_obj["operation"]
    
    # --- Handle "ALL_COLLECTIONS" Strategy ---
    if target_col == "ALL_COLLECTIONS":
        all_results = []
        valid_collections = get_collection_names()
        
        for col_name in valid_collections:
            collection = db[col_name]
            try:
                if operation == "find":
                    # We limit per collection to avoid massive dumps
                    cursor = collection.find(query_obj.get("filter", {}), query_obj.get("projection")).limit(20)
                    results = list(cursor)
                    # Tag results with source collection
                    for r in results:
                        r["_source_collection"] = col_name
                    all_results.extend(results)
                    
                elif operation == "count":
                    count = collection.count_documents(query_obj.get("filter", {}))
                    all_results.append({"collection": col_name, "count": count})
                    
                elif operation == "aggregate":
                    # Aggregation might be tricky across collections if schemas differ
                    # We'll try running it and ignore failures
                    res = list(collection.aggregate(query_obj.get("pipeline", [])))
                    for r in res:
                        r["_source_collection"] = col_name
                    all_results.extend(res)
            except Exception as e:
                logging.warning(f"Query failed for collection {col_name}: {e}")
                continue
        
        # If it was a count operation, we might want to sum them up or return the breakdown
        if operation == "count":
            total = sum(item['count'] for item in all_results)
            return {"total_count": total, "breakdown": all_results}
            
        return all_results

    # --- Handle Single Collection ---
    collection = db[target_col]

    if operation == "find":
        cursor = collection.find(query_obj.get("filter", {}), query_obj.get("projection"))
        return list(cursor)
    elif operation == "count":
        return collection.count_documents(query_obj.get("filter", {}))
    elif operation == "aggregate":
        return list(collection.aggregate(query_obj.get("pipeline", [])))
    else:
        raise ValueError(f"Unsupported operation: {operation}")
=======
    """Execute validated MongoDB query across ALL collections and return combined results."""
    operation = query_obj["operation"]
    all_collections = get_collection_names()
    
    if not all_collections:
        return []
    
    combined_results = []
    
    for collection_name in all_collections:
        collection = db[collection_name]
        
        try:
            if operation == "find":
                cursor = collection.find(query_obj.get("filter", {}), query_obj.get("projection"))
                results = list(cursor)
                # Add collection name to each result
                for result in results:
                    result["_collection"] = collection_name
                combined_results.extend(results)
            elif operation == "count":
                count = collection.count_documents(query_obj.get("filter", {}))
                if count > 0:
                    combined_results.append({
                        "_collection": collection_name,
                        "count": count
                    })
            elif operation == "aggregate":
                results = list(collection.aggregate(query_obj.get("pipeline", [])))
                # Add collection name to each result
                for result in results:
                    result["_collection"] = collection_name
                combined_results.extend(results)
        except Exception as e:
            logging.warning(f"Error querying collection '{collection_name}': {e}")
            continue
    
    return combined_results
>>>>>>> 84a9cedb5de96eafc7a8358e7348dfb4a1a3545d


def answer_user_question(user_question: str) -> Dict[str, Any]:
    """Main entrypoint: handles question → query → result → log."""
    logging.info(f"🧠 Processing question: {user_question}")

    # Step 1: Generate query from LLM (for all collections)
    mongo_query = generate_mongo_query(user_question)
    logging.info(f"📝 Generated MongoDB query (for all collections): {mongo_query}")

    # Step 2: Execute safely across all collections
    result = execute_mongo_query(mongo_query)
    collections_searched = get_collection_names()
    
    # Count results per collection
    results_by_collection = {}
    if isinstance(result, list):
        for item in result:
            coll_name = item.get("_collection", "unknown")
            results_by_collection[coll_name] = results_by_collection.get(coll_name, 0) + 1
    
    logging.info(f"✅ Query executed successfully across {len(collections_searched)} collection(s). Found {len(result)} total results.")
    logging.info(f"📊 Results by collection: {results_by_collection}")

    # Step 3: Convert to JSON-safe format
    safe_result = make_json_safe(result)

    # Step 4: Log everything (add collection info to query for logging)
    query_for_log = mongo_query.copy()
    query_for_log["collections_searched"] = collections_searched
    log_interaction(user_question, query_for_log, safe_result)

    # Step 5: Create enhanced summary with collection information
    if isinstance(result, list):
        if len(result) == 0:
            summary = f"No results found across {len(collections_searched)} collection(s): {', '.join(collections_searched)}"
        else:
            collection_info = ", ".join([f"{coll}: {count}" for coll, count in results_by_collection.items()])
            summary = f"Found {len(result)} result(s) across {len(results_by_collection)} collection(s) ({collection_info}). Searched all {len(collections_searched)} collection(s): {', '.join(collections_searched)}"
    else:
        summary = summarize_result(result)
    
    # Step 6: Return clean data to frontend
    # Return all results (not just sample) since we're searching across collections
    # Limit to 100 results max for performance, but show all if less than 100
    if isinstance(safe_result, list):
        display_results = safe_result[:100] if len(safe_result) > 100 else safe_result
    else:
        display_results = safe_result
    
    return {
        "question": user_question,
        "query": mongo_query,
        "result_summary": summary,
        "result": display_results,  # Return all results (up to 100)
        "sample_result": display_results,  # Also include as sample_result for backward compatibility
        "total_results": len(safe_result) if isinstance(safe_result, list) else 1,
        "collections_searched": collections_searched,
        "results_by_collection": results_by_collection,
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
