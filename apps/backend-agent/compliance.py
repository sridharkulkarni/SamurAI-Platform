"""Compliance checking logic"""

import sys
import os
from typing import List, Dict, Any
from datetime import datetime

# Add project root to path for shared imports
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from shared.python.models import ComplianceSuggestion
from vertex_ai_client import VertexAIClient
from openai_client import OpenAIClient


class ComplianceChecker:
    def __init__(self):
        """Initialize compliance checker"""
        self.vertex_ai_client = VertexAIClient()
        self.openai_client = OpenAIClient()

    async def check_compliance(
        self,
        transcript_segments: List[Dict[str, Any]],
        call_id: str
    ) -> List[ComplianceSuggestion]:
        """
        Check compliance for full conversation transcript
        
        Args:
            transcript_segments: List of all transcript segments (full conversation)
            call_id: Call ID for context
            
        Returns:
            List of compliance suggestions
        """
        # Format full conversation transcript with speaker labels
        transcript_text = self._format_full_transcript(transcript_segments)

        print(f"[Compliance] Transcript segments received: {len(transcript_segments)}")
        print(f"[Compliance] Formatted transcript length: {len(transcript_text)} characters")
        print(f"[Compliance] Transcript preview (first 500 chars): {transcript_text[:500]}...")

        if not transcript_text:
            return [ComplianceSuggestion(
                type='info',
                message='No transcript available for compliance check',
                severity='low',
                timestamp=datetime.utcnow().isoformat()
            )]

        # Query Vertex AI Knowledge Base for compliance rules
        try:
            kb_context = self.vertex_ai_client.get_compliance_context(transcript_text)
            print(f"[Compliance] Retrieved compliance context from Vertex AI (length: {len(kb_context)})")
            print(f"[Compliance] KB context preview (first 300 chars): {kb_context[:300]}...")
        except Exception as e:
            print(f"[Compliance] Error retrieving Vertex AI context: {e}")
            # Fallback to empty context if Vertex AI fails
            kb_context = "No compliance rules available (Vertex AI query failed)"

        # Check compliance with OpenAI
        suggestions = await self.openai_client.check_compliance(
            transcript=transcript_text,
            kb_context=kb_context
        )

        return suggestions

    def _format_full_transcript(
        self,
        transcript_segments: List[Dict[str, Any]]
    ) -> str:
        """
        Format full conversation transcript with speaker labels
        
        Args:
            transcript_segments: List of all transcript segments
            
        Returns:
            Formatted transcript text with speaker labels
        """
        if not transcript_segments:
            return ""

        # Format each segment with speaker label
        formatted_segments = []
        for segment in transcript_segments:
            speaker = segment.get('speaker', 'unknown')
            text = segment.get('text', '').strip()
            if text:
                # Format as "Agent: ..." or "Customer: ..."
                speaker_label = "Agent" if speaker == "agent" else "Customer" if speaker == "customer" else "Unknown"
                formatted_segments.append(f"{speaker_label}: {text}")

        # Combine with line breaks for readability
        transcript_text = "\n".join(formatted_segments)
        return transcript_text.strip()

    async def generate_post_call_report(
        self,
        full_transcript: List[Dict[str, Any]],
        call_id: str
    ) -> Dict[str, Any]:
        """
        Generate post-call compliance report
        
        Args:
            full_transcript: Complete transcript for the call
            call_id: Call ID
            
        Returns:
            Compliance report dictionary
        """
        # Combine full transcript
        transcript_text = " ".join([seg.get('text', '') for seg in full_transcript])

        if not transcript_text:
            return {
                'report': 'No transcript available',
                'issues_found': 0,
                'suggestions': []
            }

        # Query Vertex AI KB for full context
        try:
            kb_context = self.vertex_ai_client.get_compliance_context(transcript_text)
            print(f"[Compliance] Retrieved compliance context from Vertex AI for post-call report (length: {len(kb_context)})")
        except Exception as e:
            print(f"[Compliance] Error retrieving Vertex AI context for post-call report: {e}")
            # Fallback to empty context if Vertex AI fails
            kb_context = "No compliance rules available (Vertex AI query failed)"

        # Check compliance for full transcript
        suggestions = await self.openai_client.check_compliance(
            transcript=transcript_text,
            kb_context=kb_context
        )

        # Count issues by severity
        issues_found = len([s for s in suggestions if s.severity in ['medium', 'high']])

        return {
            'report': {
                'call_id': call_id,
                'transcript_length': len(transcript_text),
                'suggestions': [s.dict() for s in suggestions],
                'issues_found': issues_found,
                'generated_at': datetime.utcnow().isoformat()
            },
            'issues_found': issues_found,
            'suggestions': suggestions
        }

