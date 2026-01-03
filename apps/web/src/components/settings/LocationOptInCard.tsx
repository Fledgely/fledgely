'use client'

/**
 * LocationOptInCard Component - Story 40.1
 *
 * Parent-facing UI for opting into location-based rules.
 *
 * Acceptance Criteria:
 * - AC1: Explicit Dual-Guardian Opt-In
 * - AC2: Clear Privacy Explanation
 * - AC4: Default Disabled
 *
 * UI/UX Requirements:
 * - 44x44px minimum touch targets (NFR49)
 * - 4.5:1 contrast ratio (NFR45)
 * - Keyboard accessible (NFR43)
 */

import { useState, useCallback } from 'react'

export type LocationStatus = 'disabled' | 'pending' | 'enabled'

export interface LocationOptInCardProps {
  /** Current location feature status */
  status: LocationStatus
  /** Whether a request to enable is pending */
  pendingRequest?: {
    requestedByUid: string
    requestedByName?: string
    expiresAt: Date
  } | null
  /** Current user's UID */
  currentUserUid: string
  /** Callback when user wants to enable location features */
  onRequestEnable: () => void
  /** Callback when second guardian approves pending request */
  onApprove?: () => void
  /** Callback when guardian wants to disable location features */
  onDisable: () => void
  /** Callback to show privacy explanation modal */
  onShowPrivacyInfo: () => void
  /** Whether any action is in progress */
  loading?: boolean
  /** Error message to display */
  error?: string | null
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '500px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  icon: {
    width: '40px',
    height: '40px',
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.6,
    margin: '0 0 20px 0',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 500,
    marginBottom: '16px',
  },
  statusDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  statusEnabled: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  pendingInfo: {
    backgroundColor: '#fef9c3',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#854d0e',
  },
  buttonPrimary: {
    width: '100%',
    minHeight: '44px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '12px',
  },
  buttonSecondary: {
    width: '100%',
    minHeight: '44px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '12px',
  },
  buttonDanger: {
    width: '100%',
    minHeight: '44px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#dc2626',
    backgroundColor: '#ffffff',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  privacyLink: {
    fontSize: '12px',
    color: '#6b7280',
    textAlign: 'center' as const,
    marginTop: '8px',
  },
  privacyLinkButton: {
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontSize: '12px',
    padding: 0,
  },
  error: {
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#dc2626',
  },
}

export function LocationOptInCard({
  status,
  pendingRequest,
  currentUserUid,
  onRequestEnable,
  onApprove,
  onDisable,
  onShowPrivacyInfo,
  loading = false,
  error = null,
}: LocationOptInCardProps) {
  const [confirmDisable, setConfirmDisable] = useState(false)

  const handleDisable = useCallback(() => {
    if (confirmDisable) {
      onDisable()
      setConfirmDisable(false)
    } else {
      setConfirmDisable(true)
    }
  }, [confirmDisable, onDisable])

  const isUserRequester = pendingRequest?.requestedByUid === currentUserUid

  const getStatusBadge = () => {
    const badgeStyle = {
      ...styles.statusBadge,
      ...(status === 'disabled' ? styles.statusDisabled : {}),
      ...(status === 'pending' ? styles.statusPending : {}),
      ...(status === 'enabled' ? styles.statusEnabled : {}),
    }

    return (
      <span style={badgeStyle} data-testid="status-badge">
        {status === 'disabled' && '○ Disabled'}
        {status === 'pending' && '⏳ Pending Approval'}
        {status === 'enabled' && '✓ Enabled'}
      </span>
    )
  }

  return (
    <div style={styles.card} data-testid="location-opt-in-card">
      <div style={styles.header}>
        <div style={styles.icon} aria-hidden="true">
          📍
        </div>
        <h2 style={styles.title}>Location-Based Rules</h2>
      </div>

      {getStatusBadge()}

      <p style={styles.description}>
        {status === 'disabled' &&
          "Enable location features to set different rules based on where your child is (home, school, other parent's house)."}
        {status === 'pending' && 'Location features are awaiting approval from another guardian.'}
        {status === 'enabled' &&
          "Location features are active. Rules can vary based on your child's location."}
      </p>

      {error && (
        <div style={styles.error} role="alert" data-testid="error-message">
          {error}
        </div>
      )}

      {/* Pending request info */}
      {status === 'pending' && pendingRequest && (
        <div style={styles.pendingInfo} data-testid="pending-info">
          {isUserRequester ? (
            <>Waiting for another guardian to approve.</>
          ) : (
            <>
              {pendingRequest.requestedByName || 'Another guardian'} wants to enable location
              features.
            </>
          )}
        </div>
      )}

      {/* Actions based on status */}
      {status === 'disabled' && (
        <button
          style={{
            ...styles.buttonPrimary,
            ...(loading ? styles.buttonDisabled : {}),
          }}
          onClick={onRequestEnable}
          disabled={loading}
          data-testid="enable-button"
        >
          {loading ? 'Processing...' : 'Enable Location Features'}
        </button>
      )}

      {status === 'pending' && !isUserRequester && onApprove && (
        <button
          style={{
            ...styles.buttonPrimary,
            ...(loading ? styles.buttonDisabled : {}),
          }}
          onClick={onApprove}
          disabled={loading}
          data-testid="approve-button"
        >
          {loading ? 'Processing...' : 'Approve Location Features'}
        </button>
      )}

      {status === 'enabled' && (
        <button
          style={{
            ...styles.buttonDanger,
            ...(loading ? styles.buttonDisabled : {}),
          }}
          onClick={handleDisable}
          disabled={loading}
          data-testid="disable-button"
        >
          {loading
            ? 'Processing...'
            : confirmDisable
              ? 'Confirm Disable'
              : 'Disable Location Features'}
        </button>
      )}

      {/* Privacy info link */}
      <p style={styles.privacyLink}>
        <button
          style={styles.privacyLinkButton}
          onClick={onShowPrivacyInfo}
          data-testid="privacy-link"
        >
          Learn how location data is used
        </button>
      </p>
    </div>
  )
}

export default LocationOptInCard
