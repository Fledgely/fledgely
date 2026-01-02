/**
 * ReviewRequestNotification Component - Story 34.5.3 Task 6
 *
 * Component for displaying review request to parent.
 * AC2: Review Request Notification to Parent
 * AC3: Suggested Discussion Areas
 * AC5: Invitation, Not Demand
 *
 * CRITICAL: All messaging must be invitation-based, not demand-based.
 */

import type { AgreementReviewRequest } from '@fledgely/shared/contracts/agreementReviewRequest'

interface ReviewRequestNotificationProps {
  /** The review request to display */
  request: AgreementReviewRequest
  /** Callback when parent acknowledges the request */
  onAcknowledge: () => void
  /** Callback when parent wants to view the agreement */
  onViewAgreement: () => void
}

export function ReviewRequestNotification({
  request,
  onAcknowledge,
  onViewAgreement,
}: ReviewRequestNotificationProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  }

  return (
    <div
      data-testid="review-request-notification"
      style={{
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        border: '1px solid #93c5fd',
        borderRadius: 16,
        padding: 24,
        marginBottom: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 28 }}>💬</span>
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 700,
              color: '#1e40af',
            }}
          >
            Agreement Discussion Invitation
          </h3>
          <p
            style={{
              margin: '4px 0 0 0',
              fontSize: 14,
              color: '#3b82f6',
            }}
          >
            Received {formatDate(request.requestedAt)}
          </p>
        </div>
      </div>

      {/* Main Message - Invitation style (AC2, AC5) */}
      <p
        style={{
          margin: '0 0 16px 0',
          fontSize: 16,
          color: '#1e3a5f',
          lineHeight: 1.5,
        }}
      >
        <strong>{request.childName}</strong> is inviting you to have a conversation about the
        agreement together. This could be a good opportunity to check in and discuss how things are
        going.
      </p>

      {/* Suggested Discussion Areas (AC3) */}
      {request.suggestedAreas.length > 0 && (
        <div
          style={{
            background: 'white',
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <h4
            style={{
              margin: '0 0 12px 0',
              fontSize: 14,
              fontWeight: 600,
              color: '#1e40af',
            }}
          >
            Suggested topics to discuss:
          </h4>
          <ul
            style={{
              margin: 0,
              paddingLeft: 20,
              listStyleType: 'disc',
            }}
          >
            {request.suggestedAreas.map((area, index) => (
              <li
                key={index}
                style={{
                  fontSize: 14,
                  color: '#374151',
                  marginBottom: 4,
                }}
              >
                {area}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Supportive framing (AC5) */}
      <p
        style={{
          margin: '0 0 16px 0',
          fontSize: 14,
          color: '#6b7280',
          fontStyle: 'italic',
        }}
      >
        This is an invitation to connect. There&apos;s no rush — respond whenever you&apos;re ready.
      </p>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={onViewAgreement}
          style={{
            padding: '12px 20px',
            background: 'white',
            border: '2px solid #3b82f6',
            borderRadius: 8,
            color: '#3b82f6',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#eff6ff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'white'
          }}
        >
          View Agreement
        </button>

        <button
          onClick={onAcknowledge}
          style={{
            padding: '12px 20px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.02)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)'
          }}
        >
          Acknowledge Request
        </button>
      </div>
    </div>
  )
}
