'use client'

/**
 * Trusted Adult Dashboard Page - Story 52.5 Task 1.2
 *
 * Main dashboard for trusted adults to view shared child data.
 *
 * AC1: View shared data dashboard
 * AC2: Read-only access
 * AC3: Respect reverse mode settings
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import { useTrustedAdultContext } from '../../contexts/TrustedAdultContext'
import { SharedDataDashboard } from '../../components/trusted-adult-view'

const styles: Record<string, React.CSSProperties> = {
  loading: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    fontSize: '18px',
    color: '#6b7280',
  },
  error: {
    padding: '16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    marginBottom: '24px',
    fontSize: '14px',
  },
  accessDenied: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    textAlign: 'center' as const,
    padding: '24px',
  },
  accessDeniedIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5,
  },
  accessDeniedTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 8px 0',
  },
  accessDeniedMessage: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    maxWidth: '400px',
    lineHeight: 1.5,
  },
  childList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  childCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '2px solid transparent',
  },
  childCardSelected: {
    borderColor: '#7c3aed',
    boxShadow: '0 4px 6px -1px rgba(124, 58, 237, 0.1)',
  },
  childName: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  childMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#6b7280',
  },
  reverseModeTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 8px',
    backgroundColor: '#ede9fe',
    color: '#7c3aed',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: '0 0 8px 0',
  },
  pageSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 24px 0',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    textAlign: 'center' as const,
    padding: '24px',
  },
  emptyStateIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5,
  },
  emptyStateTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: '#374151',
    margin: '0 0 8px 0',
  },
  emptyStateMessage: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
    maxWidth: '400px',
    lineHeight: 1.5,
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '16px',
  },
}

export default function TrustedAdultDashboardPage() {
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()
  const {
    children,
    loading,
    error,
    selectedChild,
    accessDenied,
    accessDeniedReason,
    selectChild,
    clearSelection,
  } = useTrustedAdultContext()

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login')
    }
  }, [authLoading, firebaseUser, router])

  // Auto-select if only one child
  useEffect(() => {
    if (children.length === 1 && !selectedChild && !accessDenied) {
      selectChild(children[0].childId)
    }
  }, [children, selectedChild, accessDenied, selectChild])

  if (authLoading || loading) {
    return (
      <div style={styles.loading}>
        <p>Loading...</p>
      </div>
    )
  }

  if (!firebaseUser) {
    return null
  }

  if (error) {
    return (
      <div style={styles.error} data-testid="error-message">
        {error}
      </div>
    )
  }

  // AC6: Show access denied state
  if (accessDenied) {
    return (
      <div style={styles.accessDenied}>
        <div style={styles.accessDeniedIcon} aria-hidden="true">
          &#x1F6AB;
        </div>
        <h2 style={styles.accessDeniedTitle}>Access Denied</h2>
        <p style={styles.accessDeniedMessage}>
          {accessDeniedReason || 'You no longer have access to view this data.'}
        </p>
      </div>
    )
  }

  // No children to view
  if (children.length === 0) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyStateIcon} aria-hidden="true">
          &#x1F465;
        </div>
        <h2 style={styles.emptyStateTitle}>No Children to View</h2>
        <p style={styles.emptyStateMessage}>
          You don&apos;t have any active trusted adult relationships. Ask a parent to invite you as
          a trusted adult for their teen.
        </p>
      </div>
    )
  }

  // Show selected child's dashboard
  if (selectedChild) {
    return (
      <>
        {children.length > 1 && (
          <button type="button" onClick={clearSelection} style={styles.backButton}>
            &larr; Back to Children
          </button>
        )}
        <SharedDataDashboard
          childId={selectedChild.childId}
          childName={selectedChild.childName}
          sharedByLabel={selectedChild.sharedByLabel}
          dataFilter={selectedChild.dataFilter}
          hasData={selectedChild.hasData}
          noDataMessage={selectedChild.noDataMessage}
          reverseModeActive={selectedChild.reverseModeActive}
        />
      </>
    )
  }

  // Show child selection (multiple children)
  return (
    <>
      <h1 style={styles.pageTitle}>Your Trusted Adult Dashboard</h1>
      <p style={styles.pageSubtitle}>Select a child to view their shared data.</p>

      <div style={styles.childList}>
        {children.map((child) => (
          <div
            key={child.childId}
            style={styles.childCard}
            onClick={() => selectChild(child.childId)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                selectChild(child.childId)
              }
            }}
            data-testid={`child-card-${child.childId}`}
          >
            <h3 style={styles.childName}>{child.childName}</h3>
            <div style={styles.childMeta}>
              {child.reverseModeActive && (
                <span style={styles.reverseModeTag}>
                  <span aria-hidden="true">&#x1F512;</span>
                  Reverse Mode
                </span>
              )}
              <span>
                Added{' '}
                {child.approvedAt ? new Date(child.approvedAt).toLocaleDateString() : 'recently'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
