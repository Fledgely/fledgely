'use client'

/**
 * ScreenTimeCategoryBreakdown Component - Story 29.4
 *
 * Displays screen time breakdown by category with color-coded progress bars.
 *
 * Acceptance Criteria:
 * - AC3: Breakdown by category: "Education: 1.5h, Gaming: 1h, Social: 30m"
 */

import type { CategoryTimeEntry, ScreenTimeCategory } from '@fledgely/shared'
import { formatDuration, getCategoryColor, getCategoryLabel } from '../../hooks/useChildScreenTime'

interface ScreenTimeCategoryBreakdownProps {
  /** Category time entries */
  categories: CategoryTimeEntry[]
  /** Total minutes for percentage calculation */
  totalMinutes: number
}

/**
 * Single category row with progress bar
 */
function CategoryRow({
  category,
  minutes,
  totalMinutes,
}: {
  category: ScreenTimeCategory
  minutes: number
  totalMinutes: number
}) {
  const percentage = totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0
  const color = getCategoryColor(category)
  const label = getCategoryLabel(category)

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
          backgroundColor: color,
          flexShrink: 0,
        }}
        aria-hidden="true"
      />

      {/* Label */}
      <div
        style={{
          width: '100px',
          fontSize: '13px',
          color: '#374151',
          flexShrink: 0,
        }}
      >
        {label}
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
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${formatDuration(minutes)}, ${Math.round(percentage)}% of total`}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            backgroundColor: color,
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
          color: '#6b7280',
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
 * ScreenTimeCategoryBreakdown - Category breakdown with progress bars
 */
export function ScreenTimeCategoryBreakdown({
  categories,
  totalMinutes,
}: ScreenTimeCategoryBreakdownProps) {
  // Sort categories by minutes descending
  const sortedCategories = [...categories].sort((a, b) => b.minutes - a.minutes)

  if (sortedCategories.length === 0) {
    return null
  }

  return (
    <div data-testid="category-breakdown">
      <div
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#6b7280',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        By Category
      </div>
      {sortedCategories.map((entry) => (
        <CategoryRow
          key={entry.category}
          category={entry.category}
          minutes={entry.minutes}
          totalMinutes={totalMinutes}
        />
      ))}
    </div>
  )
}
