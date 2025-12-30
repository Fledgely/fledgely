'use client'

/**
 * Device Health Modal Component
 *
 * Story 19.4: Monitoring Health Details
 * Story 8.8: Added MonitoringCapabilitiesCard integration
 *
 * Displays detailed health metrics for a device including:
 * - Capture success rate
 * - Upload queue size
 * - Network status
 * - Battery level (if available)
 * - App version
 * - Monitoring capabilities and limitations (Story 8.8)
 */

import { Device, DeviceHealthMetrics } from '../../hooks/useDevices'
import { formatLastSeen } from '../../hooks/useDevices'
import { MonitoringCapabilitiesCard } from './MonitoringCapabilitiesCard'

interface DeviceHealthModalProps {
  device: Device
  onClose: () => void
}

/**
 * Format percentage with color coding
 */
function getSuccessRateColor(rate: number | null): string {
  if (rate === null) return '#6b7280' // gray
  if (rate >= 90) return '#22c55e' // green
  if (rate >= 70) return '#eab308' // yellow
  return '#ef4444' // red
}

/**
 * Get network status color
 */
function getNetworkColor(status: 'online' | 'offline' | undefined): string {
  return status === 'online' ? '#22c55e' : '#ef4444'
}

/**
 * Get battery color based on level
 */
function getBatteryColor(level: number | null): string {
  if (level === null) return '#6b7280'
  if (level >= 50) return '#22c55e'
  if (level >= 20) return '#eab308'
  return '#ef4444'
}

/**
 * Format the last health sync time
 */
function formatHealthSync(metrics: DeviceHealthMetrics | undefined): string {
  if (!metrics?.lastHealthSync) return 'Never'
  const date = metrics.lastHealthSync
  return formatLastSeen(date)
}

export function DeviceHealthModal({ device, onClose }: DeviceHealthModalProps) {
  const metrics = device.healthMetrics

  const modalStyles: React.CSSProperties = {
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
  }

  const contentStyles: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '480px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  }

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '16px',
  }

  const titleStyles: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  }

  const closeButtonStyles: React.CSSProperties = {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px',
    lineHeight: 1,
  }

  const sectionStyles: React.CSSProperties = {
    marginBottom: '20px',
  }

  const sectionTitleStyles: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }

  const metricRowStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid #f3f4f6',
  }

  const metricLabelStyles: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
  }

  const metricValueStyles: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
  }

  const statusBadgeStyles = (color: string): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '9999px',
    backgroundColor: `${color}15`,
    color: color,
    fontSize: '13px',
    fontWeight: 500,
  })

  const dotStyles = (color: string): React.CSSProperties => ({
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: color,
  })

  const noDataStyles: React.CSSProperties = {
    color: '#9ca3af',
    fontStyle: 'italic',
  }

  return (
    <div style={modalStyles} onClick={onClose} data-testid="health-modal-backdrop">
      <div style={contentStyles} onClick={(e) => e.stopPropagation()} data-testid="health-modal">
        <div style={headerStyles}>
          <h2 style={titleStyles}>Device Health: {device.name}</h2>
          <button
            style={closeButtonStyles}
            onClick={onClose}
            aria-label="Close"
            data-testid="health-modal-close"
          >
            &times;
          </button>
        </div>

        {/* Capture Performance */}
        <div style={sectionStyles}>
          <h3 style={sectionTitleStyles}>Capture Performance</h3>

          <div style={metricRowStyles}>
            <span style={metricLabelStyles}>Success Rate (24h)</span>
            <span style={metricValueStyles}>
              {metrics?.captureSuccessRate24h !== undefined &&
              metrics?.captureSuccessRate24h !== null ? (
                <span style={statusBadgeStyles(getSuccessRateColor(metrics.captureSuccessRate24h))}>
                  <span style={dotStyles(getSuccessRateColor(metrics.captureSuccessRate24h))} />
                  {metrics.captureSuccessRate24h}%
                </span>
              ) : (
                <span style={noDataStyles}>No data</span>
              )}
            </span>
          </div>

          <div style={metricRowStyles}>
            <span style={metricLabelStyles}>Upload Queue</span>
            <span style={metricValueStyles}>
              {metrics?.uploadQueueSize !== undefined ? (
                `${metrics.uploadQueueSize} pending`
              ) : (
                <span style={noDataStyles}>No data</span>
              )}
            </span>
          </div>
        </div>

        {/* Connectivity */}
        <div style={sectionStyles}>
          <h3 style={sectionTitleStyles}>Connectivity</h3>

          <div style={metricRowStyles}>
            <span style={metricLabelStyles}>Network Status</span>
            <span style={metricValueStyles}>
              {metrics?.networkStatus ? (
                <span style={statusBadgeStyles(getNetworkColor(metrics.networkStatus))}>
                  <span style={dotStyles(getNetworkColor(metrics.networkStatus))} />
                  {metrics.networkStatus === 'online' ? 'Online' : 'Offline'}
                </span>
              ) : (
                <span style={noDataStyles}>No data</span>
              )}
            </span>
          </div>

          <div style={metricRowStyles}>
            <span style={metricLabelStyles}>Last Health Sync</span>
            <span style={metricValueStyles}>{formatHealthSync(metrics)}</span>
          </div>
        </div>

        {/* Battery (if available) */}
        <div style={sectionStyles}>
          <h3 style={sectionTitleStyles}>Battery</h3>

          <div style={metricRowStyles}>
            <span style={metricLabelStyles}>Battery Level</span>
            <span style={metricValueStyles}>
              {metrics?.batteryLevel !== undefined && metrics?.batteryLevel !== null ? (
                <span style={statusBadgeStyles(getBatteryColor(metrics.batteryLevel))}>
                  <span style={dotStyles(getBatteryColor(metrics.batteryLevel))} />
                  {metrics.batteryLevel}%{metrics.batteryCharging && ' (Charging)'}
                </span>
              ) : (
                <span style={noDataStyles}>Not available</span>
              )}
            </span>
          </div>
        </div>

        {/* App Info */}
        <div style={sectionStyles}>
          <h3 style={sectionTitleStyles}>App Info</h3>

          <div style={metricRowStyles}>
            <span style={metricLabelStyles}>Version</span>
            <span style={metricValueStyles}>
              {metrics?.appVersion ? (
                <>
                  v{metrics.appVersion}
                  {metrics.updateAvailable && (
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '12px',
                        color: '#f59e0b',
                        fontWeight: 600,
                      }}
                    >
                      Update available
                    </span>
                  )}
                </>
              ) : (
                <span style={noDataStyles}>Unknown</span>
              )}
            </span>
          </div>

          <div style={metricRowStyles}>
            <span style={metricLabelStyles}>Device Status</span>
            <span style={metricValueStyles}>
              <span
                style={statusBadgeStyles(
                  device.status === 'active'
                    ? '#22c55e'
                    : device.status === 'offline'
                      ? '#eab308'
                      : '#ef4444'
                )}
              >
                <span
                  style={dotStyles(
                    device.status === 'active'
                      ? '#22c55e'
                      : device.status === 'offline'
                        ? '#eab308'
                        : '#ef4444'
                  )}
                />
                {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
              </span>
            </span>
          </div>
        </div>

        {/* Footer info */}
        {!metrics && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fef3c7',
              borderRadius: '8px',
              fontSize: '13px',
              color: '#92400e',
            }}
          >
            Health metrics are collected every 5 minutes when the extension is running. Data will
            appear after the first sync.
          </div>
        )}

        {/* Story 8.8: Monitoring Capabilities Card */}
        <div style={{ marginTop: '16px' }}>
          <MonitoringCapabilitiesCard healthMetrics={metrics} />
        </div>
      </div>
    </div>
  )
}
