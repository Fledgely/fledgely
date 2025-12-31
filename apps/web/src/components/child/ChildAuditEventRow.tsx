/**
 * ChildAuditEventRow Component
 *
 * Story 27.3: Child Audit Log View - AC2, AC4
 *
 * Displays a single audit event in child-friendly format:
 * - Family name (Mom, Dad, etc.)
 * - Friendly message ("Mom viewed your screenshot from Saturday")
 * - Screenshot thumbnail if applicable
 * - Relative timestamp
 */

import type { ChildAuditEvent } from '../../hooks/useChildAuditLog'

interface ChildAuditEventRowProps {
  event: ChildAuditEvent
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '16px',
    borderBottom: '1px solid #e0f2fe',
    gap: '12px',
    backgroundColor: '#ffffff',
  },
  avatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: '#e0f2fe',
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
  message: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#0c4a6e',
    marginBottom: '4px',
    lineHeight: 1.4,
  },
  timestamp: {
    fontSize: '13px',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  thumbnail: {
    width: '60px',
    height: '40px',
    borderRadius: '6px',
    backgroundColor: '#f1f5f9',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
  },
  thumbnailIcon: {
    color: '#94a3b8',
  },
}

/**
 * Get emoji for actor type
 */
function getActorEmoji(actorFamilyName: string): string {
  const lowerName = actorFamilyName.toLowerCase()

  if (lowerName === 'mom') {
    return '👩'
  }
  if (lowerName === 'dad') {
    return '👨'
  }
  if (lowerName === 'you') {
    return '😊'
  }
  if (lowerName.includes('caregiver') || lowerName.includes('a caregiver')) {
    return '🧑‍🏫'
  }
  if (lowerName === 'fledgely') {
    return '🐣'
  }
  if (lowerName === 'your parent') {
    return '👪'
  }

  return '👤'
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) {
    return 'Just now'
  }

  if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  }

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  }

  if (diffDays === 1) {
    return 'Yesterday'
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function ChildAuditEventRow({ event }: ChildAuditEventRowProps) {
  const emoji = getActorEmoji(event.actorFamilyName)

  return (
    <div style={styles.row}>
      <div style={styles.avatar}>{emoji}</div>

      <div style={styles.content}>
        <div style={styles.message}>{event.friendlyMessage}</div>

        <div style={styles.timestamp}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          {formatRelativeTime(event.timestamp)}
        </div>
      </div>

      {event.screenshotThumbnail && (
        <div style={styles.thumbnail}>
          <svg
            style={styles.thumbnailIcon}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
      )}
    </div>
  )
}
