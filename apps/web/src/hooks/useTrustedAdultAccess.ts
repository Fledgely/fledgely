'use client'

/**
 * useTrustedAdultAccess Hook - Story 52.5 Task 5.1
 *
 * Hook for managing trusted adult data access.
 *
 * AC1: View shared data dashboard
 * AC3: Respect reverse mode settings
 */

import { useState, useEffect, useCallback } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../lib/firebase'
import type { SharedDataFilter } from '@fledgely/shared'

interface ChildAccess {
  childId: string
  childName: string
  familyId: string
  trustedAdultId: string
  reverseModeActive: boolean
  approvedAt?: string
}

interface SharedData {
  hasAccess: boolean
  accessDeniedReason?: string
  childId?: string
  childName?: string
  sharedByLabel?: string
  dataFilter?: SharedDataFilter
  hasData?: boolean
  noDataMessage?: string | null
  reverseModeActive?: boolean
}

interface UseTrustedAdultAccessResult {
  children: ChildAccess[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  getSharedData: (childId: string) => Promise<SharedData>
  logAccess: (childId: string, accessType: string, categories?: string[]) => Promise<void>
}

export function useTrustedAdultAccess(): UseTrustedAdultAccessResult {
  const [children, setChildren] = useState<ChildAccess[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadChildren = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const getTrustedAdultChildren = httpsCallable(functions, 'getTrustedAdultChildrenCallable')
      const result = await getTrustedAdultChildren({})
      const data = result.data as { children: ChildAccess[] }
      setChildren(data.children || [])
    } catch (err) {
      console.error('Failed to load trusted adult children:', err)
      setError(err instanceof Error ? err.message : 'Failed to load children. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadChildren()
  }, [loadChildren])

  const getSharedData = useCallback(async (childId: string): Promise<SharedData> => {
    try {
      const getSharedDataForTrustedAdult = httpsCallable(
        functions,
        'getSharedDataForTrustedAdultCallable'
      )
      const result = await getSharedDataForTrustedAdult({ childId })
      return result.data as SharedData
    } catch (err) {
      console.error('Failed to get shared data:', err)
      return {
        hasAccess: false,
        accessDeniedReason: err instanceof Error ? err.message : 'Failed to load data',
      }
    }
  }, [])

  const logAccess = useCallback(
    async (childId: string, accessType: string, categories?: string[]): Promise<void> => {
      try {
        const logTrustedAdultAccess = httpsCallable(functions, 'logTrustedAdultAccessCallable')
        await logTrustedAdultAccess({
          childId,
          accessType,
          dataCategories: categories,
        })
      } catch (err) {
        // Log but don't throw - access logging shouldn't break the UI
        console.error('Failed to log access:', err)
      }
    },
    []
  )

  return {
    children,
    loading,
    error,
    refresh: loadChildren,
    getSharedData,
    logAccess,
  }
}
