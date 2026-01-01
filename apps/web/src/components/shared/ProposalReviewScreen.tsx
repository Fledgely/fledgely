/**
 * ProposalReviewScreen Component - Story 34.3 (AC1)
 *
 * Main screen for reviewing agreement change proposals.
 * Displays proposal details, diff view, and reason.
 */

import type { NegotiationProposal } from '../../hooks/useNegotiationHistory'
import { AgreementDiffView } from './AgreementDiffView'

interface ProposalReviewScreenProps {
  proposal: NegotiationProposal
  isParentViewing: boolean
  currentRound?: number
  children?: React.ReactNode // For response form
}

/**
 * Format timestamp to readable date string
 */
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Get status badge color and label
 */
function getStatusBadge(status: NegotiationProposal['status']): {
  color: string
  bg: string
  label: string
} {
  switch (status) {
    case 'pending':
      return { color: '#d97706', bg: '#fef3c7', label: 'Pending' }
    case 'accepted':
      return { color: '#16a34a', bg: '#dcfce7', label: 'Accepted' }
    case 'declined':
      return { color: '#dc2626', bg: '#fee2e2', label: 'Declined' }
    case 'withdrawn':
      return { color: '#6b7280', bg: '#f3f4f6', label: 'Withdrawn' }
    case 'counter-proposed':
      return { color: '#2563eb', bg: '#dbeafe', label: 'Counter-proposed' }
    default:
      return { color: '#6b7280', bg: '#f3f4f6', label: status }
  }
}

export function ProposalReviewScreen({
  proposal,
  isParentViewing,
  currentRound,
  children,
}: ProposalReviewScreenProps) {
  const statusBadge = getStatusBadge(proposal.status)

  // Determine the contextual message based on who is viewing
  const viewerContext = isParentViewing
    ? `${proposal.proposerName} wants to discuss a change`
    : `${proposal.proposerName} proposed a change to your agreement`

  return (
    <main
      role="main"
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Header Section */}
      <header style={{ marginBottom: 24 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: '#1e293b',
                margin: 0,
                marginBottom: 8,
              }}
            >
              Agreement Change Proposal
            </h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: 14 }}>{viewerContext}</p>
          </div>

          {/* Status Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                padding: '4px 12px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 600,
                color: statusBadge.color,
                background: statusBadge.bg,
                textTransform: 'uppercase',
              }}
            >
              {statusBadge.label}
            </span>
          </div>
        </div>

        {/* Metadata Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginTop: 16,
            fontSize: 13,
            color: '#64748b',
          }}
        >
          <span>
            Proposed by <strong style={{ color: '#334155' }}>{proposal.proposerName}</strong>
          </span>
          <span>•</span>
          <span>{formatDate(proposal.createdAt)}</span>
          {currentRound && currentRound > 1 && (
            <>
              <span>•</span>
              <span
                style={{
                  color: '#2563eb',
                  fontWeight: 500,
                }}
              >
                Round {currentRound}
              </span>
            </>
          )}
        </div>
      </header>

      {/* Reason Section */}
      <section style={{ marginBottom: 24 }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#64748b',
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Reason for Change
        </h3>
        <div
          style={{
            background: '#f8fafc',
            borderRadius: 12,
            padding: 16,
            borderLeft: '4px solid #2563eb',
          }}
        >
          {proposal.reason ? (
            <p
              style={{
                margin: 0,
                color: '#334155',
                fontSize: 15,
                lineHeight: 1.6,
              }}
            >
              &quot;{proposal.reason}&quot;
            </p>
          ) : (
            <p
              style={{
                margin: 0,
                color: '#94a3b8',
                fontSize: 15,
                fontStyle: 'italic',
              }}
            >
              No reason provided
            </p>
          )}
        </div>
      </section>

      {/* Proposed Changes Section */}
      <section style={{ marginBottom: 24 }}>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#64748b',
            marginBottom: 12,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Proposed Changes
        </h3>
        <AgreementDiffView changes={proposal.changes} />
      </section>

      {/* Response Form Slot (children) */}
      {children}
    </main>
  )
}
