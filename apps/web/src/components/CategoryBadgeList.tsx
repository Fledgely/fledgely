/**
 * CategoryBadgeList Component
 *
 * Story 20.4: Multi-Label Classification - AC4, AC5
 *
 * Displays classification categories with support for primary and secondary categories.
 * - Gallery variant: Shows only primary category (AC4: avoid clutter)
 * - Detail variant: Shows all categories with confidence scores (AC5)
 */

import { type Category, type SecondaryCategory } from '@fledgely/shared'
import { formatCategoryForDisplay } from '../lib/categories'

export interface CategoryBadgeListProps {
  /** Primary category name */
  primaryCategory: Category
  /** Primary category confidence score (0-100) */
  primaryConfidence: number
  /** Secondary categories with their confidence scores */
  secondaryCategories?: SecondaryCategory[]
  /** Display variant: 'gallery' shows primary only, 'detail' shows all */
  variant: 'gallery' | 'detail'
  /** Additional CSS class names */
  className?: string
}

const styles = {
  container: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    padding: '4px 8px',
    borderRadius: '9999px',
    fontWeight: 500,
  },
  secondaryBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    padding: '3px 6px',
    borderRadius: '9999px',
    fontWeight: 400,
    opacity: 0.85,
  },
  confidence: {
    fontSize: '10px',
    opacity: 0.75,
    marginLeft: '2px',
  },
}

/**
 * CategoryBadgeList - Displays primary and optionally secondary categories.
 *
 * Story 20.4: Multi-Label Classification - AC4, AC5
 *
 * Features:
 * - Gallery variant shows only primary category for clean gallery views
 * - Detail variant shows all categories with confidence scores
 * - Color-coded badges match category colors
 * - Accessible with ARIA attributes
 */
export default function CategoryBadgeList({
  primaryCategory,
  primaryConfidence,
  secondaryCategories = [],
  variant,
  className,
}: CategoryBadgeListProps) {
  const primaryDisplay = formatCategoryForDisplay(primaryCategory)

  // Gallery variant: only show primary category
  if (variant === 'gallery') {
    return (
      <span
        className={`${primaryDisplay.badgeClass} ${className || ''}`}
        style={styles.badge}
        role="status"
        aria-label={`Category: ${primaryDisplay.displayName}`}
      >
        <span>{primaryDisplay.displayName}</span>
      </span>
    )
  }

  // Detail variant: show all categories with confidence
  return (
    <span style={styles.container} className={className}>
      {/* Primary category badge */}
      <span
        className={primaryDisplay.badgeClass}
        style={styles.badge}
        role="status"
        aria-label={`Primary category: ${primaryDisplay.displayName}, ${primaryConfidence}% confidence`}
      >
        <span>{primaryDisplay.displayName}</span>
        <span style={styles.confidence}>({primaryConfidence}%)</span>
      </span>

      {/* Secondary category badges */}
      {secondaryCategories.map((secondary) => {
        const secondaryDisplay = formatCategoryForDisplay(secondary.category)
        return (
          <span
            key={secondary.category}
            className={secondaryDisplay.badgeClass}
            style={styles.secondaryBadge}
            role="status"
            aria-label={`Secondary category: ${secondaryDisplay.displayName}, ${secondary.confidence}% confidence`}
          >
            <span>{secondaryDisplay.displayName}</span>
            <span style={styles.confidence}>({secondary.confidence}%)</span>
          </span>
        )
      })}
    </span>
  )
}

/**
 * Simple category badge for single-category display.
 *
 * Story 20.4: Multi-Label Classification - AC4
 *
 * Convenience component for backward compatibility with existing single-category usage.
 */
export function CategoryBadge({ category, className }: { category: Category; className?: string }) {
  return (
    <CategoryBadgeList
      primaryCategory={category}
      primaryConfidence={100}
      variant="gallery"
      className={className}
    />
  )
}
