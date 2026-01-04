'use client'

/**
 * Reverse Mode Settings Page - Story 52.2 Task 5
 *
 * Settings page for managing reverse mode activation and sharing preferences.
 *
 * AC1: Visible only if child is 16+
 * AC2: Confirmation modal before activation
 * AC3: Toggle control for activation/deactivation
 * AC5: Can be deactivated anytime
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../contexts/AuthContext'
import { useReverseMode } from '../../../../hooks/useReverseMode'
import { useAge16Transition } from '../../../../hooks/useAge16Transition'
import ReverseModeToggle from '../../../../components/reverse-mode/ReverseModeToggle'
import ReverseModeConfirmationModal from '../../../../components/reverse-mode/ReverseModeConfirmationModal'

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
    maxWidth: '600px',
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
    lineHeight: 1.6,
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '12px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    overflow: 'hidden',
  },
  settingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #f3f4f6',
  },
  settingRowLast: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
  },
  settingInfo: {
    flex: 1,
  },
  settingLabel: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#1f2937',
    marginBottom: '4px',
  },
  settingDescription: {
    fontSize: '13px',
    color: '#6b7280',
  },
  toggle: {
    position: 'relative' as const,
    width: '44px',
    height: '24px',
    backgroundColor: '#d1d5db',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    border: 'none',
  },
  toggleActive: {
    backgroundColor: '#3b82f6',
  },
  toggleDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  toggleKnob: {
    position: 'absolute' as const,
    top: '2px',
    left: '2px',
    width: '20px',
    height: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    transition: 'transform 0.2s',
  },
  toggleKnobActive: {
    transform: 'translateX(20px)',
  },
  infoBox: {
    display: 'flex',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#eff6ff',
    borderRadius: '12px',
    border: '1px solid #bfdbfe',
    marginBottom: '24px',
  },
  infoIcon: {
    fontSize: '20px',
    flexShrink: 0,
  },
  infoText: {
    fontSize: '14px',
    color: '#1e40af',
    lineHeight: 1.6,
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
  notEligibleBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '48px 24px',
    textAlign: 'center' as const,
  },
  notEligibleIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  notEligibleTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '8px',
  },
  notEligibleText: {
    fontSize: '14px',
    color: '#6b7280',
    maxWidth: '320px',
  },
}

function SharingToggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean
  onChange: (value: boolean) => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      style={{
        ...styles.toggle,
        ...(enabled ? styles.toggleActive : {}),
        ...(disabled ? styles.toggleDisabled : {}),
      }}
      onClick={() => !disabled && onChange(!enabled)}
      disabled={disabled}
      role="switch"
      aria-checked={enabled}
    >
      <div
        style={{
          ...styles.toggleKnob,
          ...(enabled ? styles.toggleKnobActive : {}),
        }}
      />
    </button>
  )
}

export default function ReverseModeSettingsPage() {
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()
  const [showConfirmation, setShowConfirmation] = useState(false)

  // Get child ID from auth context (assuming child is logged in)
  const childId = firebaseUser?.uid

  // Hooks
  const age16Transition = useAge16Transition(childId)
  const reverseMode = useReverseMode(childId)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login')
    }
  }, [authLoading, firebaseUser, router])

  // Handle toggle click
  const handleToggle = () => {
    if (reverseMode.isActive) {
      // Deactivate directly
      reverseMode.deactivate()
    } else {
      // Show confirmation modal for activation
      setShowConfirmation(true)
    }
  }

  // Handle confirmation
  const handleConfirm = async () => {
    try {
      await reverseMode.activate(true)
      setShowConfirmation(false)
    } catch (error) {
      console.error('Failed to activate reverse mode:', error)
    }
  }

  // Handle sharing preference change
  const handleSharingChange = async (key: string, value: boolean) => {
    try {
      await reverseMode.updateSharing({ [key]: value })
    } catch (error) {
      console.error('Failed to update sharing:', error)
    }
  }

  // Loading state
  if (authLoading || age16Transition.isLoading || reverseMode.isLoading) {
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

  // Check eligibility (AC1)
  if (!age16Transition.isEligible) {
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
            <span style={styles.title}>Reverse Mode</span>
          </div>
        </header>

        <div style={styles.content}>
          <div style={{ ...styles.card, ...styles.notEligibleBox }}>
            <div style={styles.notEligibleIcon}>🔒</div>
            <h2 style={styles.notEligibleTitle}>Not Yet Available</h2>
            <p style={styles.notEligibleText}>
              Reverse Mode is available once you turn 16. This feature lets you control what your
              parents can see.
            </p>
          </div>
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
          <span style={styles.title}>Reverse Mode</span>
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>Privacy Control</h1>
          <p style={styles.pageDescription}>
            Reverse Mode puts you in control of what your parents can see. When active, you choose
            which data to share with them.
          </p>
        </div>

        {!reverseMode.isActive && (
          <div style={styles.infoBox}>
            <span style={styles.infoIcon}>ℹ️</span>
            <span style={styles.infoText}>
              When you activate Reverse Mode, your parents will be notified. By default, nothing
              will be shared with them unless you choose to share it.
            </span>
          </div>
        )}

        <div style={styles.section}>
          <ReverseModeToggle
            status={reverseMode.status}
            isLoading={reverseMode.isMutating}
            onToggle={handleToggle}
          />
        </div>

        {reverseMode.isActive && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>What to Share</div>
            <div style={styles.card}>
              <div style={styles.settingRow}>
                <div style={styles.settingInfo}>
                  <div style={styles.settingLabel}>Screen Time</div>
                  <div style={styles.settingDescription}>
                    Share how long you use your device each day
                  </div>
                </div>
                <SharingToggle
                  enabled={reverseMode.sharingPreferences?.screenTime ?? false}
                  onChange={(value) => handleSharingChange('screenTime', value)}
                  disabled={reverseMode.isUpdatingSharing}
                />
              </div>

              <div style={styles.settingRow}>
                <div style={styles.settingInfo}>
                  <div style={styles.settingLabel}>Flags</div>
                  <div style={styles.settingDescription}>
                    Share flagged content alerts with parents
                  </div>
                </div>
                <SharingToggle
                  enabled={reverseMode.sharingPreferences?.flags ?? false}
                  onChange={(value) => handleSharingChange('flags', value)}
                  disabled={reverseMode.isUpdatingSharing}
                />
              </div>

              <div style={styles.settingRow}>
                <div style={styles.settingInfo}>
                  <div style={styles.settingLabel}>Screenshots</div>
                  <div style={styles.settingDescription}>
                    Share captured screenshots with parents
                  </div>
                </div>
                <SharingToggle
                  enabled={reverseMode.sharingPreferences?.screenshots ?? false}
                  onChange={(value) => handleSharingChange('screenshots', value)}
                  disabled={reverseMode.isUpdatingSharing}
                />
              </div>

              <div style={styles.settingRowLast}>
                <div style={styles.settingInfo}>
                  <div style={styles.settingLabel}>Location</div>
                  <div style={styles.settingDescription}>Share your location data with parents</div>
                </div>
                <SharingToggle
                  enabled={reverseMode.sharingPreferences?.location ?? false}
                  onChange={(value) => handleSharingChange('location', value)}
                  disabled={reverseMode.isUpdatingSharing}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <ReverseModeConfirmationModal
        isOpen={showConfirmation}
        isLoading={reverseMode.isActivating}
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirmation(false)}
      />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
