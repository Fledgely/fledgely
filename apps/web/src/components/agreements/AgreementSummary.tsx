/**
 * Agreement Summary Component.
 *
 * Story 5.5: Agreement Preview & Summary - AC2
 *
 * Generates plain-language summary of key commitments for each party.
 * Written at 6th-grade reading level per NFR65.
 */

'use client'

import { useMemo } from 'react'
import type { AgreementTerm } from '@fledgely/shared/contracts'

interface AgreementSummaryProps {
  /** Agreement terms to summarize */
  terms: AgreementTerm[]
  /** Child's name for personalization */
  childName: string
}

/**
 * Groups commitments by party and generates plain-language summaries.
 */
export function AgreementSummary({ terms, childName }: AgreementSummaryProps) {
  /**
   * Group terms by responsible party.
   */
  const groupedTerms = useMemo(() => {
    const parent: AgreementTerm[] = []
    const child: AgreementTerm[] = []
    const shared: AgreementTerm[] = []

    terms.forEach((term) => {
      if (term.party === 'parent') {
        parent.push(term)
      } else if (term.party === 'child') {
        child.push(term)
      } else {
        shared.push(term)
      }
    })

    return { parent, child, shared }
  }, [terms])

  /**
   * Format a term for plain-language display.
   * Simplifies complex terms to 6th-grade reading level.
   */
  const formatTermText = (text: string): string => {
    // Remove complex punctuation and simplify
    let simplified = text
      .replace(/\s*\([^)]*\)/g, '') // Remove parenthetical clauses
      .replace(/\s*-\s*/g, ' ') // Replace dashes with spaces
      .trim()

    // Ensure first letter is lowercase for list format
    if (simplified.length > 0) {
      simplified = simplified.charAt(0).toLowerCase() + simplified.slice(1)
    }

    // Remove trailing period if present
    if (simplified.endsWith('.')) {
      simplified = simplified.slice(0, -1)
    }

    return simplified
  }

  const hasParentTerms = groupedTerms.parent.length > 0
  const hasChildTerms = groupedTerms.child.length > 0
  const hasSharedTerms = groupedTerms.shared.length > 0

  if (!hasParentTerms && !hasChildTerms && !hasSharedTerms) {
    return null
  }

  return (
    <div
      className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-pink-50 rounded-lg border border-gray-200"
      data-testid="agreement-summary"
      role="region"
      aria-label="Agreement summary"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-4">What We&apos;re Agreeing To</h3>

      {/* Parent commitments */}
      {hasParentTerms && (
        <div className="mb-4" data-testid="parent-summary">
          <h4 className="flex items-center gap-2 text-md font-medium text-blue-800 mb-2">
            <span
              className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm"
              aria-hidden="true"
            >
              P
            </span>
            Parent will:
          </h4>
          <ul className="ml-8 space-y-1" aria-label="Parent commitments">
            {groupedTerms.parent.map((term) => (
              <li key={term.id} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-blue-500 mt-0.5" aria-hidden="true">
                  •
                </span>
                <span>{formatTermText(term.text)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Child commitments */}
      {hasChildTerms && (
        <div className="mb-4" data-testid="child-summary">
          <h4 className="flex items-center gap-2 text-md font-medium text-pink-800 mb-2">
            <span
              className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-white text-sm"
              aria-hidden="true"
            >
              {childName.charAt(0).toUpperCase()}
            </span>
            {childName} agrees to:
          </h4>
          <ul className="ml-8 space-y-1" aria-label={`${childName}'s commitments`}>
            {groupedTerms.child.map((term) => (
              <li key={term.id} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-pink-500 mt-0.5" aria-hidden="true">
                  •
                </span>
                <span>{formatTermText(term.text)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Shared commitments */}
      {hasSharedTerms && (
        <div data-testid="shared-summary">
          <h4 className="flex items-center gap-2 text-md font-medium text-purple-800 mb-2">
            <span
              className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm"
              aria-hidden="true"
            >
              ★
            </span>
            Together we will:
          </h4>
          <ul className="ml-8 space-y-1" aria-label="Shared commitments">
            {groupedTerms.shared.map((term) => (
              <li key={term.id} className="text-sm text-gray-700 flex items-start gap-2">
                <span className="text-purple-500 mt-0.5" aria-hidden="true">
                  •
                </span>
                <span>{formatTermText(term.text)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
