'use client'

/**
 * ChildLocationHistory Component - Story 40.5
 *
 * Shows child their location transition history.
 * Child sees the same data parents see (bilateral transparency).
 *
 * Acceptance Criteria:
 * - AC3: Location History Access (bilateral transparency)
 *
 * NFR Requirements:
 * - NFR65: Text at 6th-grade reading level for child views
 * - NFR49: 44x44px minimum touch targets
 * - NFR45: 4.5:1 contrast ratio
 */

import React from 'react'
import { LOCATION_PRIVACY_MESSAGES, type ChildLocationHistoryItem } from '@fledgely/shared'

export interface ChildLocationHistoryProps {
  /** History items to display */
  history: ChildLocationHistoryItem[]
  /** Total count for pagination */
  totalCount: number
  /** Current page */
  currentPage: number
  /** Whether there are more pages */
  hasMore: boolean
  /** Loading state */
  isLoading?: boolean
  /** Error message */
  error?: string
  /** Callback to load more */
  onLoadMore?: () => void
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '500px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  count: {
    fontSize: '14px',
    color: '#6b7280',
  },
  transparencyNote: {
    backgroundColor: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#0369a1',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  listItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  listItemLast: {
    borderBottom: 'none',
  },
  icon: {
    width: '36px',
    height: '36px',
    minWidth: '36px',
    borderRadius: '8px',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  transition: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
    margin: '0 0 4px 0',
    lineHeight: 1.4,
  },
  meta: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    color: '#6b7280',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '14px',
    margin: 0,
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    color: '#9ca3af',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    color: '#dc2626',
    fontSize: '14px',
  },
  loadMoreButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '12px',
    minHeight: '44px',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    marginTop: '16px',
  },
}

export function ChildLocationHistory({
  history,
  totalCount,
  currentPage: _currentPage,
  hasMore,
  isLoading = false,
  error,
  onLoadMore,
}: ChildLocationHistoryProps): React.ReactElement {
  if (isLoading && history.length === 0) {
    return (
      <div style={styles.container} data-testid="child-location-history">
        <div style={styles.loadingContainer} data-testid="loading-state">
          Loading your history...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.container} data-testid="child-location-history">
        <div style={styles.header}>
          <h2 style={styles.title}>Where you&apos;ve been</h2>
        </div>
        <div style={styles.errorContainer} data-testid="error-state" role="alert">
          {error}
        </div>
      </div>
    )
  }

  const formatTransitionText = (item: ChildLocationHistoryItem): string => {
    if (item.fromZoneName && item.toZoneName) {
      return `Moved from ${item.fromZoneName} to ${item.toZoneName}`
    } else if (item.toZoneName) {
      return `Arrived at ${item.toZoneName}`
    } else if (item.fromZoneName) {
      return `Left ${item.fromZoneName}`
    }
    return 'Location changed'
  }

  const formatDuration = (minutes: number | null): string | null => {
    if (minutes === null) return null
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  return (
    <div style={styles.container} data-testid="child-location-history">
      <div style={styles.header}>
        <h2 style={styles.title}>Where you&apos;ve been</h2>
        <span style={styles.count}>{totalCount} places</span>
      </div>

      <div style={styles.transparencyNote} data-testid="transparency-note">
        <span aria-hidden="true">👁️</span>
        <span>{LOCATION_PRIVACY_MESSAGES.transparencyNote}</span>
      </div>

      {history.length === 0 ? (
        <div style={styles.emptyState} data-testid="empty-state">
          <div style={styles.emptyIcon} aria-hidden="true">
            📍
          </div>
          <p style={styles.emptyText}>No location history yet</p>
        </div>
      ) : (
        <>
          <ul style={styles.list} aria-label="Location history">
            {history.map((item, index) => (
              <li
                key={item.id}
                style={{
                  ...styles.listItem,
                  ...(index === history.length - 1 ? styles.listItemLast : {}),
                }}
                data-testid="history-item"
              >
                <div style={styles.icon} aria-hidden="true">
                  {item.toZoneName ? '📍' : '↗️'}
                </div>
                <div style={styles.content}>
                  <p style={styles.transition}>{formatTransitionText(item)}</p>
                  <p style={styles.meta}>
                    {item.timeDescription}
                    {item.durationMinutes !== null && ` · ${formatDuration(item.durationMinutes)}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {hasMore && (
            <button
              type="button"
              style={styles.loadMoreButton}
              onClick={onLoadMore}
              disabled={isLoading}
              data-testid="load-more-button"
            >
              {isLoading ? 'Loading...' : 'Show more'}
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default ChildLocationHistory
