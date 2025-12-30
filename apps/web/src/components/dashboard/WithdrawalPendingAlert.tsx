'use client'

/**
 * WithdrawalPendingAlert Component - Story 6.6
 *
 * Displays an urgent alert to parents when a child has initiated
 * a consent withdrawal request. Shows countdown timer and encourages
 * family discussion.
 *
 * Story 6.6 AC4: Parent is immediately notified when child initiates withdrawal
 * Story 6.6 AC5: Shows countdown during cooling period
 */

import { useState, useEffect } from 'react'
import {
  usePendingWithdrawals,
  formatTimeRemaining,
  type PendingWithdrawal,
} from '../../hooks/usePendingWithdrawals'
import { useChildren } from '../../hooks/useChildren'

interface WithdrawalPendingAlertProps {
  familyId: string
}

/**
 * Colors for withdrawal alert (using red/action scheme)
 */
const alertColors = {
  bg: '#fef2f2',
  border: '#f87171',
  text: '#991b1b',
  icon: '#ef4444',
  button: '#dc2626',
  buttonHover: '#b91c1c',
}

/**
 * Format a date as relative time
 */
function formatRequestedTime(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return date.toLocaleDateString()
}

/**
 * Single withdrawal alert card
 */
function WithdrawalCard({
  withdrawal,
  childName,
}: {
  withdrawal: PendingWithdrawal
  childName: string
}) {
  const [timeRemaining, setTimeRemaining] = useState(formatTimeRemaining(withdrawal.expiresAt))

  // Update countdown every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(formatTimeRemaining(withdrawal.expiresAt))
    }, 60000)

    return () => clearInterval(interval)
  }, [withdrawal.expiresAt])

  return (
    <div
      style={{
        backgroundColor: alertColors.bg,
        border: `2px solid ${alertColors.border}`,
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '16px',
      }}
      role="alert"
      aria-live="polite"
      data-testid="withdrawal-pending-alert"
    >
      {/* Header row with icon and child name */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}
      >
        {/* Warning icon */}
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: alertColors.icon,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 9V13M12 17H12.01M12 3L2 21H22L12 3Z"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: alertColors.text,
              marginBottom: '4px',
            }}
          >
            {childName} wants to withdraw consent
          </div>
          <div
            style={{
              fontSize: '14px',
              color: alertColors.text,
              opacity: 0.85,
              marginBottom: '12px',
              lineHeight: 1.4,
            }}
          >
            Your child has requested to stop monitoring on their device. Talk to them about this
            decision before the cooling period ends.
          </div>

          {/* Timer and request time */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {/* Countdown */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                borderRadius: '6px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke={alertColors.text} strokeWidth="2" />
                <path
                  d="M12 7V12L15 15"
                  stroke={alertColors.text}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: alertColors.text,
                }}
              >
                {timeRemaining}
              </span>
            </div>

            {/* Request time */}
            <span
              style={{
                fontSize: '12px',
                color: alertColors.text,
                opacity: 0.7,
              }}
            >
              Requested {formatRequestedTime(withdrawal.requestedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Help text */}
      <div
        style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(0, 0, 0, 0.1)',
          fontSize: '13px',
          color: alertColors.text,
          opacity: 0.8,
          lineHeight: 1.4,
        }}
      >
        <strong>What happens next:</strong> If the request is not cancelled by your child,
        monitoring will stop automatically when the timer expires. You cannot cancel this request
        &mdash; only your child can.
      </div>
    </div>
  )
}

/**
 * Loading skeleton
 */
function LoadingSkeleton() {
  return (
    <div
      style={{
        backgroundColor: '#f3f4f6',
        border: '2px solid #e5e7eb',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '16px',
      }}
      data-testid="withdrawal-alert-loading"
      role="status"
      aria-label="Loading withdrawal requests"
    >
      <div style={{ display: 'flex', gap: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#e5e7eb',
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              width: '200px',
              height: '18px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              marginBottom: '8px',
            }}
          />
          <div
            style={{
              width: '100%',
              height: '14px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
            }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Main WithdrawalPendingAlert component
 * Shows alerts for all pending withdrawal requests in the family
 */
export function WithdrawalPendingAlert({ familyId }: WithdrawalPendingAlertProps) {
  const { withdrawals, loading, error } = usePendingWithdrawals(familyId)
  const { children } = useChildren({ familyId })

  // Build a map of child IDs to names
  const childNameMap = new Map(children.map((c) => [c.id, c.name]))

  // Don't render anything if no pending withdrawals
  if (!loading && withdrawals.length === 0) {
    return null
  }

  // Show loading skeleton
  if (loading) {
    return <LoadingSkeleton />
  }

  // Show error state (hidden from user, just logged)
  if (error) {
    console.error('[WithdrawalPendingAlert] Error:', error)
    return null
  }

  return (
    <div data-testid="withdrawal-pending-alerts">
      {withdrawals.map((withdrawal) => (
        <WithdrawalCard
          key={withdrawal.requestId}
          withdrawal={withdrawal}
          childName={childNameMap.get(withdrawal.childId) || 'Your child'}
        />
      ))}
    </div>
  )
}
