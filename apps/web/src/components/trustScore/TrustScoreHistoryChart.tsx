'use client'

/**
 * TrustScoreHistoryChart Component - Story 36.4 Task 2
 *
 * Historical chart showing score over time with milestone markers.
 *
 * AC2: Historical chart: trust score over time
 * AC3: Milestone markers: "Reached 90 on Sept 15"
 */

import { useState } from 'react'
import { type TrustScoreHistoryEntry } from '@fledgely/shared'

// ============================================================================
// Types
// ============================================================================

export interface TrustScoreHistoryChartProps {
  /** Score history entries */
  history: TrustScoreHistoryEntry[]
  /** Current score to show as latest point */
  currentScore: number
}

type TimeRange = 'week' | 'month' | 'all'

// ============================================================================
// Milestone Detection
// ============================================================================

interface Milestone {
  threshold: number
  date: Date
  score: number
}

function detectMilestones(history: TrustScoreHistoryEntry[]): Milestone[] {
  const milestones: Milestone[] = []
  const thresholds = [90, 80, 70, 60, 50]

  for (const entry of history) {
    for (const threshold of thresholds) {
      if (entry.previousScore < threshold && entry.score >= threshold) {
        milestones.push({
          threshold,
          date: entry.date,
          score: entry.score,
        })
      }
    }
  }

  return milestones
}

// ============================================================================
// Range Selector Component
// ============================================================================

interface RangeSelectorProps {
  selected: TimeRange
  onSelect: (range: TimeRange) => void
}

function RangeSelector({ selected, onSelect }: RangeSelectorProps) {
  const ranges: { value: TimeRange; label: string }[] = [
    { value: 'week', label: 'Week' },
    { value: 'month', label: 'Month' },
    { value: 'all', label: 'All' },
  ]

  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        padding: '4px',
      }}
      data-testid="range-selector"
    >
      {ranges.map(({ value, label }) => (
        <button
          key={value}
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            fontWeight: 500,
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            backgroundColor: selected === value ? 'white' : 'transparent',
            color: selected === value ? '#111827' : '#6b7280',
            boxShadow: selected === value ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
          }}
          data-testid={`range-${value}`}
          data-selected={selected === value}
          onClick={() => onSelect(value)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// Chart Visualization
// ============================================================================

interface ChartProps {
  history: TrustScoreHistoryEntry[]
  currentScore: number
  milestones: Milestone[]
  onHover: (entry: TrustScoreHistoryEntry | null, index: number) => void
}

function Chart({ history, currentScore, milestones, onHover }: ChartProps) {
  if (history.length === 0) {
    return (
      <div
        style={{
          height: '160px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          color: '#6b7280',
          fontSize: '14px',
        }}
        data-testid="chart-empty"
      >
        No history yet. Check back soon!
      </div>
    )
  }

  // Simple bar chart visualization
  const maxScore = 100
  const chartHeight = 160

  return (
    <div
      style={{
        height: `${chartHeight}px`,
        display: 'flex',
        alignItems: 'flex-end',
        gap: '4px',
        padding: '8px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
      }}
      data-testid="chart-data-points"
    >
      {history.map((entry, index) => {
        const height = (entry.score / maxScore) * (chartHeight - 20)
        const isMilestone = milestones.some((m) => m.date.getTime() === entry.date.getTime())

        return (
          <div
            key={index}
            style={{
              flex: 1,
              height: `${height}px`,
              backgroundColor: isMilestone ? '#f59e0b' : '#10b981',
              borderRadius: '4px 4px 0 0',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            data-testid={`data-point-${index}`}
            tabIndex={0}
            onMouseEnter={() => onHover(entry, index)}
            onMouseLeave={() => onHover(null, -1)}
            onFocus={() => onHover(entry, index)}
            onBlur={() => onHover(null, -1)}
            aria-label={`Score: ${entry.score} on ${entry.date.toLocaleDateString()}`}
          />
        )
      })}

      {/* Current score point */}
      <div
        style={{
          flex: 1,
          height: `${(currentScore / maxScore) * (chartHeight - 20)}px`,
          backgroundColor: '#3b82f6',
          borderRadius: '4px 4px 0 0',
          border: '2px solid #1d4ed8',
        }}
        data-testid="current-score-point"
        aria-label={`Current score: ${currentScore}`}
      />
    </div>
  )
}

// ============================================================================
// Tooltip Component
// ============================================================================

interface TooltipProps {
  entry: TrustScoreHistoryEntry
}

function Tooltip({ entry }: TooltipProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        padding: '8px 12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 10,
      }}
      data-testid="chart-tooltip"
    >
      <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>{entry.score}</div>
      <div style={{ fontSize: '12px', color: '#6b7280' }}>{entry.date.toLocaleDateString()}</div>
    </div>
  )
}

// ============================================================================
// Milestone Markers
// ============================================================================

interface MilestoneMarkersProps {
  milestones: Milestone[]
}

function MilestoneMarkers({ milestones }: MilestoneMarkersProps) {
  if (milestones.length === 0) return null

  return (
    <div style={{ marginTop: '12px' }}>
      {milestones.map((milestone, index) => (
        <div
          key={index}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            backgroundColor: '#fffbeb',
            borderRadius: '4px',
            marginRight: '8px',
            marginBottom: '4px',
          }}
          data-testid={`milestone-marker-${milestone.threshold}`}
        >
          <span style={{ fontSize: '12px' }}>⭐</span>
          <span style={{ fontSize: '12px', color: '#92400e' }}>Reached {milestone.threshold}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function TrustScoreHistoryChart({ history, currentScore }: TrustScoreHistoryChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>('month')
  const [hoveredEntry, setHoveredEntry] = useState<TrustScoreHistoryEntry | null>(null)

  const milestones = detectMilestones(history)

  // Filter history based on range
  const now = new Date()
  const filteredHistory = history.filter((entry) => {
    const daysDiff = (now.getTime() - entry.date.getTime()) / (1000 * 60 * 60 * 24)
    if (selectedRange === 'week') return daysDiff <= 7
    if (selectedRange === 'month') return daysDiff <= 30
    return true
  })

  const handleHover = (entry: TrustScoreHistoryEntry | null, _index: number) => {
    setHoveredEntry(entry)
  }

  return (
    <div
      style={{ position: 'relative' }}
      data-testid="trust-score-history-chart"
      aria-label="Trust score history chart"
    >
      {/* Header with range selector */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <h4
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#374151',
            margin: 0,
          }}
        >
          Score History
        </h4>
        <RangeSelector selected={selectedRange} onSelect={setSelectedRange} />
      </div>

      {/* Chart */}
      <Chart
        history={filteredHistory}
        currentScore={currentScore}
        milestones={milestones}
        onHover={handleHover}
      />

      {/* Tooltip */}
      {hoveredEntry && <Tooltip entry={hoveredEntry} />}

      {/* Milestone markers */}
      <MilestoneMarkers milestones={milestones} />
    </div>
  )
}
