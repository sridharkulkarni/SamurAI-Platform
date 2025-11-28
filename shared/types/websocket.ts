// WebSocket message types (Backend ↔ Backend-Agent)

export type WebSocketMessageType =
  | 'audio'
  | 'transcription'
  | 'assist_request'
  | 'assist_response'
  | 'error'
  | 'call_start'
  | 'call_end'
  | 'connection_status';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  callId: string;
  timestamp: number;
  data: any;
}

export interface AudioMessage {
  audio: ArrayBuffer | Buffer; // Binary audio data (16-bit PCM, 44.1kHz)
}

export interface TranscriptionMessage {
  text: string;
  speaker?: 'agent' | 'customer';
  isFinal?: boolean;
}

export interface AssistRequestMessage {
  transcript?: string; // Last 30-40 seconds (optional, backend-agent will extract if not provided)
}

export interface AssistResponseMessage {
  suggestions: ComplianceSuggestion[];
  processingTime?: number;
}

export interface ErrorMessage {
  message: string;
  code?: string;
  details?: any;
}

export interface CallStartMessage {
  callId: string;
}

export interface CallEndMessage {
  callId: string;
}

import { ComplianceSuggestion } from './models';

