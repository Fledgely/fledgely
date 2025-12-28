/**
 * DiscussionTermCard Component
 *
 * Story 5.4: Negotiation & Discussion Support - Task 6
 *
 * Enhanced card variant for terms in discussion status.
 * Expands to show discussion panel with prompts, notes, suggestions, and resolution controls.
 *
 * NFR42: Screen reader accessible
 * NFR43: Full keyboard navigation
 * NFR49: 44x44px touch targets
 */

import { forwardRef, useState, useCallback, useId } from 'react'
import type {
  SessionTerm,
  SessionContributor,
  DiscussionNote,
  ResolutionStatus,
} from '@fledgely/contracts'
import {
  getTermCategoryColors,
  getTermCardClasses,
  getTermCategoryIcon,
  getTermTypeLabel,
  formatTermContentPreview,
} from '../builder/termUtils'
import { DiscussionPrompt } from './DiscussionPrompt'
import { TermNotesPanel } from './TermNotesPanel'
import { CompromiseSuggestions, type CompromiseSuggestionsProps } from './CompromiseSuggestions'
import { ResolutionControls } from './ResolutionControls'
import {
  getResolutionStatusLabel,
  type CompromiseSuggestion,
} from './discussionUtils'

// ============================================
// TYPES
// ============================================

export interface DiscussionTermCardProps {
  /** The term being discussed */
  term: SessionTerm
  /** The current contributor */
  contributor: SessionContributor
  /** Callback when a note is added */
  onAddNote: (termId: string, text: string, contributor: SessionContributor) => void
  /** Callback when a compromise suggestion is accepted */
  onAcceptCompromise: (termId: string, suggestion: CompromiseSuggestion, contributor: SessionContributor) => void
  /** Callback when agreement is marked */
  onMarkAgreement: (termId: string, contributor: SessionContributor) => void
  /** Whether the card starts expanded */
  defaultExpanded?: boolean
  /** Whether the card is disabled */
  disabled?: boolean
  /** Custom className */
  className?: string
  /** Test ID */
  'data-testid'?: string
}

// ============================================
// COMPONENT
// ============================================

export const DiscussionTermCard = forwardRef<HTMLDivElement, DiscussionTermCardProps>(
  function DiscussionTermCard(
    {
      term,
      contributor,
      onAddNote,
      onAcceptCompromise,
      onMarkAgreement,
      defaultExpanded = false,
      disabled = false,
      className = '',
      'data-testid': testId = 'discussion-term-card',
    },
    ref
  ) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded)
    const contentId = useId()
    const headerId = useId()

    // Get styling configurations
    const categoryColors = getTermCategoryColors(term.type)
    const cardClasses = getTermCardClasses(term.type)
    const iconPath = getTermCategoryIcon(term.type)
    const typeLabel = getTermTypeLabel(term.type)
    const contentPreview = formatTermContentPreview(term.type, term.content)

    // Get discussion data with defaults
    const resolutionStatus = (term.resolutionStatus ?? 'unresolved') as ResolutionStatus
    const discussionNotes = (term.discussionNotes ?? []) as DiscussionNote[]
    const acceptedSuggestionId = term.compromiseAccepted

    const statusLabel = getResolutionStatusLabel(resolutionStatus)
    const isResolved = resolutionStatus === 'resolved'

    // Handlers
    const handleToggle = useCallback(() => {
      setIsExpanded((prev) => !prev)
    }, [])

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleToggle()
        }
      },
      [handleToggle]
    )

    const handleAddNote = useCallback(
      (text: string, noteContributor: SessionContributor) => {
        onAddNote(term.id, text, noteContributor)
      },
      [onAddNote, term.id]
    )

    const handleAcceptCompromise = useCallback(
      (suggestion: CompromiseSuggestion, suggestionContributor: SessionContributor) => {
        onAcceptCompromise(term.id, suggestion, suggestionContributor)
      },
      [onAcceptCompromise, term.id]
    )

    const handleMarkAgreement = useCallback(
      (agreementContributor: SessionContributor) => {
        onMarkAgreement(term.id, agreementContributor)
      },
      [onMarkAgreement, term.id]
    )

    // Status badge styling
    const statusBadgeClasses: Record<ResolutionStatus, string> = {
      unresolved: 'bg-amber-100 text-amber-800 border-amber-300',
      'parent-agreed': 'bg-blue-100 text-blue-800 border-blue-300',
      'child-agreed': 'bg-pink-100 text-pink-800 border-pink-300',
      resolved: 'bg-green-100 text-green-800 border-green-300',
    }

    // Build container classes
    const containerClasses = [
      'relative rounded-lg overflow-hidden transition-all duration-200',
      cardClasses,
      // Discussion highlight border
      'border-l-4',
      isResolved
        ? 'border-l-green-500'
        : 'border-l-amber-500',
      // Shadow
      isExpanded ? 'shadow-lg' : 'shadow-sm',
      // Custom classes
      className,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div
        ref={ref}
        className={containerClasses}
        data-testid={testId}
        data-term-id={term.id}
        data-resolution-status={resolutionStatus}
      >
        {/* Card Header (Collapsible) */}
        <div
          role="button"
          tabIndex={0}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          className="p-4 cursor-pointer hover:bg-opacity-80 transition-colors min-h-[44px]"
          aria-expanded={isExpanded}
          aria-controls={contentId}
          id={headerId}
          data-testid="discussion-card-header"
        >
          <div className="flex items-start justify-between gap-3">
            {/* Term Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Category Icon */}
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${categoryColors.bg} ${categoryColors.border} border`}
                aria-hidden="true"
              >
                <svg
                  className={`w-5 h-5 ${categoryColors.icon}`}
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d={iconPath} />
                </svg>
              </div>

              {/* Type and Content */}
              <div className="flex-1 min-w-0">
                <span
                  className={`block font-medium ${categoryColors.text} truncate`}
                  data-testid="term-type-label"
                >
                  {typeLabel}
                </span>
                <p
                  className="text-sm text-gray-600 truncate"
                  data-testid="term-content-preview"
                >
                  {contentPreview}
                </p>
              </div>
            </div>

            {/* Status Badge and Expand Icon */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Resolution Status Badge */}
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusBadgeClasses[resolutionStatus]}`}
                data-testid="resolution-badge"
              >
                {isResolved && <span className="mr-1" aria-hidden="true">✓</span>}
                {statusLabel}
              </span>

              {/* Discussion Icon */}
              <span
                className="text-amber-500"
                aria-hidden="true"
                data-testid="discussion-icon"
              >
                💬
              </span>

              {/* Expand/Collapse Icon */}
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>

          {/* Notes count indicator */}
          {discussionNotes.length > 0 && !isExpanded && (
            <p
              className="text-xs text-gray-500 mt-2 ml-13"
              data-testid="notes-indicator"
            >
              {discussionNotes.length} note{discussionNotes.length !== 1 ? 's' : ''} in discussion
            </p>
          )}
        </div>

        {/* Expanded Panel */}
        {isExpanded && (
          <div
            id={contentId}
            role="region"
            aria-labelledby={headerId}
            className="border-t border-gray-200"
            data-testid="discussion-panel"
          >
            {/* Mobile: Stack vertically, Desktop: Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-0">
              {/* Left Column: Prompts and Notes */}
              <div className="p-4 border-b md:border-b-0 md:border-r border-gray-200">
                {/* Discussion Prompts */}
                <div className="mb-6">
                  <DiscussionPrompt
                    termType={term.type}
                    contributor={contributor}
                    showBoth
                    data-testid="card-discussion-prompt"
                  />
                </div>

                {/* Notes Panel */}
                <TermNotesPanel
                  notes={discussionNotes}
                  contributor={contributor}
                  onAddNote={handleAddNote}
                  readOnly={disabled || isResolved}
                  data-testid="card-notes-panel"
                />
              </div>

              {/* Right Column: Suggestions and Resolution */}
              <div className="p-4 space-y-6">
                {/* Compromise Suggestions */}
                {!isResolved && (
                  <CompromiseSuggestions
                    termType={term.type}
                    contributor={contributor}
                    onAcceptSuggestion={handleAcceptCompromise}
                    acceptedSuggestionId={acceptedSuggestionId}
                    disabled={disabled}
                    data-testid="card-compromise-suggestions"
                  />
                )}

                {/* Resolution Controls */}
                <ResolutionControls
                  termTitle={typeLabel}
                  status={resolutionStatus}
                  contributor={contributor}
                  onMarkAgreement={handleMarkAgreement}
                  disabled={disabled}
                  data-testid="card-resolution-controls"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
)

