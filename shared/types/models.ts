// Core data models

export interface Call {
  id: string; // UUID
  startedAt: string; // ISO timestamp
  endedAt?: string; // ISO timestamp
  status: 'idle' | 'active' | 'ended' | 'error';
  createdAt: string;
  updatedAt: string;
}

export interface Transcript {
  id?: number;
  callId: string;
  text: string;
  timestamp: string; // ISO timestamp
  speaker?: 'agent' | 'customer';
  createdAt?: string;
}

export interface ComplianceSuggestion {
  type: 'warning' | 'error' | 'info' | 'success';
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  ruleId?: string;
  recommendation?: string;
}

export interface ComplianceReport {
  id?: number;
  callId: string;
  report: string; // JSON string
  issuesFound: number;
  createdAt?: string;
}

