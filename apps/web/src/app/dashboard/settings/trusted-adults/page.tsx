'use client'

/**
 * Trusted Adults Settings Page - Story 52.4 Task 5.1
 *
 * Page for parents to manage trusted adults for their children.
 *
 * AC1: Designate Trusted Adult - invite form
 * AC5: Maximum 2 Trusted Adults - count display
 * AC6: Audit Logging - all actions logged
 */

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../contexts/AuthContext'
import { useFamily } from '../../../../contexts/FamilyContext'
import { useTrustedAdults } from '../../../../hooks/useTrustedAdults'
import { TrustedAdultInviteForm, TrustedAdultList } from '../../../../components/trusted-adult'

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
    maxWidth: '800px',
    margin: '0 auto',
  },
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
    gap: '16px',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  addButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#7c3aed',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
  },
  addButtonDisabled: {
    backgroundColor: '#a78bfa',
    cursor: 'not-allowed',
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
  childSelector: {
    marginBottom: '24px',
  },
  childSelectorLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
    display: 'block',
  },
  childSelect: {
    width: '100%',
    maxWidth: '300px',
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    outline: 'none',
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
  modal: {
    position: 'fixed' as const,
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
    padding: '24px',
  },
  modalContent: {
    maxHeight: '90vh',
    overflowY: 'auto' as const,
  },
  error: {
    padding: '16px',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '8px',
    marginBottom: '24px',
    fontSize: '14px',
  },
  section: {
    marginBottom: '32px',
  },
}

export default function TrustedAdultsSettingsPage() {
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()
  const { family, loading: familyLoading } = useFamily()
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)

  // Get children from family
  const children = useMemo(() => {
    if (!family?.children) return []
    return Object.entries(family.children).map(([id, child]) => ({
      id,
      name:
        (child as { name?: string; displayName?: string }).name ||
        (child as { name?: string; displayName?: string }).displayName ||
        'Child',
    }))
  }, [family?.children])

  // Auto-select first child
  const effectiveChildId = selectedChildId || (children.length > 0 ? children[0].id : null)

  // Use trusted adults hook
  const {
    trustedAdults,
    counts,
    loading: trustedAdultsLoading,
    error: trustedAdultsError,
    refresh,
    revoke,
    resendInvitation,
  } = useTrustedAdults({
    familyId: family?.id || '',
    childId: effectiveChildId || '',
  })

  // Redirect unauthenticated users
  if (!authLoading && !firebaseUser) {
    router.push('/login')
    return null
  }

  // Show loading state
  if (authLoading || familyLoading) {
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

  // Check if user is authenticated
  if (!firebaseUser) {
    return null
  }

  // Check if family exists
  if (!family?.id) {
    return (
      <main id="main-content" style={styles.main}>
        <header style={styles.header}>
          <span style={styles.logo}>Fledgely</span>
          <a href="/dashboard" style={styles.backLink}>
            &larr; Back to Dashboard
          </a>
        </header>
        <div style={styles.content}>
          <p>No family found. Please create a family first.</p>
        </div>
      </main>
    )
  }

  // Check if there are children
  if (children.length === 0) {
    return (
      <main id="main-content" style={styles.main}>
        <header style={styles.header}>
          <span style={styles.logo}>Fledgely</span>
          <a href="/dashboard" style={styles.backLink}>
            &larr; Back to Dashboard
          </a>
        </header>
        <div style={styles.content}>
          <p>No children in this family. Please add a child first.</p>
        </div>
      </main>
    )
  }

  const canAddMore = counts?.canAddMore ?? true

  const handleRevoke = async (trustedAdultId: string) => {
    if (window.confirm('Are you sure you want to remove this trusted adult?')) {
      try {
        await revoke(trustedAdultId)
      } catch (err) {
        console.error('Failed to revoke:', err)
      }
    }
  }

  const handleResend = async (trustedAdultId: string) => {
    try {
      await resendInvitation(trustedAdultId)
      alert('Invitation resent successfully!')
    } catch (err) {
      console.error('Failed to resend:', err)
      alert('Failed to resend invitation. Please try again.')
    }
  }

  const handleInviteSuccess = () => {
    setShowInviteForm(false)
    refresh()
  }

  return (
    <main id="main-content" style={styles.main}>
      <header style={styles.header}>
        <span style={styles.logo}>Fledgely</span>
        <a href="/dashboard" style={styles.backLink}>
          &larr; Back to Dashboard
        </a>
      </header>

      <div style={styles.content}>
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>Trusted Adults</h1>
          <button
            type="button"
            onClick={() => setShowInviteForm(true)}
            disabled={!canAddMore}
            style={{
              ...styles.addButton,
              ...(!canAddMore ? styles.addButtonDisabled : {}),
            }}
            data-testid="add-trusted-adult-button"
          >
            + Add Trusted Adult
          </button>
        </div>

        {/* Info box */}
        <div style={styles.infoBox}>
          <p style={styles.infoTitle}>About Trusted Adults</p>
          <p style={styles.infoText}>
            Trusted adults have view-only access to your child&apos;s activity data. They cannot
            change settings or control screen time. For children 16 and older, the teen must approve
            each trusted adult before they can see any data.
          </p>
        </div>

        {/* Child selector (if multiple children) */}
        {children.length > 1 && (
          <div style={styles.childSelector}>
            <label htmlFor="child-select" style={styles.childSelectorLabel}>
              Select Child
            </label>
            <select
              id="child-select"
              value={effectiveChildId || ''}
              onChange={(e) => setSelectedChildId(e.target.value)}
              style={styles.childSelect}
              data-testid="child-selector"
            >
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Error message */}
        {trustedAdultsError && (
          <div style={styles.error} data-testid="error-message">
            {trustedAdultsError}
          </div>
        )}

        {/* Trusted adults list */}
        <div style={styles.section}>
          <TrustedAdultList
            trustedAdults={trustedAdults}
            counts={
              counts || {
                active: 0,
                pendingInvitation: 0,
                pendingTeenApproval: 0,
                total: 0,
                maxAllowed: 2,
                canAddMore: true,
              }
            }
            onRevoke={handleRevoke}
            onResend={handleResend}
            loading={trustedAdultsLoading}
          />
        </div>

        {/* Invite form modal */}
        {showInviteForm && effectiveChildId && (
          <div
            style={styles.modal}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowInviteForm(false)
            }}
            data-testid="invite-modal"
          >
            <div style={styles.modalContent}>
              <TrustedAdultInviteForm
                familyId={family.id}
                childId={effectiveChildId}
                onSuccess={handleInviteSuccess}
                onCancel={() => setShowInviteForm(false)}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
