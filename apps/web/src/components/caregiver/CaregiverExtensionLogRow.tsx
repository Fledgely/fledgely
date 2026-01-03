/**
 * CaregiverExtensionLogRow Component - Story 39.4 Task 8
 *
 * Displays a single caregiver extension log entry showing:
 * - Who granted the extension (caregiver name)
 * - Who received it (child name)
 * - How much time was granted
 * - When it was granted
 *
 * AC4: Extension Logging - Display extension history
 * Uses React.CSSProperties inline styles per project pattern.
 */

export interface CaregiverExtensionLogEntry {
  id: string
  caregiverUid: string
  caregiverName: string
  childUid: string
  childName: string
  extensionMinutes: number
  newTimeBalanceMinutes: number
  requestId?: string
  timestamp: Date
}

interface CaregiverExtensionLogRowProps {
  entry: CaregiverExtensionLogEntry
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    gap: '12px',
  },
  icon: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#dbeafe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    fontSize: '14px',
    color: '#1f2937',
    margin: 0,
    marginBottom: '2px',
  },
  caregiverName: {
    fontWeight: 600,
  },
  childName: {
    fontWeight: 600,
    color: '#2563eb',
  },
  meta: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
  },
  extensionBadge: {
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    flexShrink: 0,
  },
  requestBadge: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 500,
    marginLeft: '8px',
  },
}

/** Format relative time for display */
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

/** Format minutes as friendly time string */
function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `+${minutes}min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (remainingMinutes === 0) {
    return `+${hours}h`
  }
  return `+${hours}h ${remainingMinutes}m`
}

export function CaregiverExtensionLogRow({ entry }: CaregiverExtensionLogRowProps) {
  return (
    <div style={styles.row} data-testid="extension-log-row" data-entry-id={entry.id}>
      <div style={styles.icon} aria-hidden="true">
        ⏰
      </div>
      <div style={styles.content}>
        <p style={styles.header}>
          <span style={styles.caregiverName}>{entry.caregiverName}</span>
          {' gave '}
          <span style={styles.childName}>{entry.childName}</span>
          {' more time'}
          {entry.requestId && <span style={styles.requestBadge}>requested</span>}
        </p>
        <p style={styles.meta}>
          {formatRelativeTime(entry.timestamp)} • New balance: {entry.newTimeBalanceMinutes}min
        </p>
      </div>
      <span style={styles.extensionBadge} data-testid="extension-badge">
        {formatMinutes(entry.extensionMinutes)}
      </span>
    </div>
  )
}

export default CaregiverExtensionLogRow
