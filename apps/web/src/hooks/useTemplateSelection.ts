/**
 * Template Selection Hook.
 *
 * Story 4.3: Template Preview & Selection - AC3
 *
 * Manages template selection state for the session.
 * Used to persist selected template until Epic 5 agreement co-creation.
 */

'use client'

import { useState, useCallback } from 'react'
import type { AgreementTemplate } from '@fledgely/shared/contracts'

/**
 * Hook for template selection state.
 * Simple hook-based state without context for MVP.
 */
export function useTemplateSelection() {
  const [selectedTemplate, setSelectedTemplate] = useState<AgreementTemplate | null>(null)

  const selectTemplate = useCallback((template: AgreementTemplate) => {
    setSelectedTemplate(template)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedTemplate(null)
  }, [])

  const isSelected = useCallback(
    (templateId: string) => {
      return selectedTemplate?.id === templateId
    },
    [selectedTemplate]
  )

  return {
    selectedTemplate,
    selectTemplate,
    clearSelection,
    isSelected,
  }
}

/**
 * Hook for template comparison state.
 * Manages which templates are selected for comparison (max 3).
 */
export function useTemplateComparison() {
  const [comparisonTemplates, setComparisonTemplates] = useState<AgreementTemplate[]>([])

  const addToComparison = useCallback((template: AgreementTemplate) => {
    setComparisonTemplates((prev) => {
      if (prev.length >= 3) return prev
      if (prev.some((t) => t.id === template.id)) return prev
      return [...prev, template]
    })
  }, [])

  const removeFromComparison = useCallback((templateId: string) => {
    setComparisonTemplates((prev) => prev.filter((t) => t.id !== templateId))
  }, [])

  const toggleComparison = useCallback((template: AgreementTemplate) => {
    setComparisonTemplates((prev) => {
      const exists = prev.some((t) => t.id === template.id)
      if (exists) {
        return prev.filter((t) => t.id !== template.id)
      }
      if (prev.length >= 3) return prev
      return [...prev, template]
    })
  }, [])

  const clearComparison = useCallback(() => {
    setComparisonTemplates([])
  }, [])

  const isInComparison = useCallback(
    (templateId: string) => {
      return comparisonTemplates.some((t) => t.id === templateId)
    },
    [comparisonTemplates]
  )

  const canAddMore = comparisonTemplates.length < 3
  const canCompare = comparisonTemplates.length >= 2

  return {
    comparisonTemplates,
    addToComparison,
    removeFromComparison,
    toggleComparison,
    clearComparison,
    isInComparison,
    canAddMore,
    canCompare,
  }
}
