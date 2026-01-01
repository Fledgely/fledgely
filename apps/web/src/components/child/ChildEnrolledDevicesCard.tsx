'use client'

/**
 * ChildEnrolledDevicesCard Component - Story 32.2
 *
 * Child-facing display for parent enrolled devices in offline time.
 *
 * Requirements:
 * - AC2: Enrollment is visible to children
 * - AC3: "Mom's phone is enrolled" shown in device list
 * - AC5: Non-enrolled parent devices noted (non-shaming)
 */

import { useMemo } from 'react'
import type { ParentEnrolledDevice, ParentDeviceType } from '@fledgely/shared'
import { PARENT_DEVICE_TYPE_LABELS, PARENT_ENROLLMENT_MESSAGES } from '@fledgely/shared'

export interface ParentInfo {
  uid: string
  displayName?: string
}

export interface ChildEnrolledDevicesCardProps {
  /** List of enrolled parent devices */
  enrolledDevices: ParentEnrolledDevice[]
  /** Whether the offline schedule is enabled */
  offlineScheduleEnabled: boolean
  /** Loading state */
  loading?: boolean
  /** List of all parents in the family (for showing who hasn't enrolled) */
  familyParents?: ParentInfo[]
}

const styles = {
  card: {
    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
    borderRadius: '16px',
    border: '1px solid #86efac',
    padding: '20px',
    marginBottom: '16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '12px',
    marginBottom: '12px',
  },
  iconContainer: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: '#22c55e',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#166534',
    margin: 0,
  },
  message: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#15803d',
    margin: '0 0 12px 0',
    lineHeight: 1.4,
  },
  deviceList: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '8px',
  },
  deviceItem: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '10px',
    padding: '10px 14px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #d1fae5',
  },
  deviceIcon: {
    fontSize: '20px',
  },
  deviceText: {
    fontSize: '14px',
    color: '#166534',
  },
  checkmark: {
    marginLeft: 'auto',
    color: '#22c55e',
    fontSize: '16px',
    fontWeight: 600,
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
    fontStyle: 'italic',
    padding: '8px 0',
  },
  loading: {
    opacity: 0.6,
  },
}

// Device icon based on type
function DeviceIcon({ type }: { type: ParentDeviceType }) {
  const icons: Record<ParentDeviceType, string> = {
    phone: '📱',
    tablet: '📲',
    laptop: '💻',
    desktop: '🖥️',
    other: '📟',
  }
  return <span style={styles.deviceIcon}>{icons[type]}</span>
}

// Family devices icon for header
function FamilyDevicesIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ffffff"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  )
}

export function ChildEnrolledDevicesCard({
  enrolledDevices,
  offlineScheduleEnabled,
  loading = false,
  familyParents = [],
}: ChildEnrolledDevicesCardProps) {
  // Filter to only active devices
  const activeDevices = useMemo(() => {
    return enrolledDevices.filter((d) => d.active)
  }, [enrolledDevices])

  // Determine which parents haven't enrolled (AC5)
  const { notEnrolledParents, allParentsEnrolled } = useMemo(() => {
    // If we don't have parent info, we can't determine enrollment status
    if (familyParents.length === 0) {
      return { notEnrolledParents: [] as ParentInfo[], allParentsEnrolled: false }
    }
    const enrolledParentUids = new Set(activeDevices.map((d) => d.parentUid))
    const notEnrolled = familyParents.filter((p) => !enrolledParentUids.has(p.uid))
    return {
      notEnrolledParents: notEnrolled,
      allParentsEnrolled: notEnrolled.length === 0 && activeDevices.length > 0,
    }
  }, [familyParents, activeDevices])

  // Don't render if offline schedule is not enabled
  if (!offlineScheduleEnabled) {
    return null
  }

  if (loading) {
    return (
      <div style={{ ...styles.card, ...styles.loading }} data-testid="enrolled-devices-loading">
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <FamilyDevicesIcon />
          </div>
          <h2 style={styles.title}>Family Devices</h2>
        </div>
        <p style={styles.message}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={styles.card} data-testid="child-enrolled-devices-card">
      <div style={styles.header}>
        <div style={styles.iconContainer}>
          <FamilyDevicesIcon />
        </div>
        <h2 style={styles.title}>Parents Following Offline Time</h2>
      </div>

      <p style={styles.message} data-testid="enrolled-message">
        These parent devices are enrolled in family offline time too!
      </p>

      {activeDevices.length === 0 ? (
        <p style={styles.emptyText} data-testid="no-enrolled-devices">
          No parent devices enrolled yet
        </p>
      ) : (
        <div style={styles.deviceList} data-testid="enrolled-devices-list" role="list">
          {activeDevices.map((device) => (
            <div
              key={device.deviceId}
              style={styles.deviceItem}
              data-testid="enrolled-device-item"
              role="listitem"
              aria-label={`${device.deviceName} is enrolled`}
            >
              <DeviceIcon type={device.deviceType} />
              <span style={styles.deviceText}>
                {device.deviceName} ({PARENT_DEVICE_TYPE_LABELS[device.deviceType]})
              </span>
              <span style={styles.checkmark} data-testid="enrolled-checkmark" aria-hidden="true">
                ✓
              </span>
            </div>
          ))}
        </div>
      )}

      {/* AC5: Show non-enrolled parents in encouraging way */}
      {notEnrolledParents.length > 0 && activeDevices.length > 0 && (
        <p
          style={{ ...styles.emptyText, marginTop: '12px' }}
          data-testid="not-enrolled-parents"
          role="status"
          aria-label="Parents not yet enrolled"
        >
          {notEnrolledParents.map((p) => p.displayName || 'A parent').join(', ')}{' '}
          {notEnrolledParents.length === 1 ? 'has not' : 'have not'} enrolled yet
        </p>
      )}

      {/* Only show "all enrolled" when ALL parents have actually enrolled */}
      {allParentsEnrolled && (
        <p
          style={{ ...styles.emptyText, marginTop: '12px', fontStyle: 'normal' }}
          data-testid="family-together-message"
          role="status"
        >
          {PARENT_ENROLLMENT_MESSAGES.allEnrolled}
        </p>
      )}
    </div>
  )
}

export default ChildEnrolledDevicesCard
