/** Right panel showing sentiment analysis and AI suggestions */

import { useMemo } from 'react';
import { FiZap, FiTrendingUp, FiTrendingDown, FiMinus, FiFileText, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

export function SentimentPanel({ transcripts = [], suggestions = [], postCallData = null }) {
  // Calculate sentiment from transcripts (simplified - in real app, this would come from backend)
  const sentimentData = useMemo(() => {
    // Simple sentiment calculation based on keywords (placeholder)
    // In production, this would come from the backend/ML model
    const customerTranscripts = transcripts.filter(t => t.speaker === 'customer');
    const text = customerTranscripts.map(t => t.text).join(' ').toLowerCase();
    
    const negativeKeywords = ['problem', 'issue', 'error', 'wrong', 'bad', 'not working', 'broken', 'frustrated', 'angry'];
    const positiveKeywords = ['thanks', 'thank you', 'good', 'great', 'excellent', 'happy', 'satisfied', 'perfect'];
    
    let negative = 0;
    let positive = 0;
    let neutral = 0;
    
    negativeKeywords.forEach(keyword => {
      if (text.includes(keyword)) negative++;
    });
    
    positiveKeywords.forEach(keyword => {
      if (text.includes(keyword)) positive++;
    });
    
    const total = negative + positive;
    if (total === 0) {
      neutral = 100;
    } else {
      negative = Math.round((negative / total) * 100);
      positive = Math.round((positive / total) * 100);
      neutral = 100 - negative - positive;
    }
    
    return { negative, neutral, positive };
  }, [transcripts]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--spacing-6)',
      height: '100%',
      overflowY: 'auto'
    }}>
      {/* Customer Sentiment Section */}
      <div style={{
        backgroundColor: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-5)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-neutral-200)'
      }}>
        <h3 style={{
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: 'var(--spacing-4)',
          color: 'var(--color-neutral-900)'
        }}>
          Customer Sentiment
        </h3>
        
        {/* Sentiment Icons */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginBottom: 'var(--spacing-4)'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
            opacity: sentimentData.negative > 20 ? 1 : 0.4
          }}>
            <FiTrendingDown size={32} color="var(--color-error)" />
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-600)' }}>
              Negative
            </span>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
            opacity: sentimentData.neutral > 20 ? 1 : 0.4
          }}>
            <FiMinus size={32} color="var(--color-warning)" />
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-600)' }}>
              Neutral
            </span>
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
            opacity: sentimentData.positive > 20 ? 1 : 0.4
          }}>
            <FiTrendingUp size={32} color="var(--color-success)" />
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-neutral-600)' }}>
              Positive
            </span>
          </div>
        </div>

        {/* Sentiment Bar Graph */}
        <div style={{
          display: 'flex',
          height: '24px',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          border: '1px solid var(--color-neutral-200)'
        }}>
          {sentimentData.negative > 0 && (
            <div style={{
              width: `${sentimentData.negative}%`,
              backgroundColor: 'var(--color-error)',
              transition: 'width 0.3s ease'
            }} />
          )}
          {sentimentData.neutral > 0 && (
            <div style={{
              width: `${sentimentData.neutral}%`,
              backgroundColor: 'var(--color-warning)',
              transition: 'width 0.3s ease'
            }} />
          )}
          {sentimentData.positive > 0 && (
            <div style={{
              width: `${sentimentData.positive}%`,
              backgroundColor: 'var(--color-success)',
              transition: 'width 0.3s ease'
            }} />
          )}
        </div>
      </div>

      {/* AI Suggestions Section */}
      <div style={{
        backgroundColor: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-5)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-neutral-200)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-2)',
          marginBottom: 'var(--spacing-4)'
        }}>
          <FiZap size={20} color="#9333ea" />
          <h3 style={{
            fontSize: 'var(--font-size-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--color-neutral-900)'
          }}>
            AI Suggestion
          </h3>
        </div>

        {suggestions.length > 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-4)'
          }}>
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                style={{
                  backgroundColor: '#f3e8ff',
                  border: '1px solid #c084fc',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--spacing-4)',
                  fontSize: 'var(--font-size-sm)',
                  lineHeight: 'var(--line-height-relaxed)',
                  color: 'var(--color-neutral-900)'
                }}
              >
                <div style={{
                  fontWeight: 'var(--font-weight-semibold)',
                  marginBottom: 'var(--spacing-2)',
                  color: '#9333ea'
                }}>
                  {suggestion.type || 'Suggestion'}
                </div>
                <div style={{ marginBottom: 'var(--spacing-2)' }}>
                  {suggestion.message || suggestion.text}
                </div>
                {suggestion.recommendation && (
                  <div style={{
                    marginTop: 'var(--spacing-2)',
                    paddingTop: 'var(--spacing-2)',
                    borderTop: '1px solid #c084fc',
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--color-neutral-700)'
                  }}>
                    {suggestion.recommendation}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            color: 'var(--color-neutral-400)',
            fontSize: 'var(--font-size-sm)',
            fontStyle: 'italic',
            textAlign: 'center',
            padding: 'var(--spacing-4)'
          }}>
            No suggestions yet. AI will provide recommendations based on the conversation.
          </div>
        )}
      </div>

      {/* Post-Call Analysis Section */}
      {postCallData && postCallData.complianceReport && (
        <div style={{
          backgroundColor: 'var(--color-white)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-5)',
          boxShadow: 'var(--shadow-sm)',
          border: '1px solid var(--color-neutral-200)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-2)',
            marginBottom: 'var(--spacing-4)'
          }}>
            <FiFileText size={20} color="var(--color-primary)" />
            <h3 style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--color-neutral-900)',
              margin: 0
            }}>
              Post-Call Analysis
            </h3>
          </div>

          {/* Issues Summary */}
          <div style={{
            marginBottom: 'var(--spacing-4)',
            padding: 'var(--spacing-3)',
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

      {/* Quick Actions Section */}
      <div style={{
        backgroundColor: 'var(--color-white)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-5)',
        boxShadow: 'var(--shadow-sm)',
        border: '1px solid var(--color-neutral-200)'
      }}>
        <h3 style={{
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: 'var(--spacing-4)',
          color: 'var(--color-neutral-900)'
        }}>
          Quick Actions
        </h3>
        <div style={{
          color: 'var(--color-neutral-400)',
          fontSize: 'var(--font-size-sm)',
          fontStyle: 'italic',
          textAlign: 'center',
          padding: 'var(--spacing-2)'
        }}>
          Actions will appear here
        </div>
      </div>
    </div>
  );
}

