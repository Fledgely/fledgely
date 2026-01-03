'use client'

/**
 * Caregiver Management Page - Story 39.1
 *
 * Page for parents to manage family caregivers.
 * Shows list of caregivers, pending invitations, and add button.
 *
 * AC5: Caregiver List Display
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { useFamily } from '../../../contexts/FamilyContext'
import CaregiverManagementPage from '../../../components/caregiver/CaregiverManagementPage'

const styles = {
  main: {
    minHeight: '100vh',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#f9fafb',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '44px',
    padding: '8px 16px',
    fontSize: '14px',
    color: '#6b7280',
    textDecoration: 'none',
    borderRadius: '8px',
  },
  content: {
    padding: '24px',
    maxWidth: '800px',
    margin: '0 auto',
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

export default function CaregiversPage() {
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
      <header style={styles.header}>
        <span style={styles.logo}>Fledgely</span>
        <a href="/dashboard" style={styles.backLink}>
          ← Back to Dashboard
        </a>
      </header>

      <div style={styles.content}>
        {family?.id ? (
          <CaregiverManagementPage familyId={family.id} />
        ) : (
          <p>No family found. Please create a family first.</p>
        )}
      </div>
    </main>
  )
}
