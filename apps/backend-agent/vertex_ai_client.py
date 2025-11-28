"""Vertex AI RAG Corpus client - Using REST API"""

import os
import json
from typing import List, Dict, Any
from google.cloud import aiplatform
from google.auth import default
from google.auth.transport.requests import Request
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv('VERTEX_AI_PROJECT_ID')
LOCATION = os.getenv('VERTEX_AI_LOCATION', 'europe-west3')
RAG_CORPUS_ID = os.getenv('VERTEX_AI_RAG_CORPUS_ID')

# Initialize Vertex AI
aiplatform.init(project=PROJECT_ID, location=LOCATION)


class VertexAIClient:
    def __init__(self):
        """Initialize Vertex AI RAG Corpus client"""
        self.project_id = PROJECT_ID
        self.location = LOCATION
        self.rag_corpus_id = RAG_CORPUS_ID
        self.credentials, _ = default()

    def query_rag_corpus(self, query_text: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """
        Query Vertex AI RAG Corpus for compliance rules using REST API
        
        Args:
            query_text: The transcript text to search for
            max_results: Maximum number of results to return
            
        Returns:
            List of relevant compliance rules/contexts
        """
        try:
            # Use Vertex AI REST API for RAG retrieval
            # The API endpoint for retrieving contexts from RAG corpus
            import requests
            
            # Get access token
            self.credentials.refresh(Request())
            access_token = self.credentials.token
            
            # RAG API endpoint
            url = f"https://{self.location}-aiplatform.googleapis.com/v1/projects/{self.project_id}/locations/{self.location}/ragCorpora/{self.rag_corpus_id}:retrieveContexts"
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "queries": [
                    {
                        "text": query_text,
                        "max_results": max_results
                    }
                ]
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            # Extract contexts from response
            results = []
            if 'contexts' in data:
                for context in data['contexts']:
                    results.append({
                        'content': context.get('text', ''),
                        'source_uri': context.get('source_uri', ''),
                        'distance': context.get('distance', 0.0)
                    })
            
            return results

        except ImportError:
            # Fallback: return empty results if requests not available
            print("[Vertex AI] requests library not available, using fallback")
            return []
        except Exception as e:
            print(f"[Vertex AI] Error querying RAG corpus: {e}")
            import traceback
            traceback.print_exc()
            # Fallback: return empty results
            return []

    def get_compliance_context(self, transcript_text: str) -> str:
        """
        Get compliance context from RAG corpus for OpenAI prompt
        
        Args:
            transcript_text: The transcript text to analyze
            
        Returns:
            Formatted compliance context string
        """
        results = self.query_rag_corpus(transcript_text, max_results=5)
        
        if not results:
            return "No specific compliance rules found for this context."
        
        context_parts = ["Relevant Compliance Rules:"]
        for i, result in enumerate(results, 1):
            content = result.get('content', '')
            # Truncate long content
            if len(content) > 300:
                content = content[:300] + "..."
            context_parts.append(f"\n{i}. {content}")
        
        return "\n".join(context_parts)
