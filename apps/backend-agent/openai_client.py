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
            transcript: The full conversation transcript to analyze
            kb_context: Compliance rules context from Vertex AI KB
            model: OpenAI model to use
            
        Returns:
            List of compliance suggestions
        """
        # Build prompt
        prompt = self._build_prompt(transcript, kb_context)

        try:
            # Call OpenAI API
            # Note: For JSON mode, we need to ensure the prompt explicitly asks for JSON
            system_prompt = """You are a smart real-time Compliance & Sales-Support Co-pilot for life-insurance sales calls in India.  
You monitor the live conversation between the agent and the customer.  
You have access to: (a) IRDAI compliance rule-book + product metadata, (b) the policy's product details.

Your objective:  
- Detect when a mandatory disclosure/rule might be ignored or misrepresented → give an alert or nudge.  
- Suggest clear, compliant phrases for the agent to use to help complete the sale without breaking compliance.  
- When no risk is detected, return an empty JSON object {}.

On a compliance issue, output in this exact JSON format (no markdown, no code blocks):

{ "Alert": "<short violation/warning>",  
  "Information/Suggestion": "<very brief compliant phrase agent can say now>",  
  "Insight": "<optional extra disclosure or info customer should know>"  
}

### Key checks & disclosure triggers depending on policy type:
- If non-term life: confirm Benefit Illustration will be / has been shared before collecting premium.
- Confirm that CIS (with sum assured, benefits, exclusions, exit/surrender rules, free-look etc.) is or will be provided.
- For linked/savings-linked/ULIP: clearly distinguish between guaranteed and non-guaranteed benefits; clarify variability.
- If surrender value/exit/lock-in applies: ensure mention of GSV/SSV/exit charges as per rules.
- Avoid using words like "fixed returns," "guaranteed high returns" if not true.

Return only valid JSON object. If no issues, return {}."""

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
            suggestions = self._parse_response(response.choices[0].message.content)
            return suggestions

        except Exception as e:
            print(f"[OpenAI] Error checking compliance: {e}")
            import traceback
            traceback.print_exc()
            return [ComplianceSuggestion(
                type='error',
                message=f"Error checking compliance: {str(e)}",
                severity='high',
                timestamp=datetime.utcnow().isoformat()
            )]

    def _build_prompt(self, transcript: str, kb_context: str) -> str:
        """Build OpenAI prompt with transcript and KB context"""
        return f"""Analyze the following life-insurance sales conversation transcript for IRDAI compliance issues.

Compliance Rules & Product Metadata:
{kb_context}

Conversation Transcript:
{transcript}

Analyze this conversation and check for:
- Missing mandatory disclosures (Benefit Illustration, CIS, free-look period, etc.)
- Misrepresentation of guaranteed vs non-guaranteed benefits
- Incorrect use of terms like "fixed returns" or "guaranteed high returns"
- Missing information about surrender values, exit charges, lock-in periods
- Any other IRDAI compliance violations

If you detect a compliance issue, return a JSON object with this structure:
{{
  "Alert": "<short violation/warning>",
  "Information/Suggestion": "<very brief compliant phrase agent can say now>",
  "Insight": "<optional extra disclosure or info customer should know>"
}}

If no compliance issues are detected, return:
{{}}

Return only valid JSON. Do not include markdown formatting."""

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

