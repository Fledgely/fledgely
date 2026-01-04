'use client'

/**
 * Reverse Mode Settings Page - Story 52.2 & 52.3
 *
 * Settings page for managing reverse mode activation and sharing preferences.
 *
 * Story 52.2:
 * AC1: Visible only if child is 16+
 * AC2: Confirmation modal before activation
 * AC3: Toggle control for activation/deactivation
 * AC5: Can be deactivated anytime
 *
 * Story 52.3:
 * AC1: Daily screen time summary sharing
 * AC2: Category-based sharing
 * AC3: Time limit status sharing
 * AC4: Nothing shared option
 * AC5: Granular controls with preview
 * AC7: Settings persistence
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../contexts/AuthContext'
import { useReverseMode } from '../../../../hooks/useReverseMode'
import { useAge16Transition } from '../../../../hooks/useAge16Transition'
import ReverseModeToggle from '../../../../components/reverse-mode/ReverseModeToggle'
import ReverseModeConfirmationModal from '../../../../components/reverse-mode/ReverseModeConfirmationModal'
import { SharingPreferencesPanel, SharingPreviewCard } from '../../../../components/reverse-mode'
import { generateSharingPreview, type ReverseModeShareingPreferences } from '@fledgely/shared'

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
  // settingRow styles removed - using SharingPreferencesPanel for Story 52.3
  // Toggle styles removed - using SharingPreferencesPanel for Story 52.3
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

// SharingToggle component removed - using SharingPreferencesPanel instead for Story 52.3

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

  // Handle sharing preferences save (Story 52.3)
  const handleSharingPreferencesSave = async (prefs: ReverseModeShareingPreferences) => {
    try {
      await reverseMode.updateSharing(prefs)
    } catch (error) {
      console.error('Failed to update sharing:', error)
    }
  }

  // Generate preview for current preferences
  const sharingPreview = reverseMode.isActive
    ? generateSharingPreview(reverseMode.sharingPreferences)
    : null

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
          <>
            {/* Enhanced Sharing Preferences Panel - Story 52.3 */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>What to Share</div>
              <SharingPreferencesPanel
                currentPreferences={reverseMode.sharingPreferences}
                onSave={handleSharingPreferencesSave}
                isLoading={reverseMode.isUpdatingSharing}
              />
            </div>

            {/* Sharing Preview Card - Story 52.3 AC5 */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>Preview</div>
              <SharingPreviewCard
                preview={sharingPreview}
                reverseModeActive={reverseMode.isActive}
              />
            </div>
          </>
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
