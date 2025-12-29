'use client'

/**
 * DevicesList Component - Story 12.4
 *
 * Displays the list of enrolled devices for a family.
 * Uses real-time Firestore listener via useDevices hook.
 *
 * Requirements:
 * - AC5: Dashboard device list refresh
 */

import { useDevices, formatLastSeen, type Device } from '../../hooks/useDevices'

interface DevicesListProps {
  familyId: string
}

const styles = {
  emptyState: {
    color: '#6b7280',
    fontSize: '14px',
    textAlign: 'center' as const,
  },
  deviceList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  deviceItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  deviceIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: '#dbeafe',
    marginRight: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    color: '#2563eb',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontWeight: 500,
    color: '#1f2937',
    fontSize: '14px',
  },
  deviceMeta: {
    fontSize: '13px',
    color: '#6b7280',
  },
  statusBadge: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: 500,
    },
    active: {
      backgroundColor: '#dcfce7',
      color: '#166534',
    },
    offline: {
      backgroundColor: '#fef3c7',
      color: '#92400e',
    },
    unenrolled: {
      backgroundColor: '#fee2e2',
      color: '#991b1b',
    },
  },
  error: {
    color: '#dc2626',
    fontSize: '14px',
    textAlign: 'center' as const,
    padding: '12px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
  },
  loading: {
    color: '#6b7280',
    fontSize: '14px',
    textAlign: 'center' as const,
    padding: '12px',
  },
}

function DeviceIcon({ type }: { type: Device['type'] }) {
  const icon = type === 'chromebook' ? '💻' : '📱'
  return <div style={styles.deviceIcon}>{icon}</div>
}

function StatusBadge({ status }: { status: Device['status'] }) {
  const statusStyles = {
    ...styles.statusBadge.base,
    ...styles.statusBadge[status],
  }

  const labels = {
    active: 'Active',
    offline: 'Offline',
    unenrolled: 'Unenrolled',
  }

  return <span style={statusStyles}>{labels[status]}</span>
}

export function DevicesList({ familyId }: DevicesListProps) {
  const { devices, loading, error } = useDevices({ familyId })

  if (loading) {
    return <p style={styles.loading}>Loading devices...</p>
  }

  if (error) {
    return <p style={styles.error}>{error}</p>
  }

  if (devices.length === 0) {
    return (
      <p style={styles.emptyState}>
        No devices enrolled yet. Add a Chromebook to start monitoring.
      </p>
    )
  }

  return (
    <div style={styles.deviceList}>
      {devices.map((device) => (
        <div key={device.deviceId} style={styles.deviceItem}>
          <DeviceIcon type={device.type} />
          <div style={styles.deviceInfo}>
            <div style={styles.deviceName}>{device.name}</div>
            <div style={styles.deviceMeta}>
              {device.type === 'chromebook' ? 'Chromebook' : 'Android'} &middot; Last seen{' '}
              {formatLastSeen(device.lastSeen)}
              {device.childId && ` &middot; Assigned`}
            </div>
          </div>
          <StatusBadge status={device.status} />
        </div>
      ))}
    </div>
  )
}
