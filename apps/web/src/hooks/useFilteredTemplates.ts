/**
 * Filtered Templates Hook.
 *
 * Story 5.6: Agreement-Only Mode Selection - AC3
 *
 * Filters available templates based on the current agreement mode.
 * In "agreement_only" mode, templates with high monitoring levels are hidden.
 */

import { useMemo } from 'react'
import type { AgreementMode, AgreementTemplate, MonitoringLevel } from '@fledgely/shared/contracts'

interface UseFilteredTemplatesOptions {
  /** Current agreement mode */
  mode: AgreementMode
  /** Available templates to filter */
  templates: AgreementTemplate[]
}

interface UseFilteredTemplatesReturn {
  /** Filtered templates for the current mode */
  templates: AgreementTemplate[]
  /** Check if a template is available in the current mode */
  isTemplateAvailable: (template: AgreementTemplate) => boolean
  /** Count of filtered out templates */
  filteredCount: number
}

/**
 * Monitoring levels that are excluded in agreement_only mode.
 * High monitoring templates focus heavily on surveillance and aren't
 * appropriate for agreement-only families.
 */
const EXCLUDED_MONITORING_LEVELS_FOR_AGREEMENT_ONLY: MonitoringLevel[] = ['high']

/**
 * Hook to filter templates based on agreement mode.
 *
 * @param options Configuration options
 * @returns Filtered templates and helper functions
 *
 * @example
 * ```tsx
 * const { templates, isTemplateAvailable, filteredCount } = useFilteredTemplates({
 *   mode: 'agreement_only',
 *   templates: allTemplates
 * })
 *
 * // templates = templates without high monitoring level
 * // isTemplateAvailable(highMonitoringTemplate) = false
 * // filteredCount = number of excluded templates
 * ```
 */
export function useFilteredTemplates(
  options: UseFilteredTemplatesOptions
): UseFilteredTemplatesReturn {
  const { mode, templates } = options

  const isTemplateAvailable = useMemo(() => {
    if (mode === 'full_monitoring') {
      // In full monitoring mode, all templates are available
      return (_template: AgreementTemplate) => true
    }

    // In agreement_only mode, exclude high monitoring templates
    const excludedLevels = new Set(EXCLUDED_MONITORING_LEVELS_FOR_AGREEMENT_ONLY)
    return (template: AgreementTemplate) => !excludedLevels.has(template.monitoringLevel)
  }, [mode])

  const filteredTemplates = useMemo(() => {
    return templates.filter(isTemplateAvailable)
  }, [templates, isTemplateAvailable])

  const filteredCount = useMemo(() => {
    return templates.length - filteredTemplates.length
  }, [templates.length, filteredTemplates.length])

  return {
    templates: filteredTemplates,
    isTemplateAvailable,
    filteredCount,
  }
}
