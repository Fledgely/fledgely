'use client'

/**
 * DemoTimeSummary Component - Story 8.5.3
 *
 * Summary card showing total time and category breakdown.
 *
 * Acceptance Criteria:
 * - AC1: Daily/weekly screen time breakdown
 * - AC2: Activity type categorization
 * - AC3: Time limit indicators
 */

import type { DemoTimeCategory } from '../../../data/demoData'
import {
  TIME_CATEGORY_COLORS,
  TIME_CATEGORY_LABELS,
  getDemoTimeLimit,
  formatDuration,
} from '../../../data/demoData'

export interface DemoTimeSummaryProps {
  /** Total screen time in minutes */
  totalMinutes: number
  /** Breakdown by category */
  byCategory: Record<DemoTimeCategory, number>
  /** Period label (e.g., "Today", "This Week") */
  period: string
  /** Daily limit for comparison */
  dailyLimit?: number
}

/**
 * Category progress bar
 */
function CategoryRow({
  category,
  minutes,
  totalMinutes,
  limit,
}: {
  category: DemoTimeCategory
  minutes: number
  totalMinutes: number
  limit?: number
}) {
  const percentage = totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0
  const isOverLimit = limit !== undefined && minutes > limit

  return (
    <div
      data-testid={`category-row-${category}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
      }}
    >
      {/* Color indicator */}
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '2px',
          backgroundColor: TIME_CATEGORY_COLORS[category],
          flexShrink: 0,
        }}
      />

      {/* Label */}
      <div
        style={{
          width: '90px',
          fontSize: '12px',
          color: '#374151',
          flexShrink: 0,
        }}
      >
        {TIME_CATEGORY_LABELS[category]}
      </div>

      {/* Progress bar */}
      <div
        style={{
          flex: 1,
          height: '8px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: TIME_CATEGORY_COLORS[category],
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Duration */}
      <div
        style={{
          width: '50px',
          fontSize: '12px',
          fontWeight: 500,
          color: isOverLimit ? '#ef4444' : '#6b7280',
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {formatDuration(minutes)}
      </div>
    </div>
  )
}

/**
 * DemoTimeSummary - Summary card with time breakdown
 */
export function DemoTimeSummary({
  totalMinutes,
  byCategory,
  period,
  dailyLimit = getDemoTimeLimit('total'),
}: DemoTimeSummaryProps) {
  const isOverLimit = totalMinutes > dailyLimit
  const isNearLimit = !isOverLimit && totalMinutes >= dailyLimit * 0.9
  const limitPercentage = Math.min((totalMinutes / dailyLimit) * 100, 100)

  // Status for display
  let limitStatus: 'under' | 'at' | 'over' = 'under'
  if (isOverLimit) limitStatus = 'over'
  else if (isNearLimit) limitStatus = 'at'

  const statusColors = {
    under: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
    at: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    over: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
  }

  const statusLabels = {
    under: 'Under Limit',
    at: 'Approaching Limit',
    over: 'Over Limit',
  }

  return (
    <div
      data-testid="demo-time-summary"
      style={{
        backgroundColor: '#faf5ff',
        border: '2px dashed #c4b5fd',
        borderRadius: '12px',
        padding: '16px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            color: '#5b21b6',
          }}
        >
          {period} Screen Time
        </h4>
        <span
          data-testid="demo-badge"
          style={{
            backgroundColor: '#8b5cf6',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: 600,
          }}
        >
          Demo Data
        </span>
      </div>

      {/* Total time with limit indicator */}
      <div
        data-testid="total-time-display"
        style={{
          textAlign: 'center',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            fontSize: '32px',
            fontWeight: 700,
            color: isOverLimit ? '#ef4444' : '#5b21b6',
          }}
        >
          {formatDuration(totalMinutes)}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: '#6b7280',
            marginTop: '4px',
          }}
        >
          of {formatDuration(dailyLimit)} limit
        </div>
      </div>

      {/* Limit progress bar */}
      <div
        data-testid="limit-progress"
        style={{
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            height: '8px',
            backgroundColor: '#e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden',
          }}
        >
          <div
            data-testid="limit-bar"
            style={{
              width: `${limitPercentage}%`,
              height: '100%',
              backgroundColor: isOverLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : '#22c55e',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Status badge */}
      <div
        data-testid="limit-status"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '16px',
          backgroundColor: statusColors[limitStatus].bg,
          border: `1px solid ${statusColors[limitStatus].border}`,
          marginBottom: '16px',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 500,
            color: statusColors[limitStatus].text,
          }}
        >
          {limitStatus === 'over' ? '⚠️' : limitStatus === 'at' ? '⏰' : '✓'}{' '}
          {statusLabels[limitStatus]}
        </span>
      </div>

      {/* Category breakdown */}
      <div data-testid="category-breakdown">
        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#5b21b6',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          By Category
        </div>
        {(['educational', 'entertainment', 'social', 'other'] as DemoTimeCategory[]).map(
          (category) => (
            <CategoryRow
              key={category}
              category={category}
              minutes={byCategory[category]}
              totalMinutes={totalMinutes}
            />
          )
        )}
      </div>
    </div>
  )
}
