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
        Check compliance for transcript segments
        
        Args:
            transcript_segments: List of transcript segments (last 30-40 seconds)
            call_id: Call ID for context
            
        Returns:
            List of compliance suggestions
        """
        # Extract last 30-40 seconds of transcript
        transcript_text = self._extract_recent_transcript(transcript_segments)

        if not transcript_text:
            return [ComplianceSuggestion(
                type='info',
                message='No transcript available for compliance check',
                severity='low',
                timestamp=datetime.utcnow().isoformat()
            )]

        # Query Vertex AI Knowledge Base
        kb_context = self.vertex_ai_client.get_compliance_context(transcript_text)

        # Check compliance with OpenAI
        suggestions = await self.openai_client.check_compliance(
            transcript=transcript_text,
            kb_context=kb_context
        )

        return suggestions

    def _extract_recent_transcript(
        self,
        transcript_segments: List[Dict[str, Any]],
        max_seconds: int = 40
    ) -> str:
        """
        Extract last N seconds of transcript
        
        Args:
            transcript_segments: List of transcript segments
            max_seconds: Maximum seconds to extract (default 40)
            
        Returns:
            Combined transcript text
        """
        if not transcript_segments:
            return ""

        # Get current time
        now = datetime.utcnow()

        # Filter segments within last N seconds
        recent_segments = []
        for segment in reversed(transcript_segments):
            segment_time = datetime.fromisoformat(segment.get('timestamp', now.isoformat()))
            time_diff = (now - segment_time).total_seconds()

            if time_diff <= max_seconds:
                recent_segments.insert(0, segment)
            else:
                break

        # Combine text
        transcript_text = " ".join([seg.get('text', '') for seg in recent_segments])
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
        kb_context = self.vertex_ai_client.get_compliance_context(transcript_text)

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

