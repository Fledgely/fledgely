/**
 * Template Service for agreement templates.
 *
 * Story 4.1: Template Library Structure - AC1, AC2, AC4, AC6
 *
 * Provides functions to fetch, filter, and search templates.
 * Uses static data for MVP (can be migrated to Firestore later).
 */

import type { AgreementTemplate, AgeGroup, TemplateCategory } from '@fledgely/shared/contracts'
import { AGREEMENT_TEMPLATES } from '../data/templates'

/**
 * Filter options for templates.
 */
export interface TemplateFilters {
  ageGroup?: AgeGroup
  categories?: TemplateCategory[]
  searchQuery?: string
}

/**
 * Get all available templates.
 *
 * @returns Promise resolving to all templates
 */
export async function getTemplates(): Promise<AgreementTemplate[]> {
  // Simulate async operation for future Firestore migration
  return Promise.resolve(AGREEMENT_TEMPLATES)
}

/**
 * Get templates filtered by age group.
 *
 * @param ageGroup - The age group to filter by
 * @returns Promise resolving to filtered templates
 */
export async function getTemplatesByAgeGroup(ageGroup: AgeGroup): Promise<AgreementTemplate[]> {
  const templates = await getTemplates()
  return templates.filter((t) => t.ageGroup === ageGroup)
}

/**
 * Filter templates by categories.
 *
 * Templates match if they include ANY of the specified categories.
 *
 * @param categories - Categories to filter by
 * @returns Promise resolving to filtered templates
 */
export async function filterTemplatesByCategories(
  categories: TemplateCategory[]
): Promise<AgreementTemplate[]> {
  if (categories.length === 0) {
    return getTemplates()
  }

  const templates = await getTemplates()
  return templates.filter((t) => t.categories.some((c) => categories.includes(c)))
}

/**
 * Filter templates with multiple criteria.
 *
 * @param filters - Filter options
 * @returns Promise resolving to filtered templates
 */
export async function filterTemplates(filters: TemplateFilters): Promise<AgreementTemplate[]> {
  let templates = await getTemplates()

  // Filter by age group
  if (filters.ageGroup) {
    templates = templates.filter((t) => t.ageGroup === filters.ageGroup)
  }

  // Filter by categories (match any)
  if (filters.categories && filters.categories.length > 0) {
    templates = templates.filter((t) => t.categories.some((c) => filters.categories!.includes(c)))
  }

  // Filter by search query
  if (filters.searchQuery && filters.searchQuery.trim()) {
    const query = filters.searchQuery.toLowerCase().trim()
    templates = templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.keyRules.some((rule) => rule.toLowerCase().includes(query))
    )
  }

  return templates
}

/**
 * Search templates by text query.
 *
 * Searches template name, description, and key rules.
 *
 * @param query - Search query string
 * @returns Promise resolving to matching templates
 */
export async function searchTemplates(query: string): Promise<AgreementTemplate[]> {
  if (!query || !query.trim()) {
    return getTemplates()
  }

  return filterTemplates({ searchQuery: query })
}

/**
 * Get a single template by ID.
 *
 * @param id - Template ID
 * @returns Promise resolving to template or null if not found
 */
export async function getTemplateById(id: string): Promise<AgreementTemplate | null> {
  const templates = await getTemplates()
  return templates.find((t) => t.id === id) ?? null
}

/**
 * Get templates count by age group.
 *
 * @returns Promise resolving to count per age group
 */
export async function getTemplateCountByAgeGroup(): Promise<Record<AgeGroup, number>> {
  const templates = await getTemplates()
  const counts: Record<string, number> = {
    '5-7': 0,
    '8-10': 0,
    '11-13': 0,
    '14-16': 0,
  }

  templates.forEach((t) => {
    counts[t.ageGroup]++
  })

  return counts as Record<AgeGroup, number>
}
