'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import type { AgreementTemplate } from '@fledgely/contracts'

/**
 * Draft types from Epic 4
 */

/**
 * WizardDraft from Story 4.4 Quick Start Wizard
 * Storage key: 'quick-start-wizard'
 */
export interface WizardDraft {
  childAge: string
  templateId: string
  customizations: {
    screenTimeMinutes: number
    bedtimeCutoff: string
    monitoringLevel: string
    selectedRules: string[]
  }
  createdAt: string
}

/**
 * Custom rule created during template customization
 */
export interface CustomRule {
  id: string
  title: string
  description: string
  category: 'time' | 'apps' | 'monitoring' | 'other'
  createdAt: string
}

/**
 * TemplateDraft from Story 4.5 Template Customization
 * Storage key: 'template-draft-{childId}'
 */
export interface TemplateDraft {
  templateId: string
  childId: string
  originalTemplate: AgreementTemplate
  customizations: {
    screenTimeMinutes: number | null
    weekendScreenTimeMinutes: number | null
    bedtimeCutoff: string | null
    monitoringLevel: string | null
    rules: {
      enabled: string[]
      disabled: string[]
      custom: CustomRule[]
    }
  }
  modifiedAt: string
  createdAt: string
}

/**
 * Draft source union type
 */
export type DraftSource =
  | { type: 'wizard'; draft: WizardDraft }
  | { type: 'template_customization'; draft: TemplateDraft }
  | { type: 'blank' }

/**
 * Storage keys for different draft types
 */
const WIZARD_STORAGE_KEY = 'quick-start-wizard'
const TEMPLATE_STORAGE_KEY_PREFIX = 'template-draft-'

/**
 * URL param keys
 */
const DRAFT_TYPE_PARAM = 'draftType'
const DRAFT_ID_PARAM = 'draftId'

/**
 * Get storage key for a child's template draft
 */
function getTemplateDraftKey(childId: string): string {
  return `${TEMPLATE_STORAGE_KEY_PREFIX}${childId}`
}

/**
 * Load wizard draft from sessionStorage
 */
export function loadWizardDraft(): WizardDraft | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = sessionStorage.getItem(WIZARD_STORAGE_KEY)
    if (!stored) return null

    const parsed = JSON.parse(stored)

    // Validate essential fields
    if (
      !parsed.templateId ||
      !parsed.customizations ||
      typeof parsed.customizations.screenTimeMinutes !== 'number'
    ) {
      return null
    }

    return parsed as WizardDraft
  } catch {
    return null
  }
}

/**
 * Load template draft from sessionStorage
 */
export function loadTemplateDraft(childId: string): TemplateDraft | null {
  if (typeof window === 'undefined') return null

  try {
    const key = getTemplateDraftKey(childId)
    const stored = sessionStorage.getItem(key)
    if (!stored) return null

    const parsed = JSON.parse(stored)

    // Validate essential fields
    if (!parsed.templateId || !parsed.childId || !parsed.originalTemplate) {
      return null
    }

    return parsed as TemplateDraft
  } catch {
    return null
  }
}

/**
 * Clear wizard draft from sessionStorage
 */
export function clearWizardDraft(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(WIZARD_STORAGE_KEY)
}

/**
 * Clear template draft from sessionStorage
 */
export function clearTemplateDraft(childId: string): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(getTemplateDraftKey(childId))
}

/**
 * Hook return type
 */
export interface UseDraftLoaderReturn {
  /** The loaded draft source */
  draftSource: DraftSource
  /** Whether the draft is being loaded */
  isLoading: boolean
  /** Error message if loading failed */
  error: string | null
  /** Refresh/reload the draft */
  refresh: () => void
  /** Clear the current draft from storage */
  clearDraft: () => void
}

/**
 * Hook to load and manage draft data for co-creation session
 *
 * Story 5.1: Co-Creation Session Initiation - Task 7
 *
 * Loads draft data from either:
 * 1. URL params (draftType, draftId)
 * 2. sessionStorage (checks wizard first, then template)
 *
 * Priority:
 * 1. URL params if present
 * 2. Template draft for specific child
 * 3. Wizard draft (global)
 * 4. Blank (no draft)
 *
 * @param childId - The child ID to load draft for
 */
export function useDraftLoader(childId: string): UseDraftLoaderReturn {
  const searchParams = useSearchParams()

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [draftSource, setDraftSource] = useState<DraftSource>({ type: 'blank' })

  /**
   * Load draft based on URL params or sessionStorage
   */
  const loadDraft = useCallback(() => {
    setIsLoading(true)
    setError(null)

    try {
      // Check URL params first
      const urlDraftType = searchParams.get(DRAFT_TYPE_PARAM)
      const urlDraftId = searchParams.get(DRAFT_ID_PARAM)

      if (urlDraftType === 'wizard') {
        const wizardDraft = loadWizardDraft()
        if (wizardDraft) {
          setDraftSource({ type: 'wizard', draft: wizardDraft })
          setIsLoading(false)
          return
        }
        // Wizard draft requested but not found
        setError('Wizard draft not found. Starting fresh.')
      }

      if (urlDraftType === 'template' && urlDraftId) {
        const templateDraft = loadTemplateDraft(urlDraftId)
        if (templateDraft) {
          setDraftSource({ type: 'template_customization', draft: templateDraft })
          setIsLoading(false)
          return
        }
        // Template draft requested but not found
        setError('Template draft not found. Starting fresh.')
      }

      // No URL params - check sessionStorage priority
      // 1. First try template draft for this specific child
      const templateDraft = loadTemplateDraft(childId)
      if (templateDraft) {
        setDraftSource({ type: 'template_customization', draft: templateDraft })
        setIsLoading(false)
        return
      }

      // 2. Then try wizard draft
      const wizardDraft = loadWizardDraft()
      if (wizardDraft) {
        setDraftSource({ type: 'wizard', draft: wizardDraft })
        setIsLoading(false)
        return
      }

      // 3. No draft found - start blank
      setDraftSource({ type: 'blank' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load draft')
      setDraftSource({ type: 'blank' })
    } finally {
      setIsLoading(false)
    }
  }, [childId, searchParams])

  /**
   * Clear the current draft from storage
   */
  const clearDraft = useCallback(() => {
    if (draftSource.type === 'wizard') {
      clearWizardDraft()
    } else if (draftSource.type === 'template_customization') {
      clearTemplateDraft(draftSource.draft.childId)
    }
    setDraftSource({ type: 'blank' })
  }, [draftSource])

  // Load draft on mount and when dependencies change
  useEffect(() => {
    loadDraft()
  }, [loadDraft])

  return {
    draftSource,
    isLoading,
    error,
    refresh: loadDraft,
    clearDraft,
  }
}

/**
 * Transform draft to session terms for co-creation
 *
 * Story 5.1: Co-Creation Session Initiation - Task 7.4
 *
 * Converts WizardDraft or TemplateDraft into initial session terms
 * that can be used when creating a co-creation session.
 */
export function transformDraftToTerms(
  draftSource: DraftSource
): Array<{ type: string; content: Record<string, unknown>; addedBy: 'parent' }> {
  const terms: Array<{ type: string; content: Record<string, unknown>; addedBy: 'parent' }> = []

  if (draftSource.type === 'wizard') {
    const { customizations } = draftSource.draft

    // Screen time
    if (customizations.screenTimeMinutes) {
      terms.push({
        type: 'screen_time',
        content: {
          weekdayMinutes: customizations.screenTimeMinutes,
          source: 'wizard',
        },
        addedBy: 'parent',
      })
    }

    // Bedtime
    if (customizations.bedtimeCutoff) {
      terms.push({
        type: 'bedtime',
        content: {
          time: customizations.bedtimeCutoff,
          source: 'wizard',
        },
        addedBy: 'parent',
      })
    }

    // Monitoring level
    if (customizations.monitoringLevel) {
      terms.push({
        type: 'monitoring',
        content: {
          level: customizations.monitoringLevel,
          source: 'wizard',
        },
        addedBy: 'parent',
      })
    }

    // Rules
    customizations.selectedRules.forEach((ruleId) => {
      terms.push({
        type: 'rule',
        content: {
          ruleId,
          source: 'wizard',
        },
        addedBy: 'parent',
      })
    })
  } else if (draftSource.type === 'template_customization') {
    const { customizations, originalTemplate } = draftSource.draft

    // Screen time (weekday)
    if (customizations.screenTimeMinutes !== null) {
      terms.push({
        type: 'screen_time',
        content: {
          weekdayMinutes: customizations.screenTimeMinutes,
          weekendMinutes: customizations.weekendScreenTimeMinutes,
          source: 'template_customization',
        },
        addedBy: 'parent',
      })
    }

    // Bedtime
    if (customizations.bedtimeCutoff !== null) {
      terms.push({
        type: 'bedtime',
        content: {
          time: customizations.bedtimeCutoff,
          source: 'template_customization',
        },
        addedBy: 'parent',
      })
    }

    // Monitoring level
    if (customizations.monitoringLevel !== null) {
      terms.push({
        type: 'monitoring',
        content: {
          level: customizations.monitoringLevel,
          source: 'template_customization',
        },
        addedBy: 'parent',
      })
    }

    // Enabled template rules
    customizations.rules.enabled.forEach((ruleId) => {
      const section = originalTemplate.sections.find((s) => s.id === ruleId)
      terms.push({
        type: 'rule',
        content: {
          ruleId,
          title: section?.title,
          description: section?.description,
          source: 'template_customization',
          fromTemplate: true,
        },
        addedBy: 'parent',
      })
    })

    // Custom rules
    customizations.rules.custom.forEach((customRule) => {
      terms.push({
        type: 'rule',
        content: {
          ruleId: customRule.id,
          title: customRule.title,
          description: customRule.description,
          category: customRule.category,
          source: 'template_customization',
          fromTemplate: false,
        },
        addedBy: 'parent',
      })
    })
  }

  return terms
}

/**
 * Build URL with draft params for navigation
 */
export function buildDraftUrl(basePath: string, draftType: 'wizard' | 'template', draftId?: string): string {
  const url = new URL(basePath, 'http://localhost')
  url.searchParams.set(DRAFT_TYPE_PARAM, draftType)
  if (draftId) {
    url.searchParams.set(DRAFT_ID_PARAM, draftId)
  }
  return `${url.pathname}${url.search}`
}
