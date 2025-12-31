'use client'

/**
 * DemoTimeChart Component - Story 8.5.3
 *
 * Bar chart visualization for demo time tracking data.
 *
 * Acceptance Criteria:
 * - AC4: Graphs and visualizations use demo data
 * - AC1: Daily/weekly screen time breakdown
 */

import type { DemoDailySummary, DemoTimeCategory } from '../../../data/demoData'
import { TIME_CATEGORY_COLORS, TIME_CATEGORY_LABELS, formatDuration } from '../../../data/demoData'

export interface DemoTimeChartProps {
  /** Daily summaries to display */
  summaries: DemoDailySummary[]
  /** Maximum value for bar scaling (optional - auto-calculates) */
  maxMinutes?: number
}

/**
 * Single bar component for a day
 */
function DayBar({ summary, maxMinutes }: { summary: DemoDailySummary; maxMinutes: number }) {
  const { dayName, totalMinutes, byCategory, limitStatus, isWeekend } = summary
  const barWidth = Math.min((totalMinutes / maxMinutes) * 100, 100)

  // Status colors
  const statusColors = {
    under: '#22c55e', // Green
    at: '#f59e0b', // Amber
    over: '#ef4444', // Red
  }

  return (
    <div
      data-testid={`day-bar-${dayName.toLowerCase()}`}
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
          width: '36px',
          fontSize: '12px',
          fontWeight: isWeekend ? 600 : 400,
          color: isWeekend ? '#8b5cf6' : '#6b7280',
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
          {(['educational', 'entertainment', 'social', 'other'] as DemoTimeCategory[]).map(
            (category) => {
              const categoryMinutes = byCategory[category]
              if (categoryMinutes === 0) return null
              const segmentWidth = (categoryMinutes / totalMinutes) * 100
              return (
                <div
                  key={category}
                  style={{
                    width: `${segmentWidth}%`,
                    height: '100%',
                    backgroundColor: TIME_CATEGORY_COLORS[category],
                    minWidth: categoryMinutes > 0 ? '2px' : 0,
                  }}
                  title={`${TIME_CATEGORY_LABELS[category]}: ${formatDuration(categoryMinutes)}`}
                />
              )
            }
          )}
        </div>
      </div>

      {/* Duration and status */}
      <div
        style={{
          width: '60px',
          fontSize: '12px',
          fontWeight: 500,
          color: statusColors[limitStatus],
          textAlign: 'right',
        }}
      >
        {formatDuration(totalMinutes)}
      </div>

      {/* Status indicator */}
      {limitStatus === 'over' && (
        <div
          data-testid="over-limit-indicator"
          style={{
            fontSize: '10px',
            backgroundColor: '#fef2f2',
            color: '#ef4444',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 500,
          }}
        >
          Over
        </div>
      )}
    </div>
  )
}

/**
 * DemoTimeChart - Bar chart for daily time tracking
 */
export function DemoTimeChart({ summaries, maxMinutes: propMaxMinutes }: DemoTimeChartProps) {
  // Calculate max for scaling (use prop or auto-calculate)
  const maxMinutes = propMaxMinutes ?? Math.max(...summaries.map((s) => s.totalMinutes), 180)

  return (
    <div
      data-testid="demo-time-chart"
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
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>Daily Screen Time</span>
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

      {/* Chart */}
      <div data-testid="chart-bars">
        {summaries.map((summary) => (
          <DayBar key={summary.date} summary={summary} maxMinutes={maxMinutes} />
        ))}
      </div>

      {/* Legend */}
      <div
        data-testid="chart-legend"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid #e9d5ff',
        }}
      >
        {(['educational', 'entertainment', 'social', 'other'] as DemoTimeCategory[]).map(
          (category) => (
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
                  backgroundColor: TIME_CATEGORY_COLORS[category],
                }}
              />
              <span>{TIME_CATEGORY_LABELS[category]}</span>
            </div>
          )
        )}
      </div>
    </div>
  )
}
