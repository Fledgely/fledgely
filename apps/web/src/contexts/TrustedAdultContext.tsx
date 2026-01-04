'use client'

/**
 * TrustedAdultContext - Story 52.5 Task 5.2
 *
 * Context provider for trusted adult state management.
 *
 * AC1: View shared data dashboard
 * AC6: Handle access revocation gracefully
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useTrustedAdultAccess } from '../hooks/useTrustedAdultAccess'
import type { SharedDataFilter } from '@fledgely/shared'

interface SelectedChild {
  childId: string
  childName: string
  sharedByLabel: string
  dataFilter: SharedDataFilter
  hasData: boolean
  noDataMessage: string | null
  reverseModeActive: boolean
}

interface TrustedAdultContextValue {
  // Children list
  children: Array<{
    childId: string
    childName: string
    familyId: string
    trustedAdultId: string
    reverseModeActive: boolean
    approvedAt?: string
  }>
  // Loading state
  loading: boolean
  // Error state
  error: string | null
  // Currently selected child data
  selectedChild: SelectedChild | null
  // Access denied state
  accessDenied: boolean
  accessDeniedReason: string | null
  // Actions
  refresh: () => Promise<void>
  selectChild: (childId: string) => Promise<void>
  clearSelection: () => void
}

const TrustedAdultContext = createContext<TrustedAdultContextValue | null>(null)

interface TrustedAdultProviderProps {
  children: ReactNode
}

export function TrustedAdultProvider({ children }: TrustedAdultProviderProps) {
  const {
    children: childrenList,
    loading,
    error,
    refresh,
    getSharedData,
    logAccess,
  } = useTrustedAdultAccess()

  const [selectedChild, setSelectedChild] = useState<SelectedChild | null>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const [accessDeniedReason, setAccessDeniedReason] = useState<string | null>(null)

  const selectChild = useCallback(
    async (childId: string) => {
      setAccessDenied(false)
      setAccessDeniedReason(null)

      const sharedData = await getSharedData(childId)

      if (!sharedData.hasAccess) {
        // AC6: Handle revocation gracefully
        setAccessDenied(true)
        setAccessDeniedReason(sharedData.accessDeniedReason || 'Access denied')
        setSelectedChild(null)
        return
      }

      // Log dashboard view
      await logAccess(childId, 'dashboard_view')

      setSelectedChild({
        childId: sharedData.childId!,
        childName: sharedData.childName!,
        sharedByLabel: sharedData.sharedByLabel!,
        dataFilter: sharedData.dataFilter!,
        hasData: sharedData.hasData!,
        noDataMessage: sharedData.noDataMessage ?? null,
        reverseModeActive: sharedData.reverseModeActive!,
      })
    },
    [getSharedData, logAccess]
  )

  const clearSelection = useCallback(() => {
    setSelectedChild(null)
    setAccessDenied(false)
    setAccessDeniedReason(null)
  }, [])

  return (
    <TrustedAdultContext.Provider
      value={{
        children: childrenList,
        loading,
        error,
        selectedChild,
        accessDenied,
        accessDeniedReason,
        refresh,
        selectChild,
        clearSelection,
      }}
    >
      {children}
    </TrustedAdultContext.Provider>
  )
}

export function useTrustedAdultContext(): TrustedAdultContextValue {
  const context = useContext(TrustedAdultContext)
  if (!context) {
    throw new Error('useTrustedAdultContext must be used within a TrustedAdultProvider')
  }
  return context
}
