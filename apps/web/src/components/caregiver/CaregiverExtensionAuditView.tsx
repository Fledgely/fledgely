/**
 * CaregiverExtensionAuditView Component - Story 39.4 Task 8
 *
 * Displays a list of caregiver extension log entries for a family.
 * Parents can see all extensions granted by caregivers.
 *
 * AC4: Extension Logging - Display extension history
 * Uses React.CSSProperties inline styles per project pattern.
 */

import {
  CaregiverExtensionLogRow,
  type CaregiverExtensionLogEntry,
} from './CaregiverExtensionLogRow'

interface CaregiverExtensionAuditViewProps {
  /** List of extension log entries */
  entries: CaregiverExtensionLogEntry[]
  /** Optional: Filter by caregiver UID */
  filterByCaregiverUid?: string
  /** Optional: Filter by child UID */
  filterByChildUid?: string
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
  count: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: 400,
    backgroundColor: '#e5e7eb',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  listContainer: {
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
  loading: {
    padding: '48px 24px',
    textAlign: 'center' as const,
  },
  loadingText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  error: {
    padding: '16px',
    backgroundColor: '#fef2f2',
    color: '#991b1b',
    fontSize: '14px',
    margin: '16px',
    borderRadius: '8px',
    border: '1px solid #fecaca',
  },
}

export function CaregiverExtensionAuditView({
  entries,
  filterByCaregiverUid,
  filterByChildUid,
  loading = false,
  error = null,
}: CaregiverExtensionAuditViewProps) {
  // Filter entries if filters are provided
  const filteredEntries = entries.filter((entry) => {
    if (filterByCaregiverUid && entry.caregiverUid !== filterByCaregiverUid) {
      return false
    }
    if (filterByChildUid && entry.childUid !== filterByChildUid) {
      return false
    }
    return true
  })

  // Sort by timestamp descending (newest first)
  const sortedEntries = [...filteredEntries].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
  )

  return (
    <div style={styles.container} data-testid="caregiver-extension-audit-view">
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>
          <span style={styles.titleIcon} aria-hidden="true">
            📋
          </span>
          Extension History
          {sortedEntries.length > 0 && (
            <span style={styles.count} data-testid="entry-count">
              {sortedEntries.length}
            </span>
          )}
        </h3>
      </div>

      {/* Error State */}
      {error && (
        <div style={styles.error} role="alert" data-testid="error-message">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={styles.loading} data-testid="loading-state">
          <p style={styles.loadingText}>Loading extension history...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && sortedEntries.length === 0 && (
        <div style={styles.emptyState} data-testid="empty-state">
          <div style={styles.emptyIcon} aria-hidden="true">
            📭
          </div>
          <h4 style={styles.emptyTitle}>No extensions yet</h4>
          <p style={styles.emptyText}>
            When caregivers grant extra screen time, it will appear here.
          </p>
        </div>
      )}

      {/* Entry List */}
      {!loading && !error && sortedEntries.length > 0 && (
        <div style={styles.listContainer} data-testid="entry-list">
          {sortedEntries.map((entry) => (
            <CaregiverExtensionLogRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  )
}

export default CaregiverExtensionAuditView
