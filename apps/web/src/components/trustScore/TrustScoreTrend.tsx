'use client'

/**
 * TrustScoreTrend Component - Story 36.3 Task 2
 *
 * Shows score trend over time with weekly and monthly displays.
 * Uses encouraging language for both increases and decreases.
 *
 * AC2: Trend shown: "Up 5 points this month"
 * AC4: Language is encouraging, not punitive
 */

// ============================================================================
// Types
// ============================================================================

export interface TrustScoreTrendProps {
  /** Weekly trend change (positive or negative) */
  weeklyTrend: number
  /** Monthly trend change (positive or negative) */
  monthlyTrend: number
  /** Which trends to show */
  mode?: 'weekly' | 'monthly' | 'both'
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format a trend value for display.
 * Uses encouraging language - "Up" and "Down" (not "Dropped" or "Lost")
 */
function formatTrend(delta: number, period: 'this week' | 'this month'): string {
  if (delta === 0) {
    return `No change ${period}`
  }

  const absValue = Math.abs(delta)
  const direction = delta > 0 ? 'Up' : 'Down'
  const plural = absValue === 1 ? 'point' : 'points'

  return `${direction} ${absValue} ${plural} ${period}`
}

/**
 * Get the direction for an icon
 */
function getTrendDirection(delta: number): 'up' | 'down' | 'none' {
  if (delta > 0) return 'up'
  if (delta < 0) return 'down'
  return 'none'
}

/**
 * Get the positive state for styling
 */
function getPositiveState(delta: number): 'true' | 'false' | 'neutral' {
  if (delta > 0) return 'true'
  if (delta < 0) return 'false'
  return 'neutral'
}

/**
 * Get colors based on trend direction
 */
function getTrendColors(delta: number): { text: string; bg: string } {
  if (delta > 0) {
    return { text: '#047857', bg: '#ecfdf5' } // Green
  }
  if (delta < 0) {
    return { text: '#9a3412', bg: '#fff7ed' } // Warm orange (encouraging, not punitive red)
  }
  return { text: '#6b7280', bg: '#f9fafb' } // Gray (neutral)
}

// ============================================================================
// Arrow Icon Component
// ============================================================================

interface TrendIconProps {
  direction: 'up' | 'down' | 'none'
  testId: string
}

function TrendIcon({ direction, testId }: TrendIconProps) {
  const color = direction === 'up' ? '#10b981' : direction === 'down' ? '#fb923c' : '#9ca3af'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '20px',
        height: '20px',
        marginRight: '8px',
      }}
      data-testid={testId}
      data-direction={direction}
      aria-hidden="true"
    >
      {direction === 'up' && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3L14 9L12.6 10.4L9 6.8V13H7V6.8L3.4 10.4L2 9L8 3Z" fill={color} />
        </svg>
      )}
      {direction === 'down' && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 13L2 7L3.4 5.6L7 9.2V3H9V9.2L12.6 5.6L14 7L8 13Z" fill={color} />
        </svg>
      )}
      {direction === 'none' && (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8H13" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </span>
  )
}

// ============================================================================
// Trend Row Component
// ============================================================================

interface TrendRowProps {
  delta: number
  period: 'this week' | 'this month'
  testId: string
  iconTestId: string
}

function TrendRow({ delta, period, testId, iconTestId }: TrendRowProps) {
  const direction = getTrendDirection(delta)
  const positiveState = getPositiveState(delta)
  const colors = getTrendColors(delta)
  const text = formatTrend(delta, period)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        backgroundColor: colors.bg,
        borderRadius: '8px',
        marginBottom: '8px',
      }}
      data-testid={testId}
      data-positive={positiveState}
    >
      <TrendIcon direction={direction} testId={iconTestId} />
      <span
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: colors.text,
        }}
      >
        {text}
      </span>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * TrustScoreTrend - Displays score trend over time
 */
export function TrustScoreTrend({
  weeklyTrend,
  monthlyTrend,
  mode = 'both',
}: TrustScoreTrendProps) {
  const showWeekly = mode === 'weekly' || mode === 'both'
  const showMonthly = mode === 'monthly' || mode === 'both'

  // Build aria label
  const ariaLabel = [
    showWeekly ? formatTrend(weeklyTrend, 'this week') : '',
    showMonthly ? formatTrend(monthlyTrend, 'this month') : '',
  ]
    .filter(Boolean)
    .join('. ')

  return (
    <div data-testid="trust-score-trend" aria-label={ariaLabel}>
      {showWeekly && (
        <TrendRow
          delta={weeklyTrend}
          period="this week"
          testId="weekly-trend"
          iconTestId="weekly-trend-icon"
        />
      )}
      {showMonthly && (
        <TrendRow
          delta={monthlyTrend}
          period="this month"
          testId="monthly-trend"
          iconTestId="monthly-trend-icon"
        />
      )}
    </div>
  )
}
