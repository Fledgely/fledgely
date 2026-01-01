'use client'

/**
 * FocusModeAnalyticsCard Component - Story 33.5
 *
 * Displays a child's focus mode analytics with positive framing.
 * Shows weekly sessions, completion rate, timing patterns, and trends.
 *
 * Acceptance Criteria:
 * - AC1: Session count summary
 * - AC2: Duration analytics
 * - AC3: Timing pattern analysis
 * - AC4: Completion rate tracking
 * - AC5: Positive framing & celebration
 * - AC6: Bilateral transparency (same view for parent and child)
 */

import {
  useFocusModeAnalytics,
  formatFocusDuration,
  getDayLabel,
  getTimeOfDayLabel,
} from '../../hooks/useFocusModeAnalytics'
import type { DayOfWeek, TimeOfDay } from '@fledgely/shared'

interface FocusModeAnalyticsCardProps {
  familyId: string
  childId: string
  childName: string
}

/**
 * Loading skeleton for the focus mode analytics card
 */
function LoadingSkeleton() {
  return (
    <div
      style={{
        backgroundColor: '#f3f4f6',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
      }}
      data-testid="focus-analytics-loading"
      role="status"
      aria-label="Loading focus mode analytics"
    >
      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            width: '150px',
            height: '16px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            marginBottom: '8px',
          }}
        />
        <div
          style={{
            width: '100px',
            height: '32px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
          }}
        />
      </div>
    </div>
  )
}

/**
 * Error state for the card
 */
function ErrorState({ message }: { message: string }) {
  return (
    <div
      style={{
        backgroundColor: '#fef2f2',
        border: '2px solid #fecaca',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
      }}
      data-testid="focus-analytics-error"
      role="alert"
    >
      <div style={{ color: '#dc2626', fontWeight: 500 }}>Unable to load focus mode analytics</div>
      <div style={{ color: '#991b1b', fontSize: '14px', marginTop: '4px' }}>{message}</div>
    </div>
  )
}

/**
 * Empty state when no focus mode data exists (with positive framing)
 */
function EmptyState({ childName }: { childName: string }) {
  return (
    <div
      style={{
        backgroundColor: '#f0fdf4',
        border: '2px solid #bbf7d0',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        textAlign: 'center',
      }}
      data-testid="focus-analytics-empty"
    >
      <div
        style={{
          fontSize: '24px',
          marginBottom: '8px',
        }}
        aria-hidden="true"
      >
        🎯
      </div>
      <div style={{ color: '#166534', fontWeight: 600, marginBottom: '4px' }}>
        Focus Mode Analytics
      </div>
      <div style={{ color: '#15803d', fontSize: '14px' }}>
        {childName} hasn&apos;t used focus mode yet. Start a focus session to see insights!
      </div>
      <div
        style={{
          marginTop: '12px',
          padding: '8px 16px',
          backgroundColor: '#16a34a',
          color: '#ffffff',
          borderRadius: '8px',
          display: 'inline-block',
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        Start Focus Session
      </div>
    </div>
  )
}

/**
 * Trend indicator showing change from previous week (positive framing)
 */
function TrendIndicator({ change, metric }: { change: number; metric: string }) {
  if (change === 0) {
    return (
      <span
        style={{
          fontSize: '12px',
          color: '#6b7280',
        }}
        data-testid="trend-indicator"
      >
        Same as last week
      </span>
    )
  }

  const isPositive = change > 0
  const absChange = Math.abs(change)

  // For focus mode, more sessions is good (positive framing)
  return (
    <span
      style={{
        fontSize: '12px',
        color: isPositive ? '#16a34a' : '#6b7280', // No red for negative - just neutral
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}
      data-testid="trend-indicator"
    >
      {isPositive && <span aria-hidden="true">📈</span>}
      <span>
        {absChange} {isPositive ? 'more' : 'fewer'} {metric} than last week
      </span>
    </span>
  )
}

/**
 * Completion rate badge with positive framing
 */
function CompletionRateBadge({ rate }: { rate: number }) {
  // Always use positive framing - no red/negative colors
  let message: string
  let bgColor: string
  let textColor: string
  let emoji: string

  if (rate >= 90) {
    message = 'Outstanding commitment!'
    bgColor = '#f0fdf4'
    textColor = '#166534'
    emoji = '🌟'
  } else if (rate >= 70) {
    message = 'Great follow-through!'
    bgColor = '#f0fdf4'
    textColor = '#166534'
    emoji = '✨'
  } else if (rate >= 50) {
    message = 'Building the habit!'
    bgColor = '#fefce8'
    textColor = '#854d0e'
    emoji = '💪'
  } else if (rate > 0) {
    message = 'Keep practicing!'
    bgColor = '#eff6ff'
    textColor = '#1e40af'
    emoji = '🎯'
  } else {
    message = 'Start a focus session!'
    bgColor = '#f9fafb'
    textColor = '#4b5563'
    emoji = '🎯'
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '16px',
        backgroundColor: bgColor,
        marginTop: '4px',
      }}
      data-testid="completion-badge"
    >
      <span aria-hidden="true">{emoji}</span>
      <span
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: textColor,
        }}
      >
        {message}
      </span>
    </div>
  )
}

/**
 * Streak display with celebration
 */
function StreakDisplay({ current, longest }: { current: number; longest: number }) {
  if (current === 0 && longest === 0) {
    return (
      <div
        style={{
          fontSize: '12px',
          color: '#6b7280',
          padding: '8px 12px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
        }}
        data-testid="streak-display"
      >
        Start your focus streak today!
      </div>
    )
  }

  let emoji = '🔥'
  if (current >= 30) emoji = '🏆'
  else if (current >= 7) emoji = '🔥'
  else if (current >= 3) emoji = '⚡'

  return (
    <div
      style={{
        padding: '8px 12px',
        backgroundColor: current > 0 ? '#fef3c7' : '#f9fafb',
        borderRadius: '8px',
      }}
      data-testid="streak-display"
    >
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#92400e' }}>
        {emoji} {current} day streak
      </div>
      {longest > current && (
        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
          Best: {longest} days
        </div>
      )}
    </div>
  )
}

/**
 * Peak times visualization
 */
function PeakTimesDisplay({
  peakDays,
  peakTimeOfDay,
}: {
  peakDays: DayOfWeek[]
  peakTimeOfDay: TimeOfDay | null
}) {
  if (peakDays.length === 0 && !peakTimeOfDay) {
    return null
  }

  return (
    <div
      style={{
        padding: '8px 12px',
        backgroundColor: '#eff6ff',
        borderRadius: '8px',
        marginTop: '8px',
      }}
      data-testid="peak-times"
    >
      <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 500, marginBottom: '4px' }}>
        🕐 Best Focus Times
      </div>
      {peakTimeOfDay && (
        <div style={{ fontSize: '14px', color: '#1e40af' }}>{getTimeOfDayLabel(peakTimeOfDay)}</div>
      )}
      {peakDays.length > 0 && (
        <div style={{ fontSize: '12px', color: '#3b82f6', marginTop: '2px' }}>
          Peak days: {peakDays.map((d) => getDayLabel(d)).join(', ')}
        </div>
      )}
    </div>
  )
}

/**
 * Session type breakdown
 */
function SessionTypeBreakdown({ manual, calendar }: { manual: number; calendar: number }) {
  const total = manual + calendar
  if (total === 0) return null

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        marginTop: '8px',
      }}
      data-testid="session-breakdown"
    >
      <div
        style={{
          flex: 1,
          padding: '6px 10px',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#374151' }}>{manual}</div>
        <div style={{ fontSize: '10px', color: '#6b7280' }}>Manual</div>
      </div>
      <div
        style={{
          flex: 1,
          padding: '6px 10px',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#374151' }}>{calendar}</div>
        <div style={{ fontSize: '10px', color: '#6b7280' }}>Calendar</div>
      </div>
    </div>
  )
}

/**
 * Main FocusModeAnalyticsCard component
 */
export function FocusModeAnalyticsCard({
  familyId,
  childId,
  childName,
}: FocusModeAnalyticsCardProps) {
  const { data, loading, error, messages } = useFocusModeAnalytics({
    familyId,
    childId,
    enabled: true,
  })

  if (loading) {
    return <LoadingSkeleton />
  }

  if (error) {
    return <ErrorState message={error} />
  }

  if (!data || data.weeklySessionCount === 0) {
    return <EmptyState childName={childName} />
  }

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
      }}
      data-testid="focus-analytics-card"
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h3
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            color: '#6b7280',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Focus Mode This Week
        </h3>
      </div>

      {/* Session count with positive message */}
      <div style={{ marginBottom: '16px' }} data-testid="session-count">
        <div
          style={{
            fontSize: '14px',
            color: '#374151',
            marginBottom: '4px',
          }}
        >
          {messages.sessionCount(data.weeklySessionCount, childName)}
        </div>
        <div
          style={{
            fontSize: '36px',
            fontWeight: 700,
            color: '#1f2937',
            lineHeight: 1,
          }}
        >
          {data.weeklySessionCount} sessions
        </div>
        <div style={{ marginTop: '4px' }}>
          <TrendIndicator change={data.sessionCountChange} metric="sessions" />
        </div>
      </div>

      {/* Average duration */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            padding: '12px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
          }}
          data-testid="avg-duration"
        >
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>
            Avg Duration
          </div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#374151' }}>
            {formatFocusDuration(data.weeklyAverageMinutes)}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
            {messages.averageDuration(data.weeklyAverageMinutes)}
          </div>
        </div>

        <div
          style={{
            padding: '12px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
          }}
          data-testid="total-time"
        >
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '2px' }}>Total Time</div>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#374151' }}>
            {formatFocusDuration(data.weeklyTotalMinutes)}
          </div>
          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>this week</div>
        </div>
      </div>

      {/* Completion rate */}
      <div
        style={{
          padding: '12px',
          backgroundColor: '#f0fdf4',
          borderRadius: '8px',
          marginBottom: '12px',
        }}
        data-testid="completion-rate"
      >
        <div style={{ fontSize: '12px', color: '#166534', marginBottom: '2px' }}>
          Completion Rate
        </div>
        <div style={{ fontSize: '24px', fontWeight: 600, color: '#166534' }}>
          {data.weeklyCompletionRate}%
        </div>
        <CompletionRateBadge rate={data.weeklyCompletionRate} />
      </div>

      {/* Streak display */}
      <StreakDisplay current={data.currentStreak} longest={data.longestStreak} />

      {/* Peak times */}
      <PeakTimesDisplay peakDays={data.peakDays} peakTimeOfDay={data.peakTimeOfDay} />

      {/* Session type breakdown */}
      <SessionTypeBreakdown manual={data.manualSessions} calendar={data.calendarSessions} />
    </div>
  )
}
