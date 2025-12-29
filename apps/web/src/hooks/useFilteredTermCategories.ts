/**
 * Filtered Term Categories Hook.
 *
 * Story 5.6: Agreement-Only Mode Selection - AC2, AC3
 *
 * Filters available term categories based on the current agreement mode.
 * In "agreement_only" mode, monitoring-related categories are hidden.
 */

import { useMemo } from 'react'
import type { AgreementMode, TermCategory } from '@fledgely/shared/contracts'
import { AGREEMENT_MODE_CATEGORIES } from '@fledgely/shared/contracts'

interface UseFilteredTermCategoriesOptions {
  /** Current agreement mode */
  mode: AgreementMode
}

interface UseFilteredTermCategoriesReturn {
  /** Available categories for the current mode */
  categories: TermCategory[]
  /** Check if a category is available in the current mode */
  isCategoryAvailable: (category: TermCategory) => boolean
  /** Check if monitoring is enabled */
  isMonitoringEnabled: boolean
}

/**
 * Hook to filter term categories based on agreement mode.
 *
 * @param options Configuration options
 * @returns Filtered categories and helper functions
 *
 * @example
 * ```tsx
 * const { categories, isCategoryAvailable, isMonitoringEnabled } = useFilteredTermCategories({
 *   mode: 'agreement_only'
 * })
 *
 * // categories = ['time', 'apps', 'rewards', 'general']
 * // isCategoryAvailable('monitoring') = false
 * // isMonitoringEnabled = false
 * ```
 */
export function useFilteredTermCategories(
  options: UseFilteredTermCategoriesOptions
): UseFilteredTermCategoriesReturn {
  const { mode } = options

  const categories = useMemo(() => {
    return AGREEMENT_MODE_CATEGORIES[mode]
  }, [mode])

  const isCategoryAvailable = useMemo(() => {
    const categorySet = new Set(categories)
    return (category: TermCategory) => categorySet.has(category)
  }, [categories])

  const isMonitoringEnabled = useMemo(() => {
    return mode === 'full_monitoring'
  }, [mode])

  return {
    categories,
    isCategoryAvailable,
    isMonitoringEnabled,
  }
}
