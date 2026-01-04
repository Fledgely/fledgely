'use client'

/**
 * AccountDeletionCard Component - Story 51.4
 *
 * Card for requesting and managing account deletion.
 *
 * Acceptance Criteria:
 * - AC1: Request deletion from settings
 * - AC3: Warning about family impact
 * - AC6: Typed confirmation required
 * - AC7: 14-day cooling off period
 * - AC8: Cancellation during cooling off
 */

import { useCallback, useState } from 'react'
import { useAccountDeletion } from '../../hooks/useAccountDeletion'
import { AccountDeleteConfirmationModal } from './AccountDeleteConfirmationModal'
import { ACCOUNT_DELETION_CONFIG } from '@fledgely/shared'

export interface AccountDeletionCardProps {
  familyId: string
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function AccountDeletionCard({ familyId }: AccountDeletionCardProps) {
  const {
    status,
    loading,
    actionLoading,
    error,
    canRequestDeletion,
    canCancelDeletion,
    coolingOffEndsAt,
    daysRemaining,
    affectedUserCount,
    requestDeletion,
    cancelDeletion,
    clearError,
  } = useAccountDeletion(familyId)

  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpenModal = useCallback(() => {
    clearError()
    setIsModalOpen(true)
  }, [clearError])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const handleConfirmDeletion = useCallback(
    async (confirmationPhrase: string): Promise<boolean> => {
      const success = await requestDeletion(confirmationPhrase)
      return success
    },
    [requestDeletion]
  )

  const handleCancelDeletion = useCallback(async () => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel the account deletion request? Your account and all family data will be preserved.'
    )
    if (!confirmed) {
      return
    }
    clearError()
    await cancelDeletion()
  }, [cancelDeletion, clearError])

  // Styles
  const cardStyles: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    border: '2px solid #dc2626',
  }

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  }

  const iconStyles: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#fef2f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    color: '#dc2626',
  }

  const titleStyles: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  }

  const subtitleStyles: React.CSSProperties = {
    fontSize: '14px',
    color: '#dc2626',
    margin: '4px 0 0 0',
    fontWeight: 600,
  }

  const descriptionStyles: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.6,
    marginBottom: '20px',
  }

  const buttonStyles: React.CSSProperties = {
    minHeight: '48px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    color: 'white',
    backgroundColor: '#dc2626',
    border: 'none',
    borderRadius: '8px',
    cursor: canRequestDeletion && !actionLoading ? 'pointer' : 'not-allowed',
    opacity: canRequestDeletion && !actionLoading ? 1 : 0.6,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    justifyContent: 'center',
  }

  const cancelButtonStyles: React.CSSProperties = {
    minHeight: '48px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#374151',
    backgroundColor: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: canCancelDeletion && !actionLoading ? 'pointer' : 'not-allowed',
    opacity: canCancelDeletion && !actionLoading ? 1 : 0.6,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    justifyContent: 'center',
  }

  const statusBoxStyles: React.CSSProperties = {
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '16px',
  }

  const coolingOffStyles: React.CSSProperties = {
    ...statusBoxStyles,
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
  }

  const processingStyles: React.CSSProperties = {
    ...statusBoxStyles,
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
  }

  const completedStyles: React.CSSProperties = {
    ...statusBoxStyles,
    backgroundColor: '#f3f4f6',
    border: '1px solid #d1d5db',
  }

  const cancelledStyles: React.CSSProperties = {
    ...statusBoxStyles,
    backgroundColor: '#ecfdf5',
    border: '1px solid #6ee7b7',
  }

  const statusTextStyles: React.CSSProperties = {
    fontSize: '14px',
    color: '#374151',
    margin: 0,
    lineHeight: 1.5,
  }

  const countdownStyles: React.CSSProperties = {
    marginTop: '12px',
    textAlign: 'center' as const,
  }

  const countdownNumberStyles: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: 700,
    color: '#b45309',
  }

  const countdownLabelStyles: React.CSSProperties = {
    fontSize: '14px',
    color: '#92400e',
    marginTop: '4px',
  }

  const errorBoxStyles: React.CSSProperties = {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    fontSize: '14px',
  }

  const loadingSpinnerStyles: React.CSSProperties = {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  }

  if (loading) {
    return (
      <div style={cardStyles} data-testid="account-deletion-card-loading">
        <div style={headerStyles}>
          <div style={iconStyles}>
            <span aria-hidden="true">!</span>
          </div>
          <div>
            <h3 style={titleStyles}>Delete Your Account</h3>
            <p style={subtitleStyles}>Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={cardStyles} data-testid="account-deletion-card">
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>

        <div style={headerStyles}>
          <div style={iconStyles}>
            <span aria-hidden="true">!</span>
          </div>
          <div>
            <h3 style={titleStyles}>Delete Your Account</h3>
            <p style={subtitleStyles}>Permanent Account Deletion</p>
          </div>
        </div>

        <p style={descriptionStyles}>
          Permanently delete your entire Fledgely account including all family member accounts,
          data, and settings. This action affects all family members and cannot be undone after the{' '}
          {ACCOUNT_DELETION_CONFIG.COOLING_OFF_DAYS}-day cooling off period.
        </p>

        {error && (
          <div style={errorBoxStyles} role="alert" data-testid="deletion-error">
            {error}
          </div>
        )}

        {/* Cooling Off State */}
        {status === 'cooling_off' && (
          <div style={coolingOffStyles} data-testid="deletion-cooling-off">
            <p style={statusTextStyles}>
              <strong>Account Deletion Scheduled</strong>
              <br />
              Your account and all family data are scheduled for permanent deletion. You can still
              cancel this request.
            </p>
            <div style={countdownStyles}>
              <div style={countdownNumberStyles}>{daysRemaining}</div>
              <div style={countdownLabelStyles}>
                day{daysRemaining !== 1 ? 's' : ''} remaining to cancel
              </div>
            </div>
            {coolingOffEndsAt && (
              <p
                style={{
                  ...statusTextStyles,
                  marginTop: '12px',
                  textAlign: 'center',
                  fontSize: '13px',
                }}
              >
                Deletion scheduled for: {formatDate(coolingOffEndsAt)}
              </p>
            )}
          </div>
        )}

        {/* Processing State */}
        {status === 'processing' && (
          <div style={processingStyles} data-testid="deletion-processing">
            <p style={statusTextStyles}>
              <strong>Account Deletion In Progress</strong>
              <br />
              Your account and all family data are being permanently deleted. This process cannot be
              stopped.
            </p>
          </div>
        )}

        {/* Completed State */}
        {status === 'completed' && (
          <div style={completedStyles} data-testid="deletion-completed">
            <p style={statusTextStyles}>
              <strong>Account Deletion Complete</strong>
              <br />
              Your account and all family data have been permanently deleted.
            </p>
          </div>
        )}

        {/* Cancelled State */}
        {status === 'cancelled' && (
          <div style={cancelledStyles} data-testid="deletion-cancelled">
            <p style={statusTextStyles}>
              <strong>Account Deletion Cancelled</strong>
              <br />
              Your previous deletion request was cancelled. Your account has been preserved.
            </p>
          </div>
        )}

        {/* Failed State */}
        {status === 'failed' && (
          <div style={processingStyles} data-testid="deletion-failed">
            <p style={statusTextStyles}>
              <strong>Account Deletion Failed</strong>
              <br />
              There was a problem processing your deletion request. Please contact support.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {status === 'cooling_off' ? (
          <button
            style={cancelButtonStyles}
            onClick={handleCancelDeletion}
            disabled={!canCancelDeletion || actionLoading}
            aria-busy={actionLoading}
            data-testid="cancel-deletion-button"
          >
            {actionLoading ? (
              <>
                <span style={loadingSpinnerStyles} aria-hidden="true" />
                Cancelling...
              </>
            ) : (
              'Cancel Account Deletion'
            )}
          </button>
        ) : status === 'processing' ? (
          <button style={{ ...buttonStyles, backgroundColor: '#9ca3af' }} disabled>
            Account Deletion In Progress...
          </button>
        ) : status === 'completed' ? null : (
          <button
            style={buttonStyles}
            onClick={handleOpenModal}
            disabled={!canRequestDeletion || actionLoading}
            data-testid="request-deletion-button"
          >
            <span aria-hidden="true">!</span>
            Delete My Account
          </button>
        )}

        {/* Privacy note */}
        <p
          style={{
            marginTop: '16px',
            fontSize: '12px',
            color: '#9ca3af',
            lineHeight: 1.5,
          }}
        >
          Account deletion is permanent and irreversible. All family members will be notified.
        </p>
      </div>

      {/* Confirmation Modal */}
      <AccountDeleteConfirmationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDeletion}
        loading={actionLoading}
        affectedUserCount={affectedUserCount}
      />
    </>
  )
}

export default AccountDeletionCard
