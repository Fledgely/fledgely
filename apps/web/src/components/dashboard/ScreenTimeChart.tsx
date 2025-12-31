'use client'

/**
 * ScreenTimeChart Component - Story 29.4
 *
 * Bar chart visualization for weekly screen time trends.
 *
 * Acceptance Criteria:
 * - AC4: Daily/weekly trend chart
 */

import type { ScreenTimeCategory } from '@fledgely/shared'
import {
  formatDuration,
  getCategoryColor,
  getCategoryLabel,
  type DailyScreenTime,
} from '../../hooks/useChildScreenTime'

interface ScreenTimeChartProps {
  /** Weekly data (up to 7 days) */
  weeklyData: DailyScreenTime[]
}

/**
 * Get short day name from date string
 */
function getDayName(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T12:00:00') // Add time to avoid timezone issues
    return date.toLocaleDateString('en-US', { weekday: 'short' })
  } catch {
    return dateStr.slice(-2)
  }
}

/**
 * Check if date is weekend
 */
function isWeekend(dateStr: string): boolean {
  try {
    const date = new Date(dateStr + 'T12:00:00')
    const day = date.getDay()
    return day === 0 || day === 6
  } catch {
    return false
  }
}

/**
 * Category order for consistent stacking
 */
const CATEGORY_ORDER: ScreenTimeCategory[] = [
  'education',
  'productivity',
  'entertainment',
  'social_media',
  'gaming',
  'communication',
  'news',
  'shopping',
  'other',
]

/**
 * Single day bar with stacked categories
 */
function DayBar({ data, maxMinutes }: { data: DailyScreenTime; maxMinutes: number }) {
  const dayName = getDayName(data.date)
  const weekend = isWeekend(data.date)
  const totalMinutes = data.totalMinutes
  const barWidth = maxMinutes > 0 ? Math.min((totalMinutes / maxMinutes) * 100, 100) : 0

  // Build category map for quick lookup
  const categoryMap = new Map<ScreenTimeCategory, number>()
  for (const entry of data.categories) {
    categoryMap.set(entry.category, entry.minutes)
  }

  return (
    <div
      data-testid={`day-bar-${data.date}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '8px',
      }}
    >
      {/* Day label */}
      <div
        style={{
          width: '32px',
          fontSize: '12px',
          fontWeight: weekend ? 600 : 400,
          color: weekend ? '#8b5cf6' : '#6b7280',
        }}
      >
        {dayName}
      </div>

      {/* Stacked bar */}
      <div
        style={{
          flex: 1,
          height: '24px',
          backgroundColor: '#f3f4f6',
          borderRadius: '4px',
          overflow: 'hidden',
          display: 'flex',
        }}
        role="img"
        aria-label={`${dayName}: ${formatDuration(totalMinutes)} total screen time`}
      >
        <div
          style={{
            width: `${barWidth}%`,
            height: '100%',
            display: 'flex',
            transition: 'width 0.3s ease',
          }}
        >
          {/* Stacked segments by category */}
          {CATEGORY_ORDER.map((category) => {
            const categoryMinutes = categoryMap.get(category) || 0
            if (categoryMinutes === 0) return null
            const segmentWidth = totalMinutes > 0 ? (categoryMinutes / totalMinutes) * 100 : 0
            return (
              <div
                key={category}
                style={{
                  width: `${segmentWidth}%`,
                  height: '100%',
                  backgroundColor: getCategoryColor(category),
                  minWidth: categoryMinutes > 0 ? '2px' : 0,
                }}
                title={`${getCategoryLabel(category)}: ${formatDuration(categoryMinutes)}`}
              />
            )
          })}
        </div>
      </div>

      {/* Duration */}
      <div
        style={{
          width: '50px',
          fontSize: '12px',
          fontWeight: 500,
          color: '#6b7280',
          textAlign: 'right',
        }}
      >
        {formatDuration(totalMinutes)}
      </div>
    </div>
  )
}

/**
 * Legend showing category colors
 */
function ChartLegend({ categories }: { categories: ScreenTimeCategory[] }) {
  return (
    <div
      data-testid="chart-legend"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid #e5e7eb',
      }}
    >
      {categories.map((category) => (
        <div
          key={category}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            color: '#6b7280',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '2px',
              backgroundColor: getCategoryColor(category),
            }}
            aria-hidden="true"
          />
          <span>{getCategoryLabel(category)}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * ScreenTimeChart - Weekly bar chart
 */
export function ScreenTimeChart({ weeklyData }: ScreenTimeChartProps) {
  if (weeklyData.length === 0) {
    return null
  }

  // Calculate max for scaling (use actual max or minimum of 60 minutes)
  const maxMinutes = Math.max(...weeklyData.map((d) => d.totalMinutes), 60)

  // Get unique categories used across all days for legend
  const usedCategories = new Set<ScreenTimeCategory>()
  for (const day of weeklyData) {
    for (const entry of day.categories) {
      if (entry.minutes > 0) {
        usedCategories.add(entry.category)
      }
    }
  }

  // Filter to only used categories, maintaining order
  const legendCategories = CATEGORY_ORDER.filter((cat) => usedCategories.has(cat))

  return (
    <div data-testid="screen-time-chart">
      <div
        style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#6b7280',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        This Week
      </div>

      {/* Chart bars */}
      <div data-testid="chart-bars">
        {weeklyData.map((day) => (
          <DayBar key={day.date} data={day} maxMinutes={maxMinutes} />
        ))}
      </div>

      {/* Legend */}
      {legendCategories.length > 0 && <ChartLegend categories={legendCategories} />}
    </div>
  )
}
