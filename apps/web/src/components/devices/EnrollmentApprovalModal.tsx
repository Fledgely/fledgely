'use client'

/**
 * EnrollmentApprovalModal Component - Story 12.3
 *
 * Modal for approving or rejecting device enrollment requests.
 * Shows pending enrollment requests with device info and action buttons.
 *
 * Requirements:
 * - AC2: Parent notification (shown as modal with pending request)
 * - AC3: Approval interface with device info
 * - AC4: Approval expiry countdown
 * - AC5: Rejection handling
 * - AC6: Approval success
 */

import { useState, useEffect, useCallback } from 'react'
import { httpsCallable } from 'firebase/functions'
import { getFunctionsInstance } from '../../lib/firebase'

interface EnrollmentRequest {
  id: string
  familyId: string
  deviceInfo: {
    type: 'chromebook'
    platform: string
    userAgent: string
  }
  status: 'pending' | 'approved' | 'rejected' | 'expired'
  createdAt: { seconds: number; nanoseconds: number }
  expiresAt: { seconds: number; nanoseconds: number }
}

interface EnrollmentApprovalModalProps {
  request: EnrollmentRequest
  isOpen: boolean
  onClose: () => void
  onApproved: () => void
  onRejected: () => void
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '440px',
    width: '100%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  icon: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#fef3c7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    flexShrink: 0,
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1f2937',
    margin: 0,
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: 1.6,
    marginBottom: '20px',
  },
  deviceInfoCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '20px',
  },
  deviceInfoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  deviceInfoLabel: {
    fontSize: '13px',
    color: '#6b7280',
    fontWeight: 500,
  },
  deviceInfoValue: {
    fontSize: '14px',
    color: '#1f2937',
    fontWeight: 500,
  },
  timerContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#fef3c7',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  timerText: {
    fontSize: '14px',
    color: '#92400e',
    fontWeight: 500,
  },
  buttonGroup: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  approveButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#22c55e',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  rejectButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '44px',
    padding: '12px 24px',
    backgroundColor: '#ffffff',
    color: '#dc2626',
    fontSize: '14px',
    fontWeight: 500,
    border: '1px solid #dc2626',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
    color: '#dc2626',
    fontSize: '14px',
  },
}

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Expired'
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

function getPlatformDisplay(userAgent: string): string {
  if (userAgent.includes('CrOS')) return 'Chrome OS'
  if (userAgent.includes('Windows')) return 'Windows'
  if (userAgent.includes('Mac')) return 'macOS'
  if (userAgent.includes('Linux')) return 'Linux'
  return 'Unknown'
}

export function EnrollmentApprovalModal({
  request,
  isOpen,
  onClose,
  onApproved,
  onRejected,
}: EnrollmentApprovalModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)

  // Calculate time remaining until expiry
  useEffect(() => {
    if (!isOpen || !request) return

    const expiresAtMs = request.expiresAt.seconds * 1000
    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000))
      setTimeRemaining(remaining)

      if (remaining <= 0) {
        // Request expired
        onClose()
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [isOpen, request, onClose])

  const handleApprove = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const functions = getFunctionsInstance()
      const approveEnrollment = httpsCallable(functions, 'approveEnrollment')
      await approveEnrollment({
        familyId: request.familyId,
        requestId: request.id,
      })
      onApproved()
    } catch (err) {
      console.error('Error approving enrollment:', err)
      setError(err instanceof Error ? err.message : 'Failed to approve enrollment')
    } finally {
      setLoading(false)
    }
  }, [request, onApproved])

  const handleReject = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const functions = getFunctionsInstance()
      const rejectEnrollment = httpsCallable(functions, 'rejectEnrollment')
      await rejectEnrollment({
        familyId: request.familyId,
        requestId: request.id,
      })
      onRejected()
    } catch (err) {
      console.error('Error rejecting enrollment:', err)
      setError(err instanceof Error ? err.message : 'Failed to reject enrollment')
    } finally {
      setLoading(false)
    }
  }, [request, onRejected])

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !loading) {
      onClose()
    }
  }

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, loading, onClose])

  if (!isOpen || !request) {
    return null
  }

  const createdAtDate = new Date(request.createdAt.seconds * 1000)
  const platform = getPlatformDisplay(request.deviceInfo.userAgent)

  return (
    <div
      style={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="approval-title"
      aria-describedby="approval-description"
    >
      <style>
        {`
          .approval-button:focus {
            outline: 2px solid #22c55e;
            outline-offset: 2px;
          }
          .approval-button:hover:not(:disabled) {
            background-color: #16a34a;
          }
          .reject-button:focus {
            outline: 2px solid #dc2626;
            outline-offset: 2px;
          }
          .reject-button:hover:not(:disabled) {
            background-color: #fef2f2;
          }
        `}
      </style>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.icon} aria-hidden="true">
            📱
          </div>
          <h2 id="approval-title" style={styles.title}>
            Device Enrollment Request
          </h2>
        </div>

        <p id="approval-description" style={styles.description}>
          A new device is requesting to join your family. Review the details below and approve or
          reject this request.
        </p>

        {error && (
          <div style={styles.errorMessage} role="alert" aria-live="polite">
            {error}
          </div>
        )}

        <div style={styles.deviceInfoCard}>
          <div style={styles.deviceInfoRow}>
            <span style={styles.deviceInfoLabel}>Device Type</span>
            <span style={styles.deviceInfoValue}>Chromebook</span>
          </div>
          <div style={styles.deviceInfoRow}>
            <span style={styles.deviceInfoLabel}>Platform</span>
            <span style={styles.deviceInfoValue}>{platform}</span>
          </div>
          <div style={{ ...styles.deviceInfoRow, marginBottom: 0 }}>
            <span style={styles.deviceInfoLabel}>Requested</span>
            <span style={styles.deviceInfoValue}>
              {createdAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        <div style={styles.timerContainer}>
          <span role="img" aria-label="timer">
            ⏱️
          </span>
          <span style={styles.timerText}>Expires in {formatTimeRemaining(timeRemaining)}</span>
        </div>

        <div style={styles.buttonGroup}>
          <button
            type="button"
            onClick={handleReject}
            disabled={loading}
            style={{
              ...styles.rejectButton,
              ...(loading ? styles.disabledButton : {}),
            }}
            className="reject-button"
            aria-busy={loading}
          >
            {loading ? 'Processing...' : 'Reject'}
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={loading}
            style={{
              ...styles.approveButton,
              ...(loading ? styles.disabledButton : {}),
            }}
            className="approval-button"
            aria-busy={loading}
          >
            {loading ? 'Processing...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}

export type { EnrollmentRequest }
