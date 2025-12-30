'use client'

/**
 * DevicesList Component - Story 12.4, 12.5, 12.6, 13.2, 13.6, 19.1, 19.2
 *
 * Displays the list of enrolled devices for a family with child assignment and removal.
 * Uses real-time Firestore listener via useDevices hook.
 * Story 19.1: Groups devices by assigned child with section headers.
 * Story 19.2: Visual health status indicators based on last sync time.
 *
 * Requirements:
 * - AC5 (12.4): Dashboard device list refresh
 * - AC1 (12.5): Assign to Child dropdown for unassigned devices
 * - AC2 (12.5): Dropdown shows all children in the family
 * - AC3 (12.5): Assignment updates device document
 * - AC5 (12.5): Device can be reassigned anytime
 * - AC6 (12.6): Remove Device action
 * - AC1-6 (13.2): Emergency code display with re-auth
 * - AC1-5 (13.6): Reset emergency codes with confirmation and re-auth
 * - AC1-6 (19.1): Device list grouped by child
 * - AC1-7 (19.2): Device health status indicators with tooltip
 */

import { useState, useCallback, useEffect } from 'react'
import { useDevices, formatLastSeen, isValidDate, type Device } from '../../hooks/useDevices'
import { useChildren, type ChildSummary } from '../../hooks/useChildren'
import { useAuth } from '../../contexts/AuthContext'
import {
  assignDeviceToChild,
  removeDevice,
  getDeviceTotpSecret,
  logEmergencyCodeView,
  resetTotpSecret,
} from '../../services/deviceService'
import { logDataViewNonBlocking } from '../../services/dataViewAuditService'
import { ReauthModal } from '../auth/ReauthModal'
import { EmergencyCodeModal } from './EmergencyCodeModal'
import { DeviceHealthModal } from './DeviceHealthModal'
import { MonitoringDisabledBanner } from './MonitoringDisabledBanner'
import { MonitoringAlertDetailModal } from './MonitoringAlertDetailModal'

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
  // Story 19.2: Enhanced status badge styles with health indicators
  statusBadge: {
    base: {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '4px 10px',
      borderRadius: '9999px',
      fontSize: '12px',
      fontWeight: 500,
      gap: '6px',
      cursor: 'pointer',
      border: 'none',
      transition: 'background-color 0.15s, box-shadow 0.15s',
    },
    active: {
      backgroundColor: '#dcfce7',
      color: '#166534',
    },
    warning: {
      backgroundColor: '#fef3c7',
      color: '#92400e',
    },
    critical: {
      backgroundColor: '#fee2e2',
      color: '#991b1b',
    },
    offline: {
      backgroundColor: '#f3f4f6',
      color: '#6b7280',
    },
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
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
  // Story 19.2: Tooltip styles
  tooltipContainer: {
    position: 'relative' as const,
    display: 'inline-block',
  },
  tooltip: {
    position: 'absolute' as const,
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '8px 12px',
    backgroundColor: '#1f2937',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '12px',
    whiteSpace: 'nowrap' as const,
    marginBottom: '6px',
    zIndex: 100,
    pointerEvents: 'none' as const,
  },
  tooltipArrow: {
    position: 'absolute' as const,
    top: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 0,
    height: 0,
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderTop: '6px solid #1f2937',
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
  emergencyCodeButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #f59e0b',
    backgroundColor: '#fffbeb',
    color: '#b45309',
    fontSize: '12px',
    cursor: 'pointer',
    marginLeft: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  emergencyCodeButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  resetSecretButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #dc2626',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    fontSize: '12px',
    cursor: 'pointer',
    marginLeft: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  resetSecretButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  warningText: {
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
    fontSize: '13px',
    color: '#92400e',
    textAlign: 'left' as const,
  },
  confirmResetButton: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    fontSize: '14px',
    cursor: 'pointer',
  },
  // Story 19.1: Group section styles
  groupSection: {
    marginBottom: '24px',
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '8px',
  },
  groupHeaderAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#dbeafe',
    marginRight: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e40af',
    overflow: 'hidden',
  } as React.CSSProperties,
  groupHeaderAvatarImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  } as React.CSSProperties,
  groupHeaderName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
  },
  groupHeaderCount: {
    fontSize: '13px',
    color: '#6b7280',
    marginLeft: '8px',
  },
  unassignedSection: {
    marginBottom: '24px',
  },
  unassignedHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #fbbf24',
    marginBottom: '8px',
  },
  unassignedIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#fef3c7',
    marginRight: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
  unassignedHeaderText: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#92400e',
  },
  unassignedHeaderCount: {
    fontSize: '13px',
    color: '#92400e',
    marginLeft: '8px',
  },
  orphanedSection: {
    marginBottom: '24px',
  },
  orphanedHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f87171',
    marginBottom: '8px',
  },
  orphanedIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#fee2e2',
    marginRight: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
  },
  orphanedHeaderText: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#991b1b',
  },
  orphanedHeaderCount: {
    fontSize: '13px',
    color: '#991b1b',
    marginLeft: '8px',
  },
  emptyStateCta: {
    marginTop: '12px',
    padding: '10px 20px',
    backgroundColor: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
}

function DeviceIcon({ type }: { type: Device['type'] }) {
  const icon = type === 'chromebook' ? '💻' : '📱'
  return <div style={styles.deviceIcon}>{icon}</div>
}

/**
 * Story 19.1: Group devices by child
 * Task 1: Implement Device Grouping Logic
 *
 * Groups devices by their assigned child, with support for:
 * - Unassigned devices (childId === null)
 * - Orphaned devices (childId exists but child was deleted)
 * - Children sorted alphabetically
 */
export interface DeviceGroup {
  child: ChildSummary
  devices: Device[]
}

export interface GroupedDevices {
  childGroups: DeviceGroup[]
  unassigned: Device[]
  orphaned: Device[]
}

export function groupDevicesByChild(devices: Device[], children: ChildSummary[]): GroupedDevices {
  const childMap = new Map(children.map((c) => [c.id, c]))
  const devicesByChild = new Map<string, Device[]>()
  const unassigned: Device[] = []
  const orphaned: Device[] = []

  for (const device of devices) {
    if (device.childId === null) {
      // Task 1.4: Unassigned devices
      unassigned.push(device)
    } else if (!childMap.has(device.childId)) {
      // Task 1.5: Orphaned devices (childId exists but child was deleted)
      orphaned.push(device)
    } else {
      // Task 1.2: Group by childId
      const existing = devicesByChild.get(device.childId) || []
      existing.push(device)
      devicesByChild.set(device.childId, existing)
    }
  }

  // Task 1.3: Sort children alphabetically by name
  const sortedChildren = [...children].sort((a, b) => a.name.localeCompare(b.name))

  // Build child groups (only for children that have devices)
  const childGroups: DeviceGroup[] = sortedChildren
    .filter((child) => devicesByChild.has(child.id))
    .map((child) => ({
      child,
      devices: devicesByChild.get(child.id)!,
    }))

  return { childGroups, unassigned, orphaned }
}

/**
 * Story 19.1: Child Group Header Component
 * Task 2: Create Child Group Header Component
 */
interface ChildGroupHeaderProps {
  child: ChildSummary
  deviceCount: number
}

function ChildGroupHeader({ child, deviceCount }: ChildGroupHeaderProps) {
  const initial = child.name.charAt(0).toUpperCase()

  return (
    <div style={styles.groupHeader} role="heading" aria-level={3}>
      <div style={styles.groupHeaderAvatar} aria-hidden="true">
        {child.photoURL ? (
          <img src={child.photoURL} alt="" style={styles.groupHeaderAvatarImg} />
        ) : (
          initial
        )}
      </div>
      <span style={styles.groupHeaderName}>{child.name}</span>
      <span style={styles.groupHeaderCount}>
        ({deviceCount} {deviceCount === 1 ? 'device' : 'devices'})
      </span>
    </div>
  )
}

/**
 * Story 19.1: Unassigned Devices Header
 * Task 3: Create Unassigned Section Header
 */
interface UnassignedHeaderProps {
  count: number
}

function UnassignedHeader({ count }: UnassignedHeaderProps) {
  return (
    <div style={styles.unassignedHeader} role="heading" aria-level={3}>
      <div style={styles.unassignedIcon}>📦</div>
      <span style={styles.unassignedHeaderText}>Unassigned Devices</span>
      <span style={styles.unassignedHeaderCount}>
        ({count} {count === 1 ? 'device' : 'devices'})
      </span>
    </div>
  )
}

/**
 * Story 19.1: Orphaned Devices Header (child deleted but device still has childId)
 */
interface OrphanedHeaderProps {
  count: number
}

function OrphanedHeader({ count }: OrphanedHeaderProps) {
  return (
    <div style={styles.orphanedHeader} role="heading" aria-level={3}>
      <div style={styles.orphanedIcon}>⚠️</div>
      <span style={styles.orphanedHeaderText}>Unknown Child</span>
      <span style={styles.orphanedHeaderCount}>
        ({count} {count === 1 ? 'device' : 'devices'})
      </span>
    </div>
  )
}

/**
 * Story 19.2: Health status type
 * Task 1: Create Status Calculation Utility
 */
export type HealthStatus = 'active' | 'warning' | 'critical' | 'offline'

// Story 19.2: Configurable thresholds (in milliseconds)
const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/**
 * Story 19.2: Calculate device health status based on last sync time
 * Story 19.3 Task 1.2: Handle never-synced devices as critical
 * Task 1.1-1.5: Status calculation utility
 *
 * @param device - The device to check
 * @returns HealthStatus - 'active' | 'warning' | 'critical' | 'offline'
 */
export function getDeviceHealthStatus(device: Device): HealthStatus {
  // Task 1.4: Unenrolled devices are always offline
  if (device.status === 'unenrolled') return 'offline'

  // Offline status from device takes precedence
  if (device.status === 'offline') return 'offline'

  // Story 19.3 AC4: Never-synced devices are critical
  if (!isValidDate(device.lastSeen)) return 'critical'

  const now = Date.now()
  const lastSeenMs = device.lastSeen.getTime()
  const timeSinceSync = now - lastSeenMs

  // Task 1.5: Handle edge case - future timestamp (clock skew)
  if (timeSinceSync < 0) return 'active'

  // Task 1.5: Configurable thresholds
  if (timeSinceSync < HOUR_MS) return 'active' // Green: < 1 hour (AC2)
  if (timeSinceSync < DAY_MS) return 'warning' // Yellow: 1-24 hours (AC3)
  return 'critical' // Red: 24+ hours (AC4)
}

/**
 * Story 19.2: Format exact timestamp for tooltip
 * Task 3.4: Show exact timestamp
 */
function formatExactTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Story 19.2: Enhanced Status Badge with health indicators
 * Task 2: Update StatusBadge Component
 * Task 3: Add Tooltip with Last Sync
 * Task 4: Add Click Handler for Health Details
 */
interface StatusBadgeProps {
  device: Device
  onClick?: (device: Device) => void
}

function StatusBadge({ device, onClick }: StatusBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  const healthStatus = getDeviceHealthStatus(device)

  // Task 2.3-2.4: Map health status to colors and labels
  const statusStyles = {
    ...styles.statusBadge.base,
    ...styles.statusBadge[healthStatus],
  }

  const dotStyles = {
    ...styles.statusDot,
    ...(healthStatus === 'active'
      ? styles.statusDotActive
      : healthStatus === 'warning'
        ? styles.statusDotWarning
        : healthStatus === 'critical'
          ? styles.statusDotCritical
          : styles.statusDotOffline),
  }

  const labels: Record<HealthStatus, string> = {
    active: 'Active',
    warning: 'Warning',
    critical: 'Critical',
    offline: 'Offline',
  }

  // Task 4.1-4.4: Make clickable with visual feedback
  const handleClick = () => {
    if (onClick) {
      onClick(device)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  return (
    <div style={styles.tooltipContainer}>
      {/* Task 3.1-3.5: Tooltip on hover */}
      {/* Story 19.3 Task 1.4: Handle never-synced state in tooltip */}
      {showTooltip && (
        <div style={styles.tooltip} role="tooltip">
          <div>Last sync: {formatLastSeen(device.lastSeen)}</div>
          {isValidDate(device.lastSeen) && (
            <div style={{ opacity: 0.8, fontSize: '11px' }}>
              {formatExactTimestamp(device.lastSeen)}
            </div>
          )}
          <div style={styles.tooltipArrow} />
        </div>
      )}
      {/* Task 2.1-2.5: Enhanced status badge with dot indicator */}
      <button
        style={statusStyles}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        aria-label={`Device status: ${labels[healthStatus]}. Last sync: ${formatLastSeen(device.lastSeen)}. Click for details.`}
        type="button"
      >
        {/* Task 2.2: Colored dot indicator */}
        <span style={dotStyles} aria-hidden="true" />
        {labels[healthStatus]}
      </button>
    </div>
  )
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

/**
 * Confirmation modal for reset emergency codes
 * Story 13.6 Task 1.2: Create confirmation dialog with warning
 */
interface ResetSecretConfirmModalProps {
  device: Device
  onConfirm: () => void
  onCancel: () => void
}

function ResetSecretConfirmModal({ device, onConfirm, onCancel }: ResetSecretConfirmModalProps) {
  return (
    <div style={styles.confirmModal} onClick={onCancel}>
      <div style={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.confirmTitle}>Reset Emergency Codes?</h3>
        <div style={styles.warningText}>
          <strong>Warning:</strong> This will invalidate all current emergency codes for &quot;
          {device.name}&quot;. Any codes previously shared with your child will stop working
          immediately.
        </div>
        <p style={styles.confirmText}>
          The device must come online to receive the new codes. Until then, old codes may still work
          on the device.
        </p>
        <div style={styles.confirmButtons}>
          <button style={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button style={styles.confirmResetButton} onClick={onConfirm}>
            Reset Codes
          </button>
        </div>
      </div>
    </div>
  )
}

export function DevicesList({ familyId }: DevicesListProps) {
  const { devices, loading: devicesLoading, error: devicesError } = useDevices({ familyId })
  const { children, loading: childrenLoading, error: childrenError } = useChildren({ familyId })
  const { firebaseUser } = useAuth()
  const [updatingDevices, setUpdatingDevices] = useState<Set<string>>(new Set())
  const [deviceErrors, setDeviceErrors] = useState<Record<string, string>>({})
  const [deviceToRemove, setDeviceToRemove] = useState<Device | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  // Story 13.2: Emergency code state
  const [deviceForEmergencyCode, setDeviceForEmergencyCode] = useState<Device | null>(null)
  const [showReauthModal, setShowReauthModal] = useState(false)
  const [emergencyCodeSecret, setEmergencyCodeSecret] = useState<string | null>(null)
  const [emergencyCodeDeviceName, setEmergencyCodeDeviceName] = useState<string>('')
  const [loadingEmergencyCode, setLoadingEmergencyCode] = useState(false)

  // Story 13.6: Reset TOTP secret state
  const [deviceForReset, setDeviceForReset] = useState<Device | null>(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showResetReauth, setShowResetReauth] = useState(false)
  const [resettingSecret, setResettingSecret] = useState(false)

  // Story 19.4: Device health modal state
  const [deviceForHealth, setDeviceForHealth] = useState<Device | null>(null)

  // Story 19.5: Monitoring disabled alert state
  const [deviceForAlert, setDeviceForAlert] = useState<Device | null>(null)

  const loading = devicesLoading || childrenLoading
  const error = devicesError || childrenError

  /**
   * Story 19.8: Log device list view for audit trail (FR27A).
   * Logs when the devices list is rendered and visible to the parent.
   */
  useEffect(() => {
    if (!loading && !error && familyId && firebaseUser?.uid && devices.length > 0) {
      // Log the devices list view
      logDataViewNonBlocking({
        viewerUid: firebaseUser.uid,
        childId: null, // Family-level view
        familyId,
        dataType: 'devices',
        metadata: {
          deviceCount: devices.length,
          activeDeviceCount: devices.filter((d) => d.status === 'active').length,
        },
      })
    }
  }, [loading, error, familyId, firebaseUser?.uid, devices.length])

  /**
   * Story 13.2: Handle emergency code button click.
   * Opens re-auth modal first for security.
   */
  const handleEmergencyCodeClick = useCallback((device: Device) => {
    setDeviceForEmergencyCode(device)
    setShowReauthModal(true)
  }, [])

  /**
   * Story 13.2: Handle successful re-authentication.
   * Fetches TOTP secret and shows emergency code modal.
   */
  const handleReauthSuccess = useCallback(async () => {
    setShowReauthModal(false)

    if (!deviceForEmergencyCode || !firebaseUser) return

    setLoadingEmergencyCode(true)
    try {
      const { totpSecret, deviceName } = await getDeviceTotpSecret(
        familyId,
        deviceForEmergencyCode.deviceId
      )

      // Log the view event (AC5)
      await logEmergencyCodeView(familyId, deviceForEmergencyCode.deviceId, firebaseUser.uid)

      setEmergencyCodeSecret(totpSecret)
      setEmergencyCodeDeviceName(deviceName)
    } catch (err) {
      console.error('Failed to get TOTP secret:', err)
      setDeviceErrors((prev) => ({
        ...prev,
        [deviceForEmergencyCode.deviceId]:
          err instanceof Error ? err.message : 'Failed to get emergency code',
      }))
      setDeviceForEmergencyCode(null)
    } finally {
      setLoadingEmergencyCode(false)
    }
  }, [deviceForEmergencyCode, familyId, firebaseUser])

  /**
   * Story 13.2: Close emergency code modal and reset state.
   */
  const handleCloseEmergencyCode = useCallback(() => {
    setEmergencyCodeSecret(null)
    setEmergencyCodeDeviceName('')
    setDeviceForEmergencyCode(null)
  }, [])

  /**
   * Story 13.6: Handle reset emergency codes button click.
   * Shows confirmation dialog first.
   */
  const handleResetSecretClick = useCallback((device: Device) => {
    setDeviceForReset(device)
    setShowResetConfirm(true)
  }, [])

  /**
   * Story 13.6: Handle reset confirmation.
   * Shows re-auth modal for security.
   */
  const handleResetConfirm = useCallback(() => {
    setShowResetConfirm(false)
    setShowResetReauth(true)
  }, [])

  /**
   * Story 13.6: Handle successful re-authentication for reset.
   * Performs the actual TOTP secret reset.
   */
  const handleResetReauthSuccess = useCallback(async () => {
    setShowResetReauth(false)

    if (!deviceForReset || !firebaseUser) return

    setResettingSecret(true)
    try {
      await resetTotpSecret(familyId, deviceForReset.deviceId, firebaseUser.uid)
      // Success - clear state (no need to show the new secret to user)
      setDeviceForReset(null)
    } catch (err) {
      console.error('Failed to reset TOTP secret:', err)
      setDeviceErrors((prev) => ({
        ...prev,
        [deviceForReset.deviceId]:
          err instanceof Error ? err.message : 'Failed to reset emergency codes',
      }))
      setDeviceForReset(null)
    } finally {
      setResettingSecret(false)
    }
  }, [deviceForReset, familyId, firebaseUser])

  /**
   * Story 13.6: Cancel reset flow.
   */
  const handleResetCancel = useCallback(() => {
    setShowResetConfirm(false)
    setShowResetReauth(false)
    setDeviceForReset(null)
  }, [])

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

  // Filter active devices vs unenrolled devices
  // Story 19.5: Unenrolled devices now show with warning banner
  const activeDevices = devices.filter((d) => d.status !== 'unenrolled')
  const unenrolledDevices = devices.filter((d) => d.status === 'unenrolled')

  // Story 19.1: Empty state with CTA (AC6)
  // Story 19.5: Show unenrolled devices even if no active devices
  if (activeDevices.length === 0 && unenrolledDevices.length === 0) {
    return (
      <div style={styles.emptyState} role="status" aria-live="polite">
        <p>No devices enrolled yet.</p>
        <button
          style={styles.emptyStateCta}
          aria-label="Add your first device"
          onClick={() => {
            // TODO: Story 20.x - Navigate to device enrollment flow
            // This will be implemented when the enrollment UI story is complete
          }}
        >
          Add your first device
        </button>
      </div>
    )
  }

  // Story 19.1: Group devices by child (AC3, AC4)
  const { childGroups, unassigned, orphaned } = groupDevicesByChild(activeDevices, children)

  /**
   * Story 19.1: Render a single device item
   * Extracted to avoid code duplication across groups
   */
  /**
   * Story 19.3 Task 2.3-2.5: Display last screenshot timestamp
   */
  const formatScreenshotTime = (date: Date | null): string => {
    if (!date || !isValidDate(date)) {
      return 'No screenshots yet'
    }
    return formatLastSeen(date)
  }

  const renderDeviceItem = (device: Device) => {
    const healthStatus = getDeviceHealthStatus(device)

    return (
      <div key={device.deviceId} style={styles.deviceItem}>
        <DeviceIcon type={device.type} />
        <div style={styles.deviceInfo}>
          <div style={styles.deviceName}>{device.name}</div>
          <div style={styles.deviceMeta}>
            {device.type === 'chromebook' ? 'Chromebook' : 'Android'} &middot; Last seen{' '}
            {formatLastSeen(device.lastSeen)} &middot; Screenshot{' '}
            {formatScreenshotTime(device.lastScreenshotAt)}
          </div>
        </div>
        {/* Story 19.3 Task 3: Warning icon for delayed sync */}
        {(healthStatus === 'warning' || healthStatus === 'critical') && (
          <span
            style={{
              marginRight: '8px',
              fontSize: '16px',
            }}
            aria-label={`Device has ${healthStatus} status - sync delayed`}
            role="img"
          >
            ⚠️
          </span>
        )}
        <ChildAssignment
          device={device}
          childList={children}
          onAssignmentChange={handleAssignmentChange}
          isUpdating={updatingDevices.has(device.deviceId)}
          error={deviceErrors[device.deviceId] || null}
        />
        <StatusBadge
          device={device}
          onClick={(dev) => {
            // Story 19.4: Open health details modal
            setDeviceForHealth(dev)
          }}
        />
        <button
          style={{
            ...styles.emergencyCodeButton,
            ...(loadingEmergencyCode ? styles.emergencyCodeButtonDisabled : {}),
          }}
          onClick={() => handleEmergencyCodeClick(device)}
          disabled={loadingEmergencyCode}
          aria-label="Show emergency unlock code"
        >
          🔓 Emergency Code
        </button>
        <button
          style={{
            ...styles.resetSecretButton,
            ...(resettingSecret ? styles.resetSecretButtonDisabled : {}),
          }}
          onClick={() => handleResetSecretClick(device)}
          disabled={resettingSecret}
          aria-label="Reset emergency codes"
        >
          🔄 Reset Codes
        </button>
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
    )
  }

  return (
    <>
      {/* Story 19.5: Monitoring disabled banners for unenrolled devices (AC2) */}
      {unenrolledDevices.map((device) => (
        <MonitoringDisabledBanner
          key={`banner-${device.deviceId}`}
          device={device}
          onViewDetails={() => setDeviceForAlert(device)}
          onReEnroll={() => {
            // TODO: Story 20.x - Navigate to re-enrollment flow
            // This will be implemented when the enrollment UI story is complete
          }}
        />
      ))}

      <div style={styles.deviceList}>
        {/* Story 19.1: Child-grouped sections (AC3) */}
        {childGroups.map(({ child, devices: childDevices }) => (
          <div key={child.id} style={styles.groupSection}>
            <ChildGroupHeader child={child} deviceCount={childDevices.length} />
            {childDevices.map(renderDeviceItem)}
          </div>
        ))}

        {/* Story 19.1: Orphaned devices section (devices with deleted child) */}
        {orphaned.length > 0 && (
          <div style={styles.orphanedSection}>
            <OrphanedHeader count={orphaned.length} />
            {orphaned.map(renderDeviceItem)}
          </div>
        )}

        {/* Story 19.1: Unassigned devices section (AC4) */}
        {unassigned.length > 0 && (
          <div style={styles.unassignedSection}>
            <UnassignedHeader count={unassigned.length} />
            {unassigned.map(renderDeviceItem)}
          </div>
        )}
      </div>

      {deviceToRemove && (
        <RemoveConfirmModal
          device={deviceToRemove}
          onConfirm={handleRemoveDevice}
          onCancel={() => setDeviceToRemove(null)}
          isRemoving={isRemoving}
        />
      )}

      {/* Story 13.2: Re-authentication modal */}
      {showReauthModal && firebaseUser && (
        <ReauthModal
          user={firebaseUser}
          isOpen={showReauthModal}
          onClose={() => {
            setShowReauthModal(false)
            setDeviceForEmergencyCode(null)
          }}
          onSuccess={handleReauthSuccess}
          title="Confirm Your Identity"
          description="For security, please verify your identity before viewing the emergency unlock code."
        />
      )}

      {/* Story 13.2: Emergency code display modal */}
      {emergencyCodeSecret && (
        <EmergencyCodeModal
          secret={emergencyCodeSecret}
          deviceName={emergencyCodeDeviceName}
          isOpen={!!emergencyCodeSecret}
          onClose={handleCloseEmergencyCode}
        />
      )}

      {/* Story 13.6: Reset confirmation modal */}
      {showResetConfirm && deviceForReset && (
        <ResetSecretConfirmModal
          device={deviceForReset}
          onConfirm={handleResetConfirm}
          onCancel={handleResetCancel}
        />
      )}

      {/* Story 13.6: Re-authentication modal for reset */}
      {showResetReauth && firebaseUser && (
        <ReauthModal
          user={firebaseUser}
          isOpen={showResetReauth}
          onClose={handleResetCancel}
          onSuccess={handleResetReauthSuccess}
          title="Confirm Your Identity"
          description="For security, please verify your identity before resetting emergency codes."
        />
      )}

      {/* Story 19.4: Device health details modal */}
      {deviceForHealth && (
        <DeviceHealthModal device={deviceForHealth} onClose={() => setDeviceForHealth(null)} />
      )}

      {/* Story 19.5: Monitoring alert detail modal */}
      {deviceForAlert && (
        <MonitoringAlertDetailModal
          device={deviceForAlert}
          onClose={() => setDeviceForAlert(null)}
          onReEnroll={() => {
            // TODO: Story 20.x - Navigate to re-enrollment flow
            setDeviceForAlert(null)
          }}
          onRemoveDevice={() => {
            // Trigger the existing remove device flow
            setDeviceToRemove(deviceForAlert)
            setDeviceForAlert(null)
          }}
        />
      )}
    </>
  )
}
