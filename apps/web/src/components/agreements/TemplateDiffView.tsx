/**
 * Template Diff View Component.
 *
 * Story 5.5: Agreement Preview & Summary - AC6
 *
 * Displays visual comparison between current agreement terms and the original template.
 * Highlights added, modified, and removed terms.
 */

'use client'

import { useMemo } from 'react'
import type { AgreementTerm } from '@fledgely/shared/contracts'

interface TemplateDiffViewProps {
  /** Current agreement terms */
  currentTerms: AgreementTerm[]
  /** Original template terms for comparison */
  templateTerms: AgreementTerm[]
}

type DiffStatus = 'added' | 'modified' | 'removed' | 'unchanged'

interface DiffedTerm {
  id: string
  currentTerm: AgreementTerm | null
  templateTerm: AgreementTerm | null
  status: DiffStatus
}

/**
 * Styling configuration for diff status.
 */
const DIFF_STYLES: Record<
  DiffStatus,
  { bg: string; border: string; label: string; labelBg: string }
> = {
  added: {
    bg: 'bg-green-50',
    border: 'border-l-4 border-green-500',
    label: 'New',
    labelBg: 'bg-green-100 text-green-800',
  },
  modified: {
    bg: 'bg-yellow-50',
    border: 'border-l-4 border-yellow-500',
    label: 'Changed',
    labelBg: 'bg-yellow-100 text-yellow-800',
  },
  removed: {
    bg: 'bg-red-50',
    border: 'border-l-4 border-red-500',
    label: 'Removed',
    labelBg: 'bg-red-100 text-red-800',
  },
  unchanged: {
    bg: 'bg-gray-50',
    border: 'border-l-4 border-gray-300',
    label: 'Same',
    labelBg: 'bg-gray-100 text-gray-600',
  },
}

/**
 * Compare two terms to determine if they're meaningfully different.
 */
function termsAreDifferent(current: AgreementTerm, template: AgreementTerm): boolean {
  // Compare key properties
  if (current.text !== template.text) return true
  if (current.category !== template.category) return true
  if (current.party !== template.party) return true

  return false
}

export function TemplateDiffView({ currentTerms, templateTerms }: TemplateDiffViewProps) {
  /**
   * Calculate diffs between current and template terms.
   */
  const diffs = useMemo(() => {
    const diffedTerms: DiffedTerm[] = []
    const templateMap = new Map(templateTerms.map((t) => [t.id, t]))
    const currentMap = new Map(currentTerms.map((t) => [t.id, t]))

    // Check current terms against template
    currentTerms.forEach((current) => {
      const template = templateMap.get(current.id)

      if (!template) {
        // Term was added
        diffedTerms.push({
          id: current.id,
          currentTerm: current,
          templateTerm: null,
          status: 'added',
        })
      } else if (termsAreDifferent(current, template)) {
        // Term was modified
        diffedTerms.push({
          id: current.id,
          currentTerm: current,
          templateTerm: template,
          status: 'modified',
        })
      } else {
        // Term unchanged
        diffedTerms.push({
          id: current.id,
          currentTerm: current,
          templateTerm: template,
          status: 'unchanged',
        })
      }
    })

    // Check for removed terms
    templateTerms.forEach((template) => {
      if (!currentMap.has(template.id)) {
        diffedTerms.push({
          id: template.id,
          currentTerm: null,
          templateTerm: template,
          status: 'removed',
        })
      }
    })

    return diffedTerms
  }, [currentTerms, templateTerms])

  /**
   * Count changes by status.
   */
  const counts = useMemo(() => {
    return {
      added: diffs.filter((d) => d.status === 'added').length,
      modified: diffs.filter((d) => d.status === 'modified').length,
      removed: diffs.filter((d) => d.status === 'removed').length,
      unchanged: diffs.filter((d) => d.status === 'unchanged').length,
    }
  }, [diffs])

  const hasChanges = counts.added > 0 || counts.modified > 0 || counts.removed > 0

  return (
    <div
      className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200"
      data-testid="template-diff-view"
      role="region"
      aria-label="Changes from template"
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Changes from Template</h3>

      {/* Summary stats */}
      <div className="flex flex-wrap gap-3 mb-4" data-testid="diff-summary">
        {counts.added > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm bg-green-100 text-green-800">
            <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />
            {counts.added} added
          </span>
        )}
        {counts.modified > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
            <span className="w-2 h-2 rounded-full bg-yellow-500" aria-hidden="true" />
            {counts.modified} changed
          </span>
        )}
        {counts.removed > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm bg-red-100 text-red-800">
            <span className="w-2 h-2 rounded-full bg-red-500" aria-hidden="true" />
            {counts.removed} removed
          </span>
        )}
        {!hasChanges && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm bg-gray-100 text-gray-600">
            <span className="w-2 h-2 rounded-full bg-gray-400" aria-hidden="true" />
            No changes from template
          </span>
        )}
      </div>

      {/* Diff list - only show if there are changes */}
      {hasChanges && (
        <div className="space-y-3" data-testid="diff-list">
          {diffs
            .filter((d) => d.status !== 'unchanged')
            .map((diff) => (
              <DiffTermCard key={diff.id} diff={diff} />
            ))}
        </div>
      )}
    </div>
  )
}

/**
 * Individual diff term card.
 */
interface DiffTermCardProps {
  diff: DiffedTerm
}

function DiffTermCard({ diff }: DiffTermCardProps) {
  const styles = DIFF_STYLES[diff.status]
  const term = diff.currentTerm || diff.templateTerm

  if (!term) return null

  return (
    <div
      className={`p-3 rounded-lg ${styles.bg} ${styles.border}`}
      data-testid={`diff-term-${diff.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {/* Show current text or strikethrough for removed */}
          {diff.status === 'removed' ? (
            <p className="text-sm text-gray-500 line-through">{term.text}</p>
          ) : (
            <p className="text-sm text-gray-800">{diff.currentTerm?.text}</p>
          )}

          {/* Show original text for modified terms */}
          {diff.status === 'modified' && diff.templateTerm && (
            <p className="text-xs text-gray-500 mt-1 line-through">Was: {diff.templateTerm.text}</p>
          )}
        </div>

        {/* Status badge */}
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${styles.labelBg}`}
          aria-label={`${styles.label} term`}
        >
          {styles.label}
        </span>
      </div>
    </div>
  )
}
