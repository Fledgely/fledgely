'use client'

/**
 * CaregiverAcceptInvitation - Story 19D.1
 *
 * Page for caregivers to accept invitations after clicking the email link.
 * Shows invitation details and requires Google Sign-In to accept.
 *
 * Implements:
 * - AC3: Caregiver completes Google Sign-In to accept
 * - AC4: After acceptance, shows onboarding (via callback)
 * - AC6: Handles expired/invalid invitations
 *
 * Uses React.CSSProperties inline styles per project pattern.
 * Uses large, clear UI suitable for older adults (NFR49).
 */

import { useState, useEffect, useCallback } from 'react'
import type { CaregiverInvitation } from '@fledgely/shared/contracts'
import {
  getCaregiverInvitationByToken,
  acceptCaregiverInvitation,
  type CaregiverInvitationErrorReason,
} from '../../services/caregiverInvitationService'

interface CaregiverAcceptInvitationProps {
  token: string
  isAuthenticated: boolean
  onSignIn: () => void
  onAccepted: (result: {
    familyId: string
    familyName: string
    childNames: string[]
    role: 'status_viewer'
  }) => void
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f4f4f5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '520px',
    width: '100%',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    textAlign: 'center' as const,
  },
  icon: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#ede9fe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '40px',
    margin: '0 auto 24px auto',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1f2937',
    margin: '0 0 12px 0',
    lineHeight: 1.3,
  },
  subtitle: {
    fontSize: '1.125rem',
    color: '#6b7280',
    margin: '0 0 32px 0',
    lineHeight: 1.5,
  },
  detailsBox: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    textAlign: 'left' as const,
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  detailRowLast: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
  },
  detailLabel: {
    fontSize: '15px',
    color: '#6b7280',
    fontWeight: 500,
  },
  detailValue: {
    fontSize: '15px',
    color: '#1f2937',
    fontWeight: 600,
  },
  infoBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '32px',
    textAlign: 'left' as const,
  },
  infoTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#166534',
    margin: '0 0 8px 0',
  },
  infoText: {
    fontSize: '15px',
    color: '#166534',
    margin: 0,
    lineHeight: 1.5,
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: '56px',
    padding: '16px 32px',
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  primaryButtonDisabled: {
    backgroundColor: '#a78bfa',
    cursor: 'not-allowed',
  },
  googleButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    width: '100%',
    minHeight: '56px',
    padding: '16px 32px',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '18px',
    fontWeight: 600,
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  googleIcon: {
    width: '24px',
    height: '24px',
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderRadius: '16px',
    padding: '40px',
    maxWidth: '520px',
    width: '100%',
    textAlign: 'center' as const,
    border: '1px solid #fecaca',
  },
  errorIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#fef2f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '40px',
    margin: '0 auto 24px auto',
  },
  errorTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#dc2626',
    margin: '0 0 12px 0',
  },
  errorText: {
    fontSize: '1rem',
    color: '#7f1d1d',
    margin: '0 0 24px 0',
    lineHeight: 1.5,
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '48px',
    padding: '12px 24px',
    backgroundColor: '#ffffff',
    color: '#374151',
    fontSize: '16px',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 40px',
  },
  loadingSpinner: {
    width: '48px',
    height: '48px',
    border: '4px solid #e5e7eb',
    borderTopColor: '#7c3aed',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '24px',
  },
  loadingText: {
    fontSize: '18px',
    color: '#6b7280',
    margin: 0,
  },
  acceptingText: {
    fontSize: '18px',
    color: '#1f2937',
    fontWeight: 500,
    marginTop: '12px',
  },
}

// Error messages for different error types (AC6)
const errorMessages: Record<CaregiverInvitationErrorReason, { title: string; message: string }> = {
  'not-found': {
    title: 'Invitation Not Found',
    message:
      'We could not find this invitation. It may have been cancelled or the link is incorrect.',
  },
  expired: {
    title: 'Invitation Expired',
    message:
      'This invitation has expired. Please ask the person who invited you to send a new invitation.',
  },
  accepted: {
    title: 'Already Accepted',
    message: 'This invitation has already been used. You may already have access to this family.',
  },
  revoked: {
    title: 'Invitation Cancelled',
    message:
      'This invitation has been cancelled. Please contact the person who invited you for more information.',
  },
  invalid: {
    title: 'Invalid Invitation',
    message: 'This invitation link is not valid. Please check the link and try again.',
  },
  unknown: {
    title: 'Something Went Wrong',
    message: 'We had trouble loading this invitation. Please try again in a moment.',
  },
}

export default function CaregiverAcceptInvitation({
  token,
  isAuthenticated,
  onSignIn,
  onAccepted,
}: CaregiverAcceptInvitationProps) {
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [invitation, setInvitation] = useState<CaregiverInvitation | null>(null)
  const [error, setError] = useState<CaregiverInvitationErrorReason | null>(null)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  // Load invitation details on mount
  useEffect(() => {
    async function loadInvitation() {
      setLoading(true)
      const result = await getCaregiverInvitationByToken(token)

      if (result.error) {
        setError(result.error)
      } else {
        setInvitation(result.invitation)
      }
      setLoading(false)
    }

    loadInvitation()
  }, [token])

  // Handle accepting the invitation (AC3)
  const handleAccept = useCallback(async () => {
    if (!invitation) return

    setAccepting(true)
    setAcceptError(null)

    const result = await acceptCaregiverInvitation(token)

    if (result.success) {
      // Success - trigger onboarding (AC4)
      onAccepted({
        familyId: result.familyId!,
        familyName: result.familyName!,
        childNames: result.childNames!,
        role: result.role!,
      })
    } else {
      setAcceptError(result.message)
      setAccepting(false)
    }
  }, [invitation, token, onAccepted])

  // Render error state (AC6)
  if (error) {
    const errorInfo = errorMessages[error]
    return (
      <div style={styles.container} data-testid="accept-invitation-error">
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>
        <div style={styles.errorCard}>
          <div style={styles.errorIcon} aria-hidden="true">
            ⚠️
          </div>
          <h1 style={styles.errorTitle}>{errorInfo.title}</h1>
          <p style={styles.errorText}>{errorInfo.message}</p>
          <a href="/" style={styles.secondaryButton}>
            Go to Home
          </a>
        </div>
      </div>
    )
  }

  // Render loading state
  if (loading) {
    return (
      <div style={styles.container} data-testid="accept-invitation-loading">
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>
        <div style={styles.card}>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner} aria-hidden="true" />
            <p style={styles.loadingText}>Loading invitation...</p>
          </div>
        </div>
      </div>
    )
  }

  // Render accepting state
  if (accepting) {
    return (
      <div style={styles.container} data-testid="accept-invitation-accepting">
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>
        <div style={styles.card}>
          <div style={styles.loadingContainer}>
            <div style={styles.loadingSpinner} aria-hidden="true" />
            <p style={styles.loadingText}>Accepting invitation...</p>
            <p style={styles.acceptingText}>You are joining {invitation?.familyName}</p>
          </div>
        </div>
      </div>
    )
  }

  // Main invitation view
  return (
    <div style={styles.container} data-testid="accept-invitation-page">
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .accept-button:focus {
            outline: 2px solid #7c3aed;
            outline-offset: 2px;
          }
          .accept-button:hover:not(:disabled) {
            background-color: #6d28d9;
          }
          .google-button:focus {
            outline: 2px solid #7c3aed;
            outline-offset: 2px;
          }
          .google-button:hover:not(:disabled) {
            background-color: #f9fafb;
            border-color: #9ca3af;
          }
        `}
      </style>
      <div style={styles.card}>
        <div style={styles.icon} aria-hidden="true">
          👋
        </div>

        <h1 style={styles.title}>You are invited!</h1>
        <p style={styles.subtitle}>
          {invitation?.inviterName} wants you to stay connected with their family.
        </p>

        <div style={styles.detailsBox}>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Invited by</span>
            <span style={styles.detailValue} data-testid="inviter-name">
              {invitation?.inviterName}
            </span>
          </div>
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Family</span>
            <span style={styles.detailValue} data-testid="family-name">
              {invitation?.familyName}
            </span>
          </div>
          <div style={styles.detailRowLast}>
            <span style={styles.detailLabel}>Your role</span>
            <span style={styles.detailValue} data-testid="role">
              Status Viewer
            </span>
          </div>
        </div>

        <div style={styles.infoBox}>
          <p style={styles.infoTitle}>What you can do:</p>
          <p style={styles.infoText}>
            You will be able to see simple status updates showing how the children are doing with
            their screen time. This is a view-only role - you cannot make changes.
          </p>
        </div>

        {acceptError && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '12px 16px',
              marginBottom: '16px',
              color: '#dc2626',
              fontSize: '14px',
              textAlign: 'left' as const,
            }}
            role="alert"
            data-testid="accept-error"
          >
            {acceptError}
          </div>
        )}

        {isAuthenticated ? (
          <button
            type="button"
            onClick={handleAccept}
            disabled={accepting}
            style={{
              ...styles.primaryButton,
              ...(accepting ? styles.primaryButtonDisabled : {}),
            }}
            className="accept-button"
            data-testid="accept-button"
          >
            {accepting ? 'Accepting...' : 'Accept Invitation'}
          </button>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            style={styles.googleButton}
            className="google-button"
            data-testid="sign-in-button"
          >
            <svg style={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google to Accept
          </button>
        )}
      </div>
    </div>
  )
}
