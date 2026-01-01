'use client'

/**
 * DignitySafeDisplay Component - Story 36.6 Task 5
 *
 * Dignity-preserving display of trust scores.
 * AC6: Privacy maintains dignity and prevents shame
 *
 * Design principles:
 * - No shame-inducing language (bad, poor, fail, shame, disappoint, worst)
 * - Growth-focused messaging for all score levels
 * - Calm colors (no alarming red for low scores)
 * - Private encouragement for improvement opportunities
 */

// ============================================================================
// Types
// ============================================================================

export interface DignitySafeDisplayProps {
  /** The trust score to display (0-100) */
  score: number
  /** Show private context/encouragement for low scores */
  showPrivateContext?: boolean
}

// ============================================================================
// Helpers
// ============================================================================

interface ScoreLevel {
  label: string
  message: string
  color: string
}

function getScoreLevel(score: number): ScoreLevel {
  if (score >= 80) {
    return {
      label: 'High Trust',
      message: 'Great progress on your trust journey!',
      color: '#059669', // Green - positive
    }
  }
  if (score >= 50) {
    return {
      label: 'Growing',
      message: 'Making progress on your trust journey!',
      color: '#d97706', // Amber - neutral growth
    }
  }
  // Low scores - use calm, non-alarming language and colors
  return {
    label: 'Building',
    message: 'Opportunity to grow and build trust together!',
    color: '#6b7280', // Gray - calm, not alarming
  }
}

function getPrivateContext(score: number): string | null {
  // Only show private context for lower scores
  if (score >= 50) return null

  return "We're here to help and support you together on this journey."
}

// ============================================================================
// Main Component
// ============================================================================

export function DignitySafeDisplay({ score, showPrivateContext = false }: DignitySafeDisplayProps) {
  const level = getScoreLevel(score)
  const privateContext = showPrivateContext ? getPrivateContext(score) : null

  return (
    <div
      data-testid="dignity-safe-display"
      style={{
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
      }}
    >
      {/* Heading */}
      <h3
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: '#6b7280',
          marginBottom: '12px',
        }}
      >
        Trust Score
      </h3>

      {/* Score value */}
      <div
        data-testid="score-value"
        aria-label={`Trust score: ${score} out of 100`}
        style={{
          fontSize: '48px',
          fontWeight: 700,
          color: level.color,
          marginBottom: '8px',
        }}
      >
        {score}
      </div>

      {/* Score level label */}
      <div
        data-testid="score-level"
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: level.color,
          marginBottom: '8px',
        }}
      >
        {level.label}
      </div>

      {/* Growth-focused message */}
      <div
        data-testid="score-message"
        style={{
          fontSize: '14px',
          color: '#6b7280',
        }}
      >
        {level.message}
      </div>

      {/* Private context for low scores */}
      {privateContext && (
        <div
          data-testid="private-context"
          style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#166534',
          }}
        >
          {privateContext}
        </div>
      )}
    </div>
  )
}
