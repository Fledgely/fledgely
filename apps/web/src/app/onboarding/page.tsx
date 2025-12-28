'use client'

/**
 * Onboarding page - shown to new users after first sign-in.
 *
 * Placeholder for Epic 2 (Family Setup) features.
 * Allows users to navigate to dashboard while onboarding is in development.
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'

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
    maxWidth: '500px',
    width: '100%',
  },
  icon: {
    fontSize: '4rem',
    marginBottom: '16px',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '8px',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '32px',
    lineHeight: 1.6,
  },
  dashboardLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    minWidth: '180px',
    padding: '12px 24px',
    backgroundColor: '#4F46E5',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 500,
    textDecoration: 'none',
    borderRadius: '8px',
    transition: 'all 0.2s ease',
  },
  loadingText: {
    color: '#1f2937',
  },
}

export default function OnboardingPage() {
  const { firebaseUser, userProfile, loading, clearNewUserFlag } = useAuth()
  const router = useRouter()

  // Clear new user flag when onboarding page loads (prevents re-redirect on refresh)
  useEffect(() => {
    if (!loading && firebaseUser) {
      clearNewUserFlag()
    }
  }, [loading, firebaseUser, clearNewUserFlag])

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/login')
    }
  }, [firebaseUser, loading, router])

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

  // Don't render if not authenticated
  if (!firebaseUser) {
    return null
  }

  const firstName =
    userProfile?.displayName?.split(' ')[0] || firebaseUser.displayName?.split(' ')[0] || 'there'

  return (
    <main style={styles.main} role="main" aria-label="Onboarding page">
      <style>
        {`
          .dashboard-link:focus {
            outline: 2px solid #ffffff;
            outline-offset: 2px;
          }
          .dashboard-link:hover {
            background-color: #4338CA;
          }
        `}
      </style>
      <div style={styles.card}>
        <div style={styles.icon} aria-hidden="true">
          🎉
        </div>
        <h1 style={styles.title}>Welcome, {firstName}!</h1>
        <p style={styles.subtitle}>
          You&apos;ve successfully created your Fledgely account. Family setup features are coming
          soon. For now, you can explore your dashboard.
        </p>
        <a href="/dashboard" style={styles.dashboardLink} className="dashboard-link">
          Go to Dashboard
        </a>
      </div>
    </main>
  )
}
