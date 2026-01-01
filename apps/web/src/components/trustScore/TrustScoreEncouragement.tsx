'use client'

/**
 * TrustScoreEncouragement Component - Story 36.3 Task 5
 *
 * Shows encouragement and growth messaging with milestone celebrations.
 * All messaging is positive and growth-focused.
 *
 * AC4: Language is encouraging, not punitive
 * AC6: Score framed as growth metric, not judgment
 */

// ============================================================================
// Types
// ============================================================================

export interface TrustScoreEncouragementProps {
  /** Encouragement message based on score trend */
  message: string
  /** Optional milestone message for celebration */
  milestoneMessage: string | null
}

// ============================================================================
// Icon Components
// ============================================================================

function EncouragementIcon() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        marginRight: '10px',
        color: '#10b981',
      }}
      data-testid="encouragement-icon"
      aria-hidden="true"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  )
}

function MilestoneIcon() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '24px',
        height: '24px',
        marginRight: '10px',
        color: '#f59e0b',
      }}
      data-testid="milestone-icon"
      aria-hidden="true"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    </span>
  )
}

// ============================================================================
// Milestone Section Component
// ============================================================================

interface MilestoneSectionProps {
  message: string
}

function MilestoneSection({ message }: MilestoneSectionProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: '#fffbeb',
        borderRadius: '10px',
        marginBottom: '12px',
        border: '2px solid #fcd34d',
      }}
      data-testid="milestone-section"
    >
      <MilestoneIcon />
      <span
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: '#92400e',
        }}
        data-testid="milestone-message"
        data-type="celebration"
      >
        {message}
      </span>
    </div>
  )
}

// ============================================================================
// Encouragement Section Component
// ============================================================================

interface EncouragementSectionProps {
  message: string
}

function EncouragementSection({ message }: EncouragementSectionProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: '#ecfdf5',
        borderRadius: '10px',
        border: '1px solid #6ee7b7',
      }}
      data-testid="encouragement-section"
    >
      <EncouragementIcon />
      <span
        style={{
          fontSize: '15px',
          fontWeight: 500,
          color: '#047857',
        }}
        data-testid="encouragement-message"
      >
        {message}
      </span>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * TrustScoreEncouragement - Shows encouragement and milestone celebrations
 */
export function TrustScoreEncouragement({
  message,
  milestoneMessage,
}: TrustScoreEncouragementProps) {
  return (
    <div
      data-testid="trust-score-encouragement"
      data-mood="positive"
      aria-label={milestoneMessage ? `${milestoneMessage}. ${message}` : message}
    >
      {milestoneMessage && <MilestoneSection message={milestoneMessage} />}
      <EncouragementSection message={message} />
    </div>
  )
}
