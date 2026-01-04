'use client'

/**
 * Teen Trusted Adults Approval Page - Story 52.4 Task 6
 *
 * Page for 16+ teens to approve/reject trusted adults.
 *
 * AC3: Teen Approval Required
 *   - Shows pending trusted adult approvals for 16+ teens
 *   - Allow approve/reject with confirmation
 *   - Shows explanation of what trusted adults can see
 *   - Hidden from teens under 16 (parent approval only)
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../../../../lib/firebase'
import { useChildAuth } from '../../../../contexts/ChildAuthContext'
import { TrustedAdultApprovalCard } from '../../../../components/trusted-adult'
import { TrustedAdultStatus } from '@fledgely/shared'

interface PendingTrustedAdult {
  id: string
  name: string
  email: string
  invitedAt: Date
  invitedByName?: string
}

const styles: Record<string, React.CSSProperties> = {
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
    maxWidth: '600px',
    margin: '0 auto',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  pageDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 24px 0',
    lineHeight: 1.5,
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
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  sectionCount: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '24px',
    height: '24px',
    padding: '0 8px',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
  },
  emptyState: {
    padding: '32px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    textAlign: 'center' as const,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: '14px',
    margin: 0,
    lineHeight: 1.5,
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  error: {
    padding: '16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    marginBottom: '24px',
    fontSize: '14px',
  },
  infoBox: {
    padding: '16px',
    backgroundColor: '#ede9fe',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  infoTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#5b21b6',
    margin: '0 0 8px 0',
  },
  infoText: {
    fontSize: '14px',
    color: '#6d28d9',
    margin: 0,
    lineHeight: 1.5,
  },
  notEligible: {
    padding: '32px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    textAlign: 'center' as const,
  },
  notEligibleText: {
    color: '#6b7280',
    fontSize: '14px',
    margin: 0,
    lineHeight: 1.5,
  },
  activeList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  activeCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
  },
  activeCardInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  activeCardName: {
    fontSize: '16px',
    fontWeight: 500,
    color: '#1f2937',
    margin: 0,
  },
  activeCardEmail: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  activeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
  },
}

export default function ChildTrustedAdultsPage() {
  const router = useRouter()
  const { child, loading: authLoading, isAuthenticated, familyId } = useChildAuth()
  const [pendingApprovals, setPendingApprovals] = useState<PendingTrustedAdult[]>([])
  const [activeTrustedAdults, setActiveTrustedAdults] = useState<PendingTrustedAdult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [is16Plus, setIs16Plus] = useState(false)

  const fetchTrustedAdults = useCallback(async () => {
    if (!familyId || !child?.id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const getTrustedAdults = httpsCallable(functions, 'getTrustedAdultsCallable')
      const result = await getTrustedAdults({ familyId, childId: child.id })
      const data = result.data as {
        trustedAdults: Array<{
          id: string
          name: string
          email: string
          status: string
          invitedAt: string | { _seconds: number }
        }>
      }

      // Filter pending approvals and active
      const pending = data.trustedAdults
        .filter((ta) => ta.status === TrustedAdultStatus.PENDING_TEEN_APPROVAL)
        .map((ta) => ({
          id: ta.id,
          name: ta.name,
          email: ta.email,
          invitedAt: parseDate(ta.invitedAt),
        }))

      const active = data.trustedAdults
        .filter((ta) => ta.status === TrustedAdultStatus.ACTIVE)
        .map((ta) => ({
          id: ta.id,
          name: ta.name,
          email: ta.email,
          invitedAt: parseDate(ta.invitedAt),
        }))

      setPendingApprovals(pending)
      setActiveTrustedAdults(active)
    } catch (err) {
      console.error('Failed to fetch trusted adults:', err)
      setError(err instanceof Error ? err.message : 'Failed to load trusted adults')
    } finally {
      setLoading(false)
    }
  }, [familyId, child?.id])

  function parseDate(value: string | { _seconds: number }): Date {
    if (typeof value === 'string') {
      return new Date(value)
    }
    if (value && typeof value === 'object' && '_seconds' in value) {
      return new Date(value._seconds * 1000)
    }
    return new Date()
  }

  // Check if child is 16+
  useEffect(() => {
    if (child?.birthdate) {
      const birthDate =
        child.birthdate instanceof Date ? child.birthdate : new Date(child.birthdate)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      const dayDiff = today.getDate() - birthDate.getDate()
      const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age
      setIs16Plus(actualAge >= 16)
    }
  }, [child?.birthdate])

  useEffect(() => {
    if (isAuthenticated && is16Plus) {
      fetchTrustedAdults()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, is16Plus, fetchTrustedAdults])

  // Redirect unauthenticated users
  if (!authLoading && !isAuthenticated) {
    router.push('/child/login')
    return null
  }

  // Show loading state
  if (authLoading || loading) {
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

  // Check if authenticated
  if (!isAuthenticated || !child) {
    return null
  }

  // Not eligible (under 16)
  if (!is16Plus) {
    return (
      <main id="main-content" style={styles.main}>
        <header style={styles.header}>
          <span style={styles.logo}>Fledgely</span>
          <a href="/child/dashboard" style={styles.backLink}>
            &larr; Back to Dashboard
          </a>
        </header>
        <div style={styles.content}>
          <h1 style={styles.pageTitle}>Trusted Adults</h1>
          <div style={styles.notEligible}>
            <p style={styles.notEligibleText}>
              This feature is available when you turn 16. Until then, your parents manage trusted
              adults for you. Check back when you&apos;re older!
            </p>
          </div>
        </div>
      </main>
    )
  }

  const handleApproved = () => {
    fetchTrustedAdults()
  }

  const handleRejected = () => {
    fetchTrustedAdults()
  }

  return (
    <main id="main-content" style={styles.main}>
      <header style={styles.header}>
        <span style={styles.logo}>Fledgely</span>
        <a href="/child/dashboard" style={styles.backLink}>
          &larr; Back to Dashboard
        </a>
      </header>

      <div style={styles.content}>
        <h1 style={styles.pageTitle}>Trusted Adults</h1>
        <p style={styles.pageDescription}>
          Manage who can view your activity data. You have control over which trusted adults your
          parents invite can see your information.
        </p>

        {/* Info box */}
        <div style={styles.infoBox}>
          <p style={styles.infoTitle}>Your Privacy, Your Choice</p>
          <p style={styles.infoText}>
            When you&apos;re 16 or older, you get to approve trusted adults before they can see any
            of your data. If you use Reverse Mode, trusted adults will only see what you choose to
            share, just like your parents.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div style={styles.error} data-testid="error-message">
            {error}
          </div>
        )}

        {/* Pending approvals section */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>
            Needs Your Approval
            <span style={styles.sectionCount}>{pendingApprovals.length}</span>
          </h2>

          {pendingApprovals.length === 0 ? (
            <div style={styles.emptyState} data-testid="no-pending">
              <div style={styles.emptyIcon} aria-hidden="true">
                &#x2714;
              </div>
              <p style={styles.emptyText}>
                No pending approvals. When your parents invite a trusted adult, they&apos;ll appear
                here for your approval.
              </p>
            </div>
          ) : (
            <div data-testid="pending-approvals">
              {pendingApprovals.map((ta) => (
                <TrustedAdultApprovalCard
                  key={ta.id}
                  trustedAdult={ta}
                  onApproved={handleApproved}
                  onRejected={handleRejected}
                />
              ))}
            </div>
          )}
        </div>

        {/* Active trusted adults section */}
        {activeTrustedAdults.length > 0 && (
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>
              Active Trusted Adults
              <span style={styles.sectionCount}>{activeTrustedAdults.length}</span>
            </h2>

            <div style={styles.activeList} data-testid="active-trusted-adults">
              {activeTrustedAdults.map((ta) => (
                <div key={ta.id} style={styles.activeCard} data-testid={`active-${ta.id}`}>
                  <div style={styles.activeCardInfo}>
                    <p style={styles.activeCardName}>{ta.name}</p>
                    <p style={styles.activeCardEmail}>{ta.email}</p>
                  </div>
                  <span style={styles.activeBadge}>Active</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
