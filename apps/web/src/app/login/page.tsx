'use client'

/**
 * Login page with Google Sign-In.
 *
 * Redirects authenticated users to dashboard.
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
}

export default function LoginPage() {
  const { firebaseUser, loading, isNewUser } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  // Redirect authenticated users appropriately
  useEffect(() => {
    if (!loading && firebaseUser) {
      if (isNewUser) {
        router.push('/onboarding')
      } else {
        router.push('/dashboard')
      }
    }
  }, [firebaseUser, loading, isNewUser, router])

  const handleSignInSuccess = () => {
    // Redirect handled by auth state change effect
  }

  const handleSignInError = (err: Error) => {
    // Handle common Firebase auth errors with user-friendly messages
    const errorCode = (err as { code?: string }).code || ''

    switch (errorCode) {
      case 'auth/popup-closed-by-user':
        setError('Sign-in was cancelled. Please try again.')
        break
      case 'auth/popup-blocked':
        setError(
          'Pop-up was blocked by your browser. Please allow pop-ups for this site and try again.'
        )
        break
      case 'auth/network-request-failed':
        setError('Network error. Please check your internet connection and try again.')
        break
      case 'auth/too-many-requests':
        setError('Too many sign-in attempts. Please wait a moment and try again.')
        break
      default:
        setError('Unable to sign in. Please try again.')
    }
  }

  // Show loading state while checking auth
  if (loading) {
    return (
      <main style={styles.main} role="main">
        <div style={styles.card}>
          <p>Loading...</p>
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

        {error && (
          <div style={styles.error} role="alert">
            {error}
          </div>
        )}

        <GoogleSignInButton onSuccess={handleSignInSuccess} onError={handleSignInError} />

        <a href="/" style={styles.backLink} className="back-link">
          &larr; Back to home
        </a>
      </div>
    </main>
  )
}
