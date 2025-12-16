/**
 * useAgreementModeTerms Hook
 *
 * Story 5.6: Agreement-Only Mode Selection - Task 3
 *
 * Hook for filtering terms and sections based on agreement mode.
 * In Agreement Only mode, monitoring-related terms and sections are excluded.
 */

import { useMemo } from 'react'
import type { SessionTerm, AgreementMode, SessionTermType, TemplateSection } from '@fledgely/contracts'
import {
  filterTermsForMode,
  filterSectionsForMode,
  getAvailableTermTypesForMode,
  getHiddenSectionTypesForMode,
  AGREEMENT_MODE_LABELS,
  isMonitoringTermType,
} from '@fledgely/contracts'

/**
 * Return type for the useAgreementModeTerms hook
 */
export interface UseAgreementModeTermsReturn {
  /** Terms filtered for the current mode (excludes monitoring in agreement_only) */
  visibleTerms: SessionTerm[]
  /** Whether monitoring terms can be added in this mode */
  canAddMonitoringTerm: boolean
  /** Term types that are filtered out in the current mode */
  filteredTermTypes: SessionTermType[]
  /** Available term types for the current mode */
  availableTermTypes: SessionTermType[]
  /** Human-readable label for the current mode */
  modeLabel: string
  /** Whether the current mode is agreement_only */
  isAgreementOnlyMode: boolean
  /** Hidden section types for the current mode */
  hiddenSectionTypes: string[]
  /** Helper to filter any term array for the current mode */
  filterTerms: (terms: SessionTerm[]) => SessionTerm[]
  /** Helper to filter any sections array for the current mode */
  filterSections: <T extends { type: string }>(sections: T[]) => T[]
  /** Helper to check if a term type is allowed in the current mode */
  isTermTypeAllowed: (type: SessionTermType) => boolean
}

/**
 * useAgreementModeTerms Hook
 *
 * Filters terms and sections based on agreement mode.
 * Uses memoization for efficient re-renders.
 *
 * @param terms - Array of session terms
 * @param mode - The agreement mode ('full' or 'agreement_only')
 * @returns Filtered terms, available types, and helper functions
 *
 * @example
 * ```tsx
 * const { visibleTerms, canAddMonitoringTerm, filterSections } = useAgreementModeTerms(
 *   session.terms,
 *   session.agreementMode ?? 'full'
 * )
 *
 * // Use visibleTerms in the UI
 * // Hide "Add Monitoring" button when canAddMonitoringTerm is false
 * // Filter template sections with filterSections
 * ```
 */
export function useAgreementModeTerms(
  terms: SessionTerm[],
  mode: AgreementMode
): UseAgreementModeTermsReturn {
  // Filter terms for the current mode
  const visibleTerms = useMemo(() => {
    return filterTermsForMode(terms, mode)
  }, [terms, mode])

  // Get available and filtered term types
  const availableTermTypes = useMemo(() => {
    return getAvailableTermTypesForMode(mode)
  }, [mode])

  const filteredTermTypes = useMemo<SessionTermType[]>(() => {
    if (mode === 'full') return []
    return ['monitoring'] as SessionTermType[]
  }, [mode])

  // Get hidden section types
  const hiddenSectionTypes = useMemo(() => {
    return getHiddenSectionTypesForMode(mode)
  }, [mode])

  // Create stable helper functions
  const filterTerms = useMemo(() => {
    return (termsToFilter: SessionTerm[]) => filterTermsForMode(termsToFilter, mode)
  }, [mode])

  const filterSections = useMemo(() => {
    return <T extends { type: string }>(sections: T[]) => filterSectionsForMode(sections, mode)
  }, [mode])

  const isTermTypeAllowed = useMemo(() => {
    return (type: SessionTermType) => !isMonitoringTermType(type) || mode === 'full'
  }, [mode])

  return {
    visibleTerms,
    canAddMonitoringTerm: mode === 'full',
    filteredTermTypes,
    availableTermTypes,
    modeLabel: AGREEMENT_MODE_LABELS[mode],
    isAgreementOnlyMode: mode === 'agreement_only',
    hiddenSectionTypes,
    filterTerms,
    filterSections,
    isTermTypeAllowed,
  }
}

/**
 * Helper hook to filter template sections by agreement mode
 *
 * @param sections - Array of template sections
 * @param mode - The agreement mode
 * @returns Filtered sections appropriate for the mode
 *
 * @example
 * ```tsx
 * const visibleSections = useFilteredSections(template.sections, mode)
 * ```
 */
export function useFilteredSections<T extends { type: string }>(
  sections: T[],
  mode: AgreementMode
): T[] {
  return useMemo(() => {
    return filterSectionsForMode(sections, mode)
  }, [sections, mode])
}

export default useAgreementModeTerms
