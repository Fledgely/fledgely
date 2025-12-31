'use client'

/**
 * Audit Log Page
 *
 * Story 27.2: Parent Audit Log View
 *
 * Displays family access history with filters and pagination.
 * Shows who accessed what data, when, and from where.
 */

import { useRouter } from 'next/navigation'
import { useAuth } from '../../../contexts/AuthContext'
import { useFamily } from '../../../contexts/FamilyContext'
import { useAuditLog } from '../../../hooks/useAuditLog'
import { AuditEventList, AuditLogFilters } from '../../../components/audit'
import { logDataViewNonBlocking } from '../../../services/dataViewAuditService'
import { useEffect } from 'react'

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
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#6b7280',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1f2937',
  },
  content: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px',
  },
  pageHeader: {
    marginBottom: '24px',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '8px',
  },
  pageDescription: {
    fontSize: '14px',
    color: '#6b7280',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e5e7eb',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  noFamilyMessage: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    color: '#6b7280',
  },
}

export default function AuditLogPage() {
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()
  const { family, loading: familyLoading } = useFamily()

  const {
    events,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    onlyFamilyAccess,
    familyMembers,
    filters,
    setFilters,
    loadMore,
  } = useAuditLog(family?.id || null)

  // Log audit page view
  useEffect(() => {
    if (firebaseUser && family) {
      logDataViewNonBlocking({
        viewerUid: firebaseUser.uid,
        childId: null,
        familyId: family.id,
        dataType: 'activity', // Using activity type for audit log views
      })
    }
  }, [firebaseUser, family])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login')
    }
  }, [authLoading, firebaseUser, router])

  if (authLoading || familyLoading) {
    return (
      <main style={styles.main}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    )
  }

  if (!firebaseUser) {
    return null
  }

  if (!family) {
    return (
      <main style={styles.main}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button
              style={styles.backButton}
              onClick={() => router.push('/dashboard')}
              aria-label="Back to dashboard"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <span style={styles.title}>Access History</span>
          </div>
        </header>
        <div style={styles.noFamilyMessage}>
          <p>You need to create or join a family to view access history.</p>
        </div>
      </main>
    )
  }

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            style={styles.backButton}
            onClick={() => router.push('/dashboard')}
            aria-label="Back to dashboard"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </button>
          <span style={styles.title}>Access History</span>
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>Family Access History</h1>
          <p style={styles.pageDescription}>
            See who has accessed your family&apos;s data, what they viewed, and when.
          </p>
        </div>

        {/* Filters */}
        <AuditLogFilters
          familyMembers={familyMembers}
          filters={filters}
          onFiltersChange={setFilters}
        />

        {/* Event list */}
        <AuditEventList
          events={events}
          isLoading={isLoading}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onlyFamilyAccess={onlyFamilyAccess}
          error={error}
          onLoadMore={loadMore}
        />
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
