/**
 * Safety Device Unenroll Section Component.
 *
 * Story 0.5.5: Remote Device Unenrollment
 *
 * Section for viewing and unenrolling devices in the safety dashboard.
 * Supports multi-select for batch unenrollment.
 *
 * CRITICAL SAFETY DESIGN:
 * - No notifications sent on unenrollment
 * - No family audit logging
 * - Shows warning about irreversibility
 * - Requires confirmation before executing
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useDevicesForFamily, DeviceInfoForSafety } from '../../hooks/useDevicesForFamily'
import { useUnenrollDevices } from '../../hooks/useUnenrollDevices'

export interface VerificationStatus {
  phoneVerified: boolean
  idDocumentVerified: boolean
  accountMatchVerified: boolean
  securityQuestionsVerified: boolean
}

export interface SafetyDeviceUnenrollSectionProps {
  /** The safety ticket ID */
  ticketId: string
  /** Verification status from ticket */
  verificationStatus: VerificationStatus
  /** Callback on successful unenrollment */
  onSuccess?: () => void
}

/**
 * Count completed verifications.
 */
function countVerifications(status: VerificationStatus): number {
  return [
    status.phoneVerified,
    status.idDocumentVerified,
    status.accountMatchVerified,
    status.securityQuestionsVerified,
  ].filter(Boolean).length
}

/**
 * Format last seen timestamp.
 */
function formatLastSeen(timestamp: number | null): string {
  if (!timestamp) return 'Never'

  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return new Date(timestamp).toLocaleDateString()
}

/**
 * Safety Device Unenroll Section.
 */
export function SafetyDeviceUnenrollSection({
  ticketId,
  verificationStatus,
  onSuccess,
}: SafetyDeviceUnenrollSectionProps) {
  const {
    loading: devicesLoading,
    error: devicesError,
    devices,
    familyId,
    familyName,
    fetchDevices,
    clearError: clearDevicesError,
  } = useDevicesForFamily()

  const {
    loading: unenrollLoading,
    error: unenrollError,
    unenrollDevices,
    clearError: clearUnenrollError,
  } = useUnenrollDevices()

  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set())
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [unenrollSuccess, setUnenrollSuccess] = useState(false)

  const verificationCount = countVerifications(verificationStatus)
  const canUnenroll = verificationCount >= 2
  const activeDevices = devices.filter((d) => d.status !== 'unenrolled')

  // Load devices on mount
  useEffect(() => {
    fetchDevices(ticketId)
  }, [ticketId, fetchDevices])

  /**
   * Toggle device selection.
   */
  const toggleDevice = useCallback((deviceId: string) => {
    setSelectedDeviceIds((prev) => {
      const next = new Set(prev)
      if (next.has(deviceId)) {
        next.delete(deviceId)
      } else {
        next.add(deviceId)
      }
      return next
    })
  }, [])

  /**
   * Select all active devices.
   */
  const selectAll = useCallback(() => {
    setSelectedDeviceIds(new Set(activeDevices.map((d) => d.deviceId)))
  }, [activeDevices])

  /**
   * Clear selection.
   */
  const clearSelection = useCallback(() => {
    setSelectedDeviceIds(new Set())
  }, [])

  /**
   * Handle unenrollment.
   */
  const handleUnenroll = async () => {
    if (!familyId || selectedDeviceIds.size === 0 || !canUnenroll) return

    clearUnenrollError()
    const result = await unenrollDevices({
      ticketId,
      familyId,
      deviceIds: Array.from(selectedDeviceIds),
    })

    if (result?.success) {
      setUnenrollSuccess(true)
      setSelectedDeviceIds(new Set())
      setShowConfirmation(false)
      // Refresh device list
      await fetchDevices(ticketId)
      onSuccess?.()
    }
  }

  /**
   * Render device row.
   */
  const renderDevice = (device: DeviceInfoForSafety) => {
    const isSelected = selectedDeviceIds.has(device.deviceId)
    const isUnenrolled = device.status === 'unenrolled'
    const isDisabled = !canUnenroll || isUnenrolled

    return (
      <tr key={device.deviceId} style={isUnenrolled ? styles.unenrolledRow : undefined}>
        <td style={styles.checkboxCell}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleDevice(device.deviceId)}
            disabled={isDisabled}
            aria-label={`Select ${device.name}`}
            style={styles.checkbox}
          />
        </td>
        <td style={styles.cell}>
          <div style={styles.deviceName}>{device.name}</div>
          <div style={styles.deviceId}>{device.deviceId.substring(0, 8)}...</div>
        </td>
        <td style={styles.cell}>
          <span style={styles.deviceType}>{device.type}</span>
        </td>
        <td style={styles.cell}>{device.childId ? 'Assigned' : 'Unassigned'}</td>
        <td style={styles.cell}>{formatLastSeen(device.lastSeen)}</td>
        <td style={styles.cell}>
          <span
            style={{
              ...styles.statusBadge,
              ...(device.status === 'active'
                ? styles.statusActive
                : device.status === 'offline'
                  ? styles.statusOffline
                  : styles.statusUnenrolled),
            }}
          >
            {device.status}
          </span>
        </td>
      </tr>
    )
  }

  // Loading state
  if (devicesLoading && devices.length === 0) {
    return (
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Device Unenrollment</h3>
        <p style={styles.loadingText}>Loading devices...</p>
      </section>
    )
  }

  // No family found
  if (!familyId) {
    return (
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Device Unenrollment</h3>
        <p style={styles.noDataText}>No family associated with this ticket.</p>
      </section>
    )
  }

  // Error state
  if (devicesError) {
    return (
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Device Unenrollment</h3>
        <div style={styles.errorBanner}>
          <span>⚠️</span>
          <span>{devicesError}</span>
          <button onClick={() => clearDevicesError()} style={styles.dismissButton}>
            Dismiss
          </button>
        </div>
      </section>
    )
  }

  return (
    <section style={styles.section}>
      <h3 style={styles.sectionTitle}>Device Unenrollment</h3>

      {familyName && <p style={styles.familyName}>Family: {familyName}</p>}

      {/* Success message */}
      {unenrollSuccess && (
        <div style={styles.successBanner}>
          <span>✓</span>
          <span>Devices unenrolled successfully</span>
        </div>
      )}

      {/* Verification warning */}
      {!canUnenroll && (
        <div style={styles.warningBanner}>
          <span>⚠️</span>
          <span>Minimum 2 verification checks required before unenrolling devices.</span>
        </div>
      )}

      {/* No devices */}
      {devices.length === 0 && (
        <p style={styles.noDataText}>No devices enrolled for this family.</p>
      )}

      {/* Device table */}
      {devices.length > 0 && (
        <>
          <div style={styles.tableActions}>
            <div style={styles.selectionInfo}>
              {selectedDeviceIds.size > 0
                ? `${selectedDeviceIds.size} device(s) selected`
                : 'No devices selected'}
            </div>
            <div style={styles.actionButtons}>
              <button
                onClick={selectAll}
                disabled={!canUnenroll || activeDevices.length === 0}
                style={styles.textButton}
              >
                Select All
              </button>
              <button
                onClick={clearSelection}
                disabled={selectedDeviceIds.size === 0}
                style={styles.textButton}
              >
                Clear
              </button>
            </div>
          </div>

          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.headerCell}></th>
                  <th style={styles.headerCell}>Device</th>
                  <th style={styles.headerCell}>Type</th>
                  <th style={styles.headerCell}>Child</th>
                  <th style={styles.headerCell}>Last Seen</th>
                  <th style={styles.headerCell}>Status</th>
                </tr>
              </thead>
              <tbody>{devices.map(renderDevice)}</tbody>
            </table>
          </div>

          {/* Unenroll button */}
          <div style={styles.unenrollSection}>
            {!showConfirmation ? (
              <button
                onClick={() => setShowConfirmation(true)}
                disabled={!canUnenroll || selectedDeviceIds.size === 0 || unenrollLoading}
                style={{
                  ...styles.unenrollButton,
                  ...(!canUnenroll || selectedDeviceIds.size === 0
                    ? styles.unenrollButtonDisabled
                    : {}),
                }}
              >
                Unenroll Selected Devices ({selectedDeviceIds.size})
              </button>
            ) : (
              <div style={styles.confirmationBox}>
                <p style={styles.confirmationText}>
                  <strong>Are you sure?</strong> This will immediately unenroll{' '}
                  {selectedDeviceIds.size} device(s). The devices will stop monitoring and this
                  action cannot be undone.
                </p>
                <div style={styles.confirmationButtons}>
                  <button
                    onClick={() => setShowConfirmation(false)}
                    style={styles.cancelButton}
                    disabled={unenrollLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUnenroll}
                    style={styles.confirmButton}
                    disabled={unenrollLoading}
                  >
                    {unenrollLoading ? 'Unenrolling...' : 'Confirm Unenrollment'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Unenroll error */}
          {unenrollError && (
            <div style={styles.errorBanner}>
              <span>⚠️</span>
              <span>{unenrollError}</span>
            </div>
          )}
        </>
      )}
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 16px 0',
  },
  familyName: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 16px 0',
  },
  loadingText: {
    fontSize: '14px',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  noDataText: {
    fontSize: '14px',
    color: '#6b7280',
  },
  warningBanner: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  successBanner: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  errorBanner: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
    marginTop: '16px',
    alignItems: 'center',
  },
  dismissButton: {
    marginLeft: 'auto',
    padding: '4px 8px',
    fontSize: '12px',
    backgroundColor: 'transparent',
    color: '#dc2626',
    border: '1px solid #dc2626',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  tableActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  selectionInfo: {
    fontSize: '14px',
    color: '#6b7280',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
  },
  textButton: {
    padding: '4px 8px',
    fontSize: '13px',
    backgroundColor: 'transparent',
    color: '#6366f1',
    border: 'none',
    cursor: 'pointer',
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  headerCell: {
    padding: '12px 16px',
    textAlign: 'left',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  cell: {
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    color: '#374151',
  },
  checkboxCell: {
    padding: '12px 16px',
    borderBottom: '1px solid #e5e7eb',
    width: '40px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  unenrolledRow: {
    opacity: 0.5,
    backgroundColor: '#f9fafb',
  },
  deviceName: {
    fontWeight: 500,
    color: '#111827',
  },
  deviceId: {
    fontSize: '12px',
    color: '#9ca3af',
    fontFamily: 'monospace',
  },
  deviceType: {
    textTransform: 'capitalize',
  },
  statusBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    textTransform: 'capitalize',
  },
  statusActive: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  statusOffline: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  statusUnenrolled: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  unenrollSection: {
    marginTop: '16px',
  },
  unenrollButton: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  unenrollButtonDisabled: {
    backgroundColor: '#c4b5fd',
    cursor: 'not-allowed',
  },
  confirmationBox: {
    padding: '16px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
  },
  confirmationText: {
    fontSize: '14px',
    color: '#92400e',
    margin: '0 0 12px 0',
  },
  confirmationButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: '#ffffff',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  confirmButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
}

export default SafetyDeviceUnenrollSection
