// Server-Sent Events (SSE) types

export type SSEEventType = 
  | 'transcription'
  | 'compliance_suggestion'
  | 'error'
  | 'call_start'
  | 'call_end'
  | 'connection_status';

export interface SSEEvent {
  type: SSEEventType;
  data: any;
}

export interface TranscriptionEvent {
  callId: string;
  text: string;
  timestamp: string;
  speaker?: 'agent' | 'customer';
}

export interface ComplianceSuggestionEvent {
  callId: string;
  suggestions: ComplianceSuggestion[];
  timestamp: string;
}

export interface ErrorEvent {
  message: string;
  code?: string;
  callId?: string;
}

export interface CallStartEvent {
  callId: string;
  startedAt: string;
}

export interface CallEndEvent {
  callId: string;
  endedAt: string;
}

export interface ConnectionStatusEvent {
  status: 'connected' | 'disconnected' | 'reconnecting';
  timestamp: string;
}

import { ComplianceSuggestion } from './models';

