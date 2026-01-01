/**
 * ProposerConfirmationScreen Component - Story 34.4
 *
 * Proposer's final confirmation UI after recipient accepts.
 * AC1: Proposer confirmation after acceptance
 * AC2: Dual digital signatures
 */

import { useState } from 'react'
import type { ProposalChange } from '@fledgely/shared'
import { AgreementDiffView } from './AgreementDiffView'

export interface ProposerConfirmationScreenProps {
  recipientName: string
  recipientAcceptedAt: number
  recipientComment: string | null
  changes: ProposalChange[]
  proposalReason: string | null
  onConfirm: () => void
  onCancel: () => void
  isActivating: boolean
}

/**
 * Format timestamp to relative time or readable date
 */
function formatAcceptedTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))

  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  } else if (hours < 24) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  } else {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}

/**
 * ProposerConfirmationScreen shows the proposer their accepted proposal
 * and allows them to confirm and activate the changes.
 */
export function ProposerConfirmationScreen({
  recipientName,
  recipientAcceptedAt,
  recipientComment,
  changes,
  proposalReason,
  onConfirm,
  onCancel,
  isActivating,
}: ProposerConfirmationScreenProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleConfirmClick = () => {
    setShowConfirmDialog(true)
  }

  const handleDialogConfirm = () => {
    setShowConfirmDialog(false)
    onConfirm()
  }

  const handleDialogCancel = () => {
    setShowConfirmDialog(false)
  }

  return (
    <main
      role="main"
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        maxWidth: 640,
        margin: '0 auto',
      }}
    >
      {/* Success Header */}
      <header
        style={{
          textAlign: 'center',
          marginBottom: 24,
          padding: '16px 0',
          background: 'linear-gradient(135deg, #dcfce7 0%, #d1fae5 100%)',
          borderRadius: 12,
        }}
      >
        <div
          style={{
            fontSize: 48,
            marginBottom: 8,
          }}
        >
          🎉
        </div>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: '#16a34a',
            margin: 0,
            marginBottom: 8,
          }}
        >
          Your proposal was accepted!
        </h2>
        <p
          style={{
            color: '#15803d',
            margin: 0,
            fontSize: 15,
          }}
        >
          {recipientName} accepted your proposed changes{' '}
          <span style={{ opacity: 0.8 }}>{formatAcceptedTime(recipientAcceptedAt)}</span>
        </p>
      </header>

      {/* Recipient Comment */}
      {recipientComment && (
        <section style={{ marginBottom: 24 }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#64748b',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {recipientName}&apos;s Response
          </h3>
          <div
            style={{
              background: '#f8fafc',
              borderRadius: 12,
              padding: 16,
              borderLeft: '4px solid #16a34a',
            }}
          >
            <p
              style={{
                margin: 0,
                color: '#334155',
                fontSize: 15,
                fontStyle: 'italic',
              }}
            >
              &quot;{recipientComment}&quot;
            </p>
          </div>
        </section>
      )}

      {/* Original Reason */}
      {proposalReason && (
        <section style={{ marginBottom: 24 }}>
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#64748b',
              marginBottom: 8,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Your Reason
          </h3>
          <div
            style={{
              background: '#f8fafc',
              borderRadius: 12,
              padding: 16,
              borderLeft: '4px solid #2563eb',
            }}
          >
            <p
              style={{
                margin: 0,
                color: '#334155',
                fontSize: 15,
              }}
            >
              {proposalReason}
            </p>
          </div>
        </section>
      )}

      {/* Changes Summary */}
      <section style={{ marginBottom: 24 }}>
        <h3
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#64748b',
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Agreed Changes
        </h3>
        <AgreementDiffView changes={changes} />
      </section>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          marginTop: 32,
        }}
      >
        <button
          onClick={onCancel}
          disabled={isActivating}
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#fff',
            color: '#64748b',
            fontSize: 15,
            fontWeight: 500,
            cursor: isActivating ? 'not-allowed' : 'pointer',
            opacity: isActivating ? 0.5 : 1,
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleConfirmClick}
          disabled={isActivating}
          style={{
            padding: '12px 32px',
            borderRadius: 8,
            border: 'none',
            background: isActivating ? '#86efac' : '#16a34a',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            cursor: isActivating ? 'not-allowed' : 'pointer',
          }}
        >
          {isActivating ? 'Activating...' : 'Confirm & Activate'}
        </button>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={handleDialogCancel}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              maxWidth: 400,
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: '#1e293b',
                margin: 0,
                marginBottom: 12,
              }}
            >
              Activate these changes?
            </h3>
            <p
              style={{
                color: '#64748b',
                fontSize: 14,
                margin: 0,
                marginBottom: 24,
                lineHeight: 1.5,
              }}
            >
              This will update the agreement immediately. Both signatures will be recorded and the
              new rules will take effect right away.
            </p>
            <div
              style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={handleDialogCancel}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  background: '#fff',
                  color: '#64748b',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                No, go back
              </button>
              <button
                onClick={handleDialogConfirm}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: '#16a34a',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
