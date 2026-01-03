/**
 * CaregiverActivityDashboard Component
 *
 * Story 39.6: Caregiver Action Logging - AC2, AC3, AC5
 *
 * Displays caregiver activity for a family including:
 * - Summary cards for each caregiver (clickable to filter)
 * - Detailed activity log with filters
 * - Real-time updates
 *
 * Used on parent dashboard to show "Caregiver Activity" section.
 * Uses React.CSSProperties inline styles per project pattern.
 */

import { useEffect, useState, useCallback } from 'react'
import type {
  CaregiverAuditLog,
  CaregiverActivitySummary,
  CaregiverAuditAction,
} from '@fledgely/shared'
import {
  getCaregiverActivitySummaries,
  getCaregiverActivity,
  subscribeToActivity,
} from '../../services/caregiverActivityService'
import { CaregiverActivityRow } from './CaregiverActivityRow'
import { CaregiverSummaryCard } from './CaregiverSummaryCard'

export interface CaregiverActivityDashboardProps {
  /** Family ID to display activity for */
  familyId: string
  /** Map of caregiver UID to display name */
  caregiverNames: Record<string, string>
  /** List of child UIDs and names for filtering */
  childrenList?: Array<{ uid: string; name: string }>
  /** Enable real-time updates (default: true) */
  enableRealtime?: boolean
  /** Maximum number of log entries to display (default: 20) */
  logLimit?: number
  /** Show loading state */
  loading?: boolean
  /** Error message to display */
  error?: string | null
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #e5e7eb',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  titleIcon: {
    fontSize: '18px',
  },
  badge: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: 400,
    backgroundColor: '#e5e7eb',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  summarySection: {
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#fafafa',
  },
  summaryTitle: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#6b7280',
    margin: '0 0 12px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  summaryGrid: {
    display: 'grid',
    gap: '12px',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  },
  filterSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
    flexWrap: 'wrap' as const,
  },
  filterLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#6b7280',
    margin: 0,
  },
  filterSelect: {
    padding: '6px 12px',
    fontSize: '13px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    minWidth: '120px',
    minHeight: '44px',
  },
  filterChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '16px',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
  filterChipButton: {
    background: 'none',
    border: 'none',
    padding: '0',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#1d4ed8',
    display: 'flex',
    alignItems: 'center',
    minWidth: '20px',
    minHeight: '20px',
  },
  clearFiltersButton: {
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 500,
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#6b7280',
    cursor: 'pointer',
    minHeight: '44px',
  },
  logSection: {
    padding: '0',
  },
  logHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#ffffff',
  },
  logTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    margin: 0,
  },
  logList: {
    maxHeight: '400px',
    overflowY: 'auto' as const,
  },
  emptyState: {
    padding: '48px 24px',
    textAlign: 'center' as const,
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#374151',
    margin: '0 0 8px 0',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  loadingContainer: {
    padding: '48px 24px',
    textAlign: 'center' as const,
  },
  loadingText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  errorContainer: {
    padding: '16px',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    fontSize: '14px',
    margin: '16px',
    borderRadius: '8px',
    border: '1px solid #fecaca',
  },
  realtimeBadge: {
    fontSize: '10px',
    color: '#059669',
    fontWeight: 500,
    backgroundColor: '#d1fae5',
    padding: '2px 6px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  realtimeDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
  },
  noResults: {
    padding: '32px 24px',
    textAlign: 'center' as const,
    color: '#6b7280',
    fontSize: '14px',
  },
}

/** Action type labels for filter dropdown */
const ACTION_LABELS: Record<CaregiverAuditAction, string> = {
  time_extension: 'Time Extensions',
  flag_viewed: 'Flags Viewed',
  flag_marked_reviewed: 'Flags Reviewed',
  permission_change: 'Permission Changes',
}

export function CaregiverActivityDashboard({
  familyId,
  caregiverNames,
  childrenList = [],
  enableRealtime = true,
  logLimit = 20,
  loading: externalLoading = false,
  error: externalError = null,
}: CaregiverActivityDashboardProps) {
  const [summaries, setSummaries] = useState<CaregiverActivitySummary[]>([])
  const [logs, setLogs] = useState<CaregiverAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isRealtime, setIsRealtime] = useState(false)

  // Filter state (AC2)
  const [filterCaregiverUid, setFilterCaregiverUid] = useState<string | null>(null)
  const [filterChildUid, setFilterChildUid] = useState<string | null>(null)
  const [filterAction, setFilterAction] = useState<CaregiverAuditAction | null>(null)

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)

        const [summaryData, logData] = await Promise.all([
          getCaregiverActivitySummaries({ familyId }, caregiverNames),
          getCaregiverActivity({
            familyId,
            limit: logLimit,
            caregiverUid: filterCaregiverUid ?? undefined,
            childUid: filterChildUid ?? undefined,
            action: filterAction ?? undefined,
          }),
        ])

        setSummaries(summaryData)
        setLogs(logData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activity')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [familyId, caregiverNames, logLimit, filterCaregiverUid, filterChildUid, filterAction])

  // Subscribe to real-time updates
  useEffect(() => {
    if (!enableRealtime || !familyId) return

    const unsubscribe = subscribeToActivity(
      familyId,
      (newLogs) => {
        // Apply client-side filters to real-time updates
        const filteredLogs = newLogs.filter((log) => {
          if (filterCaregiverUid && log.caregiverUid !== filterCaregiverUid) return false
          if (filterChildUid && log.childUid !== filterChildUid) return false
          if (filterAction && log.action !== filterAction) return false
          return true
        })
        setLogs(filteredLogs)
        setIsRealtime(true)
      },
      logLimit
    )

    return () => {
      unsubscribe()
      setIsRealtime(false)
    }
  }, [familyId, enableRealtime, logLimit, filterCaregiverUid, filterChildUid, filterAction])

  // Handle caregiver card click to filter
  const handleCaregiverClick = useCallback((caregiverUid: string) => {
    setFilterCaregiverUid((prev) => (prev === caregiverUid ? null : caregiverUid))
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilterCaregiverUid(null)
    setFilterChildUid(null)
    setFilterAction(null)
  }, [])

  const isLoading = loading || externalLoading
  const displayError = error || externalError
  const totalActions = summaries.reduce((sum, s) => sum + s.totalActions, 0)
  const hasActiveFilters = filterCaregiverUid || filterChildUid || filterAction

  return (
    <div style={styles.container} data-testid="caregiver-activity-dashboard">
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>
          <span style={styles.titleIcon} aria-hidden="true">
            👥
          </span>
          Caregiver Activity
          {totalActions > 0 && (
            <span style={styles.badge} data-testid="total-count">
              {totalActions}
            </span>
          )}
        </h3>
        {isRealtime && (
          <div style={styles.realtimeBadge} data-testid="realtime-badge">
            <div style={styles.realtimeDot} />
            Live
          </div>
        )}
      </div>

      {/* Error State */}
      {displayError && (
        <div style={styles.errorContainer} role="alert" data-testid="error-message">
          {displayError}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div style={styles.loadingContainer} data-testid="loading-state">
          <p style={styles.loadingText}>Loading caregiver activity...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !displayError && summaries.length === 0 && (
        <div style={styles.emptyState} data-testid="empty-state">
          <div style={styles.emptyIcon} aria-hidden="true">
            📭
          </div>
          <h4 style={styles.emptyTitle}>No caregiver activity yet</h4>
          <p style={styles.emptyText}>When caregivers take actions, they will appear here.</p>
        </div>
      )}

      {/* Summary Section */}
      {!isLoading && !displayError && summaries.length > 0 && (
        <>
          <div style={styles.summarySection} data-testid="summary-section">
            <h4 style={styles.summaryTitle}>This Week</h4>
            <div style={styles.summaryGrid}>
              {summaries.map((summary) => (
                <CaregiverSummaryCard
                  key={summary.caregiverUid}
                  summary={summary}
                  onClick={() => handleCaregiverClick(summary.caregiverUid)}
                />
              ))}
            </div>
          </div>

          {/* Filter Controls (AC2) */}
          <div style={styles.filterSection} data-testid="filter-section">
            <span style={styles.filterLabel}>Filter by:</span>

            {/* Caregiver filter */}
            <select
              style={styles.filterSelect}
              value={filterCaregiverUid ?? ''}
              onChange={(e) => setFilterCaregiverUid(e.target.value || null)}
              aria-label="Filter by caregiver"
              data-testid="filter-caregiver"
            >
              <option value="">All Caregivers</option>
              {Object.entries(caregiverNames).map(([uid, name]) => (
                <option key={uid} value={uid}>
                  {name}
                </option>
              ))}
            </select>

            {/* Child filter */}
            {childrenList.length > 0 && (
              <select
                style={styles.filterSelect}
                value={filterChildUid ?? ''}
                onChange={(e) => setFilterChildUid(e.target.value || null)}
                aria-label="Filter by child"
                data-testid="filter-child"
              >
                <option value="">All Children</option>
                {childrenList.map((child) => (
                  <option key={child.uid} value={child.uid}>
                    {child.name}
                  </option>
                ))}
              </select>
            )}

            {/* Action type filter */}
            <select
              style={styles.filterSelect}
              value={filterAction ?? ''}
              onChange={(e) => setFilterAction((e.target.value as CaregiverAuditAction) || null)}
              aria-label="Filter by action type"
              data-testid="filter-action"
            >
              <option value="">All Actions</option>
              {Object.entries(ACTION_LABELS).map(([action, label]) => (
                <option key={action} value={action}>
                  {label}
                </option>
              ))}
            </select>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <button
                type="button"
                style={styles.clearFiltersButton}
                onClick={clearFilters}
                aria-label="Clear all filters"
                data-testid="clear-filters"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Activity Log Section */}
          <div style={styles.logSection}>
            <div style={styles.logHeader}>
              <h4 style={styles.logTitle}>
                Recent Activity
                {hasActiveFilters && ` (filtered)`}
              </h4>
            </div>
            {logs.length > 0 ? (
              <div style={styles.logList} data-testid="activity-log">
                {logs.map((log) => (
                  <CaregiverActivityRow key={log.id} log={log} />
                ))}
              </div>
            ) : (
              <div style={styles.noResults} data-testid="no-results">
                No activity matches the current filters.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default CaregiverActivityDashboard
