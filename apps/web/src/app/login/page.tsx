'use client'

/**
 * Login page with Google Sign-In.
 *
 * Redirects authenticated users to dashboard.
 * Shows session expiry message when returning after 30+ days.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { GoogleSignInButton } from '../../components/auth/GoogleSignInButton'

const styles = {
  main: {
    display: 'flex',
    minHeight: '100vh',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    padding: '2rem',
    textAlign: 'center' as const,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    padding: '48px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    maxWidth: '400px',
    width: '100%',
  },
  logo: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '8px',
    letterSpacing: '-0.02em',
  },
  tagline: {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '32px',
  },
  error: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '24px',
    color: '#dc2626',
    fontSize: '14px',
    textAlign: 'left' as const,
  },
  info: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '24px',
    color: '#1e40af',
    fontSize: '14px',
    textAlign: 'left' as const,
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    marginTop: '24px',
    color: '#6b7280',
    fontSize: '14px',
    textDecoration: 'none',
    borderRadius: '4px',
    padding: '0 8px',
  },
  loadingText: {
    color: '#1f2937',
  },
}

export default function LoginPage() {
  const {
    firebaseUser,
    loading,
    isNewUser,
    sessionExpired,
    justLoggedOut,
    clearSessionExpiredFlag,
    clearJustLoggedOutFlag,
  } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  // Redirect authenticated users appropriately
  useEffect(() => {
    if (!loading && firebaseUser) {
      clearSessionExpiredFlag()
      clearJustLoggedOutFlag()
      if (isNewUser) {
        router.push('/onboarding')
      } else {
        router.push('/dashboard')
      }
    }
  }, [firebaseUser, loading, isNewUser, router, clearSessionExpiredFlag, clearJustLoggedOutFlag])

  const handleSignInStart = () => {
    // Clear previous error when starting a new sign-in attempt
    setError(null)
  }

  const handleSignInSuccess = () => {
    // Clear any status flags on successful sign-in
    clearSessionExpiredFlag()
    clearJustLoggedOutFlag()
    // Redirect handled by auth state change effect
  }

  const handleSignInError = (err: Error) => {
    // Handle Firebase auth errors with user-friendly messages (6th-grade reading level)
    const errorCode = (err as { code?: string }).code || 'unknown'

    // Log error for monitoring (no PII - only error code)
    console.error('[Auth Error]', { code: errorCode, type: categorizeAuthError(errorCode) })

    // Set user-friendly message based on error code
    switch (errorCode) {
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        setError('Sign-in was cancelled. Click the button to try again.')
        break
      case 'auth/popup-blocked':
        setError(
          'Your browser blocked the sign-in window. Please allow pop-ups for this site, then try again.'
        )
        break
      case 'auth/network-request-failed':
        setError('Could not connect to the internet. Please check your connection and try again.')
        break
      case 'auth/too-many-requests':
        setError('Too many tries. Please wait a minute and try again.')
        break
      case 'auth/user-disabled':
        setError('This account has been disabled. Please contact support for help.')
        break
      case 'auth/operation-not-allowed':
        setError('Sign-in is not available right now. Please try again later.')
        break
      case 'auth/internal-error':
        setError('Something went wrong on our end. Please try again in a moment.')
        break
      default:
        setError('Unable to sign in. Please try again.')
    }
  }

  /**
   * Categorize auth errors for monitoring/analytics.
   * Returns a category string without any PII.
   */
  function categorizeAuthError(errorCode: string): string {
    if (errorCode.includes('popup')) return 'popup'
    if (errorCode.includes('network')) return 'network'
    if (errorCode.includes('disabled')) return 'account'
    if (errorCode.includes('too-many')) return 'rate-limit'
    if (errorCode.includes('internal')) return 'server'
    return 'other'
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <main style={styles.main} role="main">
        <div style={styles.card}>
          <p style={styles.loadingText}>Loading...</p>
        </div>
      </main>
    )
  }

  // Don't show login form if already authenticated
  if (firebaseUser) {
    return null
  }

  return (
    <main style={styles.main} role="main" aria-label="Login page">
      <style>
        {`
          .back-link:focus {
            outline: 2px solid #4F46E5;
            outline-offset: 2px;
          }
          .back-link:hover {
            color: #374151;
          }
        `}
      </style>
      <div style={styles.card}>
        <h1 style={styles.logo}>Fledgely</h1>
        <p style={styles.tagline}>Sign in to your account</p>

        {justLoggedOut && !sessionExpired && (
          <div style={styles.info} role="status" aria-live="polite">
            You have been logged out.
          </div>
        )}

        {sessionExpired && (
          <div style={styles.info} role="status" aria-live="polite">
            Your session has ended. Please sign in again to continue.
          </div>
        )}

        {error && (
          <div style={styles.error} role="alert">
            {error}
          </div>
        )}

        <GoogleSignInButton
          onStart={handleSignInStart}
          onSuccess={handleSignInSuccess}
          onError={handleSignInError}
        />

        <a href="/" style={styles.backLink} className="back-link">
          &larr; Back to home
        </a>
      </div>
    </main>
  )
}
