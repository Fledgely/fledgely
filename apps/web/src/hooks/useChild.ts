'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { useFamily } from '@/hooks/useFamily'
import {
  addChildToFamily,
  getChildrenForFamily,
} from '@/services/childService'
import type { ChildProfile, CreateChildInput } from '@fledgely/contracts'

/**
 * Hook return type for useChild
 */
export interface UseChildReturn {
  /** Children from Firestore */
  children: ChildProfile[]
  /** Whether children are being loaded */
  loading: boolean
  /** Error state if child operations fail */
  error: Error | null
  /** Whether the family has any children */
  hasChildren: boolean
  /** Add a new child to the family */
  addChild: (input: CreateChildInput) => Promise<ChildProfile>
  /** Clear error state */
  clearError: () => void
  /** Refresh children data */
  refreshChildren: () => Promise<void>
}

/**
 * useChild Hook - Manages child state for a family
 *
 * Automatically fetches children when family is available.
 * Provides addChild function for adding children to the family.
 *
 * @example
 * ```tsx
 * const { children, hasChildren, loading, addChild } = useChild()
 *
 * if (loading) return <LoadingSkeleton />
 * if (!hasChildren) {
 *   return <button onClick={() => addChild(data)}>Add your first child</button>
 * }
 * return <ChildrenList children={children} />
 * ```
 */
export function useChild(): UseChildReturn {
  const { user: authUser } = useAuthContext()
  const { family, loading: familyLoading, hasFamily } = useFamily()

  const [children, setChildren] = useState<ChildProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Track mounted state to prevent memory leaks
  const mountedRef = useRef(true)

  /**
   * Track if we've already fetched children for current family to prevent duplicate fetches
   */
  const fetchedForFamilyRef = useRef<string | null>(null)

  /**
   * Idempotency guard - prevents duplicate child creation from double-clicks or race conditions
   * This is CRITICAL to prevent creating duplicate children if user double-clicks "Add Child"
   */
  const isSubmittingRef = useRef(false)

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    if (mountedRef.current) {
      setError(null)
    }
  }, [])

  /**
   * Fetch children data for current family
   */
  const fetchChildren = useCallback(async () => {
    if (!family) {
      if (mountedRef.current) {
        setChildren([])
        setLoading(false)
      }
      return
    }

    if (mountedRef.current) {
      setLoading(true)
      setError(null)
    }

    try {
      const familyChildren = await getChildrenForFamily(family.id)

      if (mountedRef.current) {
        setChildren(familyChildren)
        fetchedForFamilyRef.current = family.id
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to load children'))
        setChildren([])
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [family])

  /**
   * Refresh children data (for use after updates)
   */
  const refreshChildren = useCallback(async () => {
    fetchedForFamilyRef.current = null
    await fetchChildren()
  }, [fetchChildren])

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  // Fetch children when family changes
  useEffect(() => {
    // Wait for family loading to complete
    if (familyLoading) {
      return
    }

    // No family - reset state
    if (!hasFamily || !family) {
      if (mountedRef.current) {
        setChildren([])
        setLoading(false)
        setError(null)
      }
      fetchedForFamilyRef.current = null
      return
    }

    // Already fetched for this family - don't re-fetch
    if (fetchedForFamilyRef.current === family.id) {
      return
    }

    fetchChildren()
  }, [family, familyLoading, hasFamily, fetchChildren])

  /**
   * Add a new child to the family
   * Includes idempotency guard to prevent duplicate submissions
   */
  const addChild = useCallback(async (input: CreateChildInput): Promise<ChildProfile> => {
    if (!authUser) {
      throw new Error('You need to be signed in to add a child')
    }

    if (!family) {
      throw new Error('You need to create a family first')
    }

    // Idempotency guard - prevent duplicate submissions from double-clicks
    if (isSubmittingRef.current) {
      throw new Error('A child is already being added. Please wait.')
    }

    isSubmittingRef.current = true

    if (mountedRef.current) {
      setLoading(true)
      setError(null)
    }

    try {
      const newChild = await addChildToFamily(family.id, input, authUser.uid)

      if (mountedRef.current) {
        // Optimistic update - add the new child to the list
        setChildren((prev) => [...prev, newChild])
        fetchedForFamilyRef.current = family.id
      }

      return newChild
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Could not add the child')

      if (mountedRef.current) {
        setError(error)
      }

      throw error
    } finally {
      isSubmittingRef.current = false
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [authUser, family])

  return {
    children,
    loading: familyLoading || loading,
    error,
    hasChildren: children.length > 0,
    addChild,
    clearError,
    refreshChildren,
  }
}
