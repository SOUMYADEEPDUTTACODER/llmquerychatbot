from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import logging
import pandas as pd
import os

from database import get_database
from llm_service import answer_user_question, get_collection_names  # ✅ correct function name
from serpapi_service import search_patents, summarize_patents_with_llm
from datetime import datetime

app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app)

logging.basicConfig(level=logging.INFO)

# ------------------- ROUTES -------------------

@app.route("/")
def home():
    """Serve the main frontend page."""
    return render_template("index.html")


@app.route("/api/setup", methods=["POST"])
def setup_sample_database():
    """Create a sample collection in MongoDB for quick testing."""
    try:
        db = get_database()

        # Example data (you can modify or expand this)
        sample_data = [
            {"Title": "Membrane Filter", "Year": 1988, "Inventor": "A. Smith", "Category": "Biotech"},
            {"Title": "AI Chip", "Year": 2021, "Inventor": "J. Doe", "Category": "Electronics"},
            {"Title": "Neural Processor", "Year": 2019, "Inventor": "S. Tanaka", "Category": "AI"},
        ]

        # Create or replace a collection
        collection = db["sample_patents"]
        collection.delete_many({})
        collection.insert_many(sample_data)

        return jsonify({
            "message": "✅ Sample database 'sample_patents' setup successfully.",
            "collection": "sample_patents"
        })

    except Exception as e:
        logging.error(f"Setup database error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/import-csv", methods=["POST"])
def import_csv():
    """Import CSV data into MongoDB."""
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    try:
        df = pd.read_csv(file)
        db = get_database()
        collection_name = os.path.splitext(file.filename)[0]
        collection = db[collection_name]

        data = df.to_dict(orient="records")
        if data:
            collection.insert_many(data)

        logging.info(f"Imported {len(data)} records into collection '{collection_name}'")
        return jsonify({"message": "CSV imported successfully", "collection": collection_name})

    except Exception as e:
        logging.error(f"CSV import error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/query", methods=["POST"])
def ask():
    """Handle user natural language queries via LLM (MongoDB mode)."""
    try:
        data = request.get_json()
        question = data.get("question")
        mode = data.get("mode", "database")  # Default to database mode

        if not question:
            return jsonify({"error": "No question provided"}), 400

        logging.info(f"Received question: {question} (mode: {mode})")

        # If mode is serpapi, use SerpAPI search instead
        if mode == "serpapi":
            return jsonify({"error": "Use /api/search endpoint for SerpAPI mode"}), 400

        try:
            result = answer_user_question(question)
            result["mode"] = "database"
            return jsonify(result)
        except ValueError as e:
            # Handle case when no collections exist
            if "No collections found" in str(e):
                return jsonify({
                    "error": str(e),
                    "result": [],
                    "result_summary": "No collections found in database. Please import CSV data or setup sample database first.",
                    "collections_searched": [],
                    "mode": "database"
                }), 200  # Return 200 but with error message
            raise

    except Exception as e:
        logging.error(f"Error processing query: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/collections", methods=["GET"])
def get_collections():
    """Get list of all collections in the database."""
    try:
        collections = get_collection_names()
        db = get_database()
        
        # Get count for each collection
        collections_with_count = []
        for coll_name in collections:
            count = db[coll_name].count_documents({})
            collections_with_count.append({
                "name": coll_name,
                "count": count
            })
        
        return jsonify({
            "collections": collections_with_count
        })
    except Exception as e:
        logging.error(f"Error fetching collections: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/api/search", methods=["POST"])
def search():
    """Handle patent search requests using SerpAPI."""
    try:
        data = request.get_json()
        query = data.get("query") or data.get("question", "")
        limit = data.get("limit", 10)

        if not query:
            return jsonify({"error": "Query parameter is required"}), 400

        logging.info(f"Received SerpAPI search query: {query}")

        # Search patents using SerpAPI
        patents = search_patents(query, limit)

        if not patents:
            return jsonify({
                "patents": [],
                "summary": "No patents found for your query. Try different keywords.",
                "timestamp": datetime.now().isoformat(),
                "mode": "serpapi"
            })

        # Summarize with LLM
        summary = summarize_patents_with_llm(patents)

        # Format results similar to MongoDB format for consistency
        formatted_results = []
        for patent in patents:
            formatted_results.append({
                "Title": patent.get("Title", "N/A"),
                "Abstract": patent.get("Abstract", "N/A"),
                "Year": patent.get("Year", "N/A"),
                "Date": patent.get("Date", "N/A"),
                "Inventor": patent.get("Inventor", "N/A"),
                "Assignee": patent.get("Assignee", "N/A"),
                "Category": patent.get("Category", "N/A"),
                "patent_number": patent.get("patent_number", "N/A"),
                "Link": patent.get("Link", ""),
                "ai_summary": patent.get("ai_summary", ""),
                "_source": "serpapi",
                "_collection": "serpapi_search"
            })

        return jsonify({
            "question": query,
            "patents": formatted_results,
            "summary": summary,
            "result_summary": f"Found {len(formatted_results)} patents from SerpAPI",
            "sample_result": formatted_results,
            "result": formatted_results,
            "total_results": len(formatted_results),
            "collections_searched": ["serpapi_search"],
            "timestamp": datetime.now().isoformat(),
            "mode": "serpapi"
        })

    except Exception as e:
        logging.error(f"Error processing SerpAPI search: {e}")
        return jsonify({"error": str(e)}), 500


# ------------------- MAIN -------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)
