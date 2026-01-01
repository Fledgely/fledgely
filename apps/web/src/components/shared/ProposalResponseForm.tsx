/**
 * ProposalResponseForm Component - Story 34.3 (AC2, AC4)
 *
 * Form for responding to agreement change proposals.
 * Provides Accept, Decline, and Counter-propose actions.
 */

import { useState } from 'react'

interface ProposalResponseFormProps {
  onAccept: (comment: string) => void
  onDecline: (comment: string) => void
  onCounter: (comment: string) => void
  isSubmitting: boolean
}

const MAX_COMMENT_LENGTH = 500

type ConfirmAction = 'accept' | 'decline' | 'counter' | null

export function ProposalResponseForm({
  onAccept,
  onDecline,
  onCounter,
  isSubmitting,
}: ProposalResponseFormProps) {
  const [comment, setComment] = useState('')
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.slice(0, MAX_COMMENT_LENGTH)
    setComment(value)
    setValidationError(null)
  }

  const handleAcceptClick = () => {
    setValidationError(null)
    setConfirmAction('accept')
  }

  const handleDeclineClick = () => {
    if (!comment.trim()) {
      setValidationError('A comment is required when declining.')
      return
    }
    setValidationError(null)
    setConfirmAction('decline')
  }

  const handleCounterClick = () => {
    if (!comment.trim()) {
      setValidationError('A comment is required when making a counter-proposal.')
      return
    }
    setValidationError(null)
    setConfirmAction('counter')
  }

  const handleConfirm = () => {
    if (confirmAction === 'accept') {
      onAccept(comment)
    } else if (confirmAction === 'decline') {
      onDecline(comment)
    } else if (confirmAction === 'counter') {
      onCounter(comment)
    }
    setConfirmAction(null)
  }

  const handleCancel = () => {
    setConfirmAction(null)
  }

  return (
    <section
      style={{
        marginTop: 24,
        borderTop: '1px solid #e2e8f0',
        paddingTop: 24,
      }}
    >
      {/* Comment Input */}
      <div style={{ marginBottom: 16 }}>
        <label
          htmlFor="response-comment"
          style={{
            display: 'block',
            fontSize: 14,
            fontWeight: 600,
            color: '#334155',
            marginBottom: 8,
          }}
        >
          Your Response
        </label>
        <textarea
          id="response-comment"
          value={comment}
          onChange={handleCommentChange}
          placeholder="Add a comment to explain your response..."
          disabled={isSubmitting}
          style={{
            width: '100%',
            minHeight: 100,
            padding: 12,
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            fontSize: 14,
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 8,
            fontSize: 12,
          }}
        >
          <span style={{ color: '#64748b' }}>
            {comment.length} / {MAX_COMMENT_LENGTH}
          </span>
        </div>
      </div>

      {/* Positive Framing Tips */}
      <div
        style={{
          background: '#f0fdf4',
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 13,
          color: '#15803d',
        }}
      >
        <strong>Tips:</strong> Be constructive and specific. Focus on explaining your reasoning.
      </div>

      {/* Validation Error */}
      {validationError && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            color: '#dc2626',
          }}
        >
          {validationError}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div
          role="dialog"
          aria-labelledby="confirm-title"
          style={{
            background: '#f8fafc',
            padding: 16,
            borderRadius: 12,
            marginBottom: 16,
            border: '1px solid #e2e8f0',
          }}
        >
          <p
            id="confirm-title"
            style={{
              margin: 0,
              marginBottom: 16,
              fontWeight: 600,
              color: '#334155',
            }}
          >
            Are you sure you want to{' '}
            {confirmAction === 'counter' ? 'make a counter-proposal on' : confirmAction} this
            proposal?
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                background:
                  confirmAction === 'accept'
                    ? '#16a34a'
                    : confirmAction === 'counter'
                      ? '#2563eb'
                      : '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
                cursor: isSubmitting ? 'wait' : 'pointer',
              }}
            >
              Yes,{' '}
              {confirmAction === 'accept'
                ? 'Accept'
                : confirmAction === 'counter'
                  ? 'Counter-propose'
                  : 'Decline'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 500,
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {!confirmAction && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={handleAcceptClick}
            disabled={isSubmitting}
            style={{
              flex: 1,
              minWidth: 120,
              padding: '12px 20px',
              background: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: isSubmitting ? 'wait' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            Accept
          </button>
          <button
            type="button"
            onClick={handleDeclineClick}
            disabled={isSubmitting}
            style={{
              flex: 1,
              minWidth: 120,
              padding: '12px 20px',
              background: '#fef2f2',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: isSubmitting ? 'wait' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            Decline
          </button>
          <button
            type="button"
            onClick={handleCounterClick}
            disabled={isSubmitting}
            style={{
              flex: 1,
              minWidth: 120,
              padding: '12px 20px',
              background: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #93c5fd',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: isSubmitting ? 'wait' : 'pointer',
              opacity: isSubmitting ? 0.6 : 1,
            }}
          >
            Counter-propose
          </button>
        </div>
      )}
    </section>
  )
}
