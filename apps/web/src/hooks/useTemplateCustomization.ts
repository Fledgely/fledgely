/**
 * Template Customization Hook.
 *
 * Story 4.5: Template Customization Preview - AC1, AC2, AC5, AC6
 *
 * Manages customization state including modifications, custom rules,
 * removed rules, and diff tracking.
 */

'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import type { AgreementTemplate } from '@fledgely/shared/contracts'
import type { MonitoringLevel, ScreenTimeLimits, BedtimeCutoff } from './useQuickStartWizard'

/**
 * Storage key prefix for draft persistence.
 */
const DRAFT_STORAGE_KEY_PREFIX = 'fledgely-draft-'

/**
 * Rule category for custom rules.
 */
export type RuleCategory = 'time' | 'content' | 'behavior' | 'other'

/**
 * Custom rule added by parent.
 */
export interface CustomRule {
  id: string
  text: string
  category: RuleCategory
  isCustom: true
}

/**
 * Template modifications made by parent.
 */
export interface TemplateModifications {
  screenTimeLimits?: ScreenTimeLimits
  bedtimeCutoff?: BedtimeCutoff | null
  monitoringLevel?: MonitoringLevel
}

/**
 * Complete customization state.
 */
export interface CustomizationState {
  originalTemplate: AgreementTemplate
  modifications: TemplateModifications
  customRules: CustomRule[]
  removedRuleIds: Set<string>
  isDirty: boolean
}

/**
 * Maximum number of total conditions allowed (NFR60).
 */
export const MAX_CONDITIONS = 100

/**
 * Generate unique ID for custom rules.
 */
function generateRuleId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Stored draft format for localStorage.
 */
interface StoredDraft {
  templateId: string
  modifications: TemplateModifications
  customRules: CustomRule[]
  removedRuleIds: string[]
  savedAt: number
}

/**
 * Load draft from localStorage.
 */
function loadDraft(templateId: string): StoredDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const key = `${DRAFT_STORAGE_KEY_PREFIX}${templateId}`
    const stored = localStorage.getItem(key)
    if (!stored) return null
    return JSON.parse(stored) as StoredDraft
  } catch {
    return null
  }
}

/**
 * Save draft to localStorage.
 */
function saveDraft(draft: StoredDraft): void {
  if (typeof window === 'undefined') return
  try {
    const key = `${DRAFT_STORAGE_KEY_PREFIX}${draft.templateId}`
    localStorage.setItem(key, JSON.stringify(draft))
  } catch {
    // Silently fail if localStorage is full or unavailable
  }
}

/**
 * Clear draft from localStorage.
 */
function clearDraft(templateId: string): void {
  if (typeof window === 'undefined') return
  try {
    const key = `${DRAFT_STORAGE_KEY_PREFIX}${templateId}`
    localStorage.removeItem(key)
  } catch {
    // Silently fail
  }
}

/**
 * Hook for managing template customization state.
 */
export function useTemplateCustomization(template: AgreementTemplate) {
  // Load initial state from localStorage if available
  const initialState = useMemo(() => {
    const draft = loadDraft(template.id)
    if (draft && draft.templateId === template.id) {
      return {
        modifications: draft.modifications,
        customRules: draft.customRules,
        removedRuleIds: new Set(draft.removedRuleIds),
      }
    }
    return {
      modifications: {} as TemplateModifications,
      customRules: [] as CustomRule[],
      removedRuleIds: new Set<string>(),
    }
  }, [template.id])

  const [modifications, setModifications] = useState<TemplateModifications>(
    initialState.modifications
  )
  const [customRules, setCustomRules] = useState<CustomRule[]>(initialState.customRules)
  const [removedRuleIds, setRemovedRuleIds] = useState<Set<string>>(initialState.removedRuleIds)

  /**
   * Check if any changes have been made.
   */
  const isDirty = useMemo(() => {
    return (
      Object.keys(modifications).length > 0 || customRules.length > 0 || removedRuleIds.size > 0
    )
  }, [modifications, customRules, removedRuleIds])

  /**
   * Auto-save draft to localStorage when state changes.
   */
  useEffect(() => {
    if (isDirty) {
      saveDraft({
        templateId: template.id,
        modifications,
        customRules,
        removedRuleIds: Array.from(removedRuleIds),
        savedAt: Date.now(),
      })
    }
  }, [template.id, modifications, customRules, removedRuleIds, isDirty])

  /**
   * Get the current value for a field (modified or original).
   */
  const getModifiedValue = useCallback(
    <K extends keyof TemplateModifications>(field: K): TemplateModifications[K] | undefined => {
      if (field in modifications) {
        return modifications[field]
      }
      // Return original value based on field
      if (field === 'screenTimeLimits') {
        return template.screenTimeLimits as TemplateModifications[K]
      }
      if (field === 'monitoringLevel') {
        return template.monitoringLevel as TemplateModifications[K]
      }
      return undefined
    },
    [modifications, template]
  )

  /**
   * Check if a specific field has been modified.
   */
  const hasFieldChanged = useCallback(
    (field: keyof TemplateModifications): boolean => {
      return field in modifications
    },
    [modifications]
  )

  /**
   * Get the original value for a field.
   */
  const getOriginalValue = useCallback(
    <K extends keyof TemplateModifications>(field: K): TemplateModifications[K] | undefined => {
      if (field === 'screenTimeLimits') {
        return template.screenTimeLimits as TemplateModifications[K]
      }
      if (field === 'monitoringLevel') {
        return template.monitoringLevel as TemplateModifications[K]
      }
      return undefined
    },
    [template]
  )

  /**
   * Update screen time limits.
   */
  const setScreenTimeLimits = useCallback((limits: ScreenTimeLimits) => {
    setModifications((prev) => ({
      ...prev,
      screenTimeLimits: limits,
    }))
  }, [])

  /**
   * Update bedtime cutoff.
   */
  const setBedtimeCutoff = useCallback((bedtime: BedtimeCutoff | null) => {
    setModifications((prev) => ({
      ...prev,
      bedtimeCutoff: bedtime,
    }))
  }, [])

  /**
   * Update monitoring level.
   */
  const setMonitoringLevel = useCallback((level: MonitoringLevel) => {
    setModifications((prev) => ({
      ...prev,
      monitoringLevel: level,
    }))
  }, [])

  /**
   * Get total rule count (template + custom - removed).
   */
  const totalRuleCount = useMemo(() => {
    const templateRuleCount = template.keyRules?.length || 0
    // Only count actually removed rules (bounded by template rule count)
    const actuallyRemoved = Math.min(removedRuleIds.size, templateRuleCount)
    const activeTemplateRules = templateRuleCount - actuallyRemoved
    return activeTemplateRules + customRules.length
  }, [template.keyRules, customRules, removedRuleIds])

  /**
   * Check if more rules can be added.
   */
  const canAddMoreRules = useMemo(() => {
    return totalRuleCount < MAX_CONDITIONS
  }, [totalRuleCount])

  /**
   * Add a custom rule.
   */
  const addCustomRule = useCallback(
    (text: string, category: RuleCategory = 'other'): boolean => {
      if (!canAddMoreRules) {
        return false
      }
      if (!text.trim()) {
        return false
      }
      const newRule: CustomRule = {
        id: generateRuleId(),
        text: text.trim(),
        category,
        isCustom: true,
      }
      setCustomRules((prev) => [...prev, newRule])
      return true
    },
    [canAddMoreRules]
  )

  /**
   * Remove a custom rule.
   */
  const removeCustomRule = useCallback((ruleId: string) => {
    setCustomRules((prev) => prev.filter((rule) => rule.id !== ruleId))
  }, [])

  /**
   * Remove a template rule (mark as removed).
   */
  const removeTemplateRule = useCallback((ruleIndex: number) => {
    const ruleId = `template-${ruleIndex}`
    setRemovedRuleIds((prev) => new Set([...prev, ruleId]))
  }, [])

  /**
   * Restore a removed template rule.
   */
  const restoreTemplateRule = useCallback((ruleIndex: number) => {
    const ruleId = `template-${ruleIndex}`
    setRemovedRuleIds((prev) => {
      const newSet = new Set(prev)
      newSet.delete(ruleId)
      return newSet
    })
  }, [])

  /**
   * Check if a template rule is removed.
   */
  const isTemplateRuleRemoved = useCallback(
    (ruleIndex: number): boolean => {
      return removedRuleIds.has(`template-${ruleIndex}`)
    },
    [removedRuleIds]
  )

  /**
   * Revert all customizations to original.
   */
  const revertToOriginal = useCallback(() => {
    setModifications({})
    setCustomRules([])
    setRemovedRuleIds(new Set())
    clearDraft(template.id)
  }, [template.id])

  /**
   * Get customization summary for draft saving.
   */
  const getCustomizationSummary = useCallback(() => {
    return {
      templateId: template.id,
      templateName: template.name,
      modifications,
      customRules,
      removedRuleIds: Array.from(removedRuleIds),
      isDirty,
      totalRuleCount,
    }
  }, [template, modifications, customRules, removedRuleIds, isDirty, totalRuleCount])

  /**
   * Get current values (with modifications applied).
   */
  const currentValues = useMemo(() => {
    return {
      screenTimeLimits: modifications.screenTimeLimits ||
        template.screenTimeLimits || { weekday: 60, weekend: 120 },
      bedtimeCutoff: modifications.bedtimeCutoff !== undefined ? modifications.bedtimeCutoff : null,
      monitoringLevel: modifications.monitoringLevel || template.monitoringLevel || 'medium',
    }
  }, [modifications, template])

  return {
    // State
    originalTemplate: template,
    modifications,
    customRules,
    removedRuleIds,
    isDirty,

    // Current values
    currentValues,

    // Field helpers
    getModifiedValue,
    getOriginalValue,
    hasFieldChanged,

    // Field setters
    setScreenTimeLimits,
    setBedtimeCutoff,
    setMonitoringLevel,

    // Rule management
    totalRuleCount,
    canAddMoreRules,
    addCustomRule,
    removeCustomRule,
    removeTemplateRule,
    restoreTemplateRule,
    isTemplateRuleRemoved,

    // Actions
    revertToOriginal,
    getCustomizationSummary,
  }
}
