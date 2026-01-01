/**
 * HomeworkApprovalCard Component - Story 32.5 AC4
 *
 * Displays pending homework exception requests for parent approval.
 * Allows parents to approve or deny remotely.
 *
 * Features:
 * - Show pending homework requests
 * - Approve with optional duration adjustment
 * - Deny with optional reason
 * - Non-shaming language (FR60)
 */

'use client'

import { useState, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  useHomeworkApprovals,
  type HomeworkExceptionRequest,
} from '../../hooks/useHomeworkException'

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
    gap: '12px',
    marginBottom: '16px',
  },
  icon: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    backgroundColor: '#fef3c7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: '13px',
    color: '#6b7280',
  },
  requestItem: {
    padding: '16px',
    backgroundColor: '#fef3c7',
    borderRadius: '12px',
    marginBottom: '12px',
  },
  requestHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  childName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#92400e',
  },
  requestTime: {
    fontSize: '12px',
    color: '#b45309',
  },
  requestDetail: {
    fontSize: '14px',
    color: '#78350f',
    marginBottom: '12px',
  },
  durationAdjust: {
    marginBottom: '12px',
  },
  durationLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  },
  durationSelect: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
  },
  buttonRow: {
    display: 'flex',
    gap: '10px',
  },
  button: {
    flex: 1,
    padding: '12px',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  approveButton: {
    backgroundColor: '#059669',
    color: '#ffffff',
  },
  denyButton: {
    backgroundColor: '#ffffff',
    color: '#dc2626',
    border: '1px solid #fecaca',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '16px',
    color: '#6b7280',
    fontSize: '14px',
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '10px 14px',
    marginBottom: '12px',
    color: '#991b1b',
    fontSize: '13px',
  },
}

const DURATION_OPTIONS = [
  { minutes: 15, label: '15 minutes' },
  { minutes: 30, label: '30 minutes' },
  { minutes: 45, label: '45 minutes' },
  { minutes: 60, label: '1 hour' },
  { minutes: 90, label: '1.5 hours' },
  { minutes: 120, label: '2 hours' },
]

interface HomeworkApprovalCardProps {
  /** Family ID */
  familyId: string | null
}

export function HomeworkApprovalCard({ familyId }: HomeworkApprovalCardProps) {
  const { firebaseUser } = useAuth()

  const { pendingRequests, loading, error, approveRequest, denyRequest } = useHomeworkApprovals({
    familyId,
    enabled: !!familyId,
  })

  const [selectedDurations, setSelectedDurations] = useState<Record<string, number>>({})
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  const handleApprove = useCallback(
    async (request: HomeworkExceptionRequest) => {
      if (!firebaseUser?.uid) return

      setProcessingId(request.id)
      setLocalError(null)

      try {
        const duration =
          selectedDurations[request.id] || Math.round(request.requestedDuration / 60000)
        await approveRequest(request.id, firebaseUser.uid, duration)
      } catch (err) {
        setLocalError('Could not approve request. Please try again.')
        console.error('[HomeworkApprovalCard] Approve error:', err)
      } finally {
        setProcessingId(null)
      }
    },
    [firebaseUser?.uid, selectedDurations, approveRequest]
  )

  const handleDeny = useCallback(
    async (request: HomeworkExceptionRequest) => {
      if (!firebaseUser?.uid) return

      setProcessingId(request.id)
      setLocalError(null)

      try {
        await denyRequest(request.id, firebaseUser.uid)
      } catch (err) {
        setLocalError('Could not deny request. Please try again.')
        console.error('[HomeworkApprovalCard] Deny error:', err)
      } finally {
        setProcessingId(null)
      }
    },
    [firebaseUser?.uid, denyRequest]
  )

  const formatTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    return `${Math.floor(minutes / 60)}h ago`
  }

  // Don't render if no family or no pending requests
  if (!familyId) {
    return null
  }

  if (loading) {
    return null // Don't show loading state for this card
  }

  if (pendingRequests.length === 0) {
    return null // Don't show empty card
  }

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.icon}>📚</div>
        <div>
          <div style={styles.title}>Homework Request</div>
          <div style={styles.subtitle}>
            {pendingRequests.length} pending {pendingRequests.length === 1 ? 'request' : 'requests'}
          </div>
        </div>
      </div>

      {(error || localError) && <div style={styles.errorMessage}>{localError || error}</div>}

      {pendingRequests.map((request) => {
        const requestedMinutes = Math.round(request.requestedDuration / 60000)
        const selectedMinutes = selectedDurations[request.id] || requestedMinutes
        const isProcessing = processingId === request.id

        return (
          <div key={request.id} style={styles.requestItem}>
            <div style={styles.requestHeader}>
              <span style={styles.childName}>{request.requestedByName || 'Your child'}</span>
              <span style={styles.requestTime}>{formatTimeAgo(request.createdAt)}</span>
            </div>

            <div style={styles.requestDetail}>
              Needs homework time ({requestedMinutes}{' '}
              {requestedMinutes === 1 ? 'minute' : 'minutes'} requested)
            </div>

            <div style={styles.durationAdjust}>
              <label style={styles.durationLabel} htmlFor={`duration-${request.id}`}>
                Approve for:
              </label>
              <select
                id={`duration-${request.id}`}
                style={styles.durationSelect}
                value={selectedMinutes}
                onChange={(e) =>
                  setSelectedDurations((prev) => ({
                    ...prev,
                    [request.id]: Number(e.target.value),
                  }))
                }
                disabled={isProcessing}
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.minutes} value={opt.minutes}>
                    {opt.label}
                    {opt.minutes === requestedMinutes ? ' (requested)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.buttonRow}>
              <button
                style={{
                  ...styles.button,
                  ...styles.approveButton,
                  ...(isProcessing ? styles.buttonDisabled : {}),
                }}
                onClick={() => handleApprove(request)}
                disabled={isProcessing}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {isProcessing ? 'Approving...' : 'Approve'}
              </button>

              <button
                style={{
                  ...styles.button,
                  ...styles.denyButton,
                  ...(isProcessing ? styles.buttonDisabled : {}),
                }}
                onClick={() => handleDeny(request)}
                disabled={isProcessing}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                {isProcessing ? 'Denying...' : 'Not Now'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default HomeworkApprovalCard
