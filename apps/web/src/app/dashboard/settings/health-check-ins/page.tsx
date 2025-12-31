'use client'

/**
 * Health Check-In Settings Page
 *
 * Story 27.5.1: Monthly Health Check-In Prompts - AC5
 *
 * Allows guardians to configure family health check-in preferences:
 * - Enable/disable check-ins
 * - Set frequency (weekly, monthly, quarterly)
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../../contexts/AuthContext'
import { getAuth } from 'firebase/auth'
import type { CheckInSettings, CheckInFrequency } from '@fledgely/shared'

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
    lineHeight: 1.5,
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
    border: 'none',
  },
  toggleActive: {
    backgroundColor: '#10b981',
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
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    color: '#1f2937',
    cursor: 'pointer',
    minWidth: '140px',
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
    borderTopColor: '#10b981',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  saveButton: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '8px',
  },
  saveButtonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  infoBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
  },
  infoText: {
    fontSize: '14px',
    color: '#166534',
    lineHeight: 1.5,
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

export default function HealthCheckInSettingsPage() {
  const router = useRouter()
  const { firebaseUser, loading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<CheckInSettings>({
    enabled: true,
    frequency: 'monthly',
    lastCheckInPeriodStart: null,
    nextCheckInDue: null,
    updatedAt: Date.now(),
  })

  // Load settings
  const loadSettings = useCallback(async () => {
    if (!firebaseUser) return

    try {
      const auth = getAuth()
      const token = await auth.currentUser?.getIdToken()

      if (!token) return

      const response = await fetch(`${FUNCTIONS_URL}/getCheckInSettingsEndpoint`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }, [firebaseUser])

  useEffect(() => {
    if (firebaseUser) {
      loadSettings()
    } else if (!authLoading) {
      setIsLoading(false)
    }
  }, [firebaseUser, authLoading, loadSettings])

  // Save settings
  const saveSettings = async () => {
    if (!firebaseUser) return

    setIsSaving(true)
    try {
      const auth = getAuth()
      const token = await auth.currentUser?.getIdToken()

      if (!token) return

      const response = await fetch(`${FUNCTIONS_URL}/updateCheckInSettingsEndpoint`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enabled: settings.enabled,
          frequency: settings.frequency,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
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
          <span style={styles.title}>Health Check-Ins</span>
        </div>
      </header>

      <div style={styles.content}>
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>Family Health Check-Ins</h1>
          <p style={styles.pageDescription}>
            Periodic check-ins help your family reflect on how monitoring is going. Responses are
            private and help build trust.
          </p>
        </div>

        <div style={styles.infoBox}>
          <p style={styles.infoText}>
            Health check-ins prompt both parents and children to share how they feel about the
            monitoring arrangement. Responses are private - you won&apos;t see each other&apos;s
            answers, but you&apos;ll both see aggregated indicators.
          </p>
        </div>

        <div style={styles.card}>
          <div style={styles.settingRow}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Enable check-ins</div>
              <div style={styles.settingDescription}>
                Receive periodic prompts to reflect on monitoring
              </div>
            </div>
            <Toggle
              enabled={settings.enabled}
              onChange={(value) => setSettings({ ...settings, enabled: value })}
            />
          </div>

          <div style={styles.settingRowLast}>
            <div style={styles.settingInfo}>
              <div style={styles.settingLabel}>Check-in frequency</div>
              <div style={styles.settingDescription}>How often you&apos;ll receive check-ins</div>
            </div>
            <select
              style={styles.select}
              value={settings.frequency}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  frequency: e.target.value as CheckInFrequency,
                })
              }
              disabled={!settings.enabled}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
        </div>

        <button
          style={{
            ...styles.saveButton,
            ...(isSaving ? styles.saveButtonDisabled : {}),
          }}
          onClick={saveSettings}
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
