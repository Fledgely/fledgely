/**
 * DeclinedProposalView Component - Story 34.5
 *
 * Shows positive messaging after a proposal is declined.
 * AC5: Proposer can try again
 * AC6: Declined doesn't mean forever
 */

import { AFTER_DECLINE_MESSAGES } from '@fledgely/shared'

export interface DeclinedProposalViewProps {
  /** Whether viewing as proposer or responder */
  role: 'proposer' | 'responder'
  /** Name of the responder (for proposer view) */
  responderName?: string
  /** Name of the proposer (for responder view) */
  proposerName?: string
  /** The reason given for declining */
  declineReason: string
  /** When the proposal was declined */
  declinedAt: Date
}

/**
 * Displays a declined proposal with positive, non-final messaging.
 */
export function DeclinedProposalView({
  role,
  responderName,
  proposerName,
  declineReason,
  declinedAt,
}: DeclinedProposalViewProps) {
  const isProposer = role === 'proposer'
  const messages = isProposer ? AFTER_DECLINE_MESSAGES.proposer : AFTER_DECLINE_MESSAGES.responder
  const otherPersonName = isProposer ? responderName : proposerName

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      {/* Header */}
      <div className="text-center">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl">💬</span>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">{messages.title}</h2>
        <p className="text-gray-600 mt-1">{messages.body}</p>
      </div>

      {/* Who declined / responded */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600 mb-2">
          {isProposer ? (
            <>
              <span className="font-medium">{otherPersonName}</span> responded:
            </>
          ) : (
            <>
              You declined <span className="font-medium">{otherPersonName}</span>&apos;s proposal:
            </>
          )}
        </p>
        <p className="text-gray-800 italic">&quot;{declineReason}&quot;</p>
        <p className="text-xs text-gray-500 mt-2">
          {declinedAt.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>

      {/* Proposer-specific content */}
      {isProposer && (
        <>
          {/* Try again message */}
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-blue-800 font-medium">{AFTER_DECLINE_MESSAGES.proposer.tryAgain}</p>
            <p className="text-blue-600 text-sm mt-1">
              {AFTER_DECLINE_MESSAGES.proposer.cooldownInfo}
            </p>
          </div>

          {/* Suggestions */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">What you can do next:</h3>
            <ul className="space-y-2" role="list">
              {AFTER_DECLINE_MESSAGES.proposer.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-0.5">•</span>
                  <span className="text-gray-600 text-sm">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Responder-specific content */}
      {!isProposer && (
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-green-800">{AFTER_DECLINE_MESSAGES.responder.next}</p>
        </div>
      )}
    </div>
  )
}
