/** Professional post-call summary component */

import { FiFileText, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import { TranscriptionDisplay } from './TranscriptionDisplay';
import { ComplianceSuggestions } from './ComplianceSuggestions';

export function PostCallSummary({ 
  callId, 
  transcripts = [], 
  complianceReport = null 
}) {
  const issuesFound = complianceReport?.issues_found || 0;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-6)'
    }}>
      {/* Header */}
      <div className="card">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-3)',
          marginBottom: 'var(--spacing-4)'
        }}>
          <FiFileText size={24} style={{ color: 'var(--color-primary)' }} />
          <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)' }}>
            Post-Call Summary
          </h2>
        </div>
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-4)',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-600)' }}>
              Call ID
            </div>
            <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: 'var(--font-size-sm)' }}>
              {callId}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-600)' }}>
              Issues Found
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-2)',
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-bold)',
              color: issuesFound > 0 ? 'var(--color-error)' : 'var(--color-success)'
            }}>
              {issuesFound > 0 ? <FiAlertTriangle size={20} /> : <FiCheckCircle size={20} />}
              {issuesFound}
            </div>
          </div>
        </div>
      </div>

      {/* Transcript */}
      <div className="card">
        <h3 style={{
          fontSize: 'var(--font-size-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: 'var(--spacing-4)'
        }}>
          Full Transcript
        </h3>
        <TranscriptionDisplay transcripts={transcripts} />
      </div>

      {/* Compliance Report */}
      {complianceReport && (
        <div className="card">
          <h3 style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--spacing-4)'
          }}>
            Compliance Report
          </h3>
          <ComplianceSuggestions suggestions={complianceReport.suggestions || []} />
        </div>
      )}
    </div>
  );
}

