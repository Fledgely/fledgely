'use client'

/**
 * DemoNotificationPreview Component - Story 8.5.4
 *
 * Shows what push notifications look like for flagged content.
 *
 * Acceptance Criteria:
 * - AC4: Notification preview shows what alerts look like
 */

export interface DemoNotificationPreviewProps {
  /** Child's name for the notification */
  childName?: string
  /** Type of notification */
  notificationType?: 'flag' | 'screentime' | 'activity'
  /** Custom notification title */
  title?: string
  /** Custom notification body */
  body?: string
  /** Timestamp to display */
  timestamp?: Date
}

/**
 * Format time for notification display
 */
function formatNotificationTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Get notification content based on type
 */
function getNotificationContent(
  type: DemoNotificationPreviewProps['notificationType'],
  childName: string
): { title: string; body: string; icon: string } {
  switch (type) {
    case 'flag':
      return {
        title: `Fledgely - New Flag for ${childName}`,
        body: 'A new item has been flagged for your review',
        icon: '🚩',
      }
    case 'screentime':
      return {
        title: `Fledgely - Screen Time Alert`,
        body: `${childName} has reached their daily screen time limit`,
        icon: '⏰',
      }
    case 'activity':
      return {
        title: `Fledgely - Activity Update`,
        body: `${childName} has started a new session`,
        icon: '📱',
      }
    default:
      return {
        title: `Fledgely - New Flag for ${childName}`,
        body: 'A new item has been flagged for your review',
        icon: '🚩',
      }
  }
}

/**
 * DemoNotificationPreview - Shows sample push notification appearance
 */
export function DemoNotificationPreview({
  childName = 'Alex',
  notificationType = 'flag',
  title: customTitle,
  body: customBody,
  timestamp = new Date(),
}: DemoNotificationPreviewProps) {
  const content = getNotificationContent(notificationType, childName)
  const displayTitle = customTitle ?? content.title
  const displayBody = customBody ?? content.body
  const timeString = formatNotificationTime(timestamp)

  return (
    <div
      data-testid="demo-notification-preview"
      style={{
        backgroundColor: '#faf5ff',
        border: '2px dashed #c4b5fd',
        borderRadius: '12px',
        padding: '16px',
      }}
    >
      {/* Section header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <h4
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 600,
            color: '#5b21b6',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <span>🔔</span>
          <span>Notification Preview</span>
        </h4>
        <span
          data-testid="demo-badge"
          style={{
            backgroundColor: '#8b5cf6',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '10px',
            fontSize: '10px',
            fontWeight: 600,
          }}
        >
          🎭 Demo
        </span>
      </div>

      {/* Notification card (iOS-style) */}
      <div
        data-testid="notification-card"
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* Notification header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}
        >
          {/* App icon */}
          <div
            data-testid="notification-app-icon"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
            }}
          >
            🐣
          </div>

          {/* App name and time */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                data-testid="notification-app-name"
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Fledgely
              </span>
              <span
                data-testid="notification-time"
                style={{
                  fontSize: '11px',
                  color: '#9ca3af',
                }}
              >
                {timeString}
              </span>
            </div>
          </div>
        </div>

        {/* Notification content */}
        <div>
          <div
            data-testid="notification-title"
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#111827',
              marginBottom: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>{content.icon}</span>
            <span>{displayTitle}</span>
          </div>
          <p
            data-testid="notification-body"
            style={{
              margin: 0,
              fontSize: '13px',
              color: '#4b5563',
              lineHeight: 1.4,
            }}
          >
            {displayBody}
          </p>
        </div>
      </div>

      {/* Info text */}
      <p
        data-testid="notification-info"
        style={{
          margin: '12px 0 0 0',
          fontSize: '11px',
          color: '#7c3aed',
          fontStyle: 'italic',
        }}
      >
        This is a preview of how notifications will appear on your device
      </p>
    </div>
  )
}
