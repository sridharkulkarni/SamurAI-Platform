// REST API request/response types

import { ComplianceSuggestion, Transcript, ComplianceReport } from './models';

export interface StartCallRequest {
  // Empty body
}

export interface StartCallResponse {
  callId: string;
  status: 'active';
  startedAt: string;
}

export interface StopCallRequest {
  callId: string;
}

export interface StopCallResponse {
  success: boolean;
  callId: string;
  endedAt: string;
}

export interface AssistRequest {
  callId: string;
  transcript?: string; // Optional: last 30-40 seconds (backend-agent will extract if not provided)
}

export interface AssistResponse {
  success: boolean;
  callId: string;
  suggestions: ComplianceSuggestion[];
  timestamp: string;
}

export interface PostCallSummaryRequest {
  callId: string;
}

export interface PostCallSummaryResponse {
  callId: string;
  transcript: Transcript[];
  complianceReport: ComplianceReport;
  issuesFound: number;
}

