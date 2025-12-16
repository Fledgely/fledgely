/**
 * Resource Category Component
 *
 * Story 7.3: Child Allowlist Visibility - Task 2.1
 *
 * Displays a category section with child-friendly name
 * and list of resources in that category.
 */

import type { CrisisResourceCategory, CrisisUrlEntry } from '@fledgely/shared'
import { ResourceCard } from './ResourceCard'

interface ResourceCategoryProps {
  category: CrisisResourceCategory
  resources: CrisisUrlEntry[]
  className?: string
}

/**
 * Maps technical category names to child-friendly display names
 *
 * These names are written at 6th-grade reading level (AC: 4)
 * and use direct, non-stigmatizing language.
 */
export const categoryDisplayNames: Record<CrisisResourceCategory, string> = {
  suicide: 'Feeling Hopeless or Thinking About Hurting Yourself',
  abuse: 'Someone Is Hurting You',
  crisis: 'Any Kind of Emergency Help',
  lgbtq: 'LGBTQ+ Support',
  mental_health: 'Feeling Sad, Anxious, or Overwhelmed',
  domestic_violence: 'Violence at Home',
  child_abuse: 'Adults Hurting You',
  eating_disorder: 'Problems with Food or Eating',
  substance_abuse: 'Problems with Drugs or Alcohol',
}

/**
 * Category descriptions provide additional context for children
 */
export const categoryDescriptions: Record<CrisisResourceCategory, string> = {
  suicide:
    'If you are thinking about hurting yourself, these people can help. They will listen and not judge you.',
  abuse:
    'If someone is hurting you in any way, these resources are here to help you stay safe.',
  crisis:
    "For any emergency or when you don't know who else to call.",
  lgbtq:
    'Safe people who understand LGBTQ+ experiences and can help.',
  mental_health:
    'If you feel sad, worried, or overwhelmed, talking to someone can help.',
  domestic_violence:
    'If there is violence or fighting at home, these people can help you.',
  child_abuse:
    'If an adult is hurting you or making you feel unsafe, call these numbers.',
  eating_disorder:
    'If you are struggling with eating, these people understand and want to help.',
  substance_abuse:
    'If you or someone you know has problems with drugs or alcohol.',
}

/**
 * ResourceCategory displays a category section with resources
 *
 * Features:
 * - Child-friendly category name
 * - Description explaining when to use
 * - List of resources in the category
 */
export function ResourceCategory({
  category,
  resources,
  className = '',
}: ResourceCategoryProps) {
  if (resources.length === 0) {
    return null
  }

  const headingId = `category-${category}`

  return (
    <section
      aria-labelledby={headingId}
      className={`space-y-4 ${className}`}
    >
      <div className="space-y-1">
        <h2 id={headingId} className="text-lg font-semibold">
          {categoryDisplayNames[category]}
        </h2>
        <p className="text-sm text-muted-foreground">
          {categoryDescriptions[category]}
        </p>
      </div>

      <div className="space-y-3" role="list" aria-label={`${categoryDisplayNames[category]} resources`}>
        {resources.map((resource) => (
          <div key={resource.id} role="listitem">
            <ResourceCard resource={resource} />
          </div>
        ))}
      </div>
    </section>
  )
}

/**
 * Groups resources by category
 *
 * @param resources - Array of crisis URL entries
 * @returns Map of category to resources
 */
export function groupResourcesByCategory(
  resources: CrisisUrlEntry[]
): Map<CrisisResourceCategory, CrisisUrlEntry[]> {
  const grouped = new Map<CrisisResourceCategory, CrisisUrlEntry[]>()

  for (const resource of resources) {
    const existing = grouped.get(resource.category) || []
    grouped.set(resource.category, [...existing, resource])
  }

  return grouped
}

/**
 * Gets the display order for categories
 *
 * Priority order: crisis (most urgent), suicide, abuse, child_abuse,
 * domestic_violence, then remaining alphabetically
 *
 * @returns Array of category strings in priority display order
 */
export function getCategoryDisplayOrder(): CrisisResourceCategory[] {
  return [
    'crisis',
    'suicide',
    'abuse',
    'child_abuse',
    'domestic_violence',
    'mental_health',
    'lgbtq',
    'eating_disorder',
    'substance_abuse',
  ]
}
