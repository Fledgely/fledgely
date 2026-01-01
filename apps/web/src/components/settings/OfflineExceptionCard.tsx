/**
 * OfflineExceptionCard Component - Story 32.5
 *
 * Allows parents to manage offline time exceptions:
 * - AC1: Pause/Resume offline time
 * - AC3: Work exception configuration
 * - AC5: Skip tonight functionality
 * - AC6: Show current exception status
 */

'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useFamily } from '../../contexts/FamilyContext'
import { useOfflineExceptions, useIsOfflineTimePaused } from '../../hooks/useOfflineExceptions'
import type { OfflineException } from '@fledgely/shared'

const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    padding: '20px',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '8px',
  },
  cardDescription: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.5,
    marginBottom: '16px',
  },
  statusBanner: {
    padding: '12px 16px',
    borderRadius: '8px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusBannerActive: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
  },
  statusBannerInfo: {
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
  },
  statusIcon: {
    flexShrink: 0,
  },
  statusText: {
    flex: 1,
    fontSize: '14px',
    fontWeight: 500,
  },
  statusTextActive: {
    color: '#92400e',
  },
  statusTextInfo: {
    color: '#1e40af',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  button: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minHeight: '44px',
    padding: '10px 20px',
    fontSize: '14px',
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
  cancelButton: {
    backgroundColor: '#ffffff',
    color: '#6b7280',
    border: '1px solid #d1d5db',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  reasonInput: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    marginTop: '8px',
    marginBottom: '12px',
  },
  historySection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb',
  },
  historyTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '12px',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '10px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  historyItemLast: {
    borderBottom: 'none',
  },
  historyDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginTop: '6px',
    flexShrink: 0,
  },
  historyDotActive: {
    backgroundColor: '#f59e0b',
  },
  historyDotCompleted: {
    backgroundColor: '#10b981',
  },
  historyDotCancelled: {
    backgroundColor: '#9ca3af',
  },
  historyContent: {
    flex: 1,
  },
  historyMessage: {
    fontSize: '14px',
    color: '#1f2937',
    marginBottom: '2px',
  },
  historyTime: {
    fontSize: '12px',
    color: '#6b7280',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '24px',
    color: '#6b7280',
    fontSize: '14px',
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    color: '#991b1b',
    fontSize: '14px',
  },
}

interface OfflineExceptionCardProps {
  /** Whether offline schedule is enabled */
  offlineScheduleEnabled?: boolean
}

export function OfflineExceptionCard({
  offlineScheduleEnabled = false,
}: OfflineExceptionCardProps) {
  const { firebaseUser, userProfile } = useAuth()
  const { family } = useFamily()
  const familyId = family?.id ?? null

  const {
    exceptions,
    activeException,
    loading,
    error,
    pauseOfflineTime,
    resumeOfflineTime,
    skipTonight,
    cancelException,
    getDisplayMessage,
  } = useOfflineExceptions({
    familyId,
    enabled: !!familyId,
    limit: 10,
  })

  const { isPaused, isSkipped } = useIsOfflineTimePaused(familyId)

  const [showReasonInput, setShowReasonInput] = useState(false)
  const [reason, setReason] = useState('')
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const parentName = userProfile?.displayName || firebaseUser?.displayName || 'Parent'
  const parentUid = firebaseUser?.uid

  const handlePause = useCallback(async () => {
    if (!parentUid) return

    setActionInProgress('pause')
    setLocalError(null)

    try {
      await pauseOfflineTime(parentUid, parentName, reason || undefined)
      setReason('')
      setShowReasonInput(false)
    } catch (err) {
      setLocalError('Failed to pause offline time. Please try again.')
      console.error('[OfflineExceptionCard] Pause error:', err)
    } finally {
      setActionInProgress(null)
    }
  }, [parentUid, parentName, reason, pauseOfflineTime])

  const handleResume = useCallback(async () => {
    if (!activeException) return

    setActionInProgress('resume')
    setLocalError(null)

    try {
      await resumeOfflineTime(activeException.id)
    } catch (err) {
      setLocalError('Failed to resume offline time. Please try again.')
      console.error('[OfflineExceptionCard] Resume error:', err)
    } finally {
      setActionInProgress(null)
    }
  }, [activeException, resumeOfflineTime])

  const handleSkipTonight = useCallback(async () => {
    if (!parentUid) return

    setActionInProgress('skip')
    setLocalError(null)

    try {
      await skipTonight(parentUid, parentName, reason || undefined)
      setReason('')
      setShowReasonInput(false)
    } catch (err) {
      setLocalError('Failed to skip tonight. Please try again.')
      console.error('[OfflineExceptionCard] Skip error:', err)
    } finally {
      setActionInProgress(null)
    }
  }, [parentUid, parentName, reason, skipTonight])

  const handleCancel = useCallback(async () => {
    if (!activeException) return

    setActionInProgress('cancel')
    setLocalError(null)

    try {
      await cancelException(activeException.id)
    } catch (err) {
      setLocalError('Failed to cancel exception. Please try again.')
      console.error('[OfflineExceptionCard] Cancel error:', err)
    } finally {
      setActionInProgress(null)
    }
  }, [activeException, cancelException])

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getStatusDotStyle = (exception: OfflineException) => {
    switch (exception.status) {
      case 'active':
        return styles.historyDotActive
      case 'completed':
        return styles.historyDotCompleted
      case 'cancelled':
        return styles.historyDotCancelled
      default:
        return styles.historyDotCompleted
    }
  }

  if (!familyId) {
    return null
  }

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.cardTitle}>Offline Time Exceptions</div>
        <div style={styles.emptyState}>Loading...</div>
      </div>
    )
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardTitle}>Offline Time Exceptions</div>
      <div style={styles.cardDescription}>
        Need to pause or skip offline time? Use these controls for emergencies or special occasions.
        All exceptions are logged for family transparency.
      </div>

      {(error || localError) && <div style={styles.errorMessage}>{localError || error}</div>}

      {/* Current Active Exception Status */}
      {activeException && (
        <div
          style={{
            ...styles.statusBanner,
            ...styles.statusBannerActive,
          }}
        >
          <svg
            style={styles.statusIcon}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#92400e"
            strokeWidth="2"
          >
            {activeException.type === 'pause' ? (
              <path d="M10 9v6M14 9v6M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
            ) : (
              <path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            )}
          </svg>
          <span style={{ ...styles.statusText, ...styles.statusTextActive }}>
            {getDisplayMessage(activeException)}
          </span>
        </div>
      )}

      {/* No active exception and schedule is enabled */}
      {!activeException && offlineScheduleEnabled && (
        <div
          style={{
            ...styles.statusBanner,
            ...styles.statusBannerInfo,
          }}
        >
          <svg
            style={styles.statusIcon}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1e40af"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span style={{ ...styles.statusText, ...styles.statusTextInfo }}>
            Offline schedule is active. No exceptions currently in effect.
          </span>
        </div>
      )}

      {/* Optional reason input */}
      {showReasonInput && (
        <input
          type="text"
          style={styles.reasonInput}
          placeholder="Reason (optional) - e.g., Movie night, Emergency"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={100}
          aria-label="Exception reason"
        />
      )}

      {/* Action Buttons */}
      <div style={styles.buttonRow}>
        {/* Pause/Resume Button - AC1 */}
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            {actionInProgress === 'resume' ? 'Resuming...' : 'Resume Offline Time'}
          </button>
        ) : (
          <button
            style={{
              ...styles.button,
              ...styles.pauseButton,
              ...(actionInProgress || !offlineScheduleEnabled ? styles.buttonDisabled : {}),
            }}
            onClick={() => {
              if (showReasonInput) {
                handlePause()
              } else {
                setShowReasonInput(true)
              }
            }}
            disabled={!!actionInProgress || !offlineScheduleEnabled}
            aria-busy={actionInProgress === 'pause'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
            {actionInProgress === 'pause'
              ? 'Pausing...'
              : showReasonInput
                ? 'Confirm Pause'
                : 'Pause Offline Time'}
          </button>
        )}

        {/* Skip Tonight Button - AC5 */}
        {!isSkipped && !isPaused && (
          <button
            style={{
              ...styles.button,
              ...styles.skipButton,
              ...(actionInProgress || !offlineScheduleEnabled ? styles.buttonDisabled : {}),
            }}
            onClick={() => {
              if (showReasonInput) {
                handleSkipTonight()
              } else {
                setShowReasonInput(true)
              }
            }}
            disabled={!!actionInProgress || !offlineScheduleEnabled}
            aria-busy={actionInProgress === 'skip'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17 4l4 4-4 4" />
              <path d="M3 12h18" />
              <path d="M7 20l-4-4 4-4" />
            </svg>
            {actionInProgress === 'skip'
              ? 'Skipping...'
              : showReasonInput
                ? 'Confirm Skip Tonight'
                : 'Skip Tonight'}
          </button>
        )}

        {/* Cancel Active Exception */}
        {activeException && (
          <button
            style={{
              ...styles.button,
              ...styles.cancelButton,
              ...(actionInProgress ? styles.buttonDisabled : {}),
            }}
            onClick={handleCancel}
            disabled={!!actionInProgress}
            aria-busy={actionInProgress === 'cancel'}
          >
            {actionInProgress === 'cancel' ? 'Cancelling...' : 'Cancel Exception'}
          </button>
        )}

        {/* Cancel reason input */}
        {showReasonInput && !isPaused && !isSkipped && (
          <button
            style={{
              ...styles.button,
              ...styles.cancelButton,
            }}
            onClick={() => {
              setShowReasonInput(false)
              setReason('')
            }}
          >
            Cancel
          </button>
        )}
      </div>

      {/* Recent Exceptions History - AC6 */}
      {exceptions.length > 0 && (
        <div style={styles.historySection}>
          <div style={styles.historyTitle}>Recent Exceptions</div>
          {exceptions.slice(0, 5).map((exception, index) => (
            <div
              key={exception.id}
              style={{
                ...styles.historyItem,
                ...(index === Math.min(exceptions.length - 1, 4) ? styles.historyItemLast : {}),
              }}
            >
              <div style={{ ...styles.historyDot, ...getStatusDotStyle(exception) }} />
              <div style={styles.historyContent}>
                <div style={styles.historyMessage}>
                  {getDisplayMessage(exception)}
                  {exception.reason && (
                    <span style={{ color: '#6b7280' }}> — {exception.reason}</span>
                  )}
                </div>
                <div style={styles.historyTime}>
                  {formatTimestamp(exception.createdAt)}
                  {exception.status === 'active' && ' • Active now'}
                  {exception.status === 'cancelled' && ' • Cancelled'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state when no exceptions and schedule disabled */}
      {!offlineScheduleEnabled && exceptions.length === 0 && (
        <div style={styles.emptyState}>
          Enable an offline schedule above to use exception controls.
        </div>
      )}
    </div>
  )
}

export default OfflineExceptionCard
