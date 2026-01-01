'use client'

/**
 * ParentTrustScoreCard Component - Story 36.4 Task 1
 *
 * Parent-facing trust score card showing same data as child sees.
 * Supports factor click for detailed view.
 *
 * AC1: Same score visible as child sees (transparency)
 * AC4: Factor details available on click
 */

import { type TrustScore, type TrustFactor } from '@fledgely/shared'

// ============================================================================
// Types
// ============================================================================

export interface ParentTrustScoreCardProps {
  /** Child ID */
  childId: string
  /** Child's name for display */
  childName: string
  /** Trust score data */
  trustScore: TrustScore
  /** Monthly trend (optional) */
  monthlyTrend?: number
  /** Callback when a factor is clicked */
  onFactorClick?: (factor: TrustFactor) => void
}

// ============================================================================
// Score Level Helpers
// ============================================================================

type ScoreLevel = 'high' | 'medium' | 'growing'

function getScoreLevel(score: number): ScoreLevel {
  if (score >= 80) return 'high'
  if (score >= 50) return 'medium'
  return 'growing'
}

function getScoreColors(level: ScoreLevel): {
  background: string
  border: string
  text: string
  accent: string
} {
  switch (level) {
    case 'high':
      return {
        background: '#ecfdf5',
        border: '#6ee7b7',
        text: '#047857',
        accent: '#10b981',
      }
    case 'medium':
      return {
        background: '#fffbeb',
        border: '#fcd34d',
        text: '#92400e',
        accent: '#f59e0b',
      }
    case 'growing':
      return {
        background: '#fff7ed',
        border: '#fdba74',
        text: '#9a3412',
        accent: '#fb923c',
      }
  }
}

// ============================================================================
// Trend Formatter
// ============================================================================

function formatTrend(delta: number): string {
  if (delta === 0) {
    return 'No change this month'
  }
  const absValue = Math.abs(delta)
  const direction = delta > 0 ? 'Up' : 'Down'
  const plural = absValue === 1 ? 'point' : 'points'
  return `${direction} ${absValue} ${plural} this month`
}

// ============================================================================
// Factor Item Component
// ============================================================================

interface FactorItemProps {
  factor: TrustFactor
  index: number
  onClick?: () => void
  isClickable: boolean
}

function FactorItem({ factor, index, onClick, isClickable }: FactorItemProps) {
  const sign = factor.value >= 0 ? '+' : ''
  const text = `${factor.description}: ${sign}${factor.value}`

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: factor.category === 'positive' ? '#ecfdf5' : '#fff7ed',
        borderRadius: '6px',
        marginBottom: '4px',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'background-color 0.2s',
      }}
      data-testid={`parent-factor-${index}`}
      data-category={factor.category}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      aria-label={isClickable ? `Click for details: ${text}` : undefined}
    >
      <span
        style={{
          fontSize: '14px',
          color: factor.category === 'positive' ? '#047857' : '#9a3412',
        }}
      >
        {text}
      </span>
      {isClickable && (
        <span
          style={{
            marginLeft: 'auto',
            color: '#9ca3af',
            fontSize: '12px',
          }}
          aria-hidden="true"
        >
          →
        </span>
      )}
    </li>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ParentTrustScoreCard({
  childId: _childId,
  childName,
  trustScore,
  monthlyTrend = 0,
  onFactorClick,
}: ParentTrustScoreCardProps) {
  const score = trustScore.currentScore
  const level = getScoreLevel(score)
  const colors = getScoreColors(level)
  const hasFactors = trustScore.factors.length > 0

  return (
    <div
      style={{
        backgroundColor: colors.background,
        border: `2px solid ${colors.border}`,
        borderRadius: '12px',
        padding: '20px',
      }}
      data-testid="parent-trust-score-card"
      data-score-level={level}
      aria-label={`${childName}'s trust score is ${Math.round(score)} out of 100`}
    >
      {/* Header with child name */}
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: colors.text,
          marginBottom: '12px',
        }}
        data-testid="parent-score-header"
      >
        {childName}&apos;s Trust Score
      </h3>

      {/* Score display */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            fontSize: '42px',
            fontWeight: 700,
            color: colors.text,
          }}
          data-testid="parent-score-value"
        >
          {Math.round(score)}
        </div>
        <div
          style={{
            fontSize: '14px',
            color: colors.text,
            opacity: 0.8,
          }}
          data-testid="parent-trend"
        >
          {formatTrend(monthlyTrend)}
        </div>
      </div>

      {/* Factors section */}
      <div style={{ marginTop: '12px' }}>
        <h4
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#6b7280',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {onFactorClick ? 'Factors (tap for details)' : 'Factors'}
        </h4>

        {hasFactors ? (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {trustScore.factors.map((factor, index) => (
              <FactorItem
                key={index}
                factor={factor}
                index={index}
                onClick={onFactorClick ? () => onFactorClick(factor) : undefined}
                isClickable={!!onFactorClick}
              />
            ))}
          </ul>
        ) : (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '6px',
              fontSize: '14px',
              color: '#6b7280',
              textAlign: 'center',
            }}
            data-testid="parent-factors-empty"
          >
            No factors recorded yet
          </div>
        )}
      </div>
    </div>
  )
}
