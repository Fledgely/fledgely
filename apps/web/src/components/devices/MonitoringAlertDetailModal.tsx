'use client'

/**
 * Monitoring Alert Detail Modal Component
 *
 * Story 19.5: Monitoring Disabled Alert (AC: #3)
 *
 * Displays detailed information about why monitoring stopped:
 * - What changed (monitoring stopped, permissions revoked, etc.)
 * - When it happened (timestamp)
 * - Possible reasons (user action, device restart, extension disabled)
 * - Suggested actions (re-enroll device, check extension)
 */

import { useEffect, useCallback } from 'react'
import { Device } from '../../hooks/useDevices'
import { formatLastSeen } from '../../hooks/useDevices'

export interface MonitoringAlertDetailModalProps {
  device: Device
  onClose: () => void
  onReEnroll?: () => void
  onRemoveDevice?: () => void
}

const POSSIBLE_REASONS = [
  'Extension was disabled in browser settings',
  'Extension was uninstalled',
  'Browser permissions were revoked',
  "Device was restarted and extension didn't auto-start",
  'Browser was closed and background service stopped',
]

const SUGGESTED_ACTIONS = [
  'Check if the extension is still installed in Chrome',
  'Re-enable the extension if it was disabled',
  'Re-enroll the device if extension was uninstalled',
  'Contact support if the issue persists',
]

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  } as React.CSSProperties,
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '520px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  } as React.CSSProperties,
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '20px',
    borderBottom: '1px solid #fecaca',
    paddingBottom: '16px',
  } as React.CSSProperties,
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  } as React.CSSProperties,
  warningIcon: {
    color: '#dc2626',
    flexShrink: 0,
  } as React.CSSProperties,
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#991b1b',
    margin: 0,
  } as React.CSSProperties,
  deviceName: {
    color: '#dc2626',
    fontWeight: 700,
  } as React.CSSProperties,
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px',
    lineHeight: 1,
  } as React.CSSProperties,
  section: {
    marginBottom: '20px',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '8px',
  } as React.CSSProperties,
  sectionContent: {
    fontSize: '14px',
    color: '#4b5563',
    lineHeight: 1.6,
  } as React.CSSProperties,
  timestamp: {
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    padding: '8px 12px',
    borderRadius: '6px',
    display: 'inline-block',
  } as React.CSSProperties,
  list: {
    margin: '8px 0',
    paddingLeft: '20px',
    color: '#4b5563',
    fontSize: '14px',
    lineHeight: 1.8,
  } as React.CSSProperties,
  listItem: {
    marginBottom: '4px',
  } as React.CSSProperties,
  alertBox: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '20px',
  } as React.CSSProperties,
  alertText: {
    fontSize: '14px',
    color: '#991b1b',
    margin: 0,
    fontWeight: 500,
  } as React.CSSProperties,
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  } as React.CSSProperties,
  primaryButton: {
    flex: 1,
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,
  secondaryButton: {
    flex: 1,
    backgroundColor: 'transparent',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  } as React.CSSProperties,
}

/**
 * Warning Icon SVG
 */
function WarningIcon() {
  return (
    <svg
      data-testid="alert-warning-icon"
      style={styles.warningIcon}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="28"
      height="28"
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  )
}

export function MonitoringAlertDetailModal({
  device,
  onClose,
  onReEnroll,
  onRemoveDevice,
}: MonitoringAlertDetailModalProps) {
  // Handle Escape key to close modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const formatTimestamp = (date: Date | null | undefined): string => {
    if (!date) return 'Unknown'
    return formatLastSeen(date)
  }

  const hasActions = onReEnroll || onRemoveDevice

  return (
    <div style={styles.backdrop} onClick={handleBackdropClick} data-testid="alert-modal-backdrop">
      <div
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
        data-testid="alert-modal"
        role="dialog"
        aria-labelledby="alert-modal-title"
        aria-modal="true"
      >
        <div style={styles.header}>
          <div style={styles.titleContainer}>
            <WarningIcon />
            <h2 id="alert-modal-title" style={styles.title}>
              Monitoring Stopped: <span style={styles.deviceName}>{device.name}</span>
            </h2>
          </div>
          <button
            style={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
            data-testid="alert-modal-close"
          >
            &times;
          </button>
        </div>

        {/* Alert Summary */}
        <div style={styles.alertBox} aria-live="assertive">
          <p style={styles.alertText}>
            The Fledgely extension on this device is no longer sending updates. Monitoring has
            stopped and screenshots are not being captured.
          </p>
        </div>

        {/* What Happened */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>What Happened</h3>
          <p style={styles.sectionContent}>
            Monitoring stopped on this device. The extension may have been disabled, uninstalled, or
            lost required permissions.
          </p>
        </div>

        {/* When */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>When</h3>
          <div style={styles.timestamp} data-testid="when-timestamp">
            Last seen: {formatTimestamp(device.lastSeen)}
          </div>
        </div>

        {/* Possible Reasons */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Possible Reasons</h3>
          <ul style={styles.list}>
            {POSSIBLE_REASONS.map((reason, index) => (
              <li key={index} style={styles.listItem}>
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* Suggested Actions */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Suggested Actions</h3>
          <ul style={styles.list}>
            {SUGGESTED_ACTIONS.map((action, index) => (
              <li key={index} style={styles.listItem}>
                {action}
              </li>
            ))}
          </ul>
        </div>

        {/* Action Buttons */}
        {hasActions && (
          <div style={styles.buttonGroup}>
            {onReEnroll && (
              <button
                style={styles.primaryButton}
                onClick={onReEnroll}
                aria-label="Re-enroll device"
              >
                Re-enroll Device
              </button>
            )}
            {onRemoveDevice && (
              <button
                style={styles.secondaryButton}
                onClick={onRemoveDevice}
                aria-label="Remove device"
              >
                Remove Device
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
