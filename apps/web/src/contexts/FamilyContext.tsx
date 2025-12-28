'use client'

/**
 * Family context for managing family state.
 *
 * Provides the current user's family to all components.
 * Loads family data based on user's familyId from AuthContext.
 */

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getUserFamily } from '../services/familyService'
import { getChildrenByFamily } from '../services/childService'
import type { Family, ChildProfile } from '@fledgely/shared/contracts'

interface FamilyContextType {
  /** The current user's family */
  family: Family | null
  /** Children in the current family */
  children: ChildProfile[]
  /** Whether family data is loading */
  loading: boolean
  /** Error from family operations */
  error: Error | null
  /** Whether the user has a family */
  hasFamily: boolean
  /** Refresh family data */
  refreshFamily: () => Promise<void>
  /** Refresh children data */
  refreshChildren: () => Promise<void>
}

const FamilyContext = createContext<FamilyContextType | undefined>(undefined)

interface FamilyProviderProps {
  children: ReactNode
}

export function FamilyProvider({ children: providerChildren }: FamilyProviderProps) {
  const { userProfile, loading: authLoading } = useAuth()
  const [family, setFamily] = useState<Family | null>(null)
  const [children, setChildren] = useState<ChildProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadChildren = useCallback(async (familyId: string) => {
    try {
      const loadedChildren = await getChildrenByFamily(familyId)
      setChildren(loadedChildren)
    } catch (err) {
      console.error('Failed to load children:', err)
      setChildren([])
    }
  }, [])

  const loadFamily = useCallback(async () => {
    if (!userProfile?.familyId) {
      setFamily(null)
      setChildren([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const loadedFamily = await getUserFamily(userProfile.familyId)
      setFamily(loadedFamily)
      if (loadedFamily) {
        await loadChildren(loadedFamily.id)
      }
    } catch (err) {
      console.error('Failed to load family:', err)
      setError(err instanceof Error ? err : new Error('Failed to load family'))
      setFamily(null)
      setChildren([])
    } finally {
      setLoading(false)
    }
  }, [userProfile?.familyId, loadChildren])

  // Load family when user profile changes
  useEffect(() => {
    if (!authLoading) {
      loadFamily()
    }
  }, [authLoading, loadFamily])

  const refreshFamily = useCallback(async () => {
    await loadFamily()
  }, [loadFamily])

  const refreshChildren = useCallback(async () => {
    if (family) {
      await loadChildren(family.id)
    }
  }, [family, loadChildren])

  const value: FamilyContextType = {
    family,
    children,
    loading: authLoading || loading,
    error,
    hasFamily: !!family,
    refreshFamily,
    refreshChildren,
  }

  return <FamilyContext.Provider value={value}>{providerChildren}</FamilyContext.Provider>
}

export function useFamily(): FamilyContextType {
  const context = useContext(FamilyContext)
  if (context === undefined) {
    throw new Error('useFamily must be used within a FamilyProvider')
  }
  return context
}
