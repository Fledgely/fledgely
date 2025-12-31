/**
 * AgreementStatus Component - Story 19C.4
 *
 * Displays current agreement compliance status in child-friendly language.
 * Uses neutral, non-punitive language (NFR65).
 *
 * Task 1: Create AgreementStatus component
 * Task 2: Display paused state
 * Task 3: Display expired state
 * Task 4: Real-time status updates
 */

import React from 'react'

/**
 * Inline styles using React.CSSProperties (NOT Tailwind per Epic 19B pattern)
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  indicator: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background-color 0.3s ease',
  },
  icon: {
    fontSize: '24px',
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#334155',
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  message: {
    color: '#64748b',
    fontSize: '14px',
    lineHeight: 1.4,
  },
}

type AgreementStatusType = 'active' | 'paused' | 'expired'

interface StatusConfig {
  title: string
  message: string
  icon: string
  color: string
}

const STATUS_CONFIG: Record<AgreementStatusType, StatusConfig> = {
  active: {
    title: 'Agreement Status: Active',
    message: 'Monitoring is working as we agreed',
    icon: '✅',
    color: '#22c55e', // Green
  },
  paused: {
    title: 'Agreement Status: Paused',
    message: 'Monitoring is paused - talk to your parent',
    icon: '⏸️',
    color: '#f59e0b', // Amber
  },
  expired: {
    title: 'Agreement Status: Needs Renewal',
    message: 'Time to renew our agreement',
    icon: '📋',
    color: '#6366f1', // Indigo
  },
}

interface AgreementStatusProps {
  /** Current status of the agreement */
  status: AgreementStatusType
  /** Optional expiration date to display for expired agreements */
  expirationDate?: Date | null
}

/** Format date for child-friendly display */
function formatExpirationDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function AgreementStatus({ status, expirationDate }: AgreementStatusProps) {
  const config = STATUS_CONFIG[status]

  return (
    <div style={styles.container} data-testid="agreement-status">
      <div
        style={{ ...styles.indicator, backgroundColor: config.color }}
        data-testid="status-indicator"
      >
        <span style={styles.icon} data-testid="status-icon">
          {config.icon}
        </span>
      </div>

      <div style={styles.content}>
        <div style={styles.title} data-testid="status-title">
          {config.title}
        </div>
        <div style={styles.message} data-testid="status-message">
          {config.message}
          {status === 'expired' && expirationDate && (
            <span data-testid="expiration-date">
              {' '}
              (ended {formatExpirationDate(expirationDate)})
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
