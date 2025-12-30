'use client'

/**
 * Monitoring Capabilities Card Component
 *
 * Story 8.8: Encrypted Traffic Display
 *
 * Provides transparency to parents about what screenshot-based monitoring
 * can and cannot see. Uses honest, non-surveillance language.
 *
 * Key Principles:
 * - Honest communication about limitations
 * - Non-surveillance framing (conversation-starter, not spy tool)
 * - Clear explanation of encrypted content
 */

import { useState } from 'react'
import { DeviceHealthMetrics } from '../../hooks/useDevices'

interface MonitoringCapabilitiesCardProps {
  /** Optional health metrics to show encrypted traffic percentage */
  healthMetrics?: DeviceHealthMetrics
  /** Whether to show in expanded mode by default */
  defaultExpanded?: boolean
}

/**
 * Get color for encryption percentage display
 * Higher is better (more encrypted = more private)
 */
function getEncryptionColor(percent: number | null): string {
  if (percent === null) return '#6b7280' // gray
  if (percent >= 90) return '#22c55e' // green - most traffic encrypted
  if (percent >= 70) return '#3b82f6' // blue - good encryption
  return '#eab308' // yellow - some unencrypted traffic
}

export function MonitoringCapabilitiesCard({
  healthMetrics,
  defaultExpanded = false,
}: MonitoringCapabilitiesCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const cardStyles: React.CSSProperties = {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  }

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    cursor: 'pointer',
    backgroundColor: '#f1f5f9',
  }

  const titleStyles: React.CSSProperties = {
    fontSize: '15px',
    fontWeight: 600,
    color: '#334155',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }

  const expandIconStyles: React.CSSProperties = {
    fontSize: '18px',
    color: '#64748b',
    transition: 'transform 0.2s ease',
    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
  }

  const contentStyles: React.CSSProperties = {
    padding: isExpanded ? '16px' : '0',
    maxHeight: isExpanded ? '1000px' : '0',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    opacity: isExpanded ? 1 : 0,
  }

  const sectionStyles: React.CSSProperties = {
    marginBottom: '16px',
  }

  const sectionTitleStyles: React.CSSProperties = {
    fontSize: '13px',
    fontWeight: 600,
    color: '#475569',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  }

  const listStyles: React.CSSProperties = {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  }

  const listItemStyles: React.CSSProperties = {
    fontSize: '13px',
    color: '#64748b',
    padding: '4px 0',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
  }

  const bulletStyles = (color: string): React.CSSProperties => ({
    color,
    fontWeight: 600,
    minWidth: '16px',
  })

  const encryptionBoxStyles: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    padding: '12px',
    border: '1px solid #e2e8f0',
    marginBottom: '16px',
  }

  const encryptionHeaderStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  }

  const encryptionValueStyles: React.CSSProperties = {
    fontSize: '24px',
    fontWeight: 700,
    color: getEncryptionColor(healthMetrics?.encryptedTrafficPercent ?? null),
  }

  const encryptionLabelStyles: React.CSSProperties = {
    fontSize: '13px',
    color: '#64748b',
  }

  const purposeBoxStyles: React.CSSProperties = {
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    padding: '12px',
    border: '1px solid #bfdbfe',
  }

  const purposeTextStyles: React.CSSProperties = {
    fontSize: '13px',
    color: '#1e40af',
    lineHeight: 1.5,
    margin: 0,
  }

  return (
    <div style={cardStyles} data-testid="monitoring-capabilities-card">
      <div
        style={headerStyles}
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        aria-expanded={isExpanded}
        aria-label="Toggle monitoring capabilities information"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsExpanded(!isExpanded)
          }
        }}
        data-testid="capabilities-header"
      >
        <h3 style={titleStyles}>
          <span aria-hidden="true">ℹ️</span>
          About Monitoring
        </h3>
        <span style={expandIconStyles} aria-hidden="true">
          ▼
        </span>
      </div>

      <div style={contentStyles} aria-hidden={!isExpanded}>
        {/* What We Capture */}
        <div style={sectionStyles} data-testid="what-we-capture">
          <h4 style={sectionTitleStyles}>
            <span style={bulletStyles('#22c55e')}>✓</span>
            What We Capture
          </h4>
          <ul style={listStyles} role="list">
            <li style={listItemStyles}>
              <span style={bulletStyles('#22c55e')}>•</span>
              <span>Screenshots at regular intervals (shows what&apos;s on screen)</span>
            </li>
            <li style={listItemStyles}>
              <span style={bulletStyles('#22c55e')}>•</span>
              <span>Time spent in apps and websites</span>
            </li>
            <li style={listItemStyles}>
              <span style={bulletStyles('#22c55e')}>•</span>
              <span>Device activity status (online/offline)</span>
            </li>
          </ul>
        </div>

        {/* What We Cannot See */}
        <div style={sectionStyles} data-testid="what-we-cannot-see">
          <h4 style={sectionTitleStyles}>
            <span style={bulletStyles('#ef4444')}>✗</span>
            What We Cannot See
          </h4>
          <ul style={listStyles} role="list">
            <li style={listItemStyles}>
              <span style={bulletStyles('#ef4444')}>•</span>
              <span>Encrypted message content (texts, DMs, emails)</span>
            </li>
            <li style={listItemStyles}>
              <span style={bulletStyles('#ef4444')}>•</span>
              <span>Passwords or login inputs</span>
            </li>
            <li style={listItemStyles}>
              <span style={bulletStyles('#ef4444')}>•</span>
              <span>Browser history from private/incognito mode</span>
            </li>
            <li style={listItemStyles}>
              <span style={bulletStyles('#ef4444')}>•</span>
              <span>End-to-end encrypted apps (Signal, WhatsApp messages)</span>
            </li>
          </ul>
        </div>

        {/* Encrypted Traffic Indicator */}
        <div style={encryptionBoxStyles} data-testid="encrypted-traffic-section">
          <div style={encryptionHeaderStyles}>
            <span aria-hidden="true">🔐</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
              Encrypted Traffic
            </span>
          </div>
          {healthMetrics?.encryptedTrafficPercent !== null &&
          healthMetrics?.encryptedTrafficPercent !== undefined ? (
            <>
              <div style={encryptionValueStyles} data-testid="encryption-percent">
                {healthMetrics.encryptedTrafficPercent}% HTTPS
              </div>
              <p style={encryptionLabelStyles}>
                Most websites use encryption. We can see which sites are visited, but not the
                specific content typed or read.
              </p>
            </>
          ) : (
            <>
              <div
                style={{ ...encryptionValueStyles, color: '#6b7280' }}
                data-testid="encryption-percent-unavailable"
              >
                ~95% HTTPS (typical)
              </div>
              <p style={encryptionLabelStyles}>
                Most websites today use HTTPS encryption. This means we can see which sites are
                visited, but the actual page content is encrypted in transit.
              </p>
            </>
          )}
        </div>

        {/* Purpose Framing */}
        <div style={purposeBoxStyles} data-testid="purpose-section">
          <p style={purposeTextStyles}>
            <strong>💬 Why This Exists:</strong> Monitoring helps start conversations, not replace
            them. It&apos;s a tool for discussion and awareness—designed to support trust-building,
            not surveillance.
          </p>
        </div>
      </div>
    </div>
  )
}
