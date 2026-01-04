'use client'

/**
 * ChildDeviceList Component - Story 19.7
 *
 * Child-facing display for their monitored devices.
 * Shows device name, status, last capture time.
 * Read-only (no remove button).
 *
 * Requirements:
 * - AC1: Child sees list of their monitored devices
 * - AC2: Each device shows name, status, last capture time
 * - AC3: Same status indicators as parent
 * - AC4: No remove button (read-only)
 * - AC5: Click navigates to filtered screenshots
 * - AC6: "Need help?" link visible
 */

import { useMemo } from 'react'
import type { Device } from '../../hooks/useDevices'
import { formatLastSeen, isValidDate } from '../../hooks/useDevices'

export interface ChildDeviceListProps {
  /** List of devices assigned to this child */
  devices: Device[]
  /** Loading state */
  loading?: boolean
  /** Error message */
  error?: string | null
  /** Callback when device is clicked (for screenshot filtering) */
  onDeviceClick?: (deviceId: string) => void
}

const styles = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e0f2fe', // sky-100
    padding: '20px',
    marginBottom: '16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: '16px',
  },
  titleContainer: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '12px',
  },
  iconContainer: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: '#0ea5e9', // sky-500
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    boxShadow: '0 2px 8px rgba(14, 165, 233, 0.3)',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0c4a6e', // sky-900
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#0369a1', // sky-700
    margin: '4px 0 0 0',
  },
  deviceList: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '12px',
  },
  deviceCard: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    padding: '16px',
    backgroundColor: '#f0f9ff', // sky-50
    borderRadius: '12px',
    border: '1px solid #e0f2fe',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  deviceCardHover: {
    backgroundColor: '#e0f2fe',
    borderColor: '#7dd3fc',
  },
  deviceIcon: {
    fontSize: '24px',
    marginRight: '14px',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0c4a6e',
    margin: 0,
  },
  deviceMeta: {
    fontSize: '13px',
    color: '#0369a1',
    margin: '4px 0 0 0',
  },
  statusContainer: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '8px',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  statusDotActive: {
    backgroundColor: '#22c55e',
  },
  statusDotWarning: {
    backgroundColor: '#f59e0b',
  },
  statusDotCritical: {
    backgroundColor: '#ef4444',
  },
  statusDotOffline: {
    backgroundColor: '#9ca3af',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 500,
  },
  statusBadgeActive: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusBadgeWarning: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  statusBadgeCritical: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  statusBadgeOffline: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  chevron: {
    marginLeft: '12px',
    color: '#7dd3fc',
    fontSize: '20px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '32px 16px',
    color: '#0369a1',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 600,
    margin: '0 0 8px 0',
    color: '#0c4a6e',
  },
  emptyText: {
    fontSize: '14px',
    margin: 0,
    lineHeight: 1.5,
  },
  helpLink: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: '8px',
    padding: '12px 16px',
    marginTop: '16px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    border: '1px solid #fcd34d',
    color: '#92400e',
    fontSize: '14px',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'all 0.15s ease',
  },
  loading: {
    opacity: 0.6,
    pointerEvents: 'none' as const,
  },
  error: {
    padding: '16px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    border: '1px solid #fecaca',
    color: '#991b1b',
    fontSize: '14px',
    textAlign: 'center' as const,
  },
}

type HealthStatus = 'active' | 'warning' | 'critical' | 'offline'

// Use same status calculation as parent view for transparency (AC3)
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

function getDeviceHealthStatus(device: Device): HealthStatus {
  if (device.status === 'unenrolled') return 'offline'
  if (device.status === 'offline') return 'offline'
  if (!isValidDate(device.lastSeen)) return 'critical'

  const now = Date.now()
  const lastSeenTime = device.lastSeen.getTime()
  const timeSinceSync = now - lastSeenTime

  if (timeSinceSync < HOUR_MS) return 'active'
  if (timeSinceSync < DAY_MS) return 'warning'
  return 'critical'
}

function DeviceIcon({ type }: { type: Device['type'] }) {
  const icon = type === 'android' ? '📱' : '💻'
  return <span style={styles.deviceIcon}>{icon}</span>
}

function DevicesHeaderIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  )
}

function StatusIndicator({ status }: { status: HealthStatus }) {
  const statusLabels: Record<HealthStatus, string> = {
    active: 'Online',
    warning: 'Warning',
    critical: 'Issue',
    offline: 'Offline',
  }

  const dotStyle = {
    ...styles.statusDot,
    ...(status === 'active'
      ? styles.statusDotActive
      : status === 'warning'
        ? styles.statusDotWarning
        : status === 'critical'
          ? styles.statusDotCritical
          : styles.statusDotOffline),
  }

  const badgeStyle = {
    ...styles.statusBadge,
    ...(status === 'active'
      ? styles.statusBadgeActive
      : status === 'warning'
        ? styles.statusBadgeWarning
        : status === 'critical'
          ? styles.statusBadgeCritical
          : styles.statusBadgeOffline),
  }

  return (
    <div style={styles.statusContainer} data-testid="status-indicator">
      <span style={dotStyle} aria-hidden="true" />
      <span style={badgeStyle}>{statusLabels[status]}</span>
    </div>
  )
}

export function ChildDeviceList({
  devices,
  loading = false,
  error = null,
  onDeviceClick,
}: ChildDeviceListProps) {
  // Sort devices: active first, then by name
  const sortedDevices = useMemo(() => {
    return [...devices].sort((a, b) => {
      const statusA = getDeviceHealthStatus(a)
      const statusB = getDeviceHealthStatus(b)
      if (statusA === 'active' && statusB !== 'active') return -1
      if (statusA !== 'active' && statusB === 'active') return 1
      return a.name.localeCompare(b.name)
    })
  }, [devices])

  if (error) {
    return (
      <div style={styles.container} data-testid="child-device-list-error">
        <div style={styles.error}>{error}</div>
      </div>
    )
  }

  return (
    <div
      style={{ ...styles.container, ...(loading ? styles.loading : {}) }}
      data-testid="child-device-list"
    >
      <div style={styles.header}>
        <div style={styles.titleContainer}>
          <div style={styles.iconContainer}>
            <DevicesHeaderIcon />
          </div>
          <div>
            <h2 style={styles.title}>My Devices</h2>
            <p style={styles.subtitle}>
              {devices.length === 0
                ? 'No devices yet'
                : `${devices.length} device${devices.length === 1 ? '' : 's'} being monitored`}
            </p>
          </div>
        </div>
      </div>

      {devices.length === 0 ? (
        <div style={styles.emptyState} data-testid="empty-state">
          <div style={styles.emptyIcon}>📱</div>
          <h3 style={styles.emptyTitle}>No Devices Yet</h3>
          <p style={styles.emptyText}>
            When your parent adds a device for you,
            <br />
            it will show up here.
          </p>
        </div>
      ) : (
        <div style={styles.deviceList} role="list" aria-label="Your monitored devices">
          {sortedDevices.map((device) => {
            const healthStatus = getDeviceHealthStatus(device)
            const lastCapture = device.lastScreenshotAt
              ? `Last capture: ${formatLastSeen(device.lastScreenshotAt)}`
              : 'No captures yet'

            return (
              <div
                key={device.deviceId}
                style={styles.deviceCard}
                data-testid="device-card"
                role="listitem"
                tabIndex={0}
                onClick={() => onDeviceClick?.(device.deviceId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onDeviceClick?.(device.deviceId)
                  }
                }}
                onMouseEnter={(e) => {
                  Object.assign(e.currentTarget.style, styles.deviceCardHover)
                }}
                onMouseLeave={(e) => {
                  Object.assign(e.currentTarget.style, styles.deviceCard)
                }}
                aria-label={`${device.name}, ${healthStatus}, ${lastCapture}. Click to see screenshots.`}
              >
                <DeviceIcon type={device.type} />
                <div style={styles.deviceInfo}>
                  <h3 style={styles.deviceName}>{device.name}</h3>
                  <p style={styles.deviceMeta}>{lastCapture}</p>
                </div>
                <StatusIndicator status={healthStatus} />
                <span style={styles.chevron} aria-hidden="true">
                  ›
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* AC6: Crisis Resources Link */}
      <a
        href="/child/help"
        style={styles.helpLink}
        data-testid="help-link"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#fde68a'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#fef3c7'
        }}
      >
        <span aria-hidden="true">💬</span>
        <span>Need help? Talk to a trusted adult</span>
      </a>
    </div>
  )
}

export default ChildDeviceList
