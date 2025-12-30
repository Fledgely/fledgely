'use client'

/**
 * Caregiver Quick View Page - Story 19A.3
 *
 * Simplified single-screen status view for caregivers (grandparents).
 * This is a protected route that requires authentication.
 *
 * Dependencies:
 * - Epic 19D for full caregiver authentication (currently stubbed)
 *
 * For MVP Implementation:
 * - Uses current user's family context
 * - Full caregiver access control will be added in Epic 19D
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { useFamily } from '../../contexts/FamilyContext'
import { CaregiverQuickView } from '../../components/caregiver'

/**
 * Page styles
 */
const styles = {
  main: {
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f9fafb',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
  },
  logo: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '44px',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1f2937',
    letterSpacing: '-0.02em',
    textDecoration: 'none',
  },
  content: {
    padding: '24px',
  },
  loading: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    fontSize: '18px',
    color: '#6b7280',
  },
}

/**
 * Caregiver Quick View Page
 *
 * TODO: Epic 19D will add:
 * - Caregiver-specific authentication flow
 * - Access window enforcement (19D.4)
 * - Caregiver role verification
 */
export default function CaregiverPage() {
  const { firebaseUser, loading } = useAuth()
  const { family, loading: familyLoading } = useFamily()
  const router = useRouter()

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!loading && !firebaseUser) {
      router.push('/login')
    }
  }, [firebaseUser, loading, router])

  // Show loading state
  if (loading || familyLoading) {
    return (
      <main id="main-content" style={styles.main}>
        <header style={styles.header}>
          <span style={styles.logo}>Fledgely</span>
        </header>
        <div style={styles.loading}>
          <p>Loading...</p>
        </div>
      </main>
    )
  }

  // Don't render if not authenticated
  if (!firebaseUser) {
    return null
  }

  return (
    <main id="main-content" style={styles.main}>
      {/* Header - simplified for caregiver view */}
      <header style={styles.header}>
        <span style={styles.logo}>Fledgely</span>
      </header>

      {/* Main content */}
      <div style={styles.content}>
        <CaregiverQuickView familyId={family?.id ?? null} />
      </div>
    </main>
  )
}
