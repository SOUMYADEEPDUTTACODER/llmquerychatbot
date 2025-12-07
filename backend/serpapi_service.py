"""
serpapi_service.py
------------------
Service for searching patents using SerpAPI Google Patents API.
"""

import os
import re
import json
import logging
import requests
from typing import List, Dict, Any, Optional
from groq import Groq
from config import SERPAPI_API_KEY, GROQ_API_KEY, LLAMA_MODEL

logging.basicConfig(level=logging.INFO)

# Initialize Groq client
client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None


def search_patents(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Search patents using SerpAPI Google Patents API"""
    if not SERPAPI_API_KEY:
        logging.warning("SERPAPI_API_KEY is not configured. Please set your SerpAPI API key.")
        return []
    
    try:
        # SerpAPI Google Patents endpoint
        serpapi_url = "https://serpapi.com/search"
        
        # Ensure limit is within valid range (10-100)
        num_results = max(10, min(limit, 100))
        
        params = {
            "engine": "google_patents",
            "q": query,
            "api_key": SERPAPI_API_KEY,
            "num": num_results,
            "output": "json"
        }
        
        response = requests.get(serpapi_url, params=params, timeout=30)
        
        if response.status_code != 200:
            logging.error(f"SerpAPI request failed: {response.status_code} - {response.text[:200]}")
            return []
        
        data = response.json()
        
        # Check for errors in response
        if "error" in data:
            logging.error(f"SerpAPI error: {data.get('error', 'Unknown error')}")
            return []
        
        # Parse organic results (patents)
        organic_results = data.get("organic_results", [])
        
        if not organic_results:
            logging.info(f"No patents found for query: '{query}'")
            return []
        
        results = []
        for result in organic_results[:limit]:
            # Extract patent information from SerpAPI response
            title = result.get("title", "Untitled patent")
            link = result.get("link", "")
            
            # Extract patent number from link (usually in format like /patent/US12345678)
            patent_number = "N/A"
            if link:
                # Try to extract patent number from URL
                patent_match = re.search(r'/patent/([A-Z]{2}?\d+)', link)
                if patent_match:
                    patent_number = patent_match.group(1)
            
            # Try to get patent number from result directly if available
            if patent_number == "N/A" and "patent_id" in result:
                patent_number = result.get("patent_id", "N/A")
            
            # Extract snippet (abstract/preview)
            snippet = result.get("snippet", "No abstract provided")
            
            # Try to get full abstract if available
            if "abstract" in result:
                snippet = result.get("abstract", snippet)
            
            # Extract publication info
            publication_info = result.get("publication_info", {})
            date = "N/A"
            if isinstance(publication_info, dict):
                date = publication_info.get("publication_date", "N/A")
            elif isinstance(publication_info, str):
                date = publication_info
            
            # Try alternative date fields
            if date == "N/A":
                date = result.get("publication_date", result.get("date", "N/A"))
            
            # Extract assignee/inventor info
            assignee = "N/A"
            if "assignee" in result:
                assignee_data = result.get("assignee")
                if isinstance(assignee_data, str):
                    assignee = assignee_data
                elif isinstance(assignee_data, dict):
                    assignee = assignee_data.get("name", "N/A")
            elif "inventors" in result:
                inventors = result.get("inventors", [])
                if inventors:
                    if isinstance(inventors, list):
                        inventor_names = []
                        for inv in inventors:
                            if isinstance(inv, dict):
                                inventor_names.append(inv.get("name", ""))
                            elif isinstance(inv, str):
                                inventor_names.append(inv)
                        assignee = ", ".join([n for n in inventor_names if n])
                    elif isinstance(inventors, str):
                        assignee = inventors
            
            # Extract patent type
            patent_type = result.get("type", "N/A")
            if patent_type == "N/A":
                patent_type = result.get("patent_type", "N/A")
            
            results.append({
                "patent_number": patent_number,
                "Title": title,  # Use Title for consistency with MongoDB format
                "Abstract": snippet,
                "Year": date.split('-')[0] if date != "N/A" and '-' in date else date,
                "Date": date,
                "Inventor": assignee if assignee else "N/A",
                "Assignee": assignee if assignee else "N/A",
                "Category": patent_type,
                "Type": patent_type,
                "Link": link,
                "_source": "serpapi"  # Tag to identify source
            })
        
        logging.info(f"Successfully found {len(results)} patents using SerpAPI Google Patents")
        return results
        
    except requests.RequestException as e:
        logging.error(f"Error searching patents with SerpAPI: {str(e)}")
        return []
    except Exception as e:
        logging.error(f"Unexpected error searching patents: {str(e)}")
        import traceback
        traceback.print_exc()
        return []


def summarize_patents_with_llm(patent_data: List[Dict[str, Any]]) -> str:
    """Summarize patent data using Groq LLM"""
    if not client:
        return (
            "⚠️ AI Summary unavailable: Groq API key is not configured.\n\n"
            "To enable AI summaries:\n"
            "1. Get your API key from https://console.groq.com/\n"
            "2. Set GROQ_API_KEY in your .env file\n"
            "3. Restart the Flask server"
        )

    try:
        # Prepare the patent information for summarization
        patent_text = ""
        for idx, patent in enumerate(patent_data, 1):
            patent_text += f"\n\nPatent {idx}:\n"
            patent_text += f"Number: {patent.get('patent_number', 'N/A')}\n"
            patent_text += f"Title: {patent.get('Title', 'N/A')}\n"
            patent_text += f"Date: {patent.get('Date', 'N/A')}\n"
            patent_text += f"Assignee: {patent.get('Assignee', 'N/A')}\n"
            patent_text += f"Abstract: {patent.get('Abstract', 'N/A')}\n"

        # Create prompt for LLM
        prompt = f"""You are a patent analyst. Summarize the following patents.
For each patent, provide a clear and concise professional summary covering:
1. Overview
2. Key innovations
3. Potential applications

IMPORTANT: Return the output ONLY as a valid JSON object where keys are the patent indices (1, 2, 3...) corresponding to the list below, and values are the summary strings. Do not include markdown formatting (like ```json), explanations, or any other text.

Example format:
{{
  "1": "Summary for patent 1...",
  "2": "Summary for patent 2..."
}}

Patents to analyze:{patent_text}"""

        # Call Groq API
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a helpful patent analyst that writes concise, professional briefings. You always output valid JSON.",
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    },
                ],
                model=LLAMA_MODEL,
                temperature=0.3,
                max_tokens=2000,
            )

            content = chat_completion.choices[0].message.content
            logging.info(f"Successfully generated summary using model: {LLAMA_MODEL}")
            
            # Parse JSON response
            try:
                # Clean potential markdown formatting just in case
                clean_content = content.replace("```json", "").replace("```", "").strip()
                summaries = json.loads(clean_content)
                
                combined_summary = ""
                for idx, patent in enumerate(patent_data, 1):
                    # Get summary for this patent index (as string)
                    pat_summary = summaries.get(str(idx)) or summaries.get(idx) or "Summary not available."
                    
                    # Store individual summary in patent object
                    patent["ai_summary"] = pat_summary
                    
                    # Add to combined summary for display
                    combined_summary += f"Patent {idx} ({patent.get('patent_number', 'N/A')}):\n{pat_summary}\n\n"
                
                return combined_summary.strip()
                
            except json.JSONDecodeError:
                logging.warning(f"Failed to parse JSON summary: {content[:100]}...")
                # Fallback: Treat entire response as summary and assign to all
                for patent in patent_data:
                    patent["ai_summary"] = content
                return content

        except Exception as model_error:
            error_str = str(model_error)
            logging.error(f"Error with LLM summarization: {error_str}")
            
            if "quota" in error_str.lower() or "rate limit" in error_str.lower():
                return "⚠️ AI Summary unavailable: API quota or rate limit exceeded."
            elif "invalid" in error_str.lower() or "unauthorized" in error_str.lower():
                return "⚠️ AI Summary unavailable: Invalid API key or authentication error."
            else:
                return f"⚠️ AI Summary unavailable: {error_str[:200]}"

    except Exception as e:
        logging.error(f"Error with LLM summarization: {str(e)}")
        return f"⚠️ AI Summary unavailable: {str(e)[:200]}"

