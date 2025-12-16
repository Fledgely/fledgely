'use client'

import { useMemo } from 'react'
import type { AgreementPreview, SessionTerm, SessionTermType } from '@fledgely/contracts'
import {
  getSortedCategoryGroups,
  getSectionHeaderInfo,
  formatCommitmentsForDisplay,
  getSimpleCategoryName,
} from './previewUtils'
import { formatTermContentPreview, getContributorStyle } from '../builder/termUtils'

/**
 * Props for the AgreementSummary component
 */
export interface AgreementSummaryProps {
  /** The agreement preview data */
  preview: AgreementPreview
  /** Whether to show commitment summaries */
  showCommitments?: boolean
  /** Whether to use simplified language for younger children */
  simplifiedMode?: boolean
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * CategorySection Component
 * Displays a group of terms under a category header
 */
interface CategorySectionProps {
  category: SessionTermType
  terms: SessionTerm[]
  simplifiedMode: boolean
}

function CategorySection({ category, terms, simplifiedMode }: CategorySectionProps) {
  const headerInfo = getSectionHeaderInfo(category)
  const categoryName = simplifiedMode
    ? getSimpleCategoryName(category)
    : headerInfo.label

  return (
    <section
      aria-labelledby={`section-${category}`}
      className="mb-6 last:mb-0"
      data-testid={`category-section-${category}`}
    >
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-3">
        {/* Category Icon */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${headerInfo.colors.bg} ${headerInfo.colors.border} border-2`}
          aria-hidden="true"
        >
          <svg
            className={`w-5 h-5 ${headerInfo.colors.icon}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d={headerInfo.iconPath} />
          </svg>
        </div>

        {/* Header Text */}
        <div>
          <h3
            id={`section-${category}`}
            className={`text-lg font-semibold ${headerInfo.colors.text}`}
          >
            {categoryName}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {headerInfo.description}
          </p>
        </div>
      </div>

      {/* Terms List */}
      <ul
        className="space-y-2 pl-13"
        role="list"
        aria-label={`${categoryName} terms`}
      >
        {terms.map((term) => (
          <TermItem key={term.id} term={term} />
        ))}
      </ul>
    </section>
  )
}

/**
 * TermItem Component
 * Displays a single term in the summary list
 */
interface TermItemProps {
  term: SessionTerm
}

function TermItem({ term }: TermItemProps) {
  const contributorStyle = getContributorStyle(term.addedBy)
  const contentPreview = formatTermContentPreview(term.type, term.content)

  return (
    <li
      className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700"
      data-testid={`term-item-${term.id}`}
    >
      {/* Checkmark indicator */}
      <div
        className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center"
        aria-hidden="true"
      >
        <svg
          className="w-4 h-4 text-green-600 dark:text-green-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      {/* Term content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 dark:text-gray-200">
          {contentPreview}
        </p>
      </div>

      {/* Attribution badge */}
      <span
        className={`flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${contributorStyle.bg} ${contributorStyle.text} ${contributorStyle.border} border`}
        title={contributorStyle.label}
        aria-label={contributorStyle.label}
      >
        <span aria-hidden="true">{contributorStyle.icon}</span>
      </span>
    </li>
  )
}

/**
 * CommitmentsList Component
 * Displays commitment summaries for a party
 */
interface CommitmentsListProps {
  title: string
  commitments: string[]
  variant: 'parent' | 'child'
}

function CommitmentsList({ title, commitments, variant }: CommitmentsListProps) {
  const formattedCommitments = formatCommitmentsForDisplay(commitments)

  const bgColor = variant === 'parent'
    ? 'bg-indigo-50 dark:bg-indigo-950'
    : 'bg-pink-50 dark:bg-pink-950'

  const borderColor = variant === 'parent'
    ? 'border-indigo-200 dark:border-indigo-800'
    : 'border-pink-200 dark:border-pink-800'

  const titleColor = variant === 'parent'
    ? 'text-indigo-800 dark:text-indigo-200'
    : 'text-pink-800 dark:text-pink-200'

  const iconBg = variant === 'parent'
    ? 'bg-indigo-200 dark:bg-indigo-800'
    : 'bg-pink-200 dark:bg-pink-800'

  if (commitments.length === 0) {
    return null
  }

  return (
    <div
      className={`p-4 rounded-lg ${bgColor} border ${borderColor}`}
      data-testid={`commitments-${variant}`}
    >
      <h4 className={`font-semibold mb-3 ${titleColor} flex items-center gap-2`}>
        <span
          className={`w-6 h-6 rounded-full ${iconBg} flex items-center justify-center text-xs font-bold`}
          aria-hidden="true"
        >
          {variant === 'parent' ? 'P' : 'C'}
        </span>
        {title}
      </h4>
      <ul className="space-y-2" role="list" aria-label={title}>
        {formattedCommitments.map((commitment) => (
          <li
            key={commitment.id}
            className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
          >
            <span className="flex-shrink-0 text-gray-400" aria-hidden="true">
              &bull;
            </span>
            <span>{commitment.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * AgreementSummary Component
 *
 * Story 5.5: Agreement Preview & Summary - Task 2
 *
 * Displays all agreement terms in a final, readable format.
 * Features:
 * - Groups terms by category with visual section headers (AC #1)
 * - Plain-language commitment summaries for each party (AC #3)
 * - Child-friendly language at 6th-grade reading level (NFR65)
 * - Screen reader navigation support (NFR42)
 *
 * @example
 * ```tsx
 * <AgreementSummary
 *   preview={agreementPreview}
 *   showCommitments={true}
 *   simplifiedMode={false}
 * />
 * ```
 */
export function AgreementSummary({
  preview,
  showCommitments = true,
  simplifiedMode = false,
  className = '',
  'data-testid': dataTestId = 'agreement-summary',
}: AgreementSummaryProps) {
  // Get accepted terms only for the summary
  const acceptedTerms = useMemo(
    () => preview.terms.filter((t) => t.status === 'accepted'),
    [preview.terms]
  )

  // Group terms by category
  const categoryGroups = useMemo(
    () => getSortedCategoryGroups(acceptedTerms),
    [acceptedTerms]
  )

  // Count for screen reader announcement
  const termCount = acceptedTerms.length
  const categoryCount = categoryGroups.length

  return (
    <div
      className={`space-y-6 ${className}`}
      data-testid={dataTestId}
      role="region"
      aria-label="Agreement Summary"
    >
      {/* Summary Header */}
      <div className="text-center pb-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Our Family Agreement
        </h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Here is everything we agreed on together.
        </p>
        {/* Screen reader summary */}
        <p className="sr-only">
          This agreement has {termCount} terms across {categoryCount} categories.
        </p>
      </div>

      {/* Terms by Category */}
      {categoryGroups.length > 0 ? (
        <div className="space-y-6" role="list" aria-label="Agreement terms by category">
          {categoryGroups.map(([category, terms]) => (
            <CategorySection
              key={category}
              category={category}
              terms={terms}
              simplifiedMode={simplifiedMode}
            />
          ))}
        </div>
      ) : (
        <div
          className="text-center py-8 text-gray-500 dark:text-gray-400"
          role="status"
        >
          <p>No terms have been accepted yet.</p>
        </div>
      )}

      {/* Commitment Summaries */}
      {showCommitments && (
        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            What We Each Promise
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            These are the main things each person agreed to do.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CommitmentsList
              title="Parent Promises"
              commitments={preview.parentCommitments}
              variant="parent"
            />
            <CommitmentsList
              title="Child Promises"
              commitments={preview.childCommitments}
              variant="child"
            />
          </div>
        </div>
      )}

      {/* Agreement Generation Timestamp */}
      <div className="pt-4 text-center text-xs text-gray-400 dark:text-gray-500">
        <p>
          Generated on{' '}
          <time dateTime={preview.generatedAt}>
            {new Date(preview.generatedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </time>
        </p>
      </div>
    </div>
  )
}

export default AgreementSummary
