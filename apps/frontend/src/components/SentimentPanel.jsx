/** Right panel showing sentiment analysis and AI suggestions */

import { FiZap, FiFileText, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

export function SentimentPanel({ transcripts = [], suggestions = [], postCallData = null, rawLLMResponse = null, kbContext = null }) {

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-4)',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* AI Suggestions Section */}
      <div style={{
        backgroundColor: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-6)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-neutral-200)',
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-2)',
          marginBottom: 'var(--spacing-5)',
          flexShrink: 0
        }}>
          <FiZap size={24} color="#9333ea" />
          <h3 style={{
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-neutral-900)',
            margin: 0
          }}>
            AI Suggestion
          </h3>
        </div>

        {suggestions.length > 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-5)',
            flex: 1
          }}>
            {suggestions.map((suggestion, index) => {
              // Support new format: alert, information, insight
              const alert = suggestion.alert || (suggestion.message?.includes('⚠️') ? suggestion.message.split('⚠️')[1]?.split('|')[0]?.trim() : null);
              const information = suggestion.information || suggestion.recommendation || (suggestion.message?.includes('💡') ? suggestion.message.split('💡')[1]?.split('|')[0]?.trim() : null);
              const insight = suggestion.insight || (suggestion.message?.includes('ℹ️') ? suggestion.message.split('ℹ️')[1]?.trim() : null);
              
              // If message contains the formatted string, parse it
              let parsedAlert = alert;
              let parsedInformation = information;
              let parsedInsight = insight;
              
              if (suggestion.message && suggestion.message.includes('|')) {
                const parts = suggestion.message.split('|');
                parts.forEach(part => {
                  if (part.includes('⚠️')) parsedAlert = part.replace('⚠️', '').trim();
                  if (part.includes('💡')) parsedInformation = part.replace('💡', '').trim();
                  if (part.includes('ℹ️')) parsedInsight = part.replace('ℹ️', '').trim();
                });
              }
              
              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: parsedAlert ? '#fef2f2' : '#f3e8ff',
                    border: `1px solid ${parsedAlert ? '#ef4444' : '#c084fc'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--spacing-5)',
                    fontSize: 'var(--font-size-base)',
                    lineHeight: 'var(--line-height-relaxed)',
                    color: 'var(--color-neutral-900)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {parsedAlert && (
                    <div style={{
                      marginBottom: 'var(--spacing-4)',
                      padding: 'var(--spacing-4)',
                      backgroundColor: '#fee2e2',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '4px solid #ef4444'
                    }}>
                      <div style={{
                        fontWeight: 'var(--font-weight-semibold)',
                        color: '#dc2626',
                        marginBottom: 'var(--spacing-2)',
                        fontSize: 'var(--font-size-sm)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        ⚠️ Alert
                      </div>
                      <div style={{ 
                        color: '#991b1b',
                        fontSize: 'var(--font-size-base)',
                        lineHeight: '1.6'
                      }}>
                        {parsedAlert}
                      </div>
                    </div>
                  )}
                  
                  {parsedInformation && (
                    <div style={{
                      marginBottom: parsedInsight ? 'var(--spacing-4)' : 0,
                      padding: 'var(--spacing-4)',
                      backgroundColor: '#f0f9ff',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '4px solid #3b82f6'
                    }}>
                      <div style={{
                        fontWeight: 'var(--font-weight-semibold)',
                        color: '#1e40af',
                        marginBottom: 'var(--spacing-2)',
                        fontSize: 'var(--font-size-sm)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        💡 Suggestion
                      </div>
                      <div style={{ 
                        color: '#1e3a8a',
                        fontSize: 'var(--font-size-base)',
                        lineHeight: '1.6'
                      }}>
                        {parsedInformation}
                      </div>
                    </div>
                  )}
                  
                  {parsedInsight && (
                    <div style={{
                      marginTop: 'var(--spacing-4)',
                      padding: 'var(--spacing-4)',
                      backgroundColor: '#f9fafb',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '4px solid #6b7280'
                    }}>
                      <div style={{
                        fontWeight: 'var(--font-weight-semibold)',
                        color: '#374151',
                        marginBottom: 'var(--spacing-2)',
                        fontSize: 'var(--font-size-sm)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        ℹ️ Insight
                      </div>
                      <div style={{ 
                        color: '#4b5563',
                        fontSize: 'var(--font-size-base)',
                        lineHeight: '1.6'
                      }}>
                        {parsedInsight}
                      </div>
                    </div>
                  )}
                  
                  {/* Fallback: if no structured fields, show message */}
                  {!parsedAlert && !parsedInformation && !parsedInsight && (
                    <div>
                      {suggestion.message || suggestion.text || JSON.stringify(suggestion)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
            ) : (
              <div style={{
                color: 'var(--color-neutral-400)',
                fontSize: 'var(--font-size-sm)',
                fontStyle: 'italic',
                textAlign: 'center',
                padding: 'var(--spacing-4)'
              }}>
                {rawLLMResponse !== null 
                  ? 'No compliance issues detected. LLM returned empty response.' 
                  : 'No suggestions yet. AI will provide recommendations based on the conversation.'}
              </div>
            )}
      </div>

      {/* Post-Call Analysis Section */}
      {postCallData && postCallData.complianceReport && (
        <div style={{
          backgroundColor: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-4)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-neutral-200)',
          flexShrink: 0,
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
            marginBottom: 'var(--spacing-3)'
          }}>
            <FiFileText size={18} color="var(--color-primary)" />
            <h3 style={{
              fontSize: 'var(--font-size-base)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-neutral-900)',
              margin: 0
            }}>
              Post-Call Analysis
            </h3>
          </div>

          {/* Issues Summary */}
          <div style={{
            marginBottom: 'var(--spacing-2)',
            padding: 'var(--spacing-2)',
            backgroundColor: 'var(--color-neutral-50)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-neutral-600)',
              fontWeight: 'var(--font-weight-medium)'
            }}>
              Issues Found:
            </span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-2)',
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-bold)',
              color: postCallData.complianceReport.issues_found > 0 ? 'var(--color-error)' : 'var(--color-success)'
            }}>
              {postCallData.complianceReport.issues_found > 0 ? (
                <FiAlertTriangle size={18} />
              ) : (
                <FiCheckCircle size={18} />
              )}
              {postCallData.complianceReport.issues_found || 0}
            </div>
          </div>

          {/* Compliance Report Summary */}
          {postCallData.complianceReport.report && (
            <div style={{
              fontSize: 'var(--font-size-sm)',
              lineHeight: 'var(--line-height-relaxed)',
              color: 'var(--color-neutral-700)',
              padding: 'var(--spacing-3)',
              backgroundColor: 'var(--color-neutral-50)',
              borderRadius: 'var(--radius-md)',
              borderLeft: '3px solid var(--color-primary)',
              marginBottom: 'var(--spacing-3)'
            }}>
              {typeof postCallData.complianceReport.report === 'string' 
                ? postCallData.complianceReport.report
                : JSON.stringify(postCallData.complianceReport.report, null, 2)
              }
            </div>
          )}

          {/* Detailed Suggestions from Report */}
          {postCallData.complianceReport.suggestions && postCallData.complianceReport.suggestions.length > 0 && (
            <div style={{
              marginTop: 'var(--spacing-3)'
            }}>
              <div style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--spacing-2)',
                color: 'var(--color-neutral-700)'
              }}>
                Recommendations:
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-2)'
              }}>
                {postCallData.complianceReport.suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      padding: 'var(--spacing-2)',
                      backgroundColor: 'var(--color-neutral-100)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--color-neutral-700)'
                    }}
                  >
                    {suggestion.message || suggestion.text || JSON.stringify(suggestion)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

