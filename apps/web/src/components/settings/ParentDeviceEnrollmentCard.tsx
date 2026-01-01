'use client'

/**
 * ParentDeviceEnrollmentCard Component - Story 32.2
 *
 * Parent-facing UI for enrolling devices in family offline time.
 *
 * Requirements:
 * - AC1: Parent can add their phone/tablet to offline enforcement
 * - AC2: Enrollment is voluntary but visible to children
 * - AC3: "Mom's phone is enrolled" shown in device list
 * - AC5: Non-enrolled parent devices noted
 * - AC6: Encourages modeling but doesn't force parent enrollment
 */

import { useState } from 'react'
import { useParentDeviceEnrollment } from '../../hooks/useParentDeviceEnrollment'
import { useFamily } from '../../contexts/FamilyContext'
import {
  PARENT_DEVICE_TYPE_LABELS,
  PARENT_ENROLLMENT_MESSAGES,
  type ParentDeviceType,
} from '@fledgely/shared'

const DEVICE_TYPES: ParentDeviceType[] = ['phone', 'tablet', 'laptop', 'desktop', 'other']

const styles = {
  card: {
    background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
    borderRadius: '16px',
    border: '1px solid #86efac',
    padding: '24px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  header: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '12px',
    marginBottom: '16px',
  },
  iconContainer: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    backgroundColor: '#22c55e',
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#166534',
    margin: 0,
  },
  description: {
    fontSize: '14px',
    color: '#15803d',
    marginBottom: '20px',
    lineHeight: 1.5,
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#166534',
    marginBottom: '12px',
  },
  form: {
    display: 'flex' as const,
    gap: '12px',
    flexWrap: 'wrap' as const,
    marginBottom: '16px',
  },
  input: {
    flex: '1 1 200px',
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid #86efac',
    borderRadius: '8px',
    backgroundColor: 'white',
    outline: 'none',
  },
  select: {
    padding: '10px 14px',
    fontSize: '14px',
    border: '1px solid #86efac',
    borderRadius: '8px',
    backgroundColor: 'white',
    cursor: 'pointer',
    minWidth: '120px',
  },
  enrollButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 600,
    color: 'white',
    backgroundColor: '#22c55e',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  enrollButtonDisabled: {
    backgroundColor: '#86efac',
    cursor: 'not-allowed',
  },
  deviceList: {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    gap: '8px',
  },
  deviceItem: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '12px 16px',
    backgroundColor: 'white',
    borderRadius: '8px',
    border: '1px solid #d1fae5',
  },
  deviceInfo: {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '10px',
  },
  deviceIcon: {
    fontSize: '20px',
  },
  deviceName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#166534',
  },
  deviceType: {
    fontSize: '12px',
    color: '#6b7280',
  },
  removeButton: {
    padding: '6px 12px',
    fontSize: '12px',
    color: '#dc2626',
    backgroundColor: 'transparent',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  emptyState: {
    fontSize: '14px',
    color: '#6b7280',
    fontStyle: 'italic',
    padding: '12px 0',
  },
  otherParentsSection: {
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: '1px solid #d1fae5',
  },
  notEnrolledText: {
    fontSize: '14px',
    color: '#6b7280',
    fontStyle: 'italic',
    padding: '8px 0',
  },
  enrolledBadge: {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: '4px',
    padding: '4px 8px',
    fontSize: '12px',
    color: '#166534',
    backgroundColor: '#dcfce7',
    borderRadius: '12px',
  },
  loading: {
    opacity: 0.6,
  },
  error: {
    fontSize: '14px',
    color: '#dc2626',
    padding: '12px',
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    marginBottom: '16px',
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

// Smartphone icon for header
function SmartphoneIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ffffff"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12" y2="18" />
    </svg>
  )
}

export interface ParentDeviceEnrollmentCardProps {
  /** Whether the offline schedule is enabled (AC1: requires family offline time configured) */
  offlineScheduleEnabled?: boolean
}

export function ParentDeviceEnrollmentCard({
  offlineScheduleEnabled = false,
}: ParentDeviceEnrollmentCardProps) {
  const { family } = useFamily()
  const familyId = family?.id
  const { myDevices, otherParentDevices, loading, saving, error, enrollDevice, removeDevice } =
    useParentDeviceEnrollment(familyId)

  const [deviceName, setDeviceName] = useState('')
  const [deviceType, setDeviceType] = useState<ParentDeviceType>('phone')

  const handleEnroll = async () => {
    if (!deviceName.trim()) return
    await enrollDevice({ deviceName: deviceName.trim(), deviceType })
    setDeviceName('')
    setDeviceType('phone')
  }

  const handleRemove = async (deviceId: string) => {
    await removeDevice(deviceId)
  }

  // Get other parents' names from family guardians
  const getParentDisplayName = (parentUid: string): string => {
    const guardian = family?.guardians?.find((g) => g.uid === parentUid)
    // Try to get a display name, fallback to generic
    return guardian ? 'Parent' : 'Parent'
  }

  // Don't render if offline schedule is not enabled
  if (!offlineScheduleEnabled) {
    return null
  }

  if (loading) {
    return (
      <div style={{ ...styles.card, ...styles.loading }} data-testid="enrollment-loading">
        <div style={styles.header}>
          <div style={styles.iconContainer}>
            <SmartphoneIcon />
          </div>
          <h2 style={styles.title}>{PARENT_ENROLLMENT_MESSAGES.header}</h2>
        </div>
        <p style={styles.description}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={styles.card} data-testid="parent-device-enrollment-card">
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.iconContainer}>
          <SmartphoneIcon />
        </div>
        <h2 style={styles.title}>{PARENT_ENROLLMENT_MESSAGES.header}</h2>
      </div>

      {/* Encouraging description - AC6 */}
      <p style={styles.description} data-testid="enrollment-description">
        {PARENT_ENROLLMENT_MESSAGES.description}
      </p>

      {/* Error display */}
      {error && (
        <div style={styles.error} data-testid="enrollment-error">
          {error}
        </div>
      )}

      {/* Add device form - AC1 */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Add Your Device</h3>
        <div style={styles.form}>
          <input
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="Device name (e.g., My iPhone)"
            style={styles.input}
            aria-label="Device name"
            data-testid="device-name-input"
          />
          <select
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value as ParentDeviceType)}
            style={styles.select}
            aria-label="Device type"
            data-testid="device-type-select"
          >
            {DEVICE_TYPES.map((type) => (
              <option key={type} value={type}>
                {PARENT_DEVICE_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <button
            onClick={handleEnroll}
            disabled={!deviceName.trim() || saving}
            style={{
              ...styles.enrollButton,
              ...(!deviceName.trim() || saving ? styles.enrollButtonDisabled : {}),
            }}
            aria-label="Enroll device"
            data-testid="enroll-button"
          >
            {saving ? 'Enrolling...' : 'Enroll Device'}
          </button>
        </div>
      </div>

      {/* My enrolled devices - AC3 */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>My Enrolled Devices</h3>
        {myDevices.length === 0 ? (
          <p style={styles.emptyState} data-testid="no-my-devices">
            You have not enrolled any devices yet
          </p>
        ) : (
          <div style={styles.deviceList} data-testid="my-devices-list">
            {myDevices.map((device) => (
              <div key={device.deviceId} style={styles.deviceItem} data-testid="my-device-item">
                <div style={styles.deviceInfo}>
                  <DeviceIcon type={device.deviceType} />
                  <div>
                    <div style={styles.deviceName}>{device.deviceName}</div>
                    <div style={styles.deviceType}>
                      {PARENT_DEVICE_TYPE_LABELS[device.deviceType]}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(device.deviceId)}
                  style={styles.removeButton}
                  disabled={saving}
                  aria-label={`Remove ${device.deviceName}`}
                  data-testid={`remove-${device.deviceId}`}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Other parents' devices - AC5 */}
      <div style={styles.otherParentsSection}>
        <h3 style={styles.sectionTitle}>Other Family Members</h3>
        {otherParentDevices.length === 0 ? (
          <p style={styles.notEnrolledText} data-testid="no-other-devices">
            No other parents have enrolled devices yet
          </p>
        ) : (
          <div style={styles.deviceList} data-testid="other-devices-list">
            {otherParentDevices.map((device) => (
              <div key={device.deviceId} style={styles.deviceItem} data-testid="other-device-item">
                <div style={styles.deviceInfo}>
                  <DeviceIcon type={device.deviceType} />
                  <div>
                    <div style={styles.deviceName}>{device.deviceName}</div>
                    <div style={styles.deviceType}>
                      {getParentDisplayName(device.parentUid)}&apos;s{' '}
                      {PARENT_DEVICE_TYPE_LABELS[device.deviceType]}
                    </div>
                  </div>
                </div>
                <span style={styles.enrolledBadge}>✓ Enrolled</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ParentDeviceEnrollmentCard
