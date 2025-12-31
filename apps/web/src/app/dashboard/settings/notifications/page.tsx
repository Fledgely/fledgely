'use client'

/**
 * Notification Settings Page
 *
 * Story 27.6: Real-Time Access Notifications - AC1, AC3, AC4, AC5, AC6
 *
 * Allows users to configure their access notification preferences:
 * - Real-time notifications (off by default)
 * - Daily digest option
 * - Quiet hours
 * - Child-specific notifications
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../contexts/AuthContext'
import { getAuth } from 'firebase/auth'
import type { NotificationPreferences } from '@fledgely/shared'

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
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '20px',
    marginBottom: '16px',
  },
  settingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  settingRowLast: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
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
    width: '48px',
    height: '26px',
    backgroundColor: '#d1d5db',
    borderRadius: '13px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  toggleActive: {
    backgroundColor: '#3b82f6',
  },
  toggleKnob: {
    position: 'absolute' as const,
    top: '3px',
    left: '3px',
    width: '20px',
    height: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '50%',
    transition: 'transform 0.2s',
  },
  toggleKnobActive: {
    transform: 'translateX(22px)',
  },
  timeInputGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  timeInput: {
    width: '100px',
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
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
  saveButton: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '8px',
  },
  saveButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
}

const FUNCTIONS_URL = process.env.NEXT_PUBLIC_FUNCTIONS_URL || ''

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      style={{
        ...styles.toggle,
        ...(enabled ? styles.toggleActive : {}),
      }}
      onClick={() => onChange(!enabled)}
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

export default function NotificationSettingsPage() {
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    accessNotificationsEnabled: false,
    accessDigestEnabled: false,
    quietHoursStart: null,
    quietHoursEnd: null,
    notifyOnChildDataAccess: false,
    notifyOnOwnDataAccess: false,
  })

  // Load preferences
  const loadPreferences = useCallback(async () => {
    if (!firebaseUser) return

    try {
      const auth = getAuth()
      const token = await auth.currentUser?.getIdToken()

      if (!token) return

      const response = await fetch(`${FUNCTIONS_URL}/getNotificationPreferencesEndpoint`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences)
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
    } finally {
      setIsLoading(false)
    }
  }, [firebaseUser])

  useEffect(() => {
    if (firebaseUser) {
      loadPreferences()
    } else if (!authLoading) {
      setIsLoading(false)
    }
  }, [firebaseUser, authLoading, loadPreferences])

  // Save preferences
  const savePreferences = async () => {
    if (!firebaseUser) return

    setIsSaving(true)
    try {
      const auth = getAuth()
      const token = await auth.currentUser?.getIdToken()

      if (!token) return

      const response = await fetch(`${FUNCTIONS_URL}/updateNotificationPreferencesEndpoint`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ preferences }),
      })

      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences)
      }
    } catch (error) {
      console.error('Failed to save preferences:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push('/login')
    }
  }, [authLoading, firebaseUser, router])

  if (authLoading || isLoading) {
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
          <span style={styles.title}>Notification Settings</span>
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>Access Notifications</h1>
          <p style={styles.pageDescription}>
            Choose how you want to be notified when family data is accessed.
          </p>
        </div>

        <div style={styles.card}>
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Real-time notifications</div>
              <div style={styles.settingDescription}>
                Get notified immediately when someone accesses data
              </div>
            </div>
            <Toggle
              enabled={preferences.accessNotificationsEnabled}
              onChange={(value) =>
                setPreferences({ ...preferences, accessNotificationsEnabled: value })
              }
            />
          </div>

          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Daily digest</div>
              <div style={styles.settingDescription}>Get a daily summary of who accessed what</div>
            </div>
            <Toggle
              enabled={preferences.accessDigestEnabled}
              onChange={(value) => setPreferences({ ...preferences, accessDigestEnabled: value })}
            />
          </div>

          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Notify on child data access</div>
              <div style={styles.settingDescription}>
                Get notified when other guardians view your children&apos;s data
              </div>
            </div>
            <Toggle
              enabled={preferences.notifyOnChildDataAccess}
              onChange={(value) =>
                setPreferences({ ...preferences, notifyOnChildDataAccess: value })
              }
            />
          </div>

          <div style={styles.settingRowLast}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Quiet hours</div>
              <div style={styles.settingDescription}>Hold notifications during these hours</div>
            </div>
            <div style={styles.timeInputGroup}>
              <input
                type="time"
                style={styles.timeInput}
                value={preferences.quietHoursStart || ''}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    quietHoursStart: e.target.value || null,
                  })
                }
                placeholder="Start"
              />
              <span>to</span>
              <input
                type="time"
                style={styles.timeInput}
                value={preferences.quietHoursEnd || ''}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    quietHoursEnd: e.target.value || null,
                  })
                }
                placeholder="End"
              />
            </div>
          </div>
        </div>

        <button
          style={{
            ...styles.saveButton,
            ...(isSaving ? styles.saveButtonDisabled : {}),
          }}
          onClick={savePreferences}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </main>
  )
}
