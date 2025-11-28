"""WebSocket message models for backend-agent"""

from typing import Optional, List, Literal, Any, Union
from pydantic import BaseModel
from shared.python.models import ComplianceSuggestion


class WebSocketMessage(BaseModel):
    type: Literal[
        'audio',
        'transcription',
        'assist_request',
        'assist_response',
        'error',
        'call_start',
        'call_end',
        'connection_status'
    ]
    callId: str
    timestamp: int
    data: Any


class TranscriptionMessage(BaseModel):
    text: str
    speaker: Optional[Literal['agent', 'customer']] = None
    isFinal: Optional[bool] = False


class AssistRequestMessage(BaseModel):
    transcript: Optional[str] = None  # Last 30-40 seconds (optional)


class AssistResponseMessage(BaseModel):
    suggestions: List[ComplianceSuggestion]
    processingTime: Optional[float] = None


class ErrorMessage(BaseModel):
    message: str
    code: Optional[str] = None
    details: Optional[Any] = None


class CallStartMessage(BaseModel):
    callId: str


class CallEndMessage(BaseModel):
    callId: str

