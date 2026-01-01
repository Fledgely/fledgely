/**
 * OfflineExceptionQuickActions Component - Story 32.5
 *
 * Quick-access widget for parent dashboard to manage offline time exceptions.
 * Shows current status and provides pause/resume/skip buttons.
 *
 * - AC1: Quick pause/resume from dashboard
 * - AC5: Quick skip tonight from dashboard
 * - AC6: Status visibility for transparency
 */

'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useOfflineExceptions, useIsOfflineTimePaused } from '../../hooks/useOfflineExceptions'
import { useFamilyOfflineSchedule } from '../../hooks/useFamilyOfflineSchedule'

const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '16px 20px',
    marginBottom: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1f2937',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
  },
  statusActive: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
  },
  statusPaused: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  statusSkipped: {
    backgroundColor: '#ede9fe',
    color: '#5b21b6',
  },
  buttonRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    minHeight: '40px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: 500,
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
  },
  pauseButton: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
    border: '1px solid #fcd34d',
  },
  resumeButton: {
    backgroundColor: '#d1fae5',
    color: '#065f46',
    border: '1px solid #6ee7b7',
  },
  skipButton: {
    backgroundColor: '#ede9fe',
    color: '#5b21b6',
    border: '1px solid #c4b5fd',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  settingsLink: {
    fontSize: '12px',
    color: '#6b7280',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  infoText: {
    fontSize: '13px',
    color: '#6b7280',
    lineHeight: 1.5,
  },
}

interface OfflineExceptionQuickActionsProps {
  familyId: string | null
}

export function OfflineExceptionQuickActions({ familyId }: OfflineExceptionQuickActionsProps) {
  const { firebaseUser, userProfile } = useAuth()

  const { schedule, loading: scheduleLoading } = useFamilyOfflineSchedule({
    familyId: familyId ?? undefined,
    enabled: !!familyId,
  })

  const { activeException, pauseOfflineTime, resumeOfflineTime, skipTonight, getDisplayMessage } =
    useOfflineExceptions({
      familyId,
      enabled: !!familyId,
      limit: 1,
    })

  const { isPaused, isSkipped } = useIsOfflineTimePaused(familyId)

  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  const parentName = userProfile?.displayName || firebaseUser?.displayName || 'Parent'
  const parentUid = firebaseUser?.uid

  const handlePause = useCallback(async () => {
    if (!parentUid) return

    setActionInProgress('pause')
    try {
      await pauseOfflineTime(parentUid, parentName)
    } catch (err) {
      console.error('[OfflineExceptionQuickActions] Pause error:', err)
    } finally {
      setActionInProgress(null)
    }
  }, [parentUid, parentName, pauseOfflineTime])

  const handleResume = useCallback(async () => {
    if (!activeException) return

    setActionInProgress('resume')
    try {
      await resumeOfflineTime(activeException.id)
    } catch (err) {
      console.error('[OfflineExceptionQuickActions] Resume error:', err)
    } finally {
      setActionInProgress(null)
    }
  }, [activeException, resumeOfflineTime])

  const handleSkipTonight = useCallback(async () => {
    if (!parentUid) return

    setActionInProgress('skip')
    try {
      await skipTonight(parentUid, parentName)
    } catch (err) {
      console.error('[OfflineExceptionQuickActions] Skip error:', err)
    } finally {
      setActionInProgress(null)
    }
  }, [parentUid, parentName, skipTonight])

  // Don't render if no family or schedule not enabled
  if (!familyId || scheduleLoading) {
    return null
  }

  if (!schedule?.enabled) {
    return null
  }

  const getStatusBadge = () => {
    if (isPaused) {
      return (
        <span style={{ ...styles.statusBadge, ...styles.statusPaused }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
          Paused
        </span>
      )
    }
    if (isSkipped) {
      return (
        <span style={{ ...styles.statusBadge, ...styles.statusSkipped }}>
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17 4l4 4-4 4" />
          </svg>
          Skipped Tonight
        </span>
      )
    }
    return (
      <span style={{ ...styles.statusBadge, ...styles.statusActive }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="5" />
        </svg>
        Active
      </span>
    )
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.title}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#374151"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          Offline Time
        </div>
        {getStatusBadge()}
      </div>

      {/* Show current exception status message */}
      {activeException && (
        <p style={{ ...styles.infoText, marginBottom: '12px' }}>
          {getDisplayMessage(activeException)}
        </p>
      )}

      <div style={styles.buttonRow}>
        {/* Pause/Resume Button */}
        {isPaused ? (
          <button
            style={{
              ...styles.button,
              ...styles.resumeButton,
              ...(actionInProgress ? styles.buttonDisabled : {}),
            }}
            onClick={handleResume}
            disabled={!!actionInProgress}
            aria-busy={actionInProgress === 'resume'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {actionInProgress === 'resume' ? 'Resuming...' : 'Resume'}
          </button>
        ) : (
          <button
            style={{
              ...styles.button,
              ...styles.pauseButton,
              ...(actionInProgress ? styles.buttonDisabled : {}),
            }}
            onClick={handlePause}
            disabled={!!actionInProgress}
            aria-busy={actionInProgress === 'pause'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
            {actionInProgress === 'pause' ? 'Pausing...' : 'Pause'}
          </button>
        )}

        {/* Skip Tonight Button */}
        {!isSkipped && !isPaused && (
          <button
            style={{
              ...styles.button,
              ...styles.skipButton,
              ...(actionInProgress ? styles.buttonDisabled : {}),
            }}
            onClick={handleSkipTonight}
            disabled={!!actionInProgress}
            aria-busy={actionInProgress === 'skip'}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17 4l4 4-4 4" />
              <path d="M3 12h18" />
            </svg>
            {actionInProgress === 'skip' ? 'Skipping...' : 'Skip Tonight'}
          </button>
        )}

        {/* Settings Link */}
        <a href="/dashboard/settings/time-limits" style={styles.settingsLink}>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
        </a>
      </div>
    </div>
  )
}

export default OfflineExceptionQuickActions
