'use client'

/**
 * AIReasoningPanel Component - Story 22.2
 *
 * Displays AI reasoning for why content was flagged.
 *
 * Acceptance Criteria:
 * - AC2: AI reasoning panel explains why flagged
 * - AC2: Reasoning is presented in clear, non-alarming language
 */

export interface AIReasoningPanelProps {
  /** The AI's reasoning for flagging */
  reasoning: string
  /** Category of concern */
  category: string
}

const styles = {
  container: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  icon: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '14px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  reasoning: {
    fontSize: '14px',
    lineHeight: 1.6,
    color: '#374151',
    margin: 0,
    marginBottom: '12px',
  },
  disclaimer: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic' as const,
    margin: 0,
    paddingTop: '12px',
    borderTop: '1px solid #e2e8f0',
  },
}

/**
 * AIReasoningPanel - Displays AI reasoning for the flag
 */
export function AIReasoningPanel({ reasoning, category: _category }: AIReasoningPanelProps) {
  return (
    <div style={styles.container} data-testid="ai-reasoning-panel">
      <div style={styles.header}>
        <div style={styles.icon} aria-hidden="true">
          <span role="img" aria-label="AI">
            🤖
          </span>
        </div>
        <h3 style={styles.title}>Why this was flagged</h3>
      </div>

      <p style={styles.reasoning} data-testid="reasoning-text">
        {reasoning}
      </p>

      <p style={styles.disclaimer} data-testid="reasoning-disclaimer">
        This detection is provided by AI and may not always be accurate. Consider the context and
        use your judgment as a parent. You can provide feedback to help improve future detections.
      </p>
    </div>
  )
}

export default AIReasoningPanel
