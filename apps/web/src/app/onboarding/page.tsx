'use client'

/**
 * Onboarding page - shown to new users after first sign-in.
 *
 * Redirects users to family creation if they don't have a family yet.
 * Otherwise redirects to dashboard.
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

  // Redirect to family creation if no family, otherwise to dashboard
  useEffect(() => {
    if (!loading && firebaseUser && userProfile) {
      if (!userProfile.familyId) {
        // No family yet - redirect to family creation
        router.push('/family/create')
      } else {
        // Has family - redirect to dashboard
        router.push('/dashboard')
      }
    }
  }, [loading, firebaseUser, userProfile, router])

  // Show loading state while checking auth and redirecting
  return (
    <main id="main-content" style={styles.main} role="main" aria-label="Onboarding page">
      <div style={styles.card}>
        <p style={styles.loadingText}>Setting up your account...</p>
      </div>
    </main>
  )
}
