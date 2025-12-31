'use client'

/**
 * FlagPatternsCard Component - Story 22.5
 *
 * Card displaying flag patterns and analytics.
 *
 * Acceptance Criteria:
 * - AC2: Pattern summary visible
 * - AC3: Category breakdown visible
 * - AC4: Time-of-day analysis visible
 * - AC5: Patterns help identify when to have conversations
 */

import { useMemo } from 'react'
import type { FlagDocument, ConcernCategory } from '@fledgely/shared'

export interface FlagPatternsCardProps {
  /** All history flags to analyze */
  flags: FlagDocument[]
  /** Map of child IDs to names */
  childNameMap: Map<string, string>
}

const styles = {
  card: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    margin: 0,
  },
  sections: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  section: {
    padding: '12px',
    backgroundColor: '#ffffff',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#6b7280',
    marginBottom: '6px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  summaryText: {
    fontSize: '14px',
    color: '#1f2937',
    lineHeight: 1.5,
  },
  highlight: {
    fontWeight: 600,
    color: '#8b5cf6',
  },
  trendUp: {
    color: '#dc2626',
  },
  trendDown: {
    color: '#16a34a',
  },
  categoryList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  categoryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
  },
  categoryName: {
    color: '#374151',
  },
  categoryCount: {
    color: '#6b7280',
    fontWeight: 500,
  },
  progressBar: {
    height: '6px',
    backgroundColor: '#e5e7eb',
    borderRadius: '3px',
    overflow: 'hidden' as const,
    marginTop: '4px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: '3px',
  },
  insightBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '10px',
    backgroundColor: '#fef3c7',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#92400e',
  },
  emptyState: {
    textAlign: 'center' as const,
    color: '#6b7280',
    fontSize: '14px',
    padding: '16px',
  },
}

/**
 * Get start of month for a given date
 */
function startOfMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime()
}

/**
 * Format hour to readable string
 */
function formatHourRange(hour: number): string {
  const period = hour < 12 ? 'AM' : 'PM'
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return `${displayHour}${period}`
}

/**
 * Get category display name
 */
function getCategoryDisplayName(category: ConcernCategory): string {
  const names: Record<ConcernCategory, string> = {
    Violence: 'Violence',
    'Adult Content': 'Adult Content',
    Bullying: 'Bullying',
    'Self-Harm Indicators': 'Self-Harm',
    'Explicit Language': 'Explicit Language',
    'Unknown Contacts': 'Unknown Contacts',
  }
  return names[category] || category
}

/**
 * Calculate flag patterns from history
 */
function calculatePatterns(flags: FlagDocument[]) {
  const now = new Date()
  const thisMonthStart = startOfMonth(now)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthStart = startOfMonth(lastMonth)
  const lastMonthEnd = thisMonthStart - 1

  // This month vs last month
  const thisMonthFlags = flags.filter((f) => f.createdAt >= thisMonthStart)
  const lastMonthFlags = flags.filter(
    (f) => f.createdAt >= lastMonthStart && f.createdAt <= lastMonthEnd
  )

  // Category breakdown
  const categoryCount = new Map<ConcernCategory, number>()
  flags.forEach((f) => {
    categoryCount.set(f.category, (categoryCount.get(f.category) || 0) + 1)
  })
  const topCategories = [...categoryCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

  // Time of day distribution
  const hourCount = new Map<number, number>()
  flags.forEach((f) => {
    const hour = new Date(f.createdAt).getHours()
    hourCount.set(hour, (hourCount.get(hour) || 0) + 1)
  })
  const peakHours = [...hourCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)

  return {
    totalFlags: flags.length,
    thisMonthCount: thisMonthFlags.length,
    lastMonthCount: lastMonthFlags.length,
    trend: thisMonthFlags.length - lastMonthFlags.length,
    topCategories,
    peakHours,
    maxCategoryCount: topCategories[0]?.[1] || 0,
  }
}

/**
 * Generate insight text based on patterns
 */
function generateInsight(
  patterns: ReturnType<typeof calculatePatterns>,
  _childNameMap: Map<string, string>,
  _flags: FlagDocument[]
): string | null {
  if (patterns.totalFlags < 3) {
    return null
  }

  const insights: string[] = []

  // Peak time insight
  if (patterns.peakHours.length > 0) {
    const [peakHour] = patterns.peakHours[0]
    if (peakHour >= 21 || peakHour <= 5) {
      insights.push(`Most flags occur late at night (after ${formatHourRange(peakHour)}).`)
    } else if (peakHour >= 15 && peakHour <= 18) {
      insights.push(`Most flags occur in the afternoon after school.`)
    }
  }

  // Trend insight
  if (patterns.trend > 2) {
    insights.push(`Flag activity is up this month.`)
  } else if (patterns.trend < -2) {
    insights.push(`Flag activity has decreased this month.`)
  }

  // Category insight
  if (patterns.topCategories.length > 0) {
    const [topCategory, count] = patterns.topCategories[0]
    if (count >= 3) {
      insights.push(`${getCategoryDisplayName(topCategory)} is the most common concern.`)
    }
  }

  return insights.length > 0 ? insights.join(' ') : null
}

/**
 * FlagPatternsCard - Card displaying flag patterns
 */
export function FlagPatternsCard({ flags, childNameMap }: FlagPatternsCardProps) {
  const patterns = useMemo(() => calculatePatterns(flags), [flags])
  const insight = useMemo(
    () => generateInsight(patterns, childNameMap, flags),
    [patterns, childNameMap, flags]
  )

  if (patterns.totalFlags === 0) {
    return null // Don't show card if no flags
  }

  return (
    <div style={styles.card} data-testid="flag-patterns-card">
      <div style={styles.header}>
        <span role="img" aria-label="Chart">
          📊
        </span>
        <h3 style={styles.title}>Flag Patterns</h3>
      </div>

      <div style={styles.sections}>
        {/* Monthly Summary - AC2 */}
        <div style={styles.section} data-testid="monthly-summary">
          <div style={styles.sectionTitle}>This Month</div>
          <div style={styles.summaryText}>
            <span style={styles.highlight} data-testid="this-month-count">
              {patterns.thisMonthCount}
            </span>{' '}
            {patterns.thisMonthCount === 1 ? 'flag' : 'flags'}
            {patterns.lastMonthCount > 0 && (
              <span>
                {' '}
                (
                <span
                  style={
                    patterns.trend > 0 ? styles.trendUp : patterns.trend < 0 ? styles.trendDown : {}
                  }
                  data-testid="trend-indicator"
                >
                  {patterns.trend > 0 ? '↑' : patterns.trend < 0 ? '↓' : '→'}{' '}
                  {patterns.trend > 0 ? 'up' : patterns.trend < 0 ? 'down' : 'same'}{' '}
                  {Math.abs(patterns.trend)} from last month
                </span>
                )
              </span>
            )}
          </div>
        </div>

        {/* Category Breakdown - AC3 */}
        {patterns.topCategories.length > 0 && (
          <div style={styles.section} data-testid="category-breakdown">
            <div style={styles.sectionTitle}>Top Categories</div>
            <div style={styles.categoryList}>
              {patterns.topCategories.map(([category, count]) => (
                <div key={category}>
                  <div style={styles.categoryRow}>
                    <span style={styles.categoryName}>{getCategoryDisplayName(category)}</span>
                    <span style={styles.categoryCount}>{count}</span>
                  </div>
                  <div style={styles.progressBar}>
                    <div
                      style={{
                        ...styles.progressFill,
                        width: `${(count / patterns.maxCategoryCount) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Time Analysis - AC4 */}
        {patterns.peakHours.length > 0 && (
          <div style={styles.section} data-testid="time-analysis">
            <div style={styles.sectionTitle}>Peak Times</div>
            <div style={styles.summaryText}>
              Most flags occur around{' '}
              <span style={styles.highlight}>
                {patterns.peakHours.map(([hour]) => formatHourRange(hour)).join(', ')}
              </span>
            </div>
          </div>
        )}

        {/* Insight - AC5 */}
        {insight && (
          <div style={styles.insightBox} data-testid="pattern-insight">
            <span role="img" aria-label="Tip">
              💡
            </span>
            <span>{insight}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default FlagPatternsCard
