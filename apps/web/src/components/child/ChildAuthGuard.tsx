'use client'

/**
 * ChildAuthGuard Component - Story 19B.1
 *
 * Protects child routes by requiring valid child session.
 * Redirects to child login if not authenticated.
 *
 * Task 1.5: Create ChildAuthGuard component for protected routes
 */

import { useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useChildAuth } from '../../contexts/ChildAuthContext'

interface ChildAuthGuardProps {
  children: ReactNode
}

/**
 * Loading spinner styles
 */
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff', // sky-50
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #bae6fd', // sky-200
    borderRadius: '50%',
    borderTopColor: '#0ea5e9', // sky-500
    animation: 'spin 1s linear infinite',
  },
  text: {
    marginTop: '16px',
    color: '#0369a1', // sky-700
    fontSize: '1rem',
  },
}

/**
 * ChildAuthGuard - Protects child dashboard routes
 *
 * - Redirects to /child/login if no valid session
 * - Shows loading state while checking session
 * - Renders children only when authenticated
 */
export function ChildAuthGuard({ children }: ChildAuthGuardProps) {
  const router = useRouter()
  const { childSession, loading, isAuthenticated } = useChildAuth()

  useEffect(() => {
    // Wait for session check to complete
    if (loading) return

    // Redirect to login if not authenticated
    // Note: isAuthenticated already considers session expiry (see ChildAuthContext.tsx:134)
    if (!isAuthenticated) {
      router.replace('/child/login')
    }
  }, [loading, isAuthenticated, router])

  // Show loading while checking session
  if (loading) {
    return (
      <div style={styles.container} data-testid="child-auth-loading">
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>
        <div style={styles.spinner} />
        <p style={styles.text}>Loading...</p>
      </div>
    )
  }

  // Don't render children until authenticated
  if (!isAuthenticated || !childSession) {
    return null
  }

  return <>{children}</>
}
