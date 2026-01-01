'use client'

/**
 * BypassAttemptCard Component - Story 36.5 Task 2
 *
 * Displays a single bypass attempt with non-punitive framing.
 * AC1: Display with timestamp and context
 * AC2: Show impact on trust score
 * AC5: Non-punitive framing
 * AC6: Mark as accidental option
 */

import { type BypassAttempt, type BypassAttemptType } from '@fledgely/shared'

// ============================================================================
// Types
// ============================================================================

export interface BypassAttemptCardProps {
  /** Bypass attempt to display */
  attempt: BypassAttempt
  /** Callback when marked as accidental */
  onMarkAccidental?: (attemptId: string) => void
}

// ============================================================================
// Type Labels and Icons
// ============================================================================

const TYPE_LABELS: Record<BypassAttemptType, string> = {
  'extension-disable': 'Extension Disabled',
  'settings-change': 'Settings Changed',
  'vpn-detected': 'VPN Detected',
  'proxy-detected': 'Proxy Detected',
  other: 'Other',
}

const TYPE_ICONS: Record<BypassAttemptType, string> = {
  'extension-disable': '🔌',
  'settings-change': '⚙️',
  'vpn-detected': '🌐',
  'proxy-detected': '🔄',
  other: '❓',
}

// ============================================================================
// Helpers
// ============================================================================

function formatTimestamp(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function isExpired(attempt: BypassAttempt): boolean {
  return new Date() > attempt.expiresAt
}

// ============================================================================
// Main Component
// ============================================================================

export function BypassAttemptCard({ attempt, onMarkAccidental }: BypassAttemptCardProps) {
  const expired = isExpired(attempt)
  const showMarkAccidental = onMarkAccidental && attempt.wasIntentional === null && !expired
  const isAccidental = attempt.wasIntentional === false

  const handleMarkAccidental = () => {
    if (onMarkAccidental) {
      onMarkAccidental(attempt.id)
    }
  }

  return (
    <div
      style={{
        backgroundColor: expired ? '#f3f4f6' : '#fff7ed',
        border: `1px solid ${expired ? '#d1d5db' : '#fdba74'}`,
        borderRadius: '8px',
        padding: '16px',
        opacity: expired ? 0.7 : 1,
      }}
      data-testid="bypass-attempt-card"
      data-impact="negative"
      data-status={expired ? 'expired' : 'active'}
      aria-label={`${TYPE_LABELS[attempt.attemptType]} on ${formatTimestamp(attempt.occurredAt)}`}
    >
      {/* Header with icon and type */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
        }}
      >
        <span style={{ fontSize: '20px' }} data-testid="attempt-icon" aria-hidden="true">
          {TYPE_ICONS[attempt.attemptType]}
        </span>
        <span
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#9a3412',
          }}
          data-testid="attempt-type"
        >
          {TYPE_LABELS[attempt.attemptType]}
        </span>

        {/* Accidental badge */}
        {isAccidental && (
          <span
            style={{
              marginLeft: 'auto',
              padding: '2px 8px',
              backgroundColor: '#dbeafe',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#1d4ed8',
            }}
            data-testid="accidental-badge"
          >
            Marked as accidental
          </span>
        )}

        {/* Impact reduced badge */}
        {isAccidental && (
          <span
            style={{
              padding: '2px 8px',
              backgroundColor: '#dcfce7',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#166534',
            }}
            data-testid="impact-reduced-badge"
          >
            Impact reduced
          </span>
        )}
      </div>

      {/* Context/description */}
      <p
        style={{
          fontSize: '14px',
          color: '#4b5563',
          margin: '0 0 8px 0',
          lineHeight: 1.4,
        }}
        data-testid="attempt-context"
      >
        {attempt.context}
      </p>

      {/* Timestamp */}
      <div
        style={{
          fontSize: '12px',
          color: '#6b7280',
          marginBottom: '12px',
        }}
        data-testid="attempt-timestamp"
      >
        {formatTimestamp(attempt.occurredAt)}
      </div>

      {/* Impact display */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            fontSize: '13px',
            color: '#9a3412',
          }}
          data-testid="attempt-impact"
        >
          Trust score impact: {attempt.impactOnScore}
        </div>

        {/* Mark as accidental button */}
        {showMarkAccidental && (
          <button
            type="button"
            style={{
              padding: '6px 12px',
              backgroundColor: 'white',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#4b5563',
              cursor: 'pointer',
            }}
            onClick={handleMarkAccidental}
            data-testid="mark-accidental-button"
          >
            This was accidental
          </button>
        )}
      </div>
    </div>
  )
}
