'use client'

/**
 * AsymmetryAlertBanner Component
 *
 * Story 27.4: Asymmetric Viewing Pattern Detection - AC3, AC4
 *
 * Displays a non-accusatory informational banner when asymmetric
 * viewing patterns are detected between guardians. Links to the
 * audit log for full transparency.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { getAuth } from 'firebase/auth'
import type { PatternAlert } from '@fledgely/shared'

interface AsymmetryAlertBannerProps {
  familyId: string
  onDismiss?: (alertId: string) => void
}

/**
 * Colors for informational alert (using blue/info scheme - non-accusatory)
 */
const alertColors = {
  bg: '#eff6ff',
  border: '#60a5fa',
  text: '#1e40af',
  icon: '#3b82f6',
}

/**
 * API base URL for functions
 */
const FUNCTIONS_URL = process.env.NEXT_PUBLIC_FUNCTIONS_URL || ''

/**
 * Fetch pending alerts for the current user
 */
async function fetchPendingAlerts(token: string): Promise<PatternAlert[]> {
  const response = await fetch(`${FUNCTIONS_URL}/getPatternAlerts`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    return []
  }

  const data = await response.json()
  return data.alerts || []
}

/**
 * Mark an alert as read
 */
async function markAlertRead(token: string, alertId: string): Promise<void> {
  await fetch(`${FUNCTIONS_URL}/dismissPatternAlert`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ alertId }),
  })
}

/**
 * Single alert card - non-accusatory information sharing
 */
function AlertCard({ alert, onDismiss }: { alert: PatternAlert; onDismiss: () => void }) {
  return (
    <div
      style={{
        backgroundColor: alertColors.bg,
        border: `1px solid ${alertColors.border}`,
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '12px',
      }}
      role="status"
      aria-live="polite"
      data-testid="asymmetry-alert-banner"
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        {/* Info icon */}
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: alertColors.icon,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" />
            <path d="M12 16V12M12 8H12.01" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 500,
              color: alertColors.text,
              marginBottom: '8px',
              lineHeight: 1.4,
            }}
          >
            {alert.message}
          </div>

          <div
            style={{
              fontSize: '13px',
              color: alertColors.text,
              opacity: 0.8,
              marginBottom: '12px',
              lineHeight: 1.4,
            }}
          >
            This is just a heads-up to keep you in the loop. No action required.
          </div>

          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <a
              href="/dashboard/audit"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                fontWeight: 500,
                color: alertColors.icon,
                textDecoration: 'none',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              View Activity Log
            </a>

            <button
              type="button"
              onClick={onDismiss}
              style={{
                fontSize: '13px',
                color: alertColors.text,
                opacity: 0.7,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * Main AsymmetryAlertBanner component
 * Shows non-accusatory alerts about viewing pattern asymmetry
 */
export function AsymmetryAlertBanner({ familyId, onDismiss }: AsymmetryAlertBannerProps) {
  const { firebaseUser } = useAuth()
  const [alerts, setAlerts] = useState<PatternAlert[]>([])
  const [loading, setLoading] = useState(true)

  // Load alerts on mount
  useEffect(() => {
    async function loadAlerts() {
      if (!firebaseUser) {
        setLoading(false)
        return
      }

      try {
        const auth = getAuth()
        const token = await auth.currentUser?.getIdToken()

        if (token) {
          const fetchedAlerts = await fetchPendingAlerts(token)
          // Filter to alerts for this family
          const familyAlerts = fetchedAlerts.filter((a) => a.familyId === familyId)
          setAlerts(familyAlerts)
        }
      } catch {
        // Silently fail - alerts are not critical
      } finally {
        setLoading(false)
      }
    }

    loadAlerts()
  }, [firebaseUser, familyId])

  // Handle dismiss
  const handleDismiss = useCallback(
    async (alertId: string) => {
      try {
        const auth = getAuth()
        const token = await auth.currentUser?.getIdToken()

        if (token) {
          await markAlertRead(token, alertId)
        }

        // Remove from local state
        setAlerts((prev) => prev.filter((a) => a.id !== alertId))

        // Call parent callback if provided
        onDismiss?.(alertId)
      } catch {
        // Silently fail
      }
    },
    [onDismiss]
  )

  // Don't render anything if no alerts or loading
  if (loading || alerts.length === 0) {
    return null
  }

  return (
    <div data-testid="asymmetry-alerts">
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} onDismiss={() => handleDismiss(alert.id)} />
      ))}
    </div>
  )
}
