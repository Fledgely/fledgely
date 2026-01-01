/**
 * AgreementActivationSuccess Component - Story 34.4
 *
 * Success/celebration screen after agreement activation.
 * AC5: Both parties notification (visual celebration)
 */

import type { DualSignatures, ProposalChange } from '@fledgely/shared'

export interface AgreementActivationSuccessProps {
  signatures: DualSignatures
  changes: ProposalChange[]
  versionNumber: number
  onViewAgreement: () => void
  onClose: () => void
}

/**
 * Format timestamp to readable time
 */
function formatSignatureTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * AgreementActivationSuccess shows a celebration screen after
 * both parties have confirmed and the agreement is activated.
 */
export function AgreementActivationSuccess({
  signatures,
  changes,
  versionNumber,
  onViewAgreement,
  onClose,
}: AgreementActivationSuccessProps) {
  return (
    <main
      role="main"
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: 32,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        maxWidth: 480,
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      {/* Celebration Header */}
      <div
        style={{
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontSize: 64,
            marginBottom: 16,
          }}
        >
          🎉
        </div>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#16a34a',
            margin: 0,
            marginBottom: 8,
          }}
        >
          Agreement Updated!
        </h2>
        <p
          style={{
            color: '#64748b',
            fontSize: 15,
            margin: 0,
          }}
        >
          Version {versionNumber} is now active
        </p>
      </div>

      {/* Dual Signatures */}
      <section
        data-testid="signatures-section"
        style={{
          background: '#f8fafc',
          borderRadius: 12,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <h3
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#64748b',
            marginBottom: 16,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Signed By
        </h3>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 32,
          }}
        >
          {/* Proposer Signature */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                background: '#dbeafe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                fontSize: 20,
              }}
            >
              ✓
            </div>
            <div
              style={{
                fontWeight: 600,
                color: '#1e293b',
                fontSize: 15,
              }}
            >
              {signatures.proposer.userName}
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#64748b',
                textTransform: 'capitalize',
              }}
            >
              {signatures.proposer.role}
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#94a3b8',
                marginTop: 4,
              }}
            >
              {formatSignatureTime(signatures.proposer.signedAt)}
            </div>
          </div>

          {/* Connection Line */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              color: '#16a34a',
              fontSize: 24,
            }}
          >
            🤝
          </div>

          {/* Recipient Signature */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                background: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                fontSize: 20,
              }}
            >
              ✓
            </div>
            <div
              style={{
                fontWeight: 600,
                color: '#1e293b',
                fontSize: 15,
              }}
            >
              {signatures.recipient.userName}
            </div>
            <div
              style={{
                fontSize: 12,
                color: '#64748b',
                textTransform: 'capitalize',
              }}
            >
              {signatures.recipient.role}
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#94a3b8',
                marginTop: 4,
              }}
            >
              {formatSignatureTime(signatures.recipient.signedAt)}
            </div>
          </div>
        </div>
      </section>

      {/* Change Summary */}
      <section
        style={{
          marginBottom: 32,
        }}
      >
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
          Changes Applied
        </h3>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {changes.map((change, index) => (
            <div
              key={index}
              style={{
                background: '#f0fdf4',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: 14,
                color: '#15803d',
              }}
            >
              {change.sectionName}
            </div>
          ))}
        </div>
      </section>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <button
          onClick={onViewAgreement}
          style={{
            padding: '14px 24px',
            borderRadius: 8,
            border: 'none',
            background: '#16a34a',
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          View Updated Agreement
        </button>
        <button
          onClick={onClose}
          style={{
            padding: '12px 24px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#fff',
            color: '#64748b',
            fontSize: 15,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </main>
  )
}
