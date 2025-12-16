/**
 * Protected Resources List Component
 *
 * Story 7.3: Child Allowlist Visibility - Task 1.2
 *
 * Main component that displays the full list of crisis resources
 * organized by category with a privacy banner at the top.
 *
 * This component composes PrivacyBanner, ResourceCategory, and ResourceCard
 * to provide children with a complete view of protected resources.
 */

import { getCrisisAllowlist, type CrisisUrlEntry } from '@fledgely/shared'
import { PrivacyBanner } from './PrivacyBanner'
import {
  ResourceCategory,
  groupResourcesByCategory,
  getCategoryDisplayOrder,
} from './ResourceCategory'

interface ProtectedResourcesListProps {
  className?: string
  /** Optional override resources for testing */
  resources?: CrisisUrlEntry[]
}

/**
 * ProtectedResourcesList displays all crisis resources organized by category
 *
 * Features:
 * - Privacy banner prominently displayed at top (AC: 6)
 * - Resources organized by category (AC: 1)
 * - Child-friendly category names (AC: 4)
 * - Each resource shows name, description, "Always Private" badge (AC: 2)
 * - Clickable links to resources (AC: 3)
 */
export function ProtectedResourcesList({
  className = '',
  resources,
}: ProtectedResourcesListProps) {
  // Get resources from allowlist if not provided
  const allResources = resources ?? getCrisisAllowlist().entries

  // Group resources by category
  const groupedResources = groupResourcesByCategory(allResources)

  // Get display order (crisis/suicide first, then others)
  const categoryOrder = getCategoryDisplayOrder()

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Privacy banner - prominent at top (AC: 6) */}
      <PrivacyBanner />

      {/* Intro text at 6th-grade reading level (AC: 4) */}
      <div className="space-y-2">
        <p className="text-base">
          These are special websites that can help you if you need it. Your
          parents will never know if you visit them.
        </p>
        <p className="text-sm text-muted-foreground">
          Tap or click on any resource to visit their website. You can also call
          or text the numbers shown.
        </p>
      </div>

      {/* Resources organized by category (AC: 1) */}
      <div className="space-y-6" aria-label="Protected crisis resources">
        {categoryOrder.map((category) => {
          const categoryResources = groupedResources.get(category) || []
          if (categoryResources.length === 0) return null

          return (
            <ResourceCategory
              key={category}
              category={category}
              resources={categoryResources}
            />
          )
        })}
      </div>

      {/* Footer reassurance */}
      <div
        className="rounded-lg border border-green-200 bg-green-50 p-4 text-center"
        role="note"
        aria-label="Privacy reminder"
      >
        <p className="text-sm font-medium text-green-800">
          Remember: Visiting any of these sites is always private. You can get
          help anytime.
        </p>
      </div>
    </div>
  )
}

/**
 * Get total count of resources in the list
 *
 * Useful for integration tests to verify all resources are displayed.
 */
export function getResourceCount(): number {
  return getCrisisAllowlist().entries.length
}
