'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { AgreementTemplate } from '@fledgely/contracts'

interface UseTemplateSelectionOptions {
  /** Initial template to pre-select */
  initialTemplate?: AgreementTemplate | null
}

interface UseTemplateSelectionResult {
  /** Currently selected template */
  selectedTemplate: AgreementTemplate | null
  /** ID of selected template (convenience accessor) */
  selectedTemplateId: string | null
  /** Whether a template is currently selected */
  isSelecting: boolean
  /** Select a template for agreement creation */
  selectTemplate: (template: AgreementTemplate) => void
  /** Clear the current selection */
  clearSelection: () => void
  /** Navigate to agreement creation with selected template */
  proceedToAgreement: (childId?: string) => void
  /** Get the agreement creation URL for the selected template */
  getAgreementCreationUrl: (childId?: string) => string | null
}

/**
 * Hook for managing template selection state and navigation
 *
 * Story 4.3: Template Preview & Selection - Task 3
 *
 * Manages the state of which template is selected and provides
 * navigation to the agreement creation flow (Epic 5 integration point).
 *
 * @example
 * ```tsx
 * const {
 *   selectedTemplate,
 *   selectTemplate,
 *   proceedToAgreement,
 * } = useTemplateSelection()
 *
 * // In TemplatePreviewDialog onSelect handler
 * const handleSelect = (template: AgreementTemplate) => {
 *   selectTemplate(template)
 *   proceedToAgreement(selectedChildId)
 * }
 * ```
 */
export function useTemplateSelection(
  options: UseTemplateSelectionOptions = {}
): UseTemplateSelectionResult {
  const { initialTemplate = null } = options
  const router = useRouter()

  const [selectedTemplate, setSelectedTemplate] = useState<AgreementTemplate | null>(
    initialTemplate
  )

  // Select a template
  const selectTemplate = useCallback((template: AgreementTemplate) => {
    setSelectedTemplate(template)
  }, [])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedTemplate(null)
  }, [])

  // Build agreement creation URL
  const getAgreementCreationUrl = useCallback(
    (childId?: string): string | null => {
      if (!selectedTemplate) return null

      const params = new URLSearchParams()
      params.set('templateId', selectedTemplate.id)
      if (childId) {
        params.set('childId', childId)
      }

      return `/agreements/create?${params.toString()}`
    },
    [selectedTemplate]
  )

  // Navigate to agreement creation
  const proceedToAgreement = useCallback(
    (childId?: string) => {
      const url = getAgreementCreationUrl(childId)
      if (url) {
        router.push(url)
      }
    },
    [router, getAgreementCreationUrl]
  )

  return {
    selectedTemplate,
    selectedTemplateId: selectedTemplate?.id ?? null,
    isSelecting: selectedTemplate !== null,
    selectTemplate,
    clearSelection,
    proceedToAgreement,
    getAgreementCreationUrl,
  }
}
