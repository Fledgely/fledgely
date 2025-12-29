'use client'

/**
 * DevicesList Component - Story 12.4, 12.5, 12.6
 *
 * Displays the list of enrolled devices for a family with child assignment and removal.
 * Uses real-time Firestore listener via useDevices hook.
 *
 * Requirements:
 * - AC5 (12.4): Dashboard device list refresh
 * - AC1 (12.5): Assign to Child dropdown for unassigned devices
 * - AC2 (12.5): Dropdown shows all children in the family
 * - AC3 (12.5): Assignment updates device document
 * - AC5 (12.5): Device can be reassigned anytime
 * - AC6 (12.6): Remove Device action
 */

import { useState } from 'react'
import { useDevices, formatLastSeen, type Device } from '../../hooks/useDevices'
import { useChildren, type ChildSummary } from '../../hooks/useChildren'
import { assignDeviceToChild, removeDevice } from '../../services/deviceService'

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
  assignmentContainer: {
    marginLeft: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  childSelector: {
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    fontSize: '13px',
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    minWidth: '140px',
  },
  childSelectorDisabled: {
    backgroundColor: '#f3f4f6',
    cursor: 'not-allowed',
    opacity: 0.7,
  },
  assignmentError: {
    color: '#dc2626',
    fontSize: '12px',
    marginTop: '4px',
  },
  assignedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 500,
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    marginRight: '8px',
  },
  removeButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #dc2626',
    backgroundColor: '#ffffff',
    color: '#dc2626',
    fontSize: '12px',
    cursor: 'pointer',
    marginLeft: '8px',
  },
  removeButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  confirmModal: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  confirmDialog: {
    backgroundColor: '#ffffff',
    padding: '24px',
    borderRadius: '12px',
    maxWidth: '400px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
  },
  confirmTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '12px',
    color: '#1f2937',
  },
  confirmText: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '20px',
  },
  confirmButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '14px',
    cursor: 'pointer',
  },
  confirmRemoveButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontSize: '14px',
    cursor: 'pointer',
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

interface ChildAssignmentProps {
  device: Device
  childList: ChildSummary[]
  onAssignmentChange: (deviceId: string, childId: string | null) => void
  isUpdating: boolean
  error: string | null
}

/**
 * Child assignment dropdown for a device.
 * Task 2: Dashboard Device Assignment UI
 * - 2.1 Add child selector to DevicesList component
 * - 2.2 Fetch children list for family (via props)
 * - 2.3 Display current assignment status
 * - 2.4 Handle assignment/reassignment actions
 * - 2.5 Show loading and error states
 */
function ChildAssignment({
  device,
  childList,
  onAssignmentChange,
  isUpdating,
  error,
}: ChildAssignmentProps) {
  const assignedChild = device.childId ? childList.find((c) => c.id === device.childId) : null

  // Handle orphaned assignment (child was deleted but device still has childId)
  const isOrphaned = device.childId && !assignedChild

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const newChildId = value === '' ? null : value
    onAssignmentChange(device.deviceId, newChildId)
  }

  const selectStyle = {
    ...styles.childSelector,
    ...(isUpdating ? styles.childSelectorDisabled : {}),
  }

  return (
    <div style={styles.assignmentContainer}>
      {assignedChild && <span style={styles.assignedBadge}>{assignedChild.name}</span>}
      {isOrphaned && (
        <span style={{ ...styles.assignedBadge, backgroundColor: '#fef3c7', color: '#92400e' }}>
          Unknown child
        </span>
      )}
      <select
        style={selectStyle}
        value={device.childId || ''}
        onChange={handleChange}
        disabled={isUpdating}
        aria-label="Assign to child"
      >
        <option value="">{device.childId ? 'Unassign' : 'Assign to child...'}</option>
        {childList.map((child) => (
          <option key={child.id} value={child.id}>
            {child.name}
          </option>
        ))}
      </select>
      {error && <span style={styles.assignmentError}>{error}</span>}
    </div>
  )
}

/**
 * Confirmation modal for device removal
 * Story 12.6 Task 5.4: Handle removal confirmation
 */
interface RemoveConfirmModalProps {
  device: Device
  onConfirm: () => void
  onCancel: () => void
  isRemoving: boolean
}

function RemoveConfirmModal({ device, onConfirm, onCancel, isRemoving }: RemoveConfirmModalProps) {
  return (
    <div style={styles.confirmModal} onClick={onCancel}>
      <div style={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.confirmTitle}>Remove Device?</h3>
        <p style={styles.confirmText}>
          Are you sure you want to remove &quot;{device.name}&quot;? The device will need to be
          re-enrolled to resume monitoring.
        </p>
        <div style={styles.confirmButtons}>
          <button style={styles.cancelButton} onClick={onCancel} disabled={isRemoving}>
            Cancel
          </button>
          <button
            style={{
              ...styles.confirmRemoveButton,
              ...(isRemoving ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
            }}
            onClick={onConfirm}
            disabled={isRemoving}
          >
            {isRemoving ? 'Removing...' : 'Remove Device'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function DevicesList({ familyId }: DevicesListProps) {
  const { devices, loading: devicesLoading, error: devicesError } = useDevices({ familyId })
  const { children, loading: childrenLoading, error: childrenError } = useChildren({ familyId })
  const [updatingDevices, setUpdatingDevices] = useState<Set<string>>(new Set())
  const [deviceErrors, setDeviceErrors] = useState<Record<string, string>>({})
  const [deviceToRemove, setDeviceToRemove] = useState<Device | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const loading = devicesLoading || childrenLoading
  const error = devicesError || childrenError

  /**
   * Handle assignment change with server-first update.
   * Task 4.2: Handle loading state during assignment
   * Task 4.3: Show error on failure
   */
  const handleAssignmentChange = async (deviceId: string, childId: string | null) => {
    // Clear previous error for this device
    setDeviceErrors((prev) => {
      const next = { ...prev }
      delete next[deviceId]
      return next
    })

    // Mark device as updating
    setUpdatingDevices((prev) => new Set(prev).add(deviceId))

    try {
      await assignDeviceToChild(familyId, deviceId, childId)
      // Success - Firestore listener will update the UI automatically
    } catch (err: unknown) {
      // Parse Firebase error codes for better UX
      let message = 'Assignment failed'
      if (err && typeof err === 'object' && 'code' in err) {
        const errorCode = (err as { code: string }).code
        if (errorCode === 'functions/permission-denied') {
          message = 'You do not have permission to assign devices'
        } else if (errorCode === 'functions/not-found') {
          message = 'Device or child not found'
        } else if (errorCode === 'functions/unauthenticated') {
          message = 'Please sign in to assign devices'
        }
      } else if (err instanceof Error) {
        message = err.message
      }
      setDeviceErrors((prev) => ({ ...prev, [deviceId]: message }))
    } finally {
      // Clear updating state
      setUpdatingDevices((prev) => {
        const next = new Set(prev)
        next.delete(deviceId)
        return next
      })
    }
  }

  /**
   * Handle device removal with confirmation.
   * Story 12.6 Task 5: Device Removal Flow (AC: #6)
   */
  const handleRemoveDevice = async () => {
    if (!deviceToRemove) return

    setIsRemoving(true)
    try {
      await removeDevice(familyId, deviceToRemove.deviceId)
      // Success - Firestore listener will update the UI (device status becomes 'unenrolled')
      setDeviceToRemove(null)
    } catch (err: unknown) {
      let message = 'Failed to remove device'
      if (err && typeof err === 'object' && 'code' in err) {
        const errorCode = (err as { code: string }).code
        if (errorCode === 'functions/permission-denied') {
          message = 'You do not have permission to remove devices'
        } else if (errorCode === 'functions/not-found') {
          message = 'Device not found'
        }
      } else if (err instanceof Error) {
        message = err.message
      }
      setDeviceErrors((prev) => ({ ...prev, [deviceToRemove.deviceId]: message }))
      setDeviceToRemove(null)
    } finally {
      setIsRemoving(false)
    }
  }

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

  // Filter out unenrolled devices - they shouldn't appear in the list
  const activeDevices = devices.filter((d) => d.status !== 'unenrolled')

  return (
    <>
      <div style={styles.deviceList}>
        {activeDevices.map((device) => (
          <div key={device.deviceId} style={styles.deviceItem}>
            <DeviceIcon type={device.type} />
            <div style={styles.deviceInfo}>
              <div style={styles.deviceName}>{device.name}</div>
              <div style={styles.deviceMeta}>
                {device.type === 'chromebook' ? 'Chromebook' : 'Android'} &middot; Last seen{' '}
                {formatLastSeen(device.lastSeen)}
              </div>
            </div>
            <ChildAssignment
              device={device}
              childList={children}
              onAssignmentChange={handleAssignmentChange}
              isUpdating={updatingDevices.has(device.deviceId)}
              error={deviceErrors[device.deviceId] || null}
            />
            <StatusBadge status={device.status} />
            <button
              style={{
                ...styles.removeButton,
                ...(updatingDevices.has(device.deviceId) ? styles.removeButtonDisabled : {}),
              }}
              onClick={() => setDeviceToRemove(device)}
              disabled={updatingDevices.has(device.deviceId)}
              aria-label="Remove device"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      {deviceToRemove && (
        <RemoveConfirmModal
          device={deviceToRemove}
          onConfirm={handleRemoveDevice}
          onCancel={() => setDeviceToRemove(null)}
          isRemoving={isRemoving}
        />
      )}
    </>
  )
}
