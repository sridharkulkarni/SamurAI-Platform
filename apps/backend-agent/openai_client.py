"""OpenAI client for compliance checking"""

import sys
import os
from typing import List, Dict, Any
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
    ) -> List[ComplianceSuggestion]:
        """
        Check compliance using OpenAI with knowledge base context
        
        Args:
            transcript: The transcript text to analyze (last 30-40 seconds)
            kb_context: Compliance rules context from Vertex AI KB
            model: OpenAI model to use
            
        Returns:
            List of compliance suggestions
        """
        # Build prompt
        prompt = self._build_prompt(transcript, kb_context)

        try:
            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a compliance assistant for customer support agents. Analyze the conversation transcript and provide compliance suggestions based on the provided compliance rules. Identify any potential issues, misstatements, or areas where the agent should be more careful."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=500
            )

            # Parse response
            suggestions = self._parse_response(response.choices[0].message.content)
            return suggestions

        except Exception as e:
            print(f"[OpenAI] Error checking compliance: {e}")
            return [ComplianceSuggestion(
                type='error',
                message=f"Error checking compliance: {str(e)}",
                severity='high',
                timestamp=datetime.utcnow().isoformat()
            )]

    def _build_prompt(self, transcript: str, kb_context: str) -> str:
        """Build OpenAI prompt with transcript and KB context"""
        return f"""Analyze the following customer support conversation transcript for compliance issues.

{kb_context}

Conversation Transcript:
{transcript}

Please provide compliance suggestions in the following JSON format:
[
  {{
    "type": "warning|error|info|success",
    "message": "Description of the compliance issue or suggestion",
    "severity": "low|medium|high",
    "recommendation": "Specific recommendation for the agent"
  }}
]

Focus on:
- Accuracy of information provided
- Compliance with regulations and policies
- Potential misstatements or misleading claims
- Areas where the agent should be more careful
- Best practices for customer support

Return only valid JSON array."""

    def _parse_response(self, response_text: str) -> List[ComplianceSuggestion]:
        """Parse OpenAI response into ComplianceSuggestion objects"""
        import json
        import re

        try:
            # Try to extract JSON from response
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                suggestions_data = json.loads(json_str)
            else:
                # Fallback: try parsing entire response
                suggestions_data = json.loads(response_text)

            suggestions = []
            timestamp = datetime.utcnow().isoformat()

            for item in suggestions_data:
                suggestion = ComplianceSuggestion(
                    type=item.get('type', 'info'),
                    message=item.get('message', ''),
                    severity=item.get('severity', 'medium'),
                    timestamp=timestamp,
                    recommendation=item.get('recommendation')
                )
                suggestions.append(suggestion)

            return suggestions

        except Exception as e:
            print(f"[OpenAI] Error parsing response: {e}")
            # Return a generic error suggestion
            return [ComplianceSuggestion(
                type='error',
                message='Unable to parse compliance suggestions',
                severity='medium',
                timestamp=datetime.utcnow().isoformat()
            )]

