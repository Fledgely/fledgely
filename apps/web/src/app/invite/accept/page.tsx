'use client'

/**
 * Invitation Acceptance Page.
 *
 * Displays invitation details and allows users to accept invitations
 * to join a family as a co-parent.
 *
 * Implements Story 3.3 acceptance criteria:
 * - AC1: Invitation Link Landing Page
 * - AC2: Expired/Invalid Invitation Handling
 * - AC3: Authentication for Acceptance
 * - AC8: Accessibility
 */

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { signInWithPopup } from 'firebase/auth'
import {
  getInvitationByToken,
  acceptInvitation,
  type GetInvitationByTokenResult,
} from '../../../services/invitationService'
import { getFirebaseAuth, getGoogleProvider } from '../../../lib/firebase'
import { useAuth } from '../../../contexts/AuthContext'

const styles = {
  main: {
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '480px',
    width: '100%',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1f2937',
    letterSpacing: '-0.02em',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '8px',
    textAlign: 'center' as const,
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '24px',
    textAlign: 'center' as const,
    lineHeight: 1.6,
  },
  infoBox: {
    backgroundColor: '#f3f4f6',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: '1px solid #e5e7eb',
  },
  infoRowLast: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
  },
  infoLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  infoValue: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: 500,
  },
  explanation: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.6,
    marginBottom: '24px',
  },
  button: {
    width: '100%',
    minHeight: '48px',
    padding: '12px 24px',
    backgroundColor: '#4F46E5',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  buttonDisabled: {
    opacity: 0.7,
    cursor: 'not-allowed',
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
  },
  errorTitle: {
    color: '#dc2626',
  },
  errorMessage: {
    fontSize: '14px',
    color: '#dc2626',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  expiryWarning: {
    fontSize: '13px',
    color: '#b45309',
    backgroundColor: '#fffbeb',
    padding: '8px 12px',
    borderRadius: '6px',
    marginBottom: '16px',
    textAlign: 'center' as const,
  },
  loadingSpinner: {
    display: 'inline-block',
    width: '20px',
    height: '20px',
    border: '2px solid #ffffff',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  backLink: {
    display: 'block',
    textAlign: 'center' as const,
    marginTop: '16px',
    color: '#6b7280',
    fontSize: '14px',
    textDecoration: 'none',
  },
}

/**
 * Calculate days remaining until expiry.
 */
function getDaysRemaining(expiresAt: Date): number {
  const now = new Date()
  const diff = expiresAt.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Inner component that uses useSearchParams.
 * Must be wrapped in Suspense.
 */
function AcceptInvitationContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()
  const token = searchParams.get('token')

  const [invitationResult, setInvitationResult] = useState<GetInvitationByTokenResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState<string | null>(null)

  // Fetch invitation by token on mount
  useEffect(() => {
    if (!token) {
      setInvitationResult({
        invitation: null,
        error: 'invalid',
        errorMessage: 'No invitation token provided. Please check your invitation link.',
      })
      setLoading(false)
      return
    }

    getInvitationByToken(token)
      .then(setInvitationResult)
      .finally(() => setLoading(false))
  }, [token])

  /**
   * Handle accepting the invitation.
   * Signs in user if not already authenticated, then calls acceptInvitation.
   */
  const handleAccept = async () => {
    if (!token) return

    setAccepting(true)
    setAcceptError(null)

    try {
      const auth = getFirebaseAuth()

      // If user is not signed in, sign them in first
      if (!auth.currentUser) {
        await signInWithPopup(auth, getGoogleProvider())
      }

      // Accept the invitation
      const result = await acceptInvitation(token)

      if (result.success) {
        // Redirect to dashboard on success
        router.push('/dashboard')
      } else {
        setAcceptError(result.message)
      }
    } catch (err) {
      console.error('Error accepting invitation:', err)
      const error = err as { code?: string; message?: string }

      // Handle sign-in popup closed
      if (error.code === 'auth/popup-closed-by-user') {
        setAcceptError('Sign-in was cancelled. Please try again.')
      } else {
        setAcceptError(error.message || 'Failed to accept invitation. Please try again.')
      }
    } finally {
      setAccepting(false)
    }
  }

  // Loading state
  if (loading || authLoading) {
    return (
      <main id="main-content" style={styles.main}>
        <div style={styles.card}>
          <div style={styles.logo}>Fledgely</div>
          <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading invitation...</p>
        </div>
      </main>
    )
  }

  // Error state (AC2)
  if (invitationResult?.error) {
    return (
      <main id="main-content" style={styles.main}>
        <style>
          {`
            .back-link:focus {
              outline: 2px solid #4F46E5;
              outline-offset: 2px;
            }
            .back-link:hover {
              color: #4F46E5;
            }
          `}
        </style>
        <div style={{ ...styles.card, ...styles.errorCard }}>
          <div style={styles.logo}>Fledgely</div>
          <h1 style={{ ...styles.title, ...styles.errorTitle }}>Invalid Invitation</h1>
          <p style={styles.errorMessage} role="alert">
            {invitationResult.errorMessage}
          </p>
          <p style={{ ...styles.explanation, textAlign: 'center' }}>
            Please contact the person who invited you to request a new invitation link.
          </p>
          <a href="/" style={styles.backLink} className="back-link">
            Return to Home
          </a>
        </div>
      </main>
    )
  }

  const invitation = invitationResult?.invitation
  if (!invitation) {
    return null
  }

  const daysRemaining = getDaysRemaining(invitation.expiresAt)

  return (
    <main id="main-content" style={styles.main}>
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          .accept-button:focus {
            outline: 2px solid #4F46E5;
            outline-offset: 2px;
          }
          .accept-button:hover:not(:disabled) {
            background-color: #4338CA;
          }
          .back-link:focus {
            outline: 2px solid #4F46E5;
            outline-offset: 2px;
          }
          .back-link:hover {
            color: #4F46E5;
          }
        `}
      </style>
      <div style={styles.card}>
        <div style={styles.logo}>Fledgely</div>

        {/* Title (AC1) */}
        <h1 style={styles.title}>You&apos;re Invited!</h1>
        <p style={styles.subtitle}>
          <strong>{invitation.inviterName}</strong> has invited you to join the{' '}
          <strong>{invitation.familyName}</strong> family on Fledgely.
        </p>

        {/* Invitation details (AC1) */}
        <div style={styles.infoBox}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Invited by</span>
            <span style={styles.infoValue}>{invitation.inviterName}</span>
          </div>
          <div style={styles.infoRowLast}>
            <span style={styles.infoLabel}>Family</span>
            <span style={styles.infoValue}>{invitation.familyName}</span>
          </div>
        </div>

        {/* Expiry warning (AC1) */}
        {daysRemaining <= 2 && (
          <div style={styles.expiryWarning} role="status">
            This invitation expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
          </div>
        )}

        {/* Explanation of what accepting means (AC1) */}
        <p style={styles.explanation}>
          By accepting this invitation, you will become a <strong>co-parent</strong> of this family.
          You&apos;ll have <strong>equal access</strong> to all family settings, children&apos;s
          profiles, and monitoring features. Both parents have identical permissions with no
          hierarchy.
        </p>

        {/* Accept error message */}
        {acceptError && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '16px',
            }}
            role="alert"
          >
            <p style={{ color: '#dc2626', fontSize: '14px', margin: 0 }}>{acceptError}</p>
          </div>
        )}

        {/* Accept button (AC3, AC8) */}
        <button
          type="button"
          onClick={handleAccept}
          disabled={accepting}
          style={{
            ...styles.button,
            ...(accepting ? styles.buttonDisabled : {}),
          }}
          className="accept-button"
          aria-label={
            firebaseUser
              ? 'Accept invitation and join family'
              : 'Sign in with Google and accept invitation'
          }
          aria-busy={accepting}
        >
          {accepting ? (
            <>
              <span style={styles.loadingSpinner} aria-hidden="true" />
              <span>Accepting...</span>
            </>
          ) : firebaseUser ? (
            'Accept Invitation'
          ) : (
            <>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              <span>Sign in with Google &amp; Accept</span>
            </>
          )}
        </button>

        <a href="/" style={styles.backLink} className="back-link">
          Return to Home
        </a>
      </div>
    </main>
  )
}

/**
 * Invitation acceptance page.
 * Wrapped in Suspense for useSearchParams.
 */
export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <main id="main-content" style={styles.main}>
          <div style={styles.card}>
            <div style={styles.logo}>Fledgely</div>
            <p style={{ textAlign: 'center', color: '#6b7280' }}>Loading...</p>
          </div>
        </main>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  )
}
