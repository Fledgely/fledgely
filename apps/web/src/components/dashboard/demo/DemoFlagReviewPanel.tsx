'use client'

/**
 * DemoFlagReviewPanel Component - Story 8.5.4
 *
 * Complete flag review panel combining flag cards with filtering.
 *
 * Acceptance Criteria:
 * - AC1: Sample flagged items demonstrate various concern types
 * - AC2: Flag details display
 * - AC5: Resolution flow demonstration
 */

import { useState, useMemo } from 'react'
import { DemoFlagCard } from './DemoFlagCard'
import { DemoNotificationPreview } from './DemoNotificationPreview'
import type { DemoFlag } from '../../../data/demoData'
import { getDemoFlags, FLAG_RESOLUTION_STATUS_LABELS } from '../../../data/demoData'

export interface DemoFlagReviewPanelProps {
  /** Optional custom flags (defaults to demo data) */
  flags?: DemoFlag[]
  /** Whether to show notification preview */
  showNotificationPreview?: boolean
}

type FilterStatus = 'all' | 'pending' | 'reviewed' | 'resolved'

/**
 * Filter tab button component
 */
function FilterTab({
  label,
  count,
  active,
  onClick,
  testId,
}: {
  label: string
  count: number
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
        padding: '6px 12px',
        borderRadius: '8px',
        border: active ? '2px solid #8b5cf6' : '1px solid #d1d5db',
        backgroundColor: active ? '#f3e8ff' : '#fff',
        color: active ? '#7c3aed' : '#374151',
        fontSize: '12px',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <span>{label}</span>
      <span
        style={{
          backgroundColor: active ? '#8b5cf6' : '#e5e7eb',
          color: active ? '#fff' : '#6b7280',
          padding: '1px 6px',
          borderRadius: '10px',
          fontSize: '10px',
          fontWeight: 600,
        }}
      >
        {count}
      </span>
    </button>
  )
}

/**
 * DemoFlagReviewPanel - Full flag review panel
 */
export function DemoFlagReviewPanel({
  flags: propFlags,
  showNotificationPreview = true,
}: DemoFlagReviewPanelProps) {
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [expandedFlagId, setExpandedFlagId] = useState<string | null>(null)

  // Get demo data
  const allFlags = propFlags ?? getDemoFlags()

  // Calculate stats from actual flags being used
  const stats = useMemo(() => {
    const pending = allFlags.filter((f) => f.resolution.status === 'pending').length
    const reviewed = allFlags.filter((f) => f.resolution.status === 'reviewed').length
    const resolved = allFlags.filter((f) => f.resolution.status === 'resolved').length
    return {
      total: allFlags.length,
      pending,
      reviewed,
      resolved,
    }
  }, [allFlags])

  // Filter based on status
  const filteredFlags = useMemo(() => {
    if (filterStatus === 'all') {
      return allFlags
    }
    return allFlags.filter((f) => f.resolution.status === filterStatus)
  }, [filterStatus, allFlags])

  // Toggle expanded flag
  const handleFlagClick = (flagId: string) => {
    setExpandedFlagId((current) => (current === flagId ? null : flagId))
  }

  return (
    <div data-testid="demo-flag-review-panel">
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
          <span>🚩</span>
          <span>Demo Flag Review</span>
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

      {/* Summary stats */}
      <div
        data-testid="flag-stats"
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: '#f3e8ff',
          borderRadius: '8px',
        }}
      >
        <div
          style={{
            flex: 1,
            textAlign: 'center',
          }}
        >
          <div
            data-testid="stat-total"
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#5b21b6',
            }}
          >
            {stats.total}
          </div>
          <div style={{ fontSize: '11px', color: '#7c3aed' }}>Total</div>
        </div>
        <div
          style={{
            flex: 1,
            textAlign: 'center',
          }}
        >
          <div
            data-testid="stat-pending"
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#f59e0b',
            }}
          >
            {stats.pending}
          </div>
          <div style={{ fontSize: '11px', color: '#7c3aed' }}>Pending</div>
        </div>
        <div
          style={{
            flex: 1,
            textAlign: 'center',
          }}
        >
          <div
            data-testid="stat-resolved"
            style={{
              fontSize: '20px',
              fontWeight: 700,
              color: '#22c55e',
            }}
          >
            {stats.resolved}
          </div>
          <div style={{ fontSize: '11px', color: '#7c3aed' }}>Resolved</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div
        data-testid="filter-tabs"
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          flexWrap: 'wrap',
        }}
      >
        <FilterTab
          label="All"
          count={stats.total}
          active={filterStatus === 'all'}
          onClick={() => setFilterStatus('all')}
          testId="filter-all"
        />
        <FilterTab
          label={FLAG_RESOLUTION_STATUS_LABELS.pending}
          count={stats.pending}
          active={filterStatus === 'pending'}
          onClick={() => setFilterStatus('pending')}
          testId="filter-pending"
        />
        <FilterTab
          label={FLAG_RESOLUTION_STATUS_LABELS.reviewed}
          count={stats.reviewed}
          active={filterStatus === 'reviewed'}
          onClick={() => setFilterStatus('reviewed')}
          testId="filter-reviewed"
        />
        <FilterTab
          label={FLAG_RESOLUTION_STATUS_LABELS.resolved}
          count={stats.resolved}
          active={filterStatus === 'resolved'}
          onClick={() => setFilterStatus('resolved')}
          testId="filter-resolved"
        />
      </div>

      {/* Flag cards */}
      <div
        data-testid="flag-list"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: showNotificationPreview ? '16px' : 0,
        }}
      >
        {filteredFlags.length === 0 ? (
          <div
            data-testid="empty-state"
            style={{
              padding: '24px',
              textAlign: 'center',
              color: '#6b7280',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
            }}
          >
            No flags match this filter
          </div>
        ) : (
          filteredFlags.map((flag) => (
            <DemoFlagCard
              key={flag.id}
              flag={flag}
              expanded={expandedFlagId === flag.id}
              onClick={() => handleFlagClick(flag.id)}
            />
          ))
        )}
      </div>

      {/* Notification preview (AC4) */}
      {showNotificationPreview && <DemoNotificationPreview />}
    </div>
  )
}
