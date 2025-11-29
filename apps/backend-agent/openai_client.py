"""OpenAI client for compliance checking"""

import sys
import os
from typing import List, Dict, Any, Tuple
from openai import OpenAI
from dotenv import load_dotenv
from datetime import datetime

# Add project root to path for shared imports
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from shared.python.models import ComplianceSuggestion

load_dotenv()

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
client = OpenAI(api_key=OPENAI_API_KEY)


class OpenAIClient:
    def __init__(self):
        """Initialize OpenAI client"""
        self.client = client

    async def check_compliance(
        self,
        transcript: str,
        kb_context: str,
        model: str = "gpt-3.5-turbo"
    ) -> Tuple[List[ComplianceSuggestion], str]:
        """
        Check compliance using OpenAI with knowledge base context
        
        Args:
            transcript: The full conversation transcript to analyze
            kb_context: Compliance rules context from Vertex AI KB
            model: OpenAI model to use
            
        Returns:
            Tuple of (list of compliance suggestions, raw LLM response)
        """
        # Build prompt
        prompt = self._build_prompt(transcript, kb_context)
        
        print(f"[OpenAI] Transcript length: {len(transcript)} characters")
        print(f"[OpenAI] KB context length: {len(kb_context)} characters")
        print(f"[OpenAI] Full prompt length: {len(prompt)} characters")
        print(f"[OpenAI] Transcript preview: {transcript[:300]}...")

        try:
            # Call OpenAI API
            # Note: For JSON mode, we need to ensure the prompt explicitly asks for JSON
            system_prompt = """You are a Compliance & Sales-Support Co-pilot for life-insurance sales calls in India.

Your role:
- Analyze conversations for compliance violations based on the IRDAI compliance rules provided from the Vertex AI Knowledge Base
- The Vertex AI Knowledge Base is your SINGLE SOURCE OF TRUTH for all compliance requirements
- Flag only actual violations happening in the current conversation
- Provide helpful suggestions to keep the conversation compliant

Output format (JSON only, no markdown):
{ "Alert": "<short violation/warning>",  
  "Information/Suggestion": "<very brief compliant phrase agent can say now>",  
  "Insight": "<optional extra disclosure or info customer should know>"  
}

If no compliance issues are detected, return: {}"""

            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=800,
                response_format={"type": "json_object"}
            )

            # Parse response
            raw_response = response.choices[0].message.content
            print(f"[OpenAI] Raw response from LLM: {raw_response[:500]}...")
            suggestions = self._parse_response(raw_response)
            print(f"[OpenAI] Parsed {len(suggestions)} suggestions")
            return (suggestions, raw_response)

        except Exception as e:
            print(f"[OpenAI] Error checking compliance: {e}")
            import traceback
            traceback.print_exc()
            error_suggestion = ComplianceSuggestion(
                type='error',
                message=f"Error checking compliance: {str(e)}",
                severity='high',
                timestamp=datetime.utcnow().isoformat()
            )
            return ([error_suggestion], f'{{"error": "{str(e)}"}}')

    def _build_prompt(self, transcript: str, kb_context: str) -> str:
        """Build OpenAI prompt with transcript and KB context"""
        return f"""Analyze this life-insurance sales conversation for compliance violations.

COMPLIANCE RULES (Source of Truth - from Vertex AI Knowledge Base):
{kb_context}

CONVERSATION TRANSCRIPT:
{transcript}

INSTRUCTIONS:
1. Review the compliance rules above - these are your source of truth
2. Analyze the conversation transcript
3. Identify if the agent is violating any of the compliance rules
4. Only flag violations that are actually happening in this conversation
5. If violations are found, provide suggestions based on the compliance rules

Return JSON format:
- If violations found: {{ "Alert": "...", "Information/Suggestion": "...", "Insight": "..." }}
- If no violations: {{}}

Return only valid JSON, no markdown."""

    def _parse_response(self, response_text: str) -> List[ComplianceSuggestion]:
        """Parse OpenAI response into ComplianceSuggestion objects"""
        import json
        import re

        try:
            # Clean response text (remove markdown code blocks if present)
            cleaned_text = response_text.strip()
            if cleaned_text.startswith('```'):
                # Remove markdown code blocks
                cleaned_text = re.sub(r'```json\s*', '', cleaned_text)
                cleaned_text = re.sub(r'```\s*', '', cleaned_text)
                cleaned_text = cleaned_text.strip()

            # Parse JSON
            response_data = json.loads(cleaned_text)
            
            suggestions = []
            timestamp = datetime.utcnow().isoformat()

            # Check if response is empty (no issues detected)
            if not response_data or (isinstance(response_data, dict) and not any(response_data.values())):
                return []  # No compliance issues detected

            # Handle new format: { "Alert", "Information/Suggestion", "Insight" }
            if isinstance(response_data, dict):
                # Single compliance issue
                alert = response_data.get('Alert', '')
                information = response_data.get('Information/Suggestion', '') or response_data.get('Information', '')
                insight = response_data.get('Insight', '')
                
                if alert or information or insight:
                    # Determine severity based on alert presence
                    severity = 'high' if alert else 'medium' if information else 'low'
                    type_val = 'warning' if alert else 'info'
                    
                    # Combine into message
                    message_parts = []
                    if alert:
                        message_parts.append(f"⚠️ {alert}")
                    if information:
                        message_parts.append(f"💡 {information}")
                    if insight:
                        message_parts.append(f"ℹ️ {insight}")
                    
                    message = " | ".join(message_parts) if message_parts else "Compliance check completed"
                    
                    suggestion = ComplianceSuggestion(
                        type=type_val,
                        message=message,
                        severity=severity,
                        timestamp=timestamp,
                        alert=alert if alert else None,
                        information=information if information else None,
                        insight=insight if insight else None,
                        recommendation=information if information else None
                    )
                    suggestions.append(suggestion)
            
            # Handle array format (legacy support)
            elif isinstance(response_data, list):
                for item in response_data:
                    suggestion = ComplianceSuggestion(
                        type=item.get('type', 'info'),
                        message=item.get('message', ''),
                        severity=item.get('severity', 'medium'),
                        timestamp=timestamp,
                        recommendation=item.get('recommendation'),
                        alert=item.get('Alert'),
                        information=item.get('Information/Suggestion') or item.get('Information'),
                        insight=item.get('Insight')
                    )
                    suggestions.append(suggestion)

            return suggestions

        except json.JSONDecodeError as e:
            print(f"[OpenAI] JSON decode error: {e}")
            print(f"[OpenAI] Response text: {response_text[:500]}")
            # Return a generic error suggestion
            return [ComplianceSuggestion(
                type='error',
                message='Unable to parse compliance suggestions. Response format error.',
                severity='medium',
                timestamp=datetime.utcnow().isoformat()
            )]
        except Exception as e:
            print(f"[OpenAI] Error parsing response: {e}")
            import traceback
            traceback.print_exc()
            # Return a generic error suggestion
            return [ComplianceSuggestion(
                type='error',
                message=f'Error parsing compliance suggestions: {str(e)}',
                severity='medium',
                timestamp=datetime.utcnow().isoformat()
            )]

