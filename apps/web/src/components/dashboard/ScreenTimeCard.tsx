'use client'

/**
 * ScreenTimeCard Component - Story 29.4
 *
 * Displays a child's screen time summary prominently.
 * Shows today's total, change from yesterday, and category breakdown.
 *
 * Acceptance Criteria:
 * - AC1: Today's total time shown prominently
 * - AC3: Breakdown by category
 * - AC5: Comparison to agreed limits (if set)
 */

import { useChildScreenTime, formatDuration } from '../../hooks/useChildScreenTime'
import { ScreenTimeCategoryBreakdown } from './ScreenTimeCategoryBreakdown'
import { ScreenTimeDeviceBreakdown } from './ScreenTimeDeviceBreakdown'
import { ScreenTimeChart } from './ScreenTimeChart'

interface ScreenTimeCardProps {
  familyId: string
  childId: string
  childName: string
  /** Optional daily limit in minutes for comparison */
  dailyLimit?: number
}

/**
 * Loading skeleton for the screen time card
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
      data-testid="screen-time-loading"
      role="status"
      aria-label="Loading screen time data"
    >
      <div style={{ marginBottom: '16px' }}>
        <div
          style={{
            width: '120px',
            height: '16px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            marginBottom: '8px',
          }}
        />
        <div
          style={{
            width: '80px',
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
      data-testid="screen-time-error"
      role="alert"
    >
      <div style={{ color: '#dc2626', fontWeight: 500 }}>Unable to load screen time</div>
      <div style={{ color: '#991b1b', fontSize: '14px', marginTop: '4px' }}>{message}</div>
    </div>
  )
}

/**
 * Empty state when no screen time data exists
 */
function EmptyState({ childName }: { childName: string }) {
  return (
    <div
      style={{
        backgroundColor: '#f9fafb',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        textAlign: 'center',
      }}
      data-testid="screen-time-empty"
    >
      <div style={{ color: '#6b7280', fontSize: '14px' }}>
        No screen time data for {childName} yet.
      </div>
      <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '4px' }}>
        Screen time will appear once devices are enrolled and active.
      </div>
    </div>
  )
}

/**
 * Change indicator showing difference from yesterday
 */
function ChangeIndicator({ change }: { change: number }) {
  if (change === 0) {
    return (
      <span
        style={{
          fontSize: '12px',
          color: '#6b7280',
        }}
        data-testid="change-indicator"
      >
        Same as yesterday
      </span>
    )
  }

  const isIncrease = change > 0
  const absChange = Math.abs(change)

  return (
    <span
      style={{
        fontSize: '12px',
        color: isIncrease ? '#dc2626' : '#16a34a',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}
      data-testid="change-indicator"
    >
      <span aria-hidden="true">{isIncrease ? '▲' : '▼'}</span>
      <span>
        {formatDuration(absChange)} {isIncrease ? 'more' : 'less'} than yesterday
      </span>
    </span>
  )
}

/**
 * Limit comparison badge
 */
function LimitBadge({ current, limit }: { current: number; limit: number }) {
  const percentage = (current / limit) * 100
  const isOver = current > limit
  const isNear = !isOver && percentage >= 90

  let status: 'under' | 'near' | 'over' = 'under'
  if (isOver) status = 'over'
  else if (isNear) status = 'near'

  const statusColors = {
    under: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
    near: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    over: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  }

  const statusLabels = {
    under: 'Under limit',
    near: 'Near limit',
    over: 'Over limit',
  }

  const remaining = limit - current
  const remainingText =
    remaining > 0 ? `${formatDuration(remaining)} remaining` : `${formatDuration(-remaining)} over`

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '16px',
        backgroundColor: statusColors[status].bg,
        border: `1px solid ${statusColors[status].border}`,
        marginTop: '8px',
      }}
      data-testid="limit-badge"
    >
      <span
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: statusColors[status].text,
        }}
      >
        {status === 'over' ? '!' : status === 'near' ? '!' : '✓'} {statusLabels[status]} &middot;{' '}
        {remainingText}
      </span>
    </div>
  )
}

/**
 * Main ScreenTimeCard component
 */
export function ScreenTimeCard({ familyId, childId, childName, dailyLimit }: ScreenTimeCardProps) {
  const { data, loading, error } = useChildScreenTime({
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

  if (!data || (data.todayMinutes === 0 && data.weeklyData.length === 0)) {
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
      data-testid="screen-time-card"
    >
      {/* Header */}
      <div
        style={{
          marginBottom: '16px',
        }}
      >
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
          Screen Time Today
        </h3>
      </div>

      {/* Today's total */}
      <div
        style={{
          marginBottom: '16px',
        }}
        data-testid="today-total"
      >
        <div
          style={{
            fontSize: '36px',
            fontWeight: 700,
            color: '#1f2937',
            lineHeight: 1,
          }}
          aria-label={`${childName} has used ${formatDuration(data.todayMinutes)} of screen time today`}
        >
          {formatDuration(data.todayMinutes)}
        </div>

        {/* Change from yesterday */}
        <div style={{ marginTop: '4px' }}>
          <ChangeIndicator change={data.changeFromYesterday} />
        </div>

        {/* Limit comparison if limit is set */}
        {dailyLimit !== undefined && dailyLimit > 0 && (
          <LimitBadge current={data.todayMinutes} limit={dailyLimit} />
        )}
      </div>

      {/* Weekly average */}
      {data.weeklyAverage > 0 && (
        <div
          style={{
            fontSize: '12px',
            color: '#6b7280',
            marginBottom: '16px',
            padding: '8px 12px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
          }}
          data-testid="weekly-average"
        >
          Weekly average: <strong>{formatDuration(data.weeklyAverage)}</strong> per day
        </div>
      )}

      {/* Category breakdown */}
      {data.todayCategories.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <ScreenTimeCategoryBreakdown
            categories={data.todayCategories}
            totalMinutes={data.todayMinutes}
          />
        </div>
      )}

      {/* Device breakdown */}
      {data.todayDevices.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <ScreenTimeDeviceBreakdown devices={data.todayDevices} />
        </div>
      )}

      {/* Weekly chart */}
      {data.weeklyData.length > 0 && (
        <div>
          <ScreenTimeChart weeklyData={data.weeklyData} />
        </div>
      )}
    </div>
  )
}
