'use client'

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'

/**
 * Maximum number of templates that can be compared at once
 */
export const MAX_COMPARISON_TEMPLATES = 3

interface TemplateComparisonState {
  /** Array of template IDs selected for comparison (max 3) */
  selectedForComparison: string[]
  /** Whether any templates are selected for comparison */
  isComparing: boolean
  /** Number of templates currently selected */
  comparisonCount: number
  /** Whether more templates can be added (< 3) */
  canAddMore: boolean
}

interface TemplateComparisonActions {
  /** Add a template to comparison (max 3, no duplicates) */
  addToComparison: (templateId: string) => void
  /** Remove a template from comparison */
  removeFromComparison: (templateId: string) => void
  /** Clear all selected templates */
  clearComparison: () => void
  /** Toggle a template in/out of comparison */
  toggleComparison: (templateId: string) => void
  /** Check if a template is in comparison */
  isInComparison: (templateId: string) => boolean
}

type TemplateComparisonContextType = TemplateComparisonState & TemplateComparisonActions

const TemplateComparisonContext = createContext<TemplateComparisonContextType | null>(null)

interface TemplateComparisonProviderProps {
  children: ReactNode
}

/**
 * Provider component for template comparison state
 *
 * Story 4.3: Template Preview & Selection - Task 4
 *
 * Wrap your template components with this provider to enable comparison functionality.
 *
 * @example
 * ```tsx
 * <TemplateComparisonProvider>
 *   <TemplateLibrary />
 * </TemplateComparisonProvider>
 * ```
 */
export function TemplateComparisonProvider({ children }: TemplateComparisonProviderProps) {
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([])

  const addToComparison = useCallback((templateId: string) => {
    setSelectedForComparison((prev) => {
      // Don't add if already at max or duplicate
      if (prev.length >= MAX_COMPARISON_TEMPLATES || prev.includes(templateId)) {
        return prev
      }
      return [...prev, templateId]
    })
  }, [])

  const removeFromComparison = useCallback((templateId: string) => {
    setSelectedForComparison((prev) => prev.filter((id) => id !== templateId))
  }, [])

  const clearComparison = useCallback(() => {
    setSelectedForComparison([])
  }, [])

  const toggleComparison = useCallback((templateId: string) => {
    setSelectedForComparison((prev) => {
      if (prev.includes(templateId)) {
        return prev.filter((id) => id !== templateId)
      }
      if (prev.length >= MAX_COMPARISON_TEMPLATES) {
        return prev
      }
      return [...prev, templateId]
    })
  }, [])

  const isInComparison = useCallback(
    (templateId: string) => selectedForComparison.includes(templateId),
    [selectedForComparison]
  )

  const value = useMemo(
    () => ({
      selectedForComparison,
      isComparing: selectedForComparison.length > 0,
      comparisonCount: selectedForComparison.length,
      canAddMore: selectedForComparison.length < MAX_COMPARISON_TEMPLATES,
      addToComparison,
      removeFromComparison,
      clearComparison,
      toggleComparison,
      isInComparison,
    }),
    [
      selectedForComparison,
      addToComparison,
      removeFromComparison,
      clearComparison,
      toggleComparison,
      isInComparison,
    ]
  )

  return (
    <TemplateComparisonContext.Provider value={value}>
      {children}
    </TemplateComparisonContext.Provider>
  )
}

/**
 * Hook for accessing the template comparison context
 *
 * Story 4.3: Template Preview & Selection - Task 4
 *
 * Must be used within a TemplateComparisonProvider.
 *
 * @example
 * ```tsx
 * const { selectedForComparison, addToComparison, clearComparison } = useTemplateComparisonStore()
 *
 * // In template card
 * <button onClick={() => addToComparison(template.id)}>
 *   Add to Compare
 * </button>
 * ```
 */
export function useTemplateComparisonStore(): TemplateComparisonContextType {
  const context = useContext(TemplateComparisonContext)
  if (!context) {
    throw new Error('useTemplateComparisonStore must be used within a TemplateComparisonProvider')
  }
  return context
}

// For backward compatibility in tests - expose a static version
const staticStore: TemplateComparisonState & TemplateComparisonActions = {
  selectedForComparison: [],
  isComparing: false,
  comparisonCount: 0,
  canAddMore: true,
  addToComparison: () => {},
  removeFromComparison: () => {},
  clearComparison: () => {},
  toggleComparison: () => {},
  isInComparison: () => false,
}

// Expose getState for tests using static fallback
useTemplateComparisonStore.getState = () => staticStore
