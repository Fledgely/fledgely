'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { useUser } from '@/hooks/useUser'
import {
  createFamily,
  getFamilyForUser,
} from '@/services/familyService'
import type { Family } from '@fledgely/contracts'

/**
 * Hook return type for useFamily
 */
export interface UseFamilyReturn {
  /** Family from Firestore */
  family: Family | null
  /** Whether the family is being loaded */
  loading: boolean
  /** Error state if family operations fail */
  error: Error | null
  /** Whether user has a family */
  hasFamily: boolean
  /** Create a new family for the current user */
  createNewFamily: () => Promise<Family>
  /** Clear error state */
  clearError: () => void
  /** Refresh family data */
  refreshFamily: () => Promise<void>
}

/**
 * useFamily Hook - Manages family state
 *
 * Automatically fetches family when user profile is available.
 * Provides createNewFamily function for family creation.
 *
 * @example
 * ```tsx
 * const { family, hasFamily, loading, createNewFamily } = useFamily()
 *
 * if (loading) return <LoadingSkeleton />
 * if (!hasFamily) {
 *   return <button onClick={createNewFamily}>Create Family</button>
 * }
 * return <FamilyDashboard family={family} />
 * ```
 */
export function useFamily(): UseFamilyReturn {
  const { user: authUser } = useAuthContext()
  const { userProfile, loading: userLoading } = useUser()

  const [family, setFamily] = useState<Family | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Track mounted state to prevent memory leaks
  const mountedRef = useRef(true)

  /**
   * Track if we've already fetched family for current user to prevent duplicate fetches
   */
  const fetchedForUidRef = useRef<string | null>(null)

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    if (mountedRef.current) {
      setError(null)
    }
  }, [])

  /**
   * Fetch family data for current user
   */
  const fetchFamily = useCallback(async () => {
    if (!authUser) {
      if (mountedRef.current) {
        setFamily(null)
        setLoading(false)
      }
      return
    }

    if (mountedRef.current) {
      setLoading(true)
      setError(null)
    }

    try {
      const userFamily = await getFamilyForUser(authUser.uid)

      if (mountedRef.current) {
        setFamily(userFamily)
        fetchedForUidRef.current = authUser.uid
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to load family'))
        setFamily(null)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [authUser])

  /**
   * Refresh family data (for use after updates)
   */
  const refreshFamily = useCallback(async () => {
    fetchedForUidRef.current = null
    await fetchFamily()
  }, [fetchFamily])

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  // Fetch family when user profile changes
  useEffect(() => {
    // Wait for user loading to complete
    if (userLoading) {
      return
    }

    // No auth user - reset state
    if (!authUser) {
      if (mountedRef.current) {
        setFamily(null)
        setLoading(false)
        setError(null)
      }
      fetchedForUidRef.current = null
      return
    }

    // Already fetched for this user - don't re-fetch
    if (fetchedForUidRef.current === authUser.uid) {
      return
    }

    fetchFamily()
  }, [authUser, userLoading, userProfile, fetchFamily])

  /**
   * Create a new family for the current user
   */
  const createNewFamily = useCallback(async (): Promise<Family> => {
    if (!authUser) {
      throw new Error('Must be logged in to create a family')
    }

    if (mountedRef.current) {
      setLoading(true)
      setError(null)
    }

    try {
      const newFamily = await createFamily(authUser.uid)

      if (mountedRef.current) {
        setFamily(newFamily)
        fetchedForUidRef.current = authUser.uid
      }

      return newFamily
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create family')

      if (mountedRef.current) {
        setError(error)
      }

      throw error
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [authUser])

  return {
    family,
    loading: userLoading || loading,
    error,
    hasFamily: family !== null,
    createNewFamily,
    clearError,
    refreshFamily,
  }
}
