/**
 * ProposalStatusCard Component - Story 34.1 (AC6)
 *
 * Shows pending proposal status to parent.
 * Displays "Waiting for [Child] to review" and allows withdrawal.
 */

import { AGREEMENT_PROPOSAL_MESSAGES, type AgreementProposal } from '@fledgely/shared'

interface ProposalStatusCardProps {
  proposal: AgreementProposal
  childName: string
  onWithdraw: (proposalId: string) => void
}

export function ProposalStatusCard({ proposal, childName, onWithdraw }: ProposalStatusCardProps) {
  const changeCount = proposal.changes.length
  const changeText = changeCount === 1 ? '1 change' : `${changeCount} changes`

  // Get section names for summary
  const sectionNames = [...new Set(proposal.changes.map((c) => c.sectionName))]

  return (
    <article
      role="article"
      style={{
        background: '#fffbeb',
        border: '1px solid #fcd34d',
        borderRadius: 16,
        padding: 20,
      }}
    >
      {/* Status header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#f59e0b',
            animation: 'pulse 2s infinite',
          }}
        />
        <div style={{ fontWeight: 600, color: '#92400e' }}>
          {AGREEMENT_PROPOSAL_MESSAGES.pendingStatus(childName)}
        </div>
      </div>

      {/* Proposal summary */}
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 14, color: '#64748b' }}>Proposed changes</div>
          <div
            style={{
              fontSize: 13,
              color: '#92400e',
              background: '#fef3c7',
              padding: '2px 8px',
              borderRadius: 4,
              fontWeight: 500,
            }}
          >
            {changeText}
          </div>
        </div>

        {/* Sections affected */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {sectionNames.map((name) => (
            <div
              key={name}
              style={{
                padding: '6px 12px',
                background: '#f1f5f9',
                borderRadius: 6,
                fontSize: 13,
                color: '#334155',
              }}
            >
              {name}
            </div>
          ))}
        </div>

        {/* Reason if provided */}
        {proposal.reason && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Reason:</div>
            <div
              style={{
                fontSize: 14,
                color: '#334155',
                fontStyle: 'italic',
              }}
            >
              &quot;{proposal.reason}&quot;
            </div>
          </div>
        )}
      </div>

      {/* Withdraw button */}
      <button
        type="button"
        onClick={() => onWithdraw(proposal.id)}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: 'transparent',
          border: '1px solid #fcd34d',
          borderRadius: 8,
          color: '#92400e',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Withdraw Proposal
      </button>
    </article>
  )
}
