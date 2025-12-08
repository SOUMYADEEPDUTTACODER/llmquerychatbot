from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import logging
import pandas as pd
import os

from database import get_database
from llm_service import answer_user_question  # ✅ correct function name

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
    """Handle user natural language queries via LLM."""
    try:
        data = request.get_json()
        question = data.get("question")

        if not question:
            return jsonify({"error": "No question provided"}), 400

        logging.info(f"Received question: {question}")

        result = answer_user_question(question)

        return jsonify(result)

    except Exception as e:
        logging.error(f"Error processing query: {e}")
        return jsonify({"error": str(e)}), 500


# ------------------- MAIN -------------------

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5050, debug=True)
