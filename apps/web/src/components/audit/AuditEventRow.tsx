/**
 * AuditEventRow Component
 *
 * Story 27.2: Parent Audit Log View - AC2
 *
 * Displays a single audit event with:
 * - Who (actor name and role)
 * - What (resource type and access type)
 * - When (formatted timestamp)
 * - From where (device info)
 */

import type { AuditLogEvent } from '../../hooks/useAuditLog'

interface AuditEventRowProps {
  event: AuditLogEvent
}

const styles = {
  row: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '16px',
    borderBottom: '1px solid #e5e7eb',
    gap: '16px',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#e5e7eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 600,
    color: '#6b7280',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  actorName: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1f2937',
  },
  roleBadge: {
    fontSize: '11px',
    fontWeight: 500,
    padding: '2px 6px',
    borderRadius: '4px',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    textTransform: 'capitalize' as const,
  },
  action: {
    fontSize: '14px',
    color: '#4b5563',
    marginBottom: '4px',
  },
  meta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '12px',
    color: '#9ca3af',
  },
  timestamp: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  device: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
}

/**
 * Format timestamp to human-readable format
 */
function formatTimestamp(timestamp: number): string {
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
    return `${diffMins}m ago`
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

/**
 * Get human-readable action description
 */
function getActionDescription(event: AuditLogEvent): string {
  const accessVerb =
    {
      view: 'viewed',
      download: 'downloaded',
      export: 'exported',
      modify: 'modified',
    }[event.accessType] || event.accessType

  const resourceName =
    {
      screenshots: 'screenshots',
      screenshot_detail: 'a screenshot',
      child_profile: 'child profile',
      children_list: 'children list',
      flags: 'flagged content',
      flag_detail: 'a flag',
      devices: 'devices',
      device_detail: 'device details',
      agreements: 'agreements',
      activity: 'activity',
      dashboard_access: 'the dashboard',
      audit_log_view: 'audit log',
      settings_modify: 'settings',
      profile_modify: 'profile',
      caregiver_status: 'caregiver status',
    }[event.resourceType] || event.resourceType.replace(/_/g, ' ')

  return `${accessVerb} ${resourceName}`
}

/**
 * Get device type from user agent
 */
function getDeviceType(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device'

  const ua = userAgent.toLowerCase()

  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'Mobile'
  }

  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'Tablet'
  }

  if (ua.includes('chrome')) {
    return 'Chrome'
  }

  if (ua.includes('firefox')) {
    return 'Firefox'
  }

  if (ua.includes('safari')) {
    return 'Safari'
  }

  return 'Desktop'
}

/**
 * Get actor initials for avatar
 */
function getInitials(name: string): string {
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

/**
 * Get role badge color
 */
function getRoleBadgeStyle(role: string): React.CSSProperties {
  switch (role) {
    case 'guardian':
      return { backgroundColor: '#dbeafe', color: '#1e40af' }
    case 'child':
      return { backgroundColor: '#d1fae5', color: '#065f46' }
    case 'caregiver':
      return { backgroundColor: '#fef3c7', color: '#92400e' }
    case 'admin':
      return { backgroundColor: '#fee2e2', color: '#991b1b' }
    default:
      return { backgroundColor: '#f3f4f6', color: '#6b7280' }
  }
}

export function AuditEventRow({ event }: AuditEventRowProps) {
  return (
    <div style={styles.row}>
      <div style={styles.avatar}>{getInitials(event.actorDisplayName)}</div>

      <div style={styles.content}>
        <div style={styles.header}>
          <span style={styles.actorName}>{event.actorDisplayName}</span>
          <span style={{ ...styles.roleBadge, ...getRoleBadgeStyle(event.actorType) }}>
            {event.actorType}
          </span>
        </div>

        <div style={styles.action}>{getActionDescription(event)}</div>

        <div style={styles.meta}>
          <span style={styles.timestamp}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            {formatTimestamp(event.timestamp)}
          </span>

          <span style={styles.device}>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <path d="M8 21h8M12 17v4" />
            </svg>
            {getDeviceType(event.userAgent)}
          </span>
        </div>
      </div>
    </div>
  )
}
