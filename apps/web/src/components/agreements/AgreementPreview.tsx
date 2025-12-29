/**
 * Agreement Preview Component.
 *
 * Story 5.5: Agreement Preview & Summary - AC1, AC4, AC5, AC6
 *
 * Main container for reviewing the complete agreement before signing.
 * Features scroll tracking, PDF export, and template diff highlighting.
 */

'use client'

import { useState } from 'react'
import type { AgreementTerm, TermCategory } from '@fledgely/shared/contracts'
import { useScrollProgress } from '../../hooks/useScrollProgress'
import { AgreementSummary } from './AgreementSummary'
import { ImpactEstimation } from './ImpactEstimation'
import { TemplateDiffView } from './TemplateDiffView'

/**
 * Category display configuration.
 */
const CATEGORY_CONFIG: Record<TermCategory, { label: string; emoji: string; color: string }> = {
  time: { label: 'Screen Time', emoji: '⏰', color: 'bg-blue-100 border-blue-300' },
  apps: { label: 'Apps & Games', emoji: '🎮', color: 'bg-green-100 border-green-300' },
  monitoring: { label: 'Rules', emoji: '📋', color: 'bg-yellow-100 border-yellow-300' },
  rewards: { label: 'Rewards', emoji: '🌟', color: 'bg-purple-100 border-purple-300' },
  general: { label: 'Other', emoji: '💡', color: 'bg-gray-100 border-gray-300' },
}

interface AgreementPreviewProps {
  /** Agreement terms to display */
  terms: AgreementTerm[]
  /** Child's name for display */
  childName: string
  /** Original template terms for comparison (optional) */
  templateTerms?: AgreementTerm[]
  /** Called when user confirms they've reviewed the agreement */
  onConfirm?: () => void
  /** Called when user wants to go back and edit */
  onEdit?: () => void
  /** Called to download PDF */
  onDownloadPdf?: () => void
  /** Whether PDF is currently generating */
  isPdfLoading?: boolean
}

export function AgreementPreview({
  terms,
  childName,
  templateTerms,
  onConfirm,
  onEdit,
  onDownloadPdf,
  isPdfLoading = false,
}: AgreementPreviewProps) {
  const [showDiff, setShowDiff] = useState(false)
  const [hasConfirmed, setHasConfirmed] = useState(false)
  const { containerRef, progress, isComplete } = useScrollProgress({ threshold: 95 })

  /**
   * Group terms by category.
   */
  const termsByCategory = terms.reduce(
    (acc, term) => {
      if (!acc[term.category]) {
        acc[term.category] = []
      }
      acc[term.category].push(term)
      return acc
    },
    {} as Record<TermCategory, AgreementTerm[]>
  )

  /**
   * Calculate party statistics.
   */
  const parentTerms = terms.filter((t) => t.party === 'parent').length
  const childTerms = terms.filter((t) => t.party === 'child').length

  /**
   * Handle confirmation click.
   */
  const handleConfirm = () => {
    if (!hasConfirmed) {
      setHasConfirmed(true)
    }
    onConfirm?.()
  }

  const hasTemplate = templateTerms && templateTerms.length > 0

  return (
    <div className="max-w-3xl mx-auto" data-testid="agreement-preview">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Agreement</h2>
        <p className="text-gray-600">
          Take a moment to read through everything before signing. This is what {childName} and you
          are agreeing to.
        </p>
      </div>

      {/* Statistics bar */}
      <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-900">{terms.length}</span>
          <span className="text-sm text-gray-600">Total Rules</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500" aria-hidden="true" />
          <span className="text-sm text-gray-600">{parentTerms} from Parent</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-pink-500" aria-hidden="true" />
          <span className="text-sm text-gray-600">
            {childTerms} from {childName}
          </span>
        </div>
      </div>

      {/* Impact Estimation */}
      <ImpactEstimation terms={terms} childName={childName} />

      {/* Plain-Language Summary */}
      <AgreementSummary terms={terms} childName={childName} />

      {/* Template diff toggle */}
      {hasTemplate && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowDiff(!showDiff)}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:underline min-h-[44px]"
            data-testid="toggle-diff"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showDiff ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {showDiff ? 'Hide changes from template' : 'Show changes from template'}
          </button>
        </div>
      )}

      {/* Template diff view */}
      {showDiff && hasTemplate && (
        <TemplateDiffView currentTerms={terms} templateTerms={templateTerms} />
      )}

      {/* Scrollable agreement content */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">Full Agreement</h3>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Reading progress"
              />
            </div>
            <span className="text-xs text-gray-500">{progress}%</span>
          </div>
        </div>

        <div
          ref={containerRef}
          className="h-96 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-white"
          data-testid="agreement-scroll-container"
        >
          {Object.entries(termsByCategory).map(([category, categoryTerms]) => {
            const config = CATEGORY_CONFIG[category as TermCategory]
            return (
              <div key={category} className="mb-6 last:mb-0">
                <h4 className="flex items-center gap-2 text-md font-semibold text-gray-800 mb-3">
                  <span aria-hidden="true">{config.emoji}</span>
                  {config.label}
                </h4>
                <div className="space-y-3">
                  {categoryTerms.map((term) => (
                    <TermPreviewCard key={term.id} term={term} childName={childName} />
                  ))}
                </div>
              </div>
            )
          })}

          {/* Scroll end marker */}
          <div className="pt-4 mt-4 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              {isComplete
                ? '✓ You have read the entire agreement'
                : '↓ Keep scrolling to read everything'}
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation checkbox */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={hasConfirmed}
            onChange={(e) => setHasConfirmed(e.target.checked)}
            disabled={!isComplete}
            className="mt-1 w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
            data-testid="confirm-checkbox"
          />
          <span className={`text-sm ${!isComplete ? 'text-gray-400' : 'text-gray-700'}`}>
            I have read and reviewed this entire agreement.
            {!isComplete && ' (Please scroll through the entire agreement first)'}
          </span>
        </label>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[48px]"
            data-testid="edit-button"
          >
            Go Back & Edit
          </button>
        )}

        {onDownloadPdf && (
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={isPdfLoading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 min-h-[48px]"
            data-testid="download-pdf-button"
          >
            {isPdfLoading ? (
              <>
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generating PDF...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download PDF
              </>
            )}
          </button>
        )}

        {onConfirm && (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!hasConfirmed || !isComplete}
            className="flex-1 px-4 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
            data-testid="confirm-button"
          >
            Ready to Sign
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Individual term preview card.
 */
interface TermPreviewCardProps {
  term: AgreementTerm
  childName: string
}

function TermPreviewCard({ term, childName }: TermPreviewCardProps) {
  const isChildTerm = term.party === 'child'
  const partyLabel = isChildTerm ? childName : 'Parent'

  return (
    <div
      className={`p-3 rounded-lg border-l-4 ${
        isChildTerm ? 'bg-pink-50 border-pink-400' : 'bg-blue-50 border-blue-400'
      }`}
      data-testid={`term-preview-${term.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm text-gray-800">{term.text}</p>
          {term.explanation && (
            <p className="text-xs text-gray-500 mt-1 italic">{term.explanation}</p>
          )}
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            isChildTerm ? 'bg-pink-200 text-pink-800' : 'bg-blue-200 text-blue-800'
          }`}
        >
          {partyLabel}
        </span>
      </div>
    </div>
  )
}
