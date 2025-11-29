"""Vertex AI RAG Corpus client - Using REST API"""

import os
import json
from typing import List, Dict, Any
from google.cloud import aiplatform
from google.oauth2 import service_account
from google.auth.transport.requests import Request
from dotenv import load_dotenv

load_dotenv()

PROJECT_ID = os.getenv('VERTEX_AI_PROJECT_ID')
LOCATION = os.getenv('VERTEX_AI_LOCATION', 'europe-west3')
RAG_CORPUS_ID = os.getenv('VERTEX_AI_RAG_CORPUS_ID')
CREDENTIALS_PATH = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')

# Initialize Vertex AI only if project ID is available
VERTEX_AI_ENABLED = bool(PROJECT_ID and RAG_CORPUS_ID)
if VERTEX_AI_ENABLED:
    try:
        aiplatform.init(project=PROJECT_ID, location=LOCATION)
        print(f"[Vertex AI] Initialized for project: {PROJECT_ID}, location: {LOCATION}")
    except Exception as e:
        print(f"[Vertex AI] Warning: Failed to initialize Vertex AI: {e}")
        VERTEX_AI_ENABLED = False
else:
    print("[Vertex AI] Warning: Vertex AI not configured. Set VERTEX_AI_PROJECT_ID and VERTEX_AI_RAG_CORPUS_ID to enable.")


class VertexAIClient:
    def __init__(self):
        """Initialize Vertex AI RAG Corpus client"""
        self.enabled = VERTEX_AI_ENABLED
        self.project_id = PROJECT_ID
        self.location = LOCATION
        self.rag_corpus_id = RAG_CORPUS_ID
        self.credentials = None
        
        if not self.enabled:
            print("[Vertex AI] Client disabled - missing configuration")
            return
        
        # Load service account credentials with proper scopes
        try:
            if CREDENTIALS_PATH and os.path.exists(CREDENTIALS_PATH):
                self.credentials = service_account.Credentials.from_service_account_file(
                    CREDENTIALS_PATH,
                    scopes=['https://www.googleapis.com/auth/cloud-platform']
                )
                print(f"[Vertex AI] Loaded credentials from: {CREDENTIALS_PATH}")
            else:
                # Fallback to default credentials
                from google.auth import default
                self.credentials, _ = default(scopes=['https://www.googleapis.com/auth/cloud-platform'])
                print("[Vertex AI] Using default credentials")
        except Exception as e:
            print(f"[Vertex AI] Error loading credentials: {e}")
            self.enabled = False
            self.credentials = None

    def query_rag_corpus(self, query_text: str, max_results: int = 5) -> List[Dict[str, Any]]:
        """
        Query Vertex AI RAG Corpus for compliance rules using the Python SDK
        
        Args:
            query_text: The transcript text to search for
            max_results: Maximum number of results to return
            
        Returns:
            List of relevant compliance rules/contexts
        """
        if not self.enabled:
            print("[Vertex AI] Query skipped - Vertex AI not enabled")
            return []
        
        if not self.credentials:
            print("[Vertex AI] Query skipped - no credentials available")
            return []
        
        print(f"[Vertex AI] Querying RAG corpus (ID: {self.rag_corpus_id}, Project: {self.project_id}, Location: {self.location})")
        print(f"[Vertex AI] Query text (first 100 chars): {query_text[:100]}...")
        
        try:
            # Use Vertex AI Python SDK (same pattern as agent.py)
            from vertexai.preview import rag
            
            # Construct corpus name in the format: projects/{project}/locations/{location}/ragCorpora/{corpus_id}
            corpus_name = f"projects/{self.project_id}/locations/{self.location}/ragCorpora/{self.rag_corpus_id}"
            
            print(f"[Vertex AI] Using corpus: {corpus_name}")
            
            # Retrieve relevant chunks from RAG corpus using retrieval_query
            response = rag.retrieval_query(
                rag_resources=[
                    rag.RagResource(
                        rag_corpus=corpus_name,
                    )
                ],
                text=query_text,
                similarity_top_k=max_results,  # Get top N most relevant results
            )
            
            # Extract contexts from response
            results = []
            if response.contexts and hasattr(response.contexts, 'contexts'):
                for ctx in response.contexts.contexts:
                    results.append({
                        'content': getattr(ctx, 'text', '') or getattr(ctx, 'content', ''),
                        'source_uri': getattr(ctx, 'source_uri', ''),
                        'distance': getattr(ctx, 'distance', 0.0)
                    })
            
            print(f"[Vertex AI] ✅ Retrieved {len(results)} compliance rules from RAG corpus using Python SDK")
            return results
            
        except ImportError as e:
            print(f"[Vertex AI] ❌ Import error: {e}")
            print(f"[Vertex AI] Make sure 'google-cloud-aiplatform' is installed with: pip install google-cloud-aiplatform")
            return []
        except Exception as e:
            print(f"[Vertex AI] ❌ Error querying RAG corpus: {e}")
            print(f"[Vertex AI] Configuration:")
            print(f"  - Project ID: {self.project_id}")
            print(f"  - Location: {self.location}")
            print(f"  - RAG Corpus ID: {self.rag_corpus_id}")
            print(f"  - Corpus Name: projects/{self.project_id}/locations/{self.location}/ragCorpora/{self.rag_corpus_id}")
            print(f"  - Credentials: {'Available' if self.credentials else 'Missing'}")
            import traceback
            traceback.print_exc()
            # Fallback: return empty results
            return []

        except ImportError:
            # Fallback: return empty results if requests not available
            print("[Vertex AI] requests library not available, using fallback")
            return []
        except Exception as e:
            print(f"[Vertex AI] Error querying RAG corpus: {e}")
            print(f"[Vertex AI] Configuration:")
            print(f"  - Project ID: {self.project_id}")
            print(f"  - Location: {self.location}")
            print(f"  - RAG Corpus ID: {self.rag_corpus_id}")
            print(f"  - Credentials: {'Available' if self.credentials else 'Missing'}")
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
            return "No specific compliance rules found for this context. Please refer to standard IRDAI compliance guidelines."
        
        context_parts = ["Relevant Compliance Rules from Knowledge Base:"]
        for i, result in enumerate(results, 1):
            content = result.get('content', '')
            # Truncate long content but keep more context
            if len(content) > 500:
                content = content[:500] + "..."
            context_parts.append(f"\n{i}. {content}")
            # Add source if available
            source_uri = result.get('source_uri', '')
            if source_uri:
                context_parts.append(f"   (Source: {source_uri})")
        
        return "\n".join(context_parts)
    
    def verify_configuration(self) -> Dict[str, Any]:
        """
        Verify Vertex AI configuration and return status
        
        Returns:
            Dictionary with configuration status
        """
        status = {
            'enabled': self.enabled,
            'project_id': self.project_id,
            'location': self.location,
            'rag_corpus_id': self.rag_corpus_id,
            'credentials_available': self.credentials is not None,
            'credentials_valid': False
        }
        
        if self.credentials:
            try:
                if not self.credentials.valid:
                    self.credentials.refresh(Request())
                status['credentials_valid'] = True
            except Exception as e:
                status['credentials_error'] = str(e)
        
        return status
