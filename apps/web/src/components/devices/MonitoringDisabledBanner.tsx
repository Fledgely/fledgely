'use client'

/**
 * Monitoring Disabled Banner Component
 *
 * Story 19.5: Monitoring Disabled Alert (AC: #2)
 *
 * Displays a prominent warning banner when device monitoring has stopped.
 * Shows on the dashboard for devices with status 'unenrolled'.
 */

import { Device } from '../../hooks/useDevices'

export interface MonitoringDisabledBannerProps {
  device: Device
  onViewDetails: () => void
  onReEnroll?: () => void
}

const styles = {
  banner: {
    backgroundColor: '#fee2e2',
    border: '2px solid #ef4444',
    borderRadius: '8px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  } as React.CSSProperties,
  warningIcon: {
    color: '#dc2626',
    fontSize: '20px',
    flexShrink: 0,
  } as React.CSSProperties,
  content: {
    flex: 1,
  } as React.CSSProperties,
  title: {
    color: '#991b1b',
    fontSize: '14px',
    fontWeight: 600,
    margin: 0,
  } as React.CSSProperties,
  deviceName: {
    color: '#dc2626',
    fontWeight: 700,
  } as React.CSSProperties,
  buttonGroup: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
  } as React.CSSProperties,
  viewDetailsButton: {
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  } as React.CSSProperties,
  reEnrollButton: {
    backgroundColor: 'transparent',
    color: '#dc2626',
    border: '1px solid #dc2626',
    borderRadius: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  } as React.CSSProperties,
}

/**
 * Warning icon SVG
 */
function WarningIcon() {
  return (
    <svg
      data-testid="warning-icon"
      style={styles.warningIcon}
      viewBox="0 0 24 24"
      fill="currentColor"
      width="24"
      height="24"
      aria-hidden="true"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
    </svg>
  )
}

export function MonitoringDisabledBanner({
  device,
  onViewDetails,
  onReEnroll,
}: MonitoringDisabledBannerProps) {
  return (
    <div style={styles.banner} role="alert" data-testid="monitoring-disabled-banner">
      <WarningIcon />

      <div style={styles.content}>
        <p style={styles.title}>
          Monitoring stopped on <span style={styles.deviceName}>{device.name}</span>
        </p>
      </div>

      <div style={styles.buttonGroup}>
        <button
          style={styles.viewDetailsButton}
          onClick={onViewDetails}
          aria-label="View details about monitoring stopped"
        >
          View Details
        </button>

        {onReEnroll && (
          <button
            style={styles.reEnrollButton}
            onClick={onReEnroll}
            aria-label="Re-enroll this device"
          >
            Re-enroll
          </button>
        )}
      </div>
    </div>
  )
}
