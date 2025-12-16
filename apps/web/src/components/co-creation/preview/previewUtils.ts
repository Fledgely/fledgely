/**
 * Preview Utilities for Agreement Preview & Summary
 *
 * Story 5.5: Agreement Preview & Summary - Task 2
 *
 * Provides utility functions for grouping, formatting, and
 * displaying agreement terms in the preview view.
 */

import type { SessionTerm, SessionTermType, ContributionSummary } from '@fledgely/contracts'
import { getTermTypeLabel, getTermCategoryColors, getTermCategoryIcon } from '../builder/termUtils'

// ============================================
// TERM GROUPING UTILITIES
// ============================================

/**
 * Group terms by their category/type
 * @param terms - Array of session terms
 * @returns Map of term type to terms array
 */
export function groupTermsByCategory(terms: SessionTerm[]): Map<SessionTermType, SessionTerm[]> {
  const groups = new Map<SessionTermType, SessionTerm[]>()

  for (const term of terms) {
    const existing = groups.get(term.type) || []
    existing.push(term)
    groups.set(term.type, existing)
  }

  return groups
}

/**
 * Category display order for consistent presentation
 * Ordered by logical flow: rules first, then time-based, then monitoring, then consequences/rewards
 */
export const CATEGORY_DISPLAY_ORDER: SessionTermType[] = [
  'rule',
  'screen_time',
  'bedtime',
  'monitoring',
  'consequence',
  'reward',
]

/**
 * Get sorted category groups for display
 * @param terms - Array of session terms
 * @returns Array of [category, terms] tuples in display order
 */
export function getSortedCategoryGroups(
  terms: SessionTerm[]
): Array<[SessionTermType, SessionTerm[]]> {
  const groups = groupTermsByCategory(terms)
  const sorted: Array<[SessionTermType, SessionTerm[]]> = []

  for (const category of CATEGORY_DISPLAY_ORDER) {
    const categoryTerms = groups.get(category)
    if (categoryTerms && categoryTerms.length > 0) {
      sorted.push([category, categoryTerms])
    }
  }

  return sorted
}

// ============================================
// SECTION HEADER UTILITIES
// ============================================

/**
 * Child-friendly section descriptions (NFR65: 6th-grade reading level)
 */
export const SECTION_DESCRIPTIONS: Record<SessionTermType, string> = {
  rule: 'These are the main rules we agreed on together.',
  screen_time: 'This is how much time you can use screens each day.',
  bedtime: 'This is when devices need to be turned off.',
  monitoring: 'This is how parents will help keep you safe online.',
  consequence: 'This is what happens if the rules are not followed.',
  reward: 'These are good things that happen when you follow the rules.',
}

/**
 * Get child-friendly section description
 * @param type - The term type
 * @returns Child-friendly description
 */
export function getSectionDescription(type: SessionTermType): string {
  return SECTION_DESCRIPTIONS[type]
}

/**
 * Get section header info for a term category
 * @param type - The term type
 * @returns Object with label, description, colors, and icon
 */
export function getSectionHeaderInfo(type: SessionTermType) {
  return {
    label: getTermTypeLabel(type),
    description: getSectionDescription(type),
    colors: getTermCategoryColors(type),
    iconPath: getTermCategoryIcon(type),
  }
}

// ============================================
// COMMITMENT DISPLAY UTILITIES
// ============================================

/**
 * Format commitment lists for display with bullet points
 * @param commitments - Array of commitment strings
 * @returns Formatted array of commitment objects
 */
export function formatCommitmentsForDisplay(commitments: string[]): Array<{
  id: string
  text: string
}> {
  return commitments.map((text, index) => ({
    id: `commitment-${index}`,
    text,
  }))
}

// ============================================
// CONTRIBUTION ATTRIBUTION HELPERS
// ============================================

/**
 * Get contribution info for a term
 * @param termId - The term ID to find contribution for
 * @param contributions - Array of contribution summaries
 * @returns Contribution summary or null
 */
export function getContributionForTerm(
  termId: string,
  contributions: ContributionSummary[]
): ContributionSummary | null {
  return contributions.find((c) => c.termId === termId) || null
}

/**
 * Format contributor display name
 * @param contributor - 'parent' or 'child'
 * @returns Formatted display name
 */
export function formatContributorName(contributor: 'parent' | 'child'): string {
  return contributor === 'parent' ? 'Parent' : 'Child'
}

// ============================================
// READING LEVEL UTILITIES (NFR65)
// ============================================

/**
 * Simplified term type names for young readers
 */
export const SIMPLE_CATEGORY_NAMES: Record<SessionTermType, string> = {
  rule: 'Rules',
  screen_time: 'Screen Time',
  bedtime: 'Bedtime',
  monitoring: 'Safety Checks',
  consequence: 'What Happens If...',
  reward: 'Good Things',
}

/**
 * Get simplified category name for young readers
 * @param type - The term type
 * @returns Simple, child-friendly name
 */
export function getSimpleCategoryName(type: SessionTermType): string {
  return SIMPLE_CATEGORY_NAMES[type]
}

// ============================================
// TERM COUNT UTILITIES
// ============================================

/**
 * Get count of terms by status
 * @param terms - Array of session terms
 * @returns Object with counts by status
 */
export function getTermCountsByStatus(terms: SessionTerm[]): {
  accepted: number
  discussion: number
  removed: number
  total: number
} {
  let accepted = 0
  let discussion = 0
  let removed = 0

  for (const term of terms) {
    switch (term.status) {
      case 'accepted':
        accepted++
        break
      case 'discussion':
        discussion++
        break
      case 'removed':
        removed++
        break
    }
  }

  return {
    accepted,
    discussion,
    removed,
    total: terms.length,
  }
}

/**
 * Get acceptance summary text
 * @param counts - Term counts object
 * @returns Human-readable summary
 */
export function getAcceptanceSummaryText(counts: {
  accepted: number
  total: number
}): string {
  const percentage = counts.total > 0
    ? Math.round((counts.accepted / counts.total) * 100)
    : 0
  return `${counts.accepted} of ${counts.total} terms accepted (${percentage}%)`
}
