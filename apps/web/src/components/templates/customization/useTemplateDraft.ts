'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { type AgreementTemplate, type MonitoringLevel } from '@fledgely/contracts'

/**
 * Custom rule created by parent (not in original template)
 */
export interface CustomRule {
  /** Generated UUID */
  id: string
  /** Rule title */
  title: string
  /** Rule description */
  description: string
  /** Rule category */
  category: 'time' | 'apps' | 'monitoring' | 'other'
  /** When this rule was created */
  createdAt: string
}

/**
 * Customizations made to a template
 */
export interface TemplateCustomizations {
  /** Screen time in minutes (null = use original) */
  screenTimeMinutes: number | null
  /** Weekend screen time in minutes (null = use original) */
  weekendScreenTimeMinutes: number | null
  /** Bedtime cutoff time (null = use original) */
  bedtimeCutoff: string | null
  /** Monitoring level (null = use original) */
  monitoringLevel: MonitoringLevel | null
  /** Rules configuration */
  rules: {
    /** IDs of enabled template rules */
    enabled: string[]
    /** IDs of disabled template rules */
    disabled: string[]
    /** User-added custom rules */
    custom: CustomRule[]
  }
}

/**
 * Template draft saved to sessionStorage
 */
export interface TemplateDraft {
  /** Original template ID */
  templateId: string
  /** Child ID this draft is for */
  childId: string
  /** Original template for comparison */
  originalTemplate: AgreementTemplate
  /** User customizations */
  customizations: TemplateCustomizations
  /** When draft was last modified */
  modifiedAt: string
  /** When draft was created */
  createdAt: string
}

/**
 * Diff status for a field
 */
export type DiffStatus = 'original' | 'modified' | 'added' | 'removed'

/**
 * Hook return type
 */
export interface UseTemplateDraftReturn {
  /** Current draft state */
  draft: TemplateDraft | null
  /** Whether draft has unsaved changes */
  isDirty: boolean
  /** Whether draft is loading */
  isLoading: boolean

  // Actions
  /** Initialize a new draft from a template */
  initializeDraft: (template: AgreementTemplate, childId: string) => void
  /** Load existing draft from storage */
  loadDraft: (childId: string) => TemplateDraft | null
  /** Update screen time */
  setScreenTime: (minutes: number) => void
  /** Update weekend screen time */
  setWeekendScreenTime: (minutes: number) => void
  /** Update bedtime cutoff */
  setBedtimeCutoff: (time: string) => void
  /** Update monitoring level */
  setMonitoringLevel: (level: MonitoringLevel) => void
  /** Enable a template rule */
  enableRule: (ruleId: string) => void
  /** Disable a template rule */
  disableRule: (ruleId: string) => void
  /** Add a custom rule */
  addCustomRule: (rule: Omit<CustomRule, 'id' | 'createdAt'>) => void
  /** Remove a custom rule */
  removeCustomRule: (ruleId: string) => void
  /** Update a custom rule */
  updateCustomRule: (ruleId: string, updates: Partial<Omit<CustomRule, 'id' | 'createdAt'>>) => void
  /** Revert all changes to original template */
  revertToOriginal: () => void
  /** Clear draft from storage */
  clearDraft: () => void
  /** Get diff status for a field */
  getDiffStatus: (field: keyof TemplateCustomizations | string) => DiffStatus
  /** Get number of changes made */
  getChangeCount: () => number
}

const STORAGE_KEY_PREFIX = 'template-draft-'

/**
 * Get storage key for a child's draft
 */
function getStorageKey(childId: string): string {
  return `${STORAGE_KEY_PREFIX}${childId}`
}

/**
 * Generate a UUID for custom rules
 */
function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Default customizations (no changes from template)
 */
const defaultCustomizations: TemplateCustomizations = {
  screenTimeMinutes: null,
  weekendScreenTimeMinutes: null,
  bedtimeCutoff: null,
  monitoringLevel: null,
  rules: {
    enabled: [],
    disabled: [],
    custom: [],
  },
}

/**
 * Hook for managing template draft state with sessionStorage persistence
 *
 * Story 4.5: Template Customization Preview - Task 5
 * AC #5: Customized template is saved as "draft" for this child
 * AC #6: Draft persists until co-creation begins
 * AC #7: Parent can revert to original template at any time
 *
 * @param initialChildId - Optional child ID to load draft for
 */
export function useTemplateDraft(initialChildId?: string): UseTemplateDraftReturn {
  const [draft, setDraft] = useState<TemplateDraft | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDirty, setIsDirty] = useState(false)

  // Load draft from storage on mount
  useEffect(() => {
    if (initialChildId) {
      loadDraftFromStorage(initialChildId)
    }
    setIsLoading(false)
  }, [initialChildId])

  // Auto-save to storage when draft changes (debounced)
  useEffect(() => {
    if (draft && isDirty) {
      const timeoutId = setTimeout(() => {
        saveDraftToStorage(draft)
        setIsDirty(false)
      }, 500) // Debounce 500ms

      return () => clearTimeout(timeoutId)
    }
  }, [draft, isDirty])

  /**
   * Load draft from sessionStorage
   */
  const loadDraftFromStorage = useCallback((childId: string): TemplateDraft | null => {
    if (typeof window === 'undefined') return null

    try {
      const stored = sessionStorage.getItem(getStorageKey(childId))
      if (stored) {
        const parsed = JSON.parse(stored) as TemplateDraft
        setDraft(parsed)
        return parsed
      }
    } catch {
      // Ignore parse errors
    }
    return null
  }, [])

  /**
   * Save draft to sessionStorage
   */
  const saveDraftToStorage = useCallback((draftToSave: TemplateDraft) => {
    if (typeof window === 'undefined') return

    const updated: TemplateDraft = {
      ...draftToSave,
      modifiedAt: new Date().toISOString(),
    }
    sessionStorage.setItem(getStorageKey(draftToSave.childId), JSON.stringify(updated))
  }, [])

  /**
   * Initialize a new draft from a template
   */
  const initializeDraft = useCallback((template: AgreementTemplate, childId: string) => {
    // Initialize all template rules as enabled by default
    const enabledRuleIds = template.sections.map((s) => s.id)

    const newDraft: TemplateDraft = {
      templateId: template.id,
      childId,
      originalTemplate: template,
      customizations: {
        ...defaultCustomizations,
        rules: {
          enabled: enabledRuleIds,
          disabled: [],
          custom: [],
        },
      },
      modifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }

    setDraft(newDraft)
    saveDraftToStorage(newDraft)
  }, [saveDraftToStorage])

  /**
   * Load existing draft
   */
  const loadDraft = useCallback((childId: string): TemplateDraft | null => {
    return loadDraftFromStorage(childId)
  }, [loadDraftFromStorage])

  /**
   * Update draft with new customizations
   */
  const updateCustomizations = useCallback((
    updates: Partial<TemplateCustomizations>
  ) => {
    setDraft((prev) => {
      if (!prev) return prev

      return {
        ...prev,
        customizations: {
          ...prev.customizations,
          ...updates,
        },
      }
    })
    setIsDirty(true)
  }, [])

  /**
   * Set screen time
   */
  const setScreenTime = useCallback((minutes: number) => {
    updateCustomizations({ screenTimeMinutes: minutes })
  }, [updateCustomizations])

  /**
   * Set weekend screen time
   */
  const setWeekendScreenTime = useCallback((minutes: number) => {
    updateCustomizations({ weekendScreenTimeMinutes: minutes })
  }, [updateCustomizations])

  /**
   * Set bedtime cutoff
   */
  const setBedtimeCutoff = useCallback((time: string) => {
    updateCustomizations({ bedtimeCutoff: time })
  }, [updateCustomizations])

  /**
   * Set monitoring level
   */
  const setMonitoringLevel = useCallback((level: MonitoringLevel) => {
    updateCustomizations({ monitoringLevel: level })
  }, [updateCustomizations])

  /**
   * Enable a template rule
   */
  const enableRule = useCallback((ruleId: string) => {
    setDraft((prev) => {
      if (!prev) return prev

      const { enabled, disabled } = prev.customizations.rules
      return {
        ...prev,
        customizations: {
          ...prev.customizations,
          rules: {
            ...prev.customizations.rules,
            enabled: [...enabled.filter((id) => id !== ruleId), ruleId],
            disabled: disabled.filter((id) => id !== ruleId),
          },
        },
      }
    })
    setIsDirty(true)
  }, [])

  /**
   * Disable a template rule
   */
  const disableRule = useCallback((ruleId: string) => {
    setDraft((prev) => {
      if (!prev) return prev

      const { enabled, disabled } = prev.customizations.rules
      return {
        ...prev,
        customizations: {
          ...prev.customizations,
          rules: {
            ...prev.customizations.rules,
            enabled: enabled.filter((id) => id !== ruleId),
            disabled: [...disabled.filter((id) => id !== ruleId), ruleId],
          },
        },
      }
    })
    setIsDirty(true)
  }, [])

  /**
   * Add a custom rule
   */
  const addCustomRule = useCallback((rule: Omit<CustomRule, 'id' | 'createdAt'>) => {
    const newRule: CustomRule = {
      ...rule,
      id: generateId(),
      createdAt: new Date().toISOString(),
    }

    setDraft((prev) => {
      if (!prev) return prev

      return {
        ...prev,
        customizations: {
          ...prev.customizations,
          rules: {
            ...prev.customizations.rules,
            custom: [...prev.customizations.rules.custom, newRule],
          },
        },
      }
    })
    setIsDirty(true)
  }, [])

  /**
   * Remove a custom rule
   */
  const removeCustomRule = useCallback((ruleId: string) => {
    setDraft((prev) => {
      if (!prev) return prev

      return {
        ...prev,
        customizations: {
          ...prev.customizations,
          rules: {
            ...prev.customizations.rules,
            custom: prev.customizations.rules.custom.filter((r) => r.id !== ruleId),
          },
        },
      }
    })
    setIsDirty(true)
  }, [])

  /**
   * Update a custom rule
   */
  const updateCustomRule = useCallback((
    ruleId: string,
    updates: Partial<Omit<CustomRule, 'id' | 'createdAt'>>
  ) => {
    setDraft((prev) => {
      if (!prev) return prev

      return {
        ...prev,
        customizations: {
          ...prev.customizations,
          rules: {
            ...prev.customizations.rules,
            custom: prev.customizations.rules.custom.map((r) =>
              r.id === ruleId ? { ...r, ...updates } : r
            ),
          },
        },
      }
    })
    setIsDirty(true)
  }, [])

  /**
   * Revert all changes to original template
   */
  const revertToOriginal = useCallback(() => {
    setDraft((prev) => {
      if (!prev) return prev

      // Re-enable all original template rules
      const enabledRuleIds = prev.originalTemplate.sections.map((s) => s.id)

      return {
        ...prev,
        customizations: {
          ...defaultCustomizations,
          rules: {
            enabled: enabledRuleIds,
            disabled: [],
            custom: [],
          },
        },
        modifiedAt: new Date().toISOString(),
      }
    })
    setIsDirty(true)
  }, [])

  /**
   * Clear draft from storage
   */
  const clearDraft = useCallback(() => {
    if (draft && typeof window !== 'undefined') {
      sessionStorage.removeItem(getStorageKey(draft.childId))
    }
    setDraft(null)
    setIsDirty(false)
  }, [draft])

  /**
   * Get diff status for a field
   */
  const getDiffStatus = useCallback((field: keyof TemplateCustomizations | string): DiffStatus => {
    if (!draft) return 'original'

    const { customizations } = draft

    // Check for custom rules
    if (field.startsWith('custom-rule-')) {
      return 'added'
    }

    // Check for disabled template rules
    if (field.startsWith('rule-') && customizations.rules.disabled.includes(field.replace('rule-', ''))) {
      return 'removed'
    }

    // Check scalar fields
    switch (field) {
      case 'screenTimeMinutes':
        return customizations.screenTimeMinutes !== null ? 'modified' : 'original'
      case 'weekendScreenTimeMinutes':
        return customizations.weekendScreenTimeMinutes !== null ? 'modified' : 'original'
      case 'bedtimeCutoff':
        return customizations.bedtimeCutoff !== null ? 'modified' : 'original'
      case 'monitoringLevel':
        return customizations.monitoringLevel !== null ? 'modified' : 'original'
      default:
        return 'original'
    }
  }, [draft])

  /**
   * Get number of changes made
   */
  const getChangeCount = useCallback((): number => {
    if (!draft) return 0

    const { customizations } = draft
    let count = 0

    // Count modified scalar fields
    if (customizations.screenTimeMinutes !== null) count++
    if (customizations.weekendScreenTimeMinutes !== null) count++
    if (customizations.bedtimeCutoff !== null) count++
    if (customizations.monitoringLevel !== null) count++

    // Count disabled rules
    count += customizations.rules.disabled.length

    // Count custom rules
    count += customizations.rules.custom.length

    return count
  }, [draft])

  return {
    draft,
    isDirty,
    isLoading,
    initializeDraft,
    loadDraft,
    setScreenTime,
    setWeekendScreenTime,
    setBedtimeCutoff,
    setMonitoringLevel,
    enableRule,
    disableRule,
    addCustomRule,
    removeCustomRule,
    updateCustomRule,
    revertToOriginal,
    clearDraft,
    getDiffStatus,
    getChangeCount,
  }
}
