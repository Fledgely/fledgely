'use client'

/**
 * TrustScoreCard Component - Story 36.3 Task 1
 *
 * Main trust score display card for child view.
 * Displays the trust score prominently with encouraging color scheme.
 *
 * AC1: Score displayed prominently: "Your trust score: 85"
 * AC6: Score framed as growth metric, not judgment
 */

import { type TrustScore } from '@fledgely/shared'

// ============================================================================
// Types
// ============================================================================

export interface TrustScoreCardProps {
  /** Child ID for the trust score */
  childId: string
  /** Trust score data */
  trustScore: TrustScore
  /** Whether to show additional details */
  showDetails?: boolean
}

// ============================================================================
// Score Level Helpers
// ============================================================================

type ScoreLevel = 'high' | 'medium' | 'growing'

/**
 * Determine the score level for styling.
 * Uses encouraging terminology - "growing" instead of "low"
 */
function getScoreLevel(score: number): ScoreLevel {
  if (score >= 80) return 'high'
  if (score >= 50) return 'medium'
  return 'growing'
}

/**
 * Get colors based on score level.
 * All colors are encouraging - even "growing" uses a warm tone.
 */
function getScoreColors(level: ScoreLevel): {
  background: string
  border: string
  text: string
  ring: string
  ringBg: string
} {
  switch (level) {
    case 'high':
      return {
        background: '#ecfdf5', // Light green
        border: '#6ee7b7', // Green border
        text: '#047857', // Dark green text
        ring: '#10b981', // Green ring
        ringBg: '#d1fae5', // Very light green
      }
    case 'medium':
      return {
        background: '#fffbeb', // Light amber
        border: '#fcd34d', // Amber border
        text: '#92400e', // Dark amber text
        ring: '#f59e0b', // Amber ring
        ringBg: '#fef3c7', // Very light amber
      }
    case 'growing':
      return {
        background: '#fff7ed', // Light orange (warm, encouraging)
        border: '#fdba74', // Orange border
        text: '#9a3412', // Dark orange text
        ring: '#fb923c', // Orange ring
        ringBg: '#ffedd5', // Very light orange
      }
  }
}

// ============================================================================
// Score Ring Component
// ============================================================================

interface ScoreRingProps {
  score: number
  level: ScoreLevel
}

function ScoreRing({ score, level }: ScoreRingProps) {
  const colors = getScoreColors(level)
  const circumference = 2 * Math.PI * 45 // radius = 45
  const progress = Math.round(score)
  const offset = circumference - (progress / 100) * circumference

  return (
    <div
      style={{
        position: 'relative',
        width: '120px',
        height: '120px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      data-testid="score-ring"
      data-progress={progress}
    >
      <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
        {/* Background ring */}
        <circle cx="60" cy="60" r="45" fill="none" stroke={colors.ringBg} strokeWidth="10" />
        {/* Progress ring */}
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={colors.ring}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      {/* Score value in center */}
      <div
        style={{
          position: 'absolute',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontSize: '32px',
            fontWeight: 700,
            color: colors.text,
            lineHeight: 1,
          }}
          data-testid="trust-score-value"
        >
          {Math.round(score)}
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * TrustScoreCard - Main trust score display for child view
 */
export function TrustScoreCard({
  childId: _childId,
  trustScore,
  showDetails = false,
}: TrustScoreCardProps) {
  const score = trustScore.currentScore
  const level = getScoreLevel(score)
  const colors = getScoreColors(level)

  return (
    <div
      style={{
        backgroundColor: colors.background,
        border: `2px solid ${colors.border}`,
        borderRadius: '16px',
        padding: '24px',
        outline: 'none',
      }}
      tabIndex={0}
      data-testid="trust-score-card"
      data-score-level={level}
      aria-label={`Your trust score is ${Math.round(score)} out of 100`}
    >
      {/* Header */}
      <h2
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: colors.text,
          marginBottom: '16px',
          textAlign: 'center',
        }}
      >
        Your trust score
      </h2>

      {/* Score ring display */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: showDetails ? '16px' : '0',
        }}
      >
        <ScoreRing score={score} level={level} />
      </div>

      {/* Details section (optional) */}
      {showDetails && (
        <div
          style={{
            paddingTop: '16px',
            borderTop: `1px solid ${colors.border}`,
          }}
          data-testid="trust-score-details"
        >
          <p
            style={{
              fontSize: '14px',
              color: colors.text,
              textAlign: 'center',
              margin: 0,
            }}
          >
            {level === 'high' && 'Great job! Keep up the good work.'}
            {level === 'medium' && "You're doing well. Keep going!"}
            {level === 'growing' && 'Every day is a chance to improve!'}
          </p>
        </div>
      )}
    </div>
  )
}
