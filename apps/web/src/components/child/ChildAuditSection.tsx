/**
 * ChildAuditSection Component
 *
 * Story 27.3: Child Audit Log View - AC1, AC4, AC5, AC6
 *
 * "Who's Seen My Data" section for child dashboard with:
 * - Child-friendly event list
 * - Trust-building messaging
 * - Empty state for no recent access
 * - Screenshot thumbnails
 */

import type { ChildAuditEvent } from '../../hooks/useChildAuditLog'
import { ChildAuditEventRow } from './ChildAuditEventRow'

interface ChildAuditSectionProps {
  events: ChildAuditEvent[]
  isLoading: boolean
  error: string | null
  noRecentAccess: boolean
  lastAccessDate: number | null
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '1px solid #e0f2fe',
    overflow: 'hidden',
    marginTop: '24px',
  },
  header: {
    padding: '20px 24px',
    borderBottom: '1px solid #e0f2fe',
    backgroundColor: '#f0f9ff',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#0c4a6e',
  },
  headerIcon: {
    fontSize: '22px',
  },
  trustMessage: {
    marginTop: '8px',
    fontSize: '14px',
    color: '#0369a1',
    lineHeight: 1.5,
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '48px',
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: '3px solid #e0f2fe',
    borderTopColor: '#0ea5e9',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  errorContainer: {
    padding: '24px',
    textAlign: 'center' as const,
    color: '#dc2626',
    fontSize: '14px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center' as const,
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0c4a6e',
    margin: '0 0 8px 0',
  },
  emptyText: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.5,
    maxWidth: '280px',
  },
  eventList: {
    maxHeight: '400px',
    overflowY: 'auto' as const,
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid #e0f2fe',
    backgroundColor: '#f8fafc',
    textAlign: 'center' as const,
  },
  footerText: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
}

export function ChildAuditSection({
  events,
  isLoading,
  error,
  noRecentAccess,
  lastAccessDate,
}: ChildAuditSectionProps) {
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.headerTitle}>
          <span style={styles.headerIcon}>👀</span>
          Who&apos;s Seen My Data
        </h2>
        <p style={styles.trustMessage}>
          This shows you exactly who looked at your screenshots and profile. We believe you should
          always know when someone sees your information.
        </p>
      </div>

      {isLoading && (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {!isLoading && error && (
        <div style={styles.errorContainer}>
          <p>Oops! We couldn&apos;t load this right now. Try again later.</p>
        </div>
      )}

      {!isLoading && !error && events.length === 0 && (
        <div style={styles.emptyState}>
          <span style={styles.emptyIcon}>✨</span>
          <p style={styles.emptyTitle}>No one viewed your data this week</p>
          <p style={styles.emptyText}>
            When someone looks at your screenshots or profile, it will show up here so you always
            know.
          </p>
        </div>
      )}

      {!isLoading && !error && events.length > 0 && (
        <>
          <div style={styles.eventList}>
            {events.map((event) => (
              <ChildAuditEventRow key={event.id} event={event} />
            ))}
          </div>

          <div style={styles.footer}>
            <p style={styles.footerText}>
              {noRecentAccess
                ? 'No one has looked at your data recently'
                : lastAccessDate
                  ? `Last viewed ${formatLastAccess(lastAccessDate)}`
                  : 'Showing your recent activity'}
            </p>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Format last access date for footer
 */
function formatLastAccess(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) {
    return 'today'
  }
  if (diffDays === 1) {
    return 'yesterday'
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
