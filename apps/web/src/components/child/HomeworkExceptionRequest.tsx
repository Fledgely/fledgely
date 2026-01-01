/**
 * HomeworkExceptionRequest Component - Story 32.5 AC4
 *
 * Allows children to request homework exception during offline time.
 * Child-friendly UI with simple language.
 *
 * - Request homework time with duration selection
 * - Show pending request status
 * - Show active exception with time remaining
 */

'use client'

import { useState, useCallback } from 'react'
import { useHomeworkException } from '../../hooks/useHomeworkException'
import { OFFLINE_EXCEPTION_MESSAGES } from '@fledgely/shared'

const styles = {
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '1px solid #e5e7eb',
    padding: '20px',
    marginBottom: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  icon: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  iconRequest: {
    backgroundColor: '#eff6ff',
  },
  iconPending: {
    backgroundColor: '#fef3c7',
  },
  iconActive: {
    backgroundColor: '#d1fae5',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.5,
  },
  statusBox: {
    padding: '16px',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  statusPending: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
  },
  statusActive: {
    backgroundColor: '#d1fae5',
    border: '1px solid #6ee7b7',
  },
  statusDenied: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
  },
  statusText: {
    fontSize: '15px',
    fontWeight: 500,
    marginBottom: '4px',
  },
  statusDetail: {
    fontSize: '14px',
    color: '#6b7280',
  },
  timeRemaining: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '8px',
  },
  timeValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#059669',
  },
  timeLabel: {
    fontSize: '14px',
    color: '#6b7280',
  },
  durationSelector: {
    marginBottom: '16px',
  },
  durationLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '8px',
  },
  durationOptions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  durationOption: {
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    backgroundColor: '#ffffff',
    color: '#374151',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  durationOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
  },
  button: {
    width: '100%',
    padding: '14px',
    fontSize: '16px',
    fontWeight: 600,
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  requestButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    color: '#6b7280',
    border: '1px solid #d1d5db',
    marginTop: '8px',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
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

const DURATION_OPTIONS = [
  { minutes: 30, label: '30 min' },
  { minutes: 60, label: '1 hour' },
  { minutes: 90, label: '1.5 hours' },
  { minutes: 120, label: '2 hours' },
]

interface HomeworkExceptionRequestProps {
  /** Family ID */
  familyId: string | null
  /** Child ID */
  childId: string | null
  /** Child's name */
  childName: string
  /** Whether offline time is currently active */
  isOfflineTimeActive?: boolean
}

export function HomeworkExceptionRequest({
  familyId,
  childId,
  childName,
  isOfflineTimeActive = false,
}: HomeworkExceptionRequestProps) {
  const {
    pendingRequest,
    activeException,
    loading,
    error,
    requestHomeworkTime,
    cancelRequest,
    timeRemainingMinutes,
    canRequest,
  } = useHomeworkException({
    familyId,
    childId,
    enabled: !!familyId && !!childId,
  })

  const [selectedDuration, setSelectedDuration] = useState(60)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleRequest = useCallback(async () => {
    setIsSubmitting(true)
    setLocalError(null)

    try {
      await requestHomeworkTime(childName, selectedDuration)
    } catch (err) {
      setLocalError('Could not send request. Please try again.')
      console.error('[HomeworkExceptionRequest] Error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }, [childName, selectedDuration, requestHomeworkTime])

  const handleCancel = useCallback(async () => {
    setIsSubmitting(true)
    setLocalError(null)

    try {
      await cancelRequest()
    } catch (err) {
      setLocalError('Could not cancel request. Please try again.')
      console.error('[HomeworkExceptionRequest] Cancel error:', err)
    } finally {
      setIsSubmitting(false)
    }
  }, [cancelRequest])

  // Don't show if no family/child or offline time is not active
  if (!familyId || !childId) {
    return null
  }

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={{ ...styles.icon, ...styles.iconRequest }}>📚</div>
          <div>
            <div style={styles.title}>Homework Time</div>
            <div style={styles.subtitle}>Loading...</div>
          </div>
        </div>
      </div>
    )
  }

  // Show active exception status
  if (activeException) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={{ ...styles.icon, ...styles.iconActive }}>✅</div>
          <div>
            <div style={styles.title}>Homework Mode Active</div>
            <div style={styles.subtitle}>{OFFLINE_EXCEPTION_MESSAGES.childHomeworkActive}</div>
          </div>
        </div>

        <div style={{ ...styles.statusBox, ...styles.statusActive }}>
          <div style={{ ...styles.statusText, color: '#065f46' }}>
            You can access education websites!
          </div>
          {timeRemainingMinutes !== null && (
            <div style={styles.timeRemaining}>
              <span style={styles.timeValue}>{timeRemainingMinutes}</span>
              <span style={styles.timeLabel}>
                {timeRemainingMinutes === 1 ? 'minute' : 'minutes'} remaining
              </span>
            </div>
          )}
        </div>

        <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center' }}>
          When homework time ends, offline time will resume automatically.
        </p>
      </div>
    )
  }

  // Show pending request status
  if (pendingRequest) {
    const requestedMinutes = Math.round(pendingRequest.requestedDuration / 60000)
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={{ ...styles.icon, ...styles.iconPending }}>⏳</div>
          <div>
            <div style={styles.title}>Waiting for Approval</div>
            <div style={styles.subtitle}>Your parent will decide soon</div>
          </div>
        </div>

        <div style={{ ...styles.statusBox, ...styles.statusPending }}>
          <div style={{ ...styles.statusText, color: '#92400e' }}>Request sent!</div>
          <div style={styles.statusDetail}>
            You asked for {requestedMinutes} {requestedMinutes === 1 ? 'minute' : 'minutes'} of
            homework time.
          </div>
        </div>

        {(error || localError) && <div style={styles.errorMessage}>{localError || error}</div>}

        <button
          style={{
            ...styles.button,
            ...styles.cancelButton,
            ...(isSubmitting ? styles.buttonDisabled : {}),
          }}
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Cancelling...' : 'Cancel Request'}
        </button>
      </div>
    )
  }

  // Show request form
  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={{ ...styles.icon, ...styles.iconRequest }}>📚</div>
        <div>
          <div style={styles.title}>Need Homework Time?</div>
          <div style={styles.subtitle}>Ask your parent for time to finish your homework</div>
        </div>
      </div>

      {!isOfflineTimeActive && (
        <div
          style={{ ...styles.statusBox, backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb' }}
        >
          <div style={{ ...styles.statusText, color: '#6b7280' }}>
            Offline time is not active right now
          </div>
          <div style={styles.statusDetail}>You can browse freely!</div>
        </div>
      )}

      {isOfflineTimeActive && canRequest && (
        <>
          {(error || localError) && <div style={styles.errorMessage}>{localError || error}</div>}

          <div style={styles.durationSelector}>
            <div style={styles.durationLabel}>How much time do you need?</div>
            <div style={styles.durationOptions}>
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.minutes}
                  style={{
                    ...styles.durationOption,
                    ...(selectedDuration === option.minutes ? styles.durationOptionSelected : {}),
                  }}
                  onClick={() => setSelectedDuration(option.minutes)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <button
            style={{
              ...styles.button,
              ...styles.requestButton,
              ...(isSubmitting ? styles.buttonDisabled : {}),
            }}
            onClick={handleRequest}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending Request...' : 'Ask for Homework Time'}
          </button>

          <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center', marginTop: '12px' }}>
            Only education websites will work during homework time
          </p>
        </>
      )}
    </div>
  )
}

export default HomeworkExceptionRequest
