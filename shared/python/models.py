"""Pydantic models for backend-agent"""

from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, Field


class Call(BaseModel):
    id: str  # UUID
    started_at: str  # ISO timestamp
    ended_at: Optional[str] = None  # ISO timestamp
    status: Literal['idle', 'active', 'ended', 'error'] = 'idle'
    created_at: str
    updated_at: str


class Transcript(BaseModel):
    id: Optional[int] = None
    call_id: str
    text: str
    timestamp: str  # ISO timestamp
    speaker: Optional[Literal['agent', 'customer']] = None
    created_at: Optional[str] = None


class ComplianceSuggestion(BaseModel):
    type: Literal['warning', 'error', 'info', 'success'] = 'info'
    message: str
    severity: Literal['low', 'medium', 'high'] = 'medium'
    timestamp: str
    rule_id: Optional[str] = None
    recommendation: Optional[str] = None
    # New fields for life-insurance compliance format
    alert: Optional[str] = None  # Short violation/warning
    information: Optional[str] = None  # Compliant phrase agent can say
    insight: Optional[str] = None  # Extra disclosure or info customer should know


class ComplianceReport(BaseModel):
    id: Optional[int] = None
    call_id: str
    report: str  # JSON string
    issues_found: int = 0
    created_at: Optional[str] = None

