'use client'

/**
 * Child Settings Page - Story 52.2 Task 7
 *
 * Settings index for child users. Shows available settings options.
 * Reverse Mode section is conditionally shown for 16+ children (AC1).
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useChildAuth } from '../../../contexts/ChildAuthContext'
import { useAge16Transition } from '../../../hooks/useAge16Transition'
import { useReverseMode } from '../../../hooks/useReverseMode'

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f0f9ff',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#ffffff',
    borderBottom: '2px solid #bae6fd',
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
    color: '#0369a1',
    marginRight: '16px',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#0c4a6e',
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
    color: '#0c4a6e',
    marginBottom: '8px',
  },
  pageDescription: {
    fontSize: '14px',
    color: '#0369a1',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#0369a1',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '12px',
  },
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #bae6fd',
    overflow: 'hidden',
    marginBottom: '24px',
  },
  settingItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #e0f2fe',
    cursor: 'pointer',
    backgroundColor: '#ffffff',
    textDecoration: 'none',
    transition: 'background-color 0.15s ease',
  },
  settingItemLast: {
    borderBottom: 'none',
  },
  settingInfo: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  settingIcon: {
    fontSize: '24px',
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: '15px',
    fontWeight: 500,
    color: '#0c4a6e',
    marginBottom: '4px',
  },
  settingDescription: {
    fontSize: '13px',
    color: '#0369a1',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 500,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  statusOff: {
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
  },
  chevron: {
    color: '#7dd3fc',
    fontSize: '20px',
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
    border: '3px solid #e0f2fe',
    borderTopColor: '#0ea5e9',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
}

export default function ChildSettingsPage() {
  const router = useRouter()
  const { user: childUser, loading: authLoading } = useChildAuth()
  const childId = childUser?.uid

  const age16Transition = useAge16Transition(childId)
  const reverseMode = useReverseMode(childId)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !childUser) {
      router.push('/child/login')
    }
  }, [authLoading, childUser, router])

  if (authLoading || age16Transition.isLoading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  if (!childUser) {
    return null
  }

  const is16Plus = age16Transition.isEligible

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button
          style={styles.backButton}
          onClick={() => router.push('/child/dashboard')}
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
        <span style={styles.title}>Settings</span>
      </header>

      <div style={styles.content}>
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>My Settings</h1>
          <p style={styles.pageDescription}>Manage your preferences and privacy</p>
        </div>

        {/* Privacy Section - Only shown for 16+ (AC1) */}
        {is16Plus && (
          <>
            <div style={styles.sectionTitle}>Privacy</div>
            <div style={styles.settingsCard}>
              <button
                style={{
                  ...styles.settingItem,
                  ...styles.settingItemLast,
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                }}
                onClick={() => router.push('/dashboard/settings/reverse-mode')}
              >
                <div style={styles.settingInfo}>
                  <span style={styles.settingIcon}>🔒</span>
                  <div style={styles.settingContent}>
                    <div style={styles.settingLabel}>Reverse Mode</div>
                    <div style={styles.settingDescription}>Control what your parents can see</div>
                  </div>
                </div>
                <div
                  style={{
                    ...styles.statusBadge,
                    ...(reverseMode.isActive ? styles.statusActive : styles.statusOff),
                  }}
                >
                  {reverseMode.isActive ? 'Active' : 'Off'}
                </div>
                <span style={styles.chevron}>›</span>
              </button>
            </div>
          </>
        )}

        {/* Account Section */}
        <div style={styles.sectionTitle}>Account</div>
        <div style={styles.settingsCard}>
          <button
            style={{
              ...styles.settingItem,
              ...styles.settingItemLast,
              border: 'none',
              width: '100%',
              textAlign: 'left',
            }}
            onClick={() => router.push('/child/profile')}
          >
            <div style={styles.settingInfo}>
              <span style={styles.settingIcon}>👤</span>
              <div style={styles.settingContent}>
                <div style={styles.settingLabel}>My Profile</div>
                <div style={styles.settingDescription}>View and update your profile</div>
              </div>
            </div>
            <span style={styles.chevron}>›</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
