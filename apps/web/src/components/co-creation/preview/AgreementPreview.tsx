'use client'

import { useRef } from 'react'
import type {
  AgreementPreview as AgreementPreviewType,
  AgreementMode,
  CoCreationSession,
  SessionContributor,
} from '@fledgely/contracts'
import { generateAgreementPreview, getContributionStats, AGREEMENT_MODE_LABELS } from '@fledgely/contracts'
import { AgreementSummary } from './AgreementSummary'
import { ContributionAttribution } from './ContributionAttribution'
import { ImpactSummary } from './ImpactSummary'
import { ScrollProgress } from './ScrollProgress'
import { ExportButton } from './ExportButton'
import { useScrollCompletion } from '../../../hooks/useScrollCompletion'
import { useImpactEstimate } from '../../../hooks/useImpactEstimate'
import { useAgreementExport } from '../../../hooks/useAgreementExport'

/**
 * Props for the AgreementPreview component
 */
export interface AgreementPreviewProps {
  /** Co-creation session with agreement data */
  session: CoCreationSession
  /** Generated preview data (optional - will generate if not provided) */
  preview?: AgreementPreviewType
  /** Current active contributor viewing the preview */
  activeContributor?: SessionContributor
  /** Parent's scroll completion progress (0-100) */
  parentScrollProgress?: number
  /** Child's scroll completion progress (0-100) */
  childScrollProgress?: number
  /** Whether parent has completed reading */
  parentScrollComplete?: boolean
  /** Whether child has completed reading */
  childScrollComplete?: boolean
  /** Callback when scroll completion changes */
  onScrollComplete?: (contributor: SessionContributor, complete: boolean) => void
  /** Callback when "Continue to Signing" is clicked */
  onContinueToSigning?: () => void
  /** Callback when export completes */
  onExportComplete?: () => void
  /** Whether to show simplified child-friendly language */
  simplified?: boolean
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * SigningGate Component
 * Button that gates access to signing based on scroll completion
 */
interface SigningGateProps {
  canProceed: boolean
  onContinue: () => void
}

function SigningGate({ canProceed, onContinue }: SigningGateProps) {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <button
        type="button"
        onClick={onContinue}
        disabled={!canProceed}
        className={`px-6 py-3 rounded-lg font-semibold text-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
          canProceed
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
        }`}
        aria-describedby={canProceed ? undefined : 'signing-gate-message'}
        data-testid="continue-to-signing-button"
      >
        Continue to Signing
      </button>
      {!canProceed && (
        <p
          id="signing-gate-message"
          className="text-sm text-gray-500 dark:text-gray-400 text-center"
          role="alert"
        >
          Both parent and child must read the entire agreement before signing.
        </p>
      )}
    </div>
  )
}

/**
 * AgreementPreview Component
 *
 * Story 5.5: Agreement Preview & Summary - Task 7
 *
 * Main preview page that integrates all preview components.
 * Displays the complete agreement for review before signing.
 *
 * Features:
 * - Agreement summary with all terms (AC #1)
 * - Contribution attribution showing who added what (AC #2)
 * - Plain-language summary (AC #3)
 * - Impact estimates (AC #4)
 * - Scroll tracking (anti-TLDR) (AC #5)
 * - PDF export option (AC #6)
 *
 * @example
 * ```tsx
 * <AgreementPreview
 *   session={coCreationSession}
 *   activeContributor="parent"
 *   onContinueToSigning={handleContinue}
 * />
 * ```
 */
export function AgreementPreview({
  session,
  preview: providedPreview,
  activeContributor = 'parent',
  parentScrollProgress: externalParentProgress,
  childScrollProgress: externalChildProgress,
  parentScrollComplete: externalParentComplete,
  childScrollComplete: externalChildComplete,
  onScrollComplete,
  onContinueToSigning,
  onExportComplete,
  simplified = false,
  className = '',
  'data-testid': dataTestId = 'agreement-preview',
}: AgreementPreviewProps) {
  // Generate preview if not provided
  const preview = providedPreview ?? generateAgreementPreview(session)

  // Get agreement mode from session (default to 'full' for backwards compatibility)
  const agreementMode: AgreementMode = session.agreementMode ?? 'full'

  // Ref for scroll tracking container
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Internal scroll tracking for current contributor
  const {
    scrollPercentage: internalScrollPercentage,
    isComplete: internalScrollComplete,
  } = useScrollCompletion(scrollContainerRef, {
    threshold: 90,
    enabled: true,
  })

  // Determine actual scroll values (external takes precedence if provided)
  const parentProgress =
    activeContributor === 'parent'
      ? externalParentProgress ?? internalScrollPercentage
      : externalParentProgress ?? 0
  const childProgress =
    activeContributor === 'child'
      ? externalChildProgress ?? internalScrollPercentage
      : externalChildProgress ?? 0
  const parentComplete =
    activeContributor === 'parent'
      ? externalParentComplete ?? internalScrollComplete
      : externalParentComplete ?? false
  const childComplete =
    activeContributor === 'child'
      ? externalChildComplete ?? internalScrollComplete
      : externalChildComplete ?? false

  // Notify parent of scroll completion
  if (onScrollComplete && internalScrollComplete) {
    onScrollComplete(activeContributor, true)
  }

  // Can proceed to signing when both have read
  const canProceedToSigning = parentComplete && childComplete

  // Impact estimates
  const { impact, hasImpact } = useImpactEstimate(preview.terms)

  // Contribution stats
  const stats = getContributionStats(session.contributions)

  // Export functionality
  const { exportToPdf, openPrintDialog, isExporting } = useAgreementExport({
    preview,
    title: 'Family Agreement Preview',
    onExportComplete,
  })

  // Handle continue to signing
  const handleContinueToSigning = () => {
    if (canProceedToSigning && onContinueToSigning) {
      onContinueToSigning()
    }
  }

  return (
    <div
      className={`flex flex-col h-full bg-white dark:bg-gray-950 ${className}`}
      data-testid={dataTestId}
      data-agreement-preview
    >
      {/* Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Agreement Preview
              </h1>
              {/* Mode Badge */}
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  agreementMode === 'agreement_only'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                }`}
                data-testid="preview-mode-badge"
              >
                {AGREEMENT_MODE_LABELS[agreementMode]}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Review your family agreement before signing
            </p>
          </div>
          <ExportButton
            onExportPdf={exportToPdf}
            onPrint={openPrintDialog}
            isExporting={isExporting}
            data-testid="export-button"
          />
        </div>
      </header>

      {/* Scroll Progress Tracker - Fixed at top */}
      <div className="flex-shrink-0 px-6 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <ScrollProgress
          parentProgress={parentProgress}
          childProgress={childProgress}
          parentComplete={parentComplete}
          childComplete={childComplete}
          activeContributor={activeContributor}
          data-testid="scroll-progress"
        />
      </div>

      {/* Scrollable Content Area */}
      <main
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-6 py-6"
        data-testid="preview-content"
      >
        <div className="max-w-3xl mx-auto space-y-8">
          {/* Agreement Summary */}
          <section aria-labelledby="summary-heading">
            <AgreementSummary
              preview={preview}
              session={session}
              simplified={simplified}
              showCommitments
              showContributions
              data-testid="agreement-summary"
            />
          </section>

          {/* Contribution Attribution */}
          <section aria-labelledby="attribution-heading">
            <h2
              id="attribution-heading"
              className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4"
            >
              Who Contributed What
            </h2>
            <ContributionAttribution
              contributions={preview.contributions}
              showTimeline={false}
              showPercentage
              data-testid="contribution-attribution"
            />
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">Parent contributed:</span> {stats.parentAdded} terms
                ({stats.parentPercentage}%)
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                <span className="font-medium">Child contributed:</span> {stats.childAdded} terms
                ({stats.childPercentage}%)
              </p>
            </div>
          </section>

          {/* Impact Summary */}
          {hasImpact && (
            <section aria-labelledby="impact-heading">
              <h2
                id="impact-heading"
                className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4"
              >
                What This Means
              </h2>
              <ImpactSummary
                impact={impact}
                agreementMode={agreementMode}
                simplifiedMode={simplified}
                data-testid="impact-summary"
              />
            </section>
          )}

          {/* Signatures Placeholder */}
          <section
            aria-labelledby="signatures-heading"
            className="border-t border-gray-200 dark:border-gray-700 pt-8"
          >
            <h2
              id="signatures-heading"
              className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4"
            >
              Signatures
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Parent Signature
                </p>
                <div className="h-16 border-b-2 border-dashed border-gray-300 dark:border-gray-600" />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Date: _______________
                </p>
              </div>
              <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Child Signature
                </p>
                <div className="h-16 border-b-2 border-dashed border-gray-300 dark:border-gray-600" />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Date: _______________
                </p>
              </div>
            </div>
          </section>

          {/* Footer with timestamp */}
          <footer className="text-center text-xs text-gray-400 dark:text-gray-500 pt-4 print-footer">
            <p>Generated by Fledgely on {new Date(preview.generatedAt).toLocaleDateString()}</p>
            <p className="mt-1">Session ID: {preview.sessionId}</p>
          </footer>
        </div>
      </main>

      {/* Fixed Footer - Continue to Signing */}
      <footer className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
        <SigningGate canProceed={canProceedToSigning} onContinue={handleContinueToSigning} />
      </footer>
    </div>
  )
}

export default AgreementPreview
