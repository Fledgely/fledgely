'use client'

/**
 * TrustScoreImprovement Component - Story 36.3 Task 4
 *
 * Shows improvement tips based on current factors.
 * Uses encouraging, growth-focused language.
 *
 * AC5: Tips: "To improve: stick to time limits for 2 weeks"
 * AC4: Language is encouraging, not punitive
 */

// ============================================================================
// Types
// ============================================================================

export interface TrustScoreImprovementProps {
  /** Improvement tips to display */
  tips: string[]
  /** Maximum number of tips to show */
  limit?: number
  /** Show encouragement when there are no tips */
  showEncouragementWhenEmpty?: boolean
}

// ============================================================================
// Tip Icon Component
// ============================================================================

interface TipIconProps {
  index: number
}

function TipIcon({ index }: TipIconProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '20px',
        height: '20px',
        marginRight: '8px',
        color: '#f59e0b',
      }}
      data-testid={`tip-icon-${index}`}
      data-type="tip"
      aria-hidden="true"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1.5a4.5 4.5 0 0 0-1.5 8.74V12a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.76A4.5 4.5 0 0 0 8 1.5zM6.5 14a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1H7a.5.5 0 0 1-.5-.5z" />
      </svg>
    </span>
  )
}

// ============================================================================
// Tip Item Component
// ============================================================================

interface TipItemProps {
  tip: string
  index: number
  isPrimary: boolean
}

function TipItem({ tip, index, isPrimary }: TipItemProps) {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        padding: '10px 12px',
        backgroundColor: isPrimary ? '#fffbeb' : '#f9fafb',
        borderRadius: '8px',
        marginBottom: '6px',
        borderLeft: `3px solid ${isPrimary ? '#f59e0b' : '#e5e7eb'}`,
      }}
      data-testid={`improvement-tip-${index}`}
      data-priority={isPrimary ? 'primary' : 'secondary'}
      role="listitem"
    >
      <TipIcon index={index} />
      <span
        style={{
          fontSize: '14px',
          color: '#374151',
          lineHeight: 1.4,
        }}
      >
        {tip}
      </span>
    </li>
  )
}

// ============================================================================
// Encouragement Component
// ============================================================================

function Encouragement() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: '#ecfdf5',
        borderRadius: '8px',
        borderLeft: '3px solid #10b981',
      }}
      data-testid="improvement-encouragement"
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '20px',
          height: '20px',
          marginRight: '8px',
          color: '#10b981',
        }}
        aria-hidden="true"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zm3.5 6.5l-4 4a.5.5 0 0 1-.7 0l-2-2a.5.5 0 0 1 .7-.7L7 9.3l3.6-3.6a.5.5 0 0 1 .8.7l.1.1z" />
        </svg>
      </span>
      <span
        style={{
          fontSize: '14px',
          color: '#047857',
          fontWeight: 500,
        }}
      >
        Keep up the good work! No improvements needed right now.
      </span>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * TrustScoreImprovement - Shows improvement tips
 */
export function TrustScoreImprovement({
  tips,
  limit = 3,
  showEncouragementWhenEmpty = false,
}: TrustScoreImprovementProps) {
  // Empty state
  if (tips.length === 0) {
    if (showEncouragementWhenEmpty) {
      return (
        <div data-testid="trust-score-improvement">
          <Encouragement />
        </div>
      )
    }
    return null
  }

  // Limit tips
  const visibleTips = tips.slice(0, limit)
  const remainingCount = tips.length - visibleTips.length

  return (
    <div data-testid="trust-score-improvement">
      <h4
        style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#374151',
          marginBottom: '12px',
        }}
        data-testid="improvement-header"
      >
        Tips to improve
      </h4>

      <ul
        style={{ listStyle: 'none', margin: 0, padding: 0 }}
        data-testid="improvement-tips"
        role="list"
      >
        {visibleTips.map((tip, index) => (
          <TipItem key={index} tip={tip} index={index} isPrimary={index === 0} />
        ))}
      </ul>

      {remainingCount > 0 && (
        <div
          style={{
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '8px',
            paddingLeft: '12px',
          }}
          data-testid="more-tips-indicator"
        >
          +{remainingCount} more
        </div>
      )}
    </div>
  )
}
