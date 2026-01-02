/**
 * ChildProposalStatusCard Component - Story 34.2 (AC5)
 *
 * Shows pending proposal status to child.
 * Displays "Waiting for [Parent] to review" with encouraging message.
 * Allows child to withdraw proposal before parent responds.
 */

import { CHILD_PROPOSAL_MESSAGES, type AgreementProposal } from '@fledgely/shared'
import {
  canChildRespond,
  CO_PARENT_APPROVAL_MESSAGES,
} from '../../services/coParentProposalApprovalService'

interface ChildProposalStatusCardProps {
  proposal: AgreementProposal
  parentName: string
  onWithdraw: (proposalId: string) => void
}

export function ChildProposalStatusCard({
  proposal,
  parentName,
  onWithdraw,
}: ChildProposalStatusCardProps) {
  const changeCount = proposal.changes.length
  const changeText = changeCount === 1 ? '1 change' : `${changeCount} changes`

  // Get section names for summary
  const sectionNames = [...new Set(proposal.changes.map((c) => c.sectionName))]

  return (
    <article
      role="article"
      style={{
        background: '#eff6ff',
        border: '1px solid #93c5fd',
        borderRadius: 16,
        padding: 20,
      }}
    >
      {/* Encouraging message */}
      <div
        style={{
          marginBottom: 16,
          padding: '12px 16px',
          background: '#dbeafe',
          borderRadius: 12,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 600, color: '#1e40af' }}>
          Great job speaking up! 🎉
        </div>
      </div>

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
            background: '#3b82f6',
            animation: 'pulse 2s infinite',
          }}
        />
        <div style={{ fontWeight: 600, color: '#1e40af' }}>
          {CHILD_PROPOSAL_MESSAGES.pendingStatus(parentName)}
        </div>
      </div>

      {/* Co-parent approval notice - Story 3A.3 AC2 */}
      {proposal.coParentApprovalRequired && !canChildRespond(proposal) && (
        <div
          data-testid="coparent-approval-notice"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            padding: '10px 12px',
            background: '#fef9c3',
            borderRadius: 8,
            fontSize: 13,
            color: '#854d0e',
          }}
        >
          <span>⏳</span>
          <span>{CO_PARENT_APPROVAL_MESSAGES.childCannotRespond}</span>
        </div>
      )}

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
          <div style={{ fontSize: 14, color: '#64748b' }}>Your request</div>
          <div
            style={{
              fontSize: 13,
              color: '#1e40af',
              background: '#dbeafe',
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
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Your reason:</div>
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
          border: '1px solid #93c5fd',
          borderRadius: 8,
          color: '#1e40af',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Take Back Request
      </button>
    </article>
  )
}
