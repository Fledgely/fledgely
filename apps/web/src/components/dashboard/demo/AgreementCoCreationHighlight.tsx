'use client'

/**
 * AgreementCoCreationHighlight Component - Story 8.5.6
 *
 * Emphasizes that children help decide the monitoring rules.
 * Shows example of negotiable limits to demonstrate agency.
 *
 * Acceptance Criteria:
 * - AC4: Demo emphasizes agreement co-creation ("You help decide the rules")
 * - AC5: Language is at 6th-grade reading level
 */

export interface AgreementCoCreationHighlightProps {
  /** Compact mode for inline display */
  compact?: boolean
}

/**
 * Sample negotiable limits to show as examples
 */
const SAMPLE_NEGOTIABLE_RULES = [
  { rule: 'Screen time limits', example: 'How many hours per day' },
  { rule: 'Private time windows', example: 'Homework time with no pictures' },
  { rule: 'App categories', example: 'Which apps to check on' },
]

/**
 * AgreementCoCreationHighlight - "You help decide the rules" message
 *
 * Uses child-friendly language at 6th-grade reading level:
 * - Short sentences (10-15 words)
 * - Simple words (1-2 syllables)
 * - Active voice
 * - Empowering tone
 */
export function AgreementCoCreationHighlight({
  compact = false,
}: AgreementCoCreationHighlightProps) {
  const containerStyles: React.CSSProperties = {
    backgroundColor: '#e0f2fe', // Sky-100
    border: '1px solid #7dd3fc', // Sky-300
    borderRadius: compact ? '6px' : '8px',
    padding: compact ? '10px 12px' : '14px 16px',
    marginBottom: compact ? '8px' : '12px',
  }

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: compact ? '4px' : '8px',
  }

  const iconStyles: React.CSSProperties = {
    fontSize: compact ? '18px' : '22px',
  }

  const titleStyles: React.CSSProperties = {
    margin: 0,
    fontSize: compact ? '14px' : '16px',
    fontWeight: 600,
    color: '#0369a1', // Sky-700
  }

  const messageStyles: React.CSSProperties = {
    margin: '0 0 10px 0',
    fontSize: compact ? '13px' : '15px',
    color: '#374151', // Gray-700
    lineHeight: 1.5,
  }

  const rulesListStyles: React.CSSProperties = {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  }

  const ruleItemStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '6px',
    padding: '6px 8px',
    marginBottom: '4px',
    backgroundColor: '#f0f9ff', // Sky-50
    borderRadius: '4px',
    fontSize: compact ? '12px' : '13px',
  }

  const checkStyles: React.CSSProperties = {
    color: '#0284c7', // Sky-600
    fontSize: compact ? '12px' : '14px',
    flexShrink: 0,
  }

  const ruleTextStyles: React.CSSProperties = {
    color: '#0c4a6e', // Sky-900
  }

  const exampleStyles: React.CSSProperties = {
    color: '#6b7280', // Gray-500
    fontStyle: 'italic',
    marginLeft: '4px',
  }

  return (
    <div data-testid="agreement-cocreation-highlight" style={containerStyles}>
      <div style={headerStyles}>
        <span style={iconStyles} aria-hidden="true" data-testid="callout-icon">
          🤝
        </span>
        <h4 style={titleStyles} data-testid="callout-title">
          You Help Decide the Rules
        </h4>
      </div>
      <p style={messageStyles} data-testid="callout-message">
        This is not just your parent&apos;s rules. You get to help decide what is fair. You talk
        together and agree on what works for your family.
      </p>
      <div data-testid="negotiable-rules-container">
        <ul style={rulesListStyles}>
          {SAMPLE_NEGOTIABLE_RULES.map((item) => (
            <li key={item.rule} style={ruleItemStyles} data-testid="negotiable-rule">
              <span style={checkStyles} aria-hidden="true">
                ✓
              </span>
              <span>
                <span style={ruleTextStyles}>{item.rule}</span>
                <span style={exampleStyles}>– {item.example}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
