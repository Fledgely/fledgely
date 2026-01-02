'use client'

/**
 * Graduation Eligibility Banner Component - Story 38.2 Task 5
 *
 * Shows graduation eligibility status and prompts conversation.
 * AC2: Notification to BOTH child AND parent about eligibility
 * AC3: Both parties must acknowledge readiness
 * AC4: Celebratory messaging
 */

import { useState } from 'react'
import type { GraduationConversation, ViewerType } from '@fledgely/shared'
import {
  getConversationDaysUntilExpiry,
  getMissingAcknowledgments,
  hasAllAcknowledgments,
  getChildEligibilityNotification,
  getParentEligibilityNotification,
  getAcknowledgmentButtonLabel,
  getCelebratoryMessage,
  getNotificationSummary,
} from '@fledgely/shared'

export interface GraduationEligibilityBannerProps {
  conversation: GraduationConversation
  viewerType: ViewerType
  viewerId: string
  childName: string
  hasAcknowledged: boolean
  onAcknowledge: () => Promise<void>
  onSchedule?: () => void
  onViewTemplate?: () => void
}

const styles = {
  banner: {
    backgroundColor: '#f0fdf4',
    border: '2px solid #86efac',
    borderRadius: '16px',
    padding: '24px',
    textAlign: 'center' as const,
    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
  },
  celebrateIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#166534',
    marginBottom: '8px',
    margin: 0,
  },
  message: {
    fontSize: '16px',
    color: '#15803d',
    marginBottom: '20px',
    lineHeight: 1.6,
    maxWidth: '600px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  statusSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
  },
  statusTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '12px',
    margin: 0,
  },
  statusList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '12px',
    justifyContent: 'center',
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  statusItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#374151',
  },
  statusIconDone: {
    color: '#22c55e',
    fontSize: '18px',
  },
  statusIconPending: {
    color: '#f59e0b',
    fontSize: '18px',
  },
  countdown: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '16px',
  },
  countdownDanger: {
    fontSize: '14px',
    color: '#dc2626',
    fontWeight: 600,
    marginBottom: '16px',
  },
  buttonGroup: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '12px',
    justifyContent: 'center',
  },
  primaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '48px',
    padding: '12px 28px',
    backgroundColor: '#22c55e',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  primaryButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
  secondaryButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '48px',
    padding: '12px 28px',
    backgroundColor: 'transparent',
    color: '#166534',
    fontSize: '16px',
    fontWeight: 500,
    border: '2px solid #86efac',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  acknowledgedBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '20px',
  },
  errorMessage: {
    color: '#dc2626',
    fontSize: '14px',
    marginTop: '12px',
  },
  summary: {
    fontSize: '14px',
    color: '#374151',
    marginTop: '16px',
    fontStyle: 'italic',
  },
}

export default function GraduationEligibilityBanner({
  conversation,
  viewerType,
  viewerId,
  childName,
  hasAcknowledged,
  onAcknowledge,
  onSchedule,
  onViewTemplate,
}: GraduationEligibilityBannerProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const daysRemaining = getConversationDaysUntilExpiry(conversation)
  const { childMissing, missingParentIds } = getMissingAcknowledgments(conversation)
  const allAcknowledged = hasAllAcknowledgments(conversation)

  // Get notification content based on viewer type
  const notification =
    viewerType === 'child'
      ? getChildEligibilityNotification(conversation.id)
      : getParentEligibilityNotification(childName, conversation.id)

  const celebratoryMessage = getCelebratoryMessage(viewerType, childName)
  const buttonLabel = getAcknowledgmentButtonLabel(viewerType)
  const statusSummary = getNotificationSummary(conversation, viewerType, childName)

  const handleAcknowledge = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await onAcknowledge()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to acknowledge')
    } finally {
      setIsLoading(false)
    }
  }

  const isDangerCountdown = daysRemaining <= 7

  // Build acknowledgment status list
  const acknowledgmentStatuses: { label: string; acknowledged: boolean }[] = []

  if (viewerType === 'child') {
    acknowledgmentStatuses.push({
      label: 'You',
      acknowledged: !childMissing,
    })
    acknowledgmentStatuses.push({
      label:
        missingParentIds.length > 0
          ? `Parents (${conversation.requiredParentIds.length - missingParentIds.length}/${conversation.requiredParentIds.length})`
          : 'All Parents',
      acknowledged: missingParentIds.length === 0,
    })
  } else {
    acknowledgmentStatuses.push({
      label: childName,
      acknowledged: !childMissing,
    })

    // Check if current viewer (parent) has acknowledged
    const viewerHasAcknowledged = conversation.parentAcknowledgments.some(
      (ack) => ack.userId === viewerId
    )
    acknowledgmentStatuses.push({
      label: 'You',
      acknowledged: viewerHasAcknowledged,
    })

    // Other parents
    const otherParentCount = conversation.requiredParentIds.filter((id) => id !== viewerId).length
    const otherParentsAcknowledged = conversation.parentAcknowledgments.filter(
      (ack) => ack.userId !== viewerId
    ).length
    if (otherParentCount > 0) {
      acknowledgmentStatuses.push({
        label: `Other Parents (${otherParentsAcknowledged}/${otherParentCount})`,
        acknowledged: otherParentsAcknowledged === otherParentCount,
      })
    }
  }

  return (
    <div
      style={styles.banner}
      role="region"
      aria-label={`Graduation eligibility for ${viewerType === 'child' ? 'you' : childName}`}
    >
      <style>
        {`
          .graduation-primary-btn:hover:not(:disabled) {
            background-color: #16a34a;
            transform: translateY(-1px);
          }
          .graduation-primary-btn:focus {
            outline: 2px solid #22c55e;
            outline-offset: 2px;
          }
          .graduation-secondary-btn:hover {
            background-color: #f0fdf4;
          }
          .graduation-secondary-btn:focus {
            outline: 2px solid #86efac;
            outline-offset: 2px;
          }
        `}
      </style>

      <div style={styles.celebrateIcon} aria-hidden="true">
        &#127881;
      </div>

      <h2 style={styles.title}>{notification.title}</h2>

      <p style={styles.message}>{celebratoryMessage}</p>

      <div style={styles.statusSection}>
        <h3 style={styles.statusTitle}>Acknowledgment Status</h3>
        <ul style={styles.statusList}>
          {acknowledgmentStatuses.map((status, index) => (
            <li key={index} style={styles.statusItem}>
              <span
                style={status.acknowledged ? styles.statusIconDone : styles.statusIconPending}
                aria-hidden="true"
              >
                {status.acknowledged ? '\u2713' : '\u25CB'}
              </span>
              <span>
                {status.label}
                {status.acknowledged ? ' (acknowledged)' : ' (pending)'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p style={isDangerCountdown ? styles.countdownDanger : styles.countdown}>
        {daysRemaining > 0
          ? `${daysRemaining} days remaining to complete this conversation`
          : 'This conversation has expired'}
      </p>

      <div style={styles.buttonGroup}>
        {!hasAcknowledged && daysRemaining > 0 && (
          <button
            type="button"
            onClick={handleAcknowledge}
            disabled={isLoading}
            style={{
              ...styles.primaryButton,
              ...(isLoading ? styles.primaryButtonDisabled : {}),
            }}
            className="graduation-primary-btn"
            aria-busy={isLoading}
          >
            {isLoading ? 'Acknowledging...' : buttonLabel}
          </button>
        )}

        {hasAcknowledged && !allAcknowledged && (
          <div style={styles.acknowledgedBadge}>
            <span aria-hidden="true">&#10003;</span>
            <span>You have acknowledged</span>
          </div>
        )}

        {allAcknowledged && onSchedule && (
          <button
            type="button"
            onClick={onSchedule}
            style={styles.primaryButton}
            className="graduation-primary-btn"
          >
            Schedule Conversation
          </button>
        )}

        {onViewTemplate && (
          <button
            type="button"
            onClick={onViewTemplate}
            style={styles.secondaryButton}
            className="graduation-secondary-btn"
          >
            View Conversation Guide
          </button>
        )}
      </div>

      {error && (
        <p style={styles.errorMessage} role="alert">
          {error}
        </p>
      )}

      <p style={styles.summary}>{statusSummary}</p>
    </div>
  )
}
