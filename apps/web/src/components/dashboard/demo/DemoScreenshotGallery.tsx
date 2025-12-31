'use client'

/**
 * DemoScreenshotGallery Component - Story 8.5.2
 *
 * Gallery view for demo screenshots with filtering and timeline grouping.
 *
 * Acceptance Criteria:
 * - AC1: Category variety display
 * - AC4: Timeline view with multiple days
 * - AC6: Filter and search functionality
 */

import { useState, useMemo } from 'react'
import { DemoScreenshotCard } from './DemoScreenshotCard'
import type { DemoScreenshot, DemoScreenshotCategory } from '../../../data/demoData'
import { DEMO_SCREENSHOTS, CATEGORY_LABELS } from '../../../data/demoData'

export interface DemoScreenshotGalleryProps {
  /** Optional custom screenshots (defaults to DEMO_SCREENSHOTS) */
  screenshots?: DemoScreenshot[]
}

type FilterCategory = DemoScreenshotCategory | 'all' | 'flagged'

/**
 * Filter chip component
 */
function FilterChip({
  label,
  active,
  onClick,
  count,
  isFlagged,
}: {
  label: string
  active: boolean
  onClick: () => void
  count: number
  isFlagged?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={`filter-chip-${label.toLowerCase().replace(' ', '-')}`}
      style={{
        padding: '6px 12px',
        borderRadius: '16px',
        border: active ? '2px solid #8b5cf6' : '1px solid #d1d5db',
        backgroundColor: active ? '#f3e8ff' : '#fff',
        color: active ? '#7c3aed' : isFlagged ? '#ea580c' : '#374151',
        fontSize: '13px',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'all 0.15s ease',
      }}
    >
      {isFlagged && <span>🚩</span>}
      <span>{label}</span>
      <span
        style={{
          backgroundColor: active ? '#8b5cf6' : '#e5e7eb',
          color: active ? '#fff' : '#6b7280',
          padding: '1px 6px',
          borderRadius: '10px',
          fontSize: '11px',
          fontWeight: 600,
        }}
      >
        {count}
      </span>
    </button>
  )
}

/**
 * Group screenshots by day for timeline view
 */
function groupByDay(screenshots: DemoScreenshot[]): Map<string, DemoScreenshot[]> {
  const grouped = new Map<string, DemoScreenshot[]>()

  // Sort by timestamp descending (most recent first)
  const sorted = [...screenshots].sort((a, b) => b.timestamp - a.timestamp)

  for (const screenshot of sorted) {
    const date = new Date(screenshot.timestamp)
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)

    let dayKey: string
    if (date.toDateString() === now.toDateString()) {
      dayKey = 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      dayKey = 'Yesterday'
    } else {
      dayKey = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })
    }

    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, [])
    }
    grouped.get(dayKey)!.push(screenshot)
  }

  return grouped
}

/**
 * DemoScreenshotGallery - Gallery with filtering and timeline
 */
export function DemoScreenshotGallery({
  screenshots = DEMO_SCREENSHOTS,
}: DemoScreenshotGalleryProps) {
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Calculate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<FilterCategory, number> = {
      all: screenshots.length,
      homework: 0,
      gaming: 0,
      social: 0,
      video: 0,
      creative: 0,
      flagged: 0,
    }

    for (const s of screenshots) {
      counts[s.category]++
      if (s.flagged) counts.flagged++
    }

    return counts
  }, [screenshots])

  // Filter and search screenshots
  const filteredScreenshots = useMemo(() => {
    let result = screenshots

    // Apply category filter
    if (activeFilter === 'flagged') {
      result = result.filter((s) => s.flagged)
    } else if (activeFilter !== 'all') {
      result = result.filter((s) => s.category === activeFilter)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (s) => s.title.toLowerCase().includes(query) || s.url.toLowerCase().includes(query)
      )
    }

    return result
  }, [screenshots, activeFilter, searchQuery])

  // Group filtered results by day
  const groupedScreenshots = useMemo(() => groupByDay(filteredScreenshots), [filteredScreenshots])

  return (
    <div
      data-testid="demo-screenshot-gallery"
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
          <span>📸</span>
          <span>Demo Screenshot Gallery</span>
        </h3>
        <span
          data-testid="demo-badge"
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

      {/* Filter chips - AC6 */}
      <div
        data-testid="filter-chips"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <FilterChip
          label="All"
          active={activeFilter === 'all'}
          onClick={() => setActiveFilter('all')}
          count={categoryCounts.all}
        />
        <FilterChip
          label={CATEGORY_LABELS.homework}
          active={activeFilter === 'homework'}
          onClick={() => setActiveFilter('homework')}
          count={categoryCounts.homework}
        />
        <FilterChip
          label={CATEGORY_LABELS.gaming}
          active={activeFilter === 'gaming'}
          onClick={() => setActiveFilter('gaming')}
          count={categoryCounts.gaming}
        />
        <FilterChip
          label={CATEGORY_LABELS.social}
          active={activeFilter === 'social'}
          onClick={() => setActiveFilter('social')}
          count={categoryCounts.social}
        />
        <FilterChip
          label={CATEGORY_LABELS.video}
          active={activeFilter === 'video'}
          onClick={() => setActiveFilter('video')}
          count={categoryCounts.video}
        />
        <FilterChip
          label={CATEGORY_LABELS.creative}
          active={activeFilter === 'creative'}
          onClick={() => setActiveFilter('creative')}
          count={categoryCounts.creative}
        />
        <FilterChip
          label="Flagged"
          active={activeFilter === 'flagged'}
          onClick={() => setActiveFilter('flagged')}
          count={categoryCounts.flagged}
          isFlagged
        />
      </div>

      {/* Search input - AC6 */}
      <div style={{ marginBottom: '16px' }}>
        <input
          type="text"
          placeholder="Search screenshots by title or URL..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="search-input"
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '14px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Results count */}
      <div
        data-testid="results-count"
        style={{
          fontSize: '13px',
          color: '#6b7280',
          marginBottom: '12px',
        }}
      >
        Showing {filteredScreenshots.length} of {screenshots.length} screenshots
      </div>

      {/* Timeline view - AC4 */}
      {filteredScreenshots.length === 0 ? (
        <div
          data-testid="no-results"
          style={{
            textAlign: 'center',
            padding: '24px',
            color: '#6b7280',
          }}
        >
          No screenshots match your filters
        </div>
      ) : (
        <div data-testid="timeline-view">
          {Array.from(groupedScreenshots.entries()).map(([dayLabel, dayScreenshots]) => (
            <div
              key={dayLabel}
              data-testid={`day-group-${dayLabel.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {/* Day header */}
              <div
                data-testid="day-header"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#5b21b6',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  padding: '8px 0',
                  marginBottom: '8px',
                  borderBottom: '1px solid #e9d5ff',
                }}
              >
                {dayLabel}
              </div>

              {/* Screenshot grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                {dayScreenshots.map((screenshot) => (
                  <DemoScreenshotCard key={screenshot.id} screenshot={screenshot} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
