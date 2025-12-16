/**
 * Template Library - Main Export File
 *
 * Story 4.1: Template Library Structure
 *
 * This file exports all bundled agreement templates and provides
 * helper functions for filtering and searching templates.
 *
 * Templates are bundled in code (not Firestore) for:
 * - Performance (S3: Bundled Templates Strategy)
 * - Offline browsing capability
 * - Version control with application
 */

import {
  agreementTemplateSchema,
  type AgeGroup,
  type AgreementTemplate,
  type TemplateConcern,
  type TemplateVariation,
} from '../../agreement-template.schema'
import { ages5to7Templates } from './ages-5-7'
import { ages8to10Templates } from './ages-8-10'
import { ages11to13Templates } from './ages-11-13'
import { ages14to16Templates } from './ages-14-16'

// ============================================
// TEMPLATE EXPORTS
// ============================================

/**
 * Re-export individual age group templates for direct access
 */
export { ages5to7Templates } from './ages-5-7'
export { ages8to10Templates } from './ages-8-10'
export { ages11to13Templates } from './ages-11-13'
export { ages14to16Templates } from './ages-14-16'

/**
 * All templates combined (12 total: 4 age groups × 3 variations)
 */
export const ALL_TEMPLATES: AgreementTemplate[] = [
  ...ages5to7Templates,
  ...ages8to10Templates,
  ...ages11to13Templates,
  ...ages14to16Templates,
]

/**
 * Templates organized by age group for quick access
 */
export const TEMPLATES_BY_AGE_GROUP: Record<AgeGroup, AgreementTemplate[]> = {
  '5-7': ages5to7Templates,
  '8-10': ages8to10Templates,
  '11-13': ages11to13Templates,
  '14-16': ages14to16Templates,
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all templates in the library
 *
 * @returns Array of all agreement templates (12 total)
 *
 * @example
 * const templates = getAllTemplates()
 * console.log(templates.length) // 12
 */
export function getAllTemplates(): AgreementTemplate[] {
  return [...ALL_TEMPLATES]
}

/**
 * Get templates filtered by age group
 *
 * @param ageGroup - The age group to filter by ('5-7', '8-10', '11-13', '14-16')
 * @returns Array of templates for the specified age group (3 templates per age group)
 *
 * @example
 * const youngChildTemplates = getTemplatesByAgeGroup('5-7')
 * console.log(youngChildTemplates.length) // 3 (strict, balanced, permissive)
 */
export function getTemplatesByAgeGroup(ageGroup: AgeGroup): AgreementTemplate[] {
  return [...TEMPLATES_BY_AGE_GROUP[ageGroup]]
}

/**
 * Get templates filtered by one or more concerns
 *
 * @param concerns - Array of concerns to filter by
 * @param templates - Optional array of templates to filter (defaults to all templates)
 * @returns Templates that include at least one of the specified concerns
 *
 * @example
 * // Get all templates that address gaming
 * const gamingTemplates = filterTemplatesByConcern(['gaming'])
 *
 * @example
 * // Get templates for ages 11-13 that address social media or safety
 * const ageTemplates = getTemplatesByAgeGroup('11-13')
 * const filtered = filterTemplatesByConcern(['social_media', 'safety'], ageTemplates)
 */
export function filterTemplatesByConcern(
  concerns: TemplateConcern[],
  templates: AgreementTemplate[] = ALL_TEMPLATES
): AgreementTemplate[] {
  if (concerns.length === 0) {
    return [...templates]
  }

  return templates.filter((template) =>
    concerns.some((concern) => template.concerns.includes(concern))
  )
}

/**
 * Get templates filtered by variation
 *
 * @param variation - The variation to filter by ('strict', 'balanced', 'permissive')
 * @param templates - Optional array of templates to filter (defaults to all templates)
 * @returns Templates with the specified variation
 *
 * @example
 * // Get all balanced templates
 * const balancedTemplates = filterTemplatesByVariation('balanced')
 */
export function filterTemplatesByVariation(
  variation: TemplateVariation,
  templates: AgreementTemplate[] = ALL_TEMPLATES
): AgreementTemplate[] {
  return templates.filter((template) => template.variation === variation)
}

/**
 * Search templates by name or description
 *
 * @param query - Search query (case-insensitive)
 * @param templates - Optional array of templates to search (defaults to all templates)
 * @returns Templates whose name or description contains the query
 *
 * @example
 * const strictTemplates = searchTemplates('strict')
 * const balancedTemplates = searchTemplates('balanced')
 */
export function searchTemplates(
  query: string,
  templates: AgreementTemplate[] = ALL_TEMPLATES
): AgreementTemplate[] {
  const lowerQuery = query.toLowerCase().trim()

  if (!lowerQuery) {
    return [...templates]
  }

  return templates.filter(
    (template) =>
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Get a specific template by ID
 *
 * @param id - Template UUID
 * @returns The template if found, undefined otherwise
 *
 * @example
 * const template = getTemplateById('a5c3e8b0-1234-4567-8901-abcdef123456')
 */
export function getTemplateById(id: string): AgreementTemplate | undefined {
  return ALL_TEMPLATES.find((template) => template.id === id)
}

/**
 * Advanced template search with multiple filters
 *
 * @param options - Search options
 * @returns Filtered array of templates
 *
 * @example
 * const results = findTemplates({
 *   ageGroup: '11-13',
 *   concerns: ['social_media', 'gaming'],
 *   variation: 'balanced',
 *   query: 'trust'
 * })
 */
export function findTemplates(options: {
  ageGroup?: AgeGroup
  concerns?: TemplateConcern[]
  variation?: TemplateVariation
  query?: string
}): AgreementTemplate[] {
  let results = [...ALL_TEMPLATES]

  // Filter by age group
  if (options.ageGroup) {
    results = results.filter((t) => t.ageGroup === options.ageGroup)
  }

  // Filter by concerns
  if (options.concerns && options.concerns.length > 0) {
    results = filterTemplatesByConcern(options.concerns, results)
  }

  // Filter by variation
  if (options.variation) {
    results = results.filter((t) => t.variation === options.variation)
  }

  // Filter by search query
  if (options.query) {
    results = searchTemplates(options.query, results)
  }

  return results
}

/**
 * Get template counts by age group
 *
 * @returns Object with count of templates per age group
 *
 * @example
 * const counts = getTemplateCountsByAgeGroup()
 * // { '5-7': 3, '8-10': 3, '11-13': 3, '14-16': 3 }
 */
export function getTemplateCountsByAgeGroup(): Record<AgeGroup, number> {
  return {
    '5-7': ages5to7Templates.length,
    '8-10': ages8to10Templates.length,
    '11-13': ages11to13Templates.length,
    '14-16': ages14to16Templates.length,
  }
}

/**
 * Get template counts by concern
 *
 * @returns Object with count of templates per concern
 *
 * @example
 * const counts = getTemplateCountsByConcern()
 * // { gaming: 8, social_media: 10, homework: 6, screen_time: 12, safety: 12 }
 */
export function getTemplateCountsByConcern(): Record<TemplateConcern, number> {
  const concerns: TemplateConcern[] = ['gaming', 'social_media', 'homework', 'screen_time', 'safety']
  const counts: Record<TemplateConcern, number> = {
    gaming: 0,
    social_media: 0,
    homework: 0,
    screen_time: 0,
    safety: 0,
  }

  for (const template of ALL_TEMPLATES) {
    for (const concern of template.concerns) {
      counts[concern]++
    }
  }

  return counts
}

/**
 * Validate that all bundled templates pass schema validation
 * Used for testing and startup validation
 *
 * @returns Object with validation results
 */
export function validateAllTemplates(): {
  valid: boolean
  totalCount: number
  errors: Array<{ templateId: string; error: string }>
} {
  const errors: Array<{ templateId: string; error: string }> = []

  for (const template of ALL_TEMPLATES) {
    const result = agreementTemplateSchema.safeParse(template)
    if (!result.success) {
      errors.push({
        templateId: template.id,
        error: result.error.message,
      })
    }
  }

  return {
    valid: errors.length === 0,
    totalCount: ALL_TEMPLATES.length,
    errors,
  }
}
