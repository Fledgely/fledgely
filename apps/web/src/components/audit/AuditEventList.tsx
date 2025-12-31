/**
 * AuditEventList Component
 *
 * Story 27.2: Parent Audit Log View - AC1, AC5, AC6
 *
 * Container component for displaying audit events with:
 * - Chronological list (newest first)
 * - Load more / infinite scroll
 * - Empty state and reassurance message
 */

import { useCallback, useRef, useEffect } from 'react'
import type { AuditLogEvent } from '../../hooks/useAuditLog'
import { AuditEventRow } from './AuditEventRow'

interface AuditEventListProps {
  events: AuditLogEvent[]
  isLoading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  onlyFamilyAccess: boolean
  error: string | null
  onLoadMore: () => void
}

const styles = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
  },
  reassuranceMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#d1fae5',
    borderBottom: '1px solid #a7f3d0',
  },
  reassuranceIcon: {
    width: '24px',
    height: '24px',
    color: '#059669',
  },
  reassuranceText: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#065f46',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '48px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    textAlign: 'center' as const,
  },
  emptyIcon: {
    width: '48px',
    height: '48px',
    color: '#9ca3af',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
  },
  errorContainer: {
    padding: '24px',
    textAlign: 'center' as const,
    color: '#dc2626',
  },
  loadMoreContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  loadMoreButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#3b82f6',
    backgroundColor: 'transparent',
    border: '1px solid #3b82f6',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  loadingMore: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    color: '#6b7280',
  },
}

export function AuditEventList({
  events,
  isLoading,
  isLoadingMore,
  hasMore,
  onlyFamilyAccess,
  error,
  onLoadMore,
}: AuditEventListProps) {
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Infinite scroll observer
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const target = entries[0]
      if (target.isIntersecting && hasMore && !isLoadingMore) {
        onLoadMore()
      }
    },
    [hasMore, isLoadingMore, onLoadMore]
  )

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    })

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [handleObserver])

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <p>Error loading audit log: {error}</p>
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          <svg
            style={styles.emptyIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p style={styles.emptyTitle}>No access events yet</p>
          <p style={styles.emptyText}>
            Access events will appear here when family members view data.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      {/* Reassurance message - Story 27.2 AC5 */}
      {onlyFamilyAccess && (
        <div style={styles.reassuranceMessage}>
          <svg
            style={styles.reassuranceIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span style={styles.reassuranceText}>
            Your family&apos;s data has only been accessed by family members
          </span>
        </div>
      )}

      {/* Event list */}
      {events.map((event) => (
        <AuditEventRow key={event.id} event={event} />
      ))}

      {/* Load more trigger */}
      <div ref={loadMoreRef} style={styles.loadMoreContainer}>
        {isLoadingMore ? (
          <div style={styles.loadingMore}>
            <div style={{ ...styles.spinner, width: '16px', height: '16px' }} />
            Loading more...
          </div>
        ) : hasMore ? (
          <button style={styles.loadMoreButton} onClick={onLoadMore} type="button">
            Load more
          </button>
        ) : events.length > 0 ? (
          <span style={{ fontSize: '14px', color: '#9ca3af' }}>No more events</span>
        ) : null}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
