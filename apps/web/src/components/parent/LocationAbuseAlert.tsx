/**
 * Location Abuse Alert Component
 *
 * Story 40.6: Location Feature Abuse Prevention
 * - AC4: Bilateral parent alerts
 * - AC5: Conflict resolution resources
 *
 * Displays abuse pattern alerts with neutral messaging and resources.
 */

import * as React from 'react'
import { LOCATION_ABUSE_MESSAGES, type LocationAbusePatternType } from '@fledgely/shared'

export interface LocationAbuseAlertData {
  id: string
  patternType: LocationAbusePatternType
  sentAt: Date
  acknowledged: boolean
  resourcesViewed: boolean
}

export interface LocationAbuseAlertProps {
  /** Alert data */
  alert: LocationAbuseAlertData
  /** Whether the alert is loading */
  isLoading?: boolean
  /** Callback when alert is acknowledged */
  onAcknowledge?: (alertId: string) => void
  /** Callback when resources are viewed */
  onViewResources?: (alertId: string) => void
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    backgroundColor: '#FFF8E1',
    border: '1px solid #FFB74D',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  icon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    margin: 0,
    marginBottom: '8px',
  },
  summary: {
    fontSize: '14px',
    color: '#555',
    margin: 0,
    marginBottom: '12px',
    lineHeight: 1.5,
  },
  detail: {
    fontSize: '13px',
    color: '#666',
    margin: 0,
    marginBottom: '16px',
    fontStyle: 'italic',
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  button: {
    padding: '10px 20px',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    minHeight: '44px',
    minWidth: '44px',
    border: 'none',
  },
  primaryButton: {
    backgroundColor: '#1976D2',
    color: 'white',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    color: '#1976D2',
    border: '1px solid #1976D2',
  },
  acknowledgedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#4CAF50',
  },
  timestamp: {
    fontSize: '12px',
    color: '#888',
    marginTop: '8px',
  },
}

/**
 * Get the alert message based on pattern type.
 */
function getAlertMessage(patternType: LocationAbusePatternType): {
  title: string
  summary: string
  detail: string
} {
  switch (patternType) {
    case 'asymmetric_checks':
      return LOCATION_ABUSE_MESSAGES.asymmetricChecks
    case 'frequent_rule_changes':
      return LOCATION_ABUSE_MESSAGES.frequentRuleChanges
    case 'cross_custody_restriction':
      return LOCATION_ABUSE_MESSAGES.crossCustodyRestriction
    default:
      return {
        title: 'Pattern Detected',
        summary: 'A usage pattern was detected.',
        detail: 'Please review the resources below.',
      }
  }
}

/**
 * Format date for display.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * LocationAbuseAlert Component
 *
 * Displays a single abuse pattern alert with neutral messaging.
 * Never blames either parent directly.
 */
export function LocationAbuseAlert({
  alert,
  isLoading = false,
  onAcknowledge,
  onViewResources,
}: LocationAbuseAlertProps): React.ReactElement {
  const message = getAlertMessage(alert.patternType)

  const handleAcknowledge = () => {
    if (onAcknowledge && !alert.acknowledged) {
      onAcknowledge(alert.id)
    }
  }

  const handleViewResources = () => {
    if (onViewResources) {
      onViewResources(alert.id)
    }
  }

  return (
    <div
      style={styles.container}
      role="alert"
      aria-labelledby={`alert-title-${alert.id}`}
      data-testid="location-abuse-alert"
    >
      <div style={styles.header}>
        <span style={styles.icon} aria-hidden="true">
          ⚠️
        </span>
        <div style={styles.content}>
          <h3 id={`alert-title-${alert.id}`} style={styles.title}>
            {message.title}
          </h3>
          <p style={styles.summary}>{message.summary}</p>
          <p style={styles.detail}>{message.detail}</p>

          <div style={styles.actions}>
            {!alert.acknowledged ? (
              <button
                style={{ ...styles.button, ...styles.secondaryButton }}
                onClick={handleAcknowledge}
                disabled={isLoading}
                aria-label="Acknowledge this alert"
                data-testid="acknowledge-button"
              >
                {isLoading ? 'Acknowledging...' : 'I understand'}
              </button>
            ) : (
              <span style={styles.acknowledgedBadge} data-testid="acknowledged-badge">
                <span aria-hidden="true">✓</span> Acknowledged
              </span>
            )}

            <button
              style={{ ...styles.button, ...styles.primaryButton }}
              onClick={handleViewResources}
              disabled={isLoading}
              aria-label="View conflict resolution resources"
              data-testid="view-resources-button"
            >
              View Resources
            </button>
          </div>

          <p style={styles.timestamp} data-testid="alert-timestamp">
            Detected on {formatDate(alert.sentAt)}
          </p>
        </div>
      </div>
    </div>
  )
}
