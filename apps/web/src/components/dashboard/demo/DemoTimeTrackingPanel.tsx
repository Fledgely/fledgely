'use client'

/**
 * DemoTimeTrackingPanel Component - Story 8.5.3
 *
 * Complete time tracking panel combining chart and summary.
 *
 * Acceptance Criteria:
 * - AC5: Realistic patterns (school days vs weekends)
 * - AC6: Interactive filters and date ranges
 */

import { useState, useMemo } from 'react'
import { DemoTimeChart } from './DemoTimeChart'
import { DemoTimeSummary } from './DemoTimeSummary'
import type { DemoDailySummary } from '../../../data/demoData'
import {
  getDemoTimeSummaryByDay,
  getDemoWeeklyTimeByCategory,
  getDemoWeeklyTotalTime,
  getDemoTimeLimit,
} from '../../../data/demoData'

export interface DemoTimeTrackingPanelProps {
  /** Optional custom summaries (defaults to demo data) */
  summaries?: DemoDailySummary[]
}

type DateRange = 'today' | 'week'

/**
 * Tab button component
 */
function TabButton({
  label,
  active,
  onClick,
  testId,
}: {
  label: string
  active: boolean
  onClick: () => void
  testId: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      style={{
        padding: '8px 16px',
        borderRadius: '8px',
        border: active ? '2px solid #8b5cf6' : '1px solid #d1d5db',
        backgroundColor: active ? '#f3e8ff' : '#fff',
        color: active ? '#7c3aed' : '#374151',
        fontSize: '13px',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  )
}

/**
 * DemoTimeTrackingPanel - Full time tracking panel
 */
export function DemoTimeTrackingPanel({ summaries: propSummaries }: DemoTimeTrackingPanelProps) {
  const [dateRange, setDateRange] = useState<DateRange>('week')

  // Get demo data
  const allSummaries = propSummaries ?? getDemoTimeSummaryByDay()

  // Filter based on date range
  const filteredSummaries = useMemo(() => {
    if (dateRange === 'today') {
      return allSummaries.slice(0, 1) // Just today
    }
    return allSummaries // All 7 days
  }, [dateRange, allSummaries])

  // Calculate totals for summary display
  const summaryData = useMemo(() => {
    if (dateRange === 'today' && filteredSummaries.length > 0) {
      const today = filteredSummaries[0]
      return {
        totalMinutes: today.totalMinutes,
        byCategory: today.byCategory,
        period: 'Today',
        dailyLimit: getDemoTimeLimit('total'),
      }
    }

    // Week totals
    return {
      totalMinutes: getDemoWeeklyTotalTime(),
      byCategory: getDemoWeeklyTimeByCategory(),
      period: 'This Week',
      dailyLimit: getDemoTimeLimit('total') * 7, // Weekly limit
    }
  }, [dateRange, filteredSummaries])

  return (
    <div data-testid="demo-time-tracking-panel">
      {/* Header with date range selector */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: '#5b21b6',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>📊</span>
          <span>Demo Time Tracking</span>
        </h3>
        <span
          data-testid="panel-demo-badge"
          style={{
            backgroundColor: '#8b5cf6',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
          }}
        >
          🎭 Sample Data
        </span>
      </div>

      {/* Date range tabs (AC6) */}
      <div
        data-testid="date-range-selector"
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
        }}
      >
        <TabButton
          label="Today"
          active={dateRange === 'today'}
          onClick={() => setDateRange('today')}
          testId="tab-today"
        />
        <TabButton
          label="This Week"
          active={dateRange === 'week'}
          onClick={() => setDateRange('week')}
          testId="tab-week"
        />
      </div>

      {/* Panel content */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '16px',
        }}
      >
        {/* Summary card */}
        <DemoTimeSummary
          totalMinutes={summaryData.totalMinutes}
          byCategory={summaryData.byCategory}
          period={summaryData.period}
          dailyLimit={summaryData.dailyLimit}
        />

        {/* Chart (only show for week view) */}
        {dateRange === 'week' && <DemoTimeChart summaries={filteredSummaries} />}
      </div>

      {/* Pattern insights (AC5) */}
      <div
        data-testid="pattern-insights"
        style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#f3e8ff',
          borderRadius: '8px',
          fontSize: '12px',
          color: '#5b21b6',
        }}
      >
        <strong>Pattern Insight:</strong> Screen time is typically higher on weekends with more
        entertainment activities, while weekdays show more educational content usage.
      </div>
    </div>
  )
}
