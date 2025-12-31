'use client'

/**
 * CaregiverAccessLogViewer Component - Story 19D.3
 *
 * Displays caregiver access logs for parents to review.
 * Shows summary like "Grandpa Joe viewed Emma's status 3 times this week"
 *
 * Acceptance Criteria:
 * - AC3: Logs visible to parent in family audit trail
 * - AC6: Parents can review caregiver activity summaries
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
  getCaregiverAccessSummaries,
  formatAccessSummary,
  type CaregiverAccessSummary,
} from '../../services/caregiverAuditService'

/**
 * Props for CaregiverAccessLogViewer
 */
export interface CaregiverAccessLogViewerProps {
  /** Family ID to fetch logs for */
  familyId: string
  /** Map of caregiver UID to display name */
  caregiverNames: Record<string, string>
  /** Map of child ID to display name */
  childNames?: Record<string, string>
  /** Time period for filtering (default: 'week') */
  period?: 'today' | 'week' | 'month' | 'all'
}

/**
 * Calculate date range based on period
 */
function getDateRange(period: 'today' | 'week' | 'month' | 'all'): {
  startDate: Date | undefined
  endDate: Date
} {
  const now = new Date()

  switch (period) {
    case 'today': {
      const startOfDay = new Date(now)
      startOfDay.setHours(0, 0, 0, 0)
      return { startDate: startOfDay, endDate: now }
    }
    case 'week': {
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      return { startDate: startOfWeek, endDate: now }
    }
    case 'month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return { startDate: startOfMonth, endDate: now }
    }
    case 'all':
    default:
      return { startDate: undefined, endDate: now }
  }
}

/**
 * Format period label for display
 */
function getPeriodLabel(period: 'today' | 'week' | 'month' | 'all'): string {
  switch (period) {
    case 'today':
      return 'today'
    case 'week':
      return 'this week'
    case 'month':
      return 'this month'
    case 'all':
      return 'all time'
  }
}

/**
 * CaregiverAccessLogViewer - Parent-facing caregiver activity summary
 */
export function CaregiverAccessLogViewer({
  familyId,
  caregiverNames,
  childNames,
  period = 'week',
}: CaregiverAccessLogViewerProps) {
  const [summaries, setSummaries] = useState<CaregiverAccessSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch summaries on mount or when params change
  useEffect(() => {
    async function fetchSummaries() {
      setLoading(true)
      setError(null)

      try {
        const { startDate, endDate } = getDateRange(period)
        const data = await getCaregiverAccessSummaries(
          {
            familyId,
            startDate,
            endDate,
          },
          caregiverNames
        )
        setSummaries(data)
      } catch (err) {
        setError('Failed to load caregiver activity')
        console.error('Error fetching caregiver access logs:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSummaries()
  }, [familyId, caregiverNames, period])

  // Memoize formatted summaries
  const formattedSummaries = useMemo(() => {
    return summaries.map((summary) => ({
      ...summary,
      formatted: formatAccessSummary(summary, childNames),
      periodLabel: getPeriodLabel(period),
    }))
  }, [summaries, childNames, period])

  // Styles
  const containerStyles: React.CSSProperties = {
    padding: '16px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  }

  const headerStyles: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }

  const listStyles: React.CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  }

  const itemStyles: React.CSSProperties = {
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }

  const summaryTextStyles: React.CSSProperties = {
    fontSize: '16px',
    color: '#374151',
  }

  const timestampStyles: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
  }

  const emptyStyles: React.CSSProperties = {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '16px',
  }

  const loadingStyles: React.CSSProperties = {
    padding: '24px',
    textAlign: 'center',
    color: '#6b7280',
  }

  const errorStyles: React.CSSProperties = {
    padding: '16px',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    borderRadius: '8px',
    fontSize: '14px',
  }

  // Loading state
  if (loading) {
    return (
      <div style={containerStyles} data-testid="caregiver-access-log-viewer">
        <div style={loadingStyles}>Loading caregiver activity...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div style={containerStyles} data-testid="caregiver-access-log-viewer">
        <div style={errorStyles}>{error}</div>
      </div>
    )
  }

  // Empty state
  if (summaries.length === 0) {
    return (
      <div style={containerStyles} data-testid="caregiver-access-log-viewer">
        <header style={headerStyles}>
          <span>Caregiver Activity</span>
        </header>
        <div style={emptyStyles}>No caregiver activity {getPeriodLabel(period)}</div>
      </div>
    )
  }

  return (
    <div style={containerStyles} data-testid="caregiver-access-log-viewer">
      <header style={headerStyles}>
        <span>Caregiver Activity</span>
        <span style={{ fontSize: '14px', fontWeight: 400, color: '#6b7280' }}>
          ({getPeriodLabel(period)})
        </span>
      </header>

      <ul style={listStyles} role="list" aria-label="Caregiver access history">
        {formattedSummaries.map((summary) => (
          <li
            key={summary.caregiverId}
            style={itemStyles}
            data-testid={`caregiver-access-item-${summary.caregiverId}`}
          >
            <span style={summaryTextStyles}>{summary.formatted}</span>
            <span style={timestampStyles}>Last: {summary.lastAccess.toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default CaregiverAccessLogViewer
