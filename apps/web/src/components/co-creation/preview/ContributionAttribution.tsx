'use client'

import { useMemo } from 'react'
import type {
  ContributionSummary,
  SessionContributor,
  SessionTermType,
} from '@fledgely/contracts'
import { getContributionStats } from '@fledgely/contracts'
import { getTermTypeLabel, getTermCategoryColors, getContributorStyle } from '../builder/termUtils'

/**
 * Props for the ContributionAttribution component
 */
export interface ContributionAttributionProps {
  /** Array of contribution summaries */
  contributions: ContributionSummary[]
  /** Whether to show detailed timeline */
  showTimeline?: boolean
  /** Whether to show percentage breakdown */
  showPercentage?: boolean
  /** Additional CSS classes */
  className?: string
  /** Data attributes for testing */
  'data-testid'?: string
}

/**
 * ContributorBadge Component
 * Displays a badge showing who contributed
 */
interface ContributorBadgeProps {
  contributor: SessionContributor
  size?: 'sm' | 'md' | 'lg'
}

function ContributorBadge({ contributor, size = 'md' }: ContributorBadgeProps) {
  const style = getContributorStyle(contributor)

  const sizeClasses = {
    sm: 'w-5 h-5 text-xs',
    md: 'w-6 h-6 text-sm',
    lg: 'w-8 h-8 text-base',
  }

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold ${sizeClasses[size]} ${style.bg} ${style.text} ${style.border} border`}
      title={style.label}
      aria-label={style.label}
    >
      {style.icon}
    </span>
  )
}

/**
 * ContributionItem Component
 * Displays a single contribution entry
 */
interface ContributionItemProps {
  contribution: ContributionSummary
}

function ContributionItem({ contribution }: ContributionItemProps) {
  const categoryColors = getTermCategoryColors(contribution.category)
  const typeLabel = getTermTypeLabel(contribution.category)
  const contributorStyle = getContributorStyle(contribution.addedBy)

  const hasModifications = contribution.modifiedBy && contribution.modifiedBy.length > 0

  return (
    <li
      className="flex items-start gap-3 py-2"
      data-testid={`contribution-item-${contribution.termId}`}
    >
      {/* Contributor badge */}
      <div className="flex-shrink-0 pt-0.5">
        <ContributorBadge contributor={contribution.addedBy} size="md" />
      </div>

      {/* Contribution details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
            {contribution.termTitle}
          </span>
          <span
            className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${categoryColors.bg} ${categoryColors.text}`}
          >
            {typeLabel}
          </span>
        </div>

        {/* Attribution line */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
          Added by {contributorStyle.label.toLowerCase().replace(' suggested', '')}
          {hasModifications && (
            <span className="ml-1">
              , modified by{' '}
              {contribution.modifiedBy!.map((m, i) => (
                <span key={i}>
                  {i > 0 && ', '}
                  {getContributorStyle(m).label.toLowerCase().replace(' suggested', '')}
                </span>
              ))}
            </span>
          )}
        </p>
      </div>
    </li>
  )
}

/**
 * PercentageBar Component
 * Visual representation of contribution percentages
 */
interface PercentageBarProps {
  parentPercent: number
  childPercent: number
}

function PercentageBar({ parentPercent, childPercent }: PercentageBarProps) {
  const parentStyle = getContributorStyle('parent')
  const childStyle = getContributorStyle('child')

  return (
    <div
      className="h-4 w-full rounded-full overflow-hidden flex"
      role="img"
      aria-label={`Contributions: Parent ${parentPercent}%, Child ${childPercent}%`}
    >
      <div
        className={`${parentStyle.bg.replace('bg-', 'bg-')} transition-all duration-300`}
        style={{ width: `${parentPercent}%` }}
        data-testid="percentage-bar-parent"
      />
      <div
        className={`${childStyle.bg.replace('bg-', 'bg-')} transition-all duration-300`}
        style={{ width: `${childPercent}%` }}
        data-testid="percentage-bar-child"
      />
    </div>
  )
}

/**
 * StatsDisplay Component
 * Shows contribution statistics
 */
interface StatsDisplayProps {
  stats: ReturnType<typeof getContributionStats>
}

function StatsDisplay({ stats }: StatsDisplayProps) {
  const parentStyle = getContributorStyle('parent')
  const childStyle = getContributorStyle('child')

  return (
    <div className="space-y-3" data-testid="contribution-stats">
      {/* Percentage bar */}
      <PercentageBar
        parentPercent={stats.parentPercentage}
        childPercent={stats.childPercentage}
      />

      {/* Legend */}
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-2">
          <ContributorBadge contributor="parent" size="sm" />
          <span className={`font-medium ${parentStyle.text}`}>
            Parent: {stats.parentAdded} ({stats.parentPercentage}%)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ContributorBadge contributor="child" size="sm" />
          <span className={`font-medium ${childStyle.text}`}>
            Child: {stats.childAdded} ({stats.childPercentage}%)
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * ContributionTimeline Component
 * Shows chronological contribution highlights
 */
interface ContributionTimelineProps {
  contributions: ContributionSummary[]
}

function ContributionTimeline({ contributions }: ContributionTimelineProps) {
  // Group contributions by contributor for timeline view
  const parentContributions = contributions.filter((c) => c.addedBy === 'parent')
  const childContributions = contributions.filter((c) => c.addedBy === 'child')

  return (
    <div className="grid grid-cols-2 gap-4" data-testid="contribution-timeline">
      {/* Parent side */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <ContributorBadge contributor="parent" size="md" />
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            Parent Added
          </span>
        </div>
        <ul className="space-y-1" role="list" aria-label="Parent contributions">
          {parentContributions.length > 0 ? (
            parentContributions.map((c) => (
              <li
                key={c.termId}
                className="text-sm text-gray-600 dark:text-gray-400 pl-2 border-l-2 border-indigo-300 dark:border-indigo-700"
              >
                {c.termTitle}
              </li>
            ))
          ) : (
            <li className="text-sm text-gray-400 dark:text-gray-500 italic">
              No contributions yet
            </li>
          )}
        </ul>
      </div>

      {/* Child side */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
          <ContributorBadge contributor="child" size="md" />
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            Child Added
          </span>
        </div>
        <ul className="space-y-1" role="list" aria-label="Child contributions">
          {childContributions.length > 0 ? (
            childContributions.map((c) => (
              <li
                key={c.termId}
                className="text-sm text-gray-600 dark:text-gray-400 pl-2 border-l-2 border-pink-300 dark:border-pink-700"
              >
                {c.termTitle}
              </li>
            ))
          ) : (
            <li className="text-sm text-gray-400 dark:text-gray-500 italic">
              No contributions yet
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

/**
 * ContributionAttribution Component
 *
 * Story 5.5: Agreement Preview & Summary - Task 3
 *
 * Displays who added/modified each term in the agreement.
 * Features:
 * - Contributor badges (parent/child) for each term (AC #2)
 * - Contribution timeline highlights
 * - Contribution percentage per party
 * - Visual clarity with color coding
 *
 * @example
 * ```tsx
 * <ContributionAttribution
 *   contributions={preview.contributions}
 *   showTimeline={true}
 *   showPercentage={true}
 * />
 * ```
 */
export function ContributionAttribution({
  contributions,
  showTimeline = false,
  showPercentage = true,
  className = '',
  'data-testid': dataTestId = 'contribution-attribution',
}: ContributionAttributionProps) {
  // Calculate contribution statistics
  const stats = useMemo(
    () => getContributionStats(contributions),
    [contributions]
  )

  // Group contributions by category for organized display
  const groupedContributions = useMemo(() => {
    const groups = new Map<SessionTermType, ContributionSummary[]>()

    for (const contribution of contributions) {
      const existing = groups.get(contribution.category) || []
      existing.push(contribution)
      groups.set(contribution.category, existing)
    }

    return groups
  }, [contributions])

  if (contributions.length === 0) {
    return (
      <div
        className={`text-center py-4 text-gray-500 dark:text-gray-400 ${className}`}
        data-testid={dataTestId}
        role="status"
      >
        <p>No contributions to display.</p>
      </div>
    )
  }

  return (
    <div
      className={`space-y-6 ${className}`}
      data-testid={dataTestId}
      role="region"
      aria-label="Contribution Attribution"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Who Added What
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {contributions.length} term{contributions.length !== 1 ? 's' : ''} total
        </span>
      </div>

      {/* Percentage breakdown */}
      {showPercentage && <StatsDisplay stats={stats} />}

      {/* Timeline view */}
      {showTimeline && <ContributionTimeline contributions={contributions} />}

      {/* Detailed contribution list */}
      {!showTimeline && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Contribution Details
          </h4>
          <ul
            className="divide-y divide-gray-100 dark:divide-gray-800"
            role="list"
            aria-label="List of contributions"
          >
            {contributions.map((contribution) => (
              <ContributionItem
                key={contribution.termId}
                contribution={contribution}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Summary statement */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {stats.parentPercentage > stats.childPercentage ? (
            <>
              <span className="font-medium text-indigo-600 dark:text-indigo-400">
                Parent
              </span>{' '}
              contributed more terms to this agreement.
            </>
          ) : stats.childPercentage > stats.parentPercentage ? (
            <>
              <span className="font-medium text-pink-600 dark:text-pink-400">
                Child
              </span>{' '}
              contributed more terms to this agreement.
            </>
          ) : (
            <>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                Both
              </span>{' '}
              contributed equally to this agreement!
            </>
          )}
        </p>
      </div>
    </div>
  )
}

export default ContributionAttribution
