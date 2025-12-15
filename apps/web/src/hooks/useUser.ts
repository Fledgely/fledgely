'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { getOrCreateUser } from '@/services/userService'
import type { User } from '@fledgely/contracts'

/**
 * Hook return type for useUser
 */
export interface UseUserReturn {
  /** User profile from Firestore */
  userProfile: User | null
  /** Whether this is a new user (just created profile) */
  isNewUser: boolean
  /** Loading state while fetching/creating profile */
  loading: boolean
  /** Error state if profile operations fail */
  error: Error | null
  /** Clear error state */
  clearError: () => void
}

/**
 * useUser Hook - Manages user profile state
 *
 * Automatically fetches or creates user profile when auth state changes.
 * Tracks whether user is new (for routing to onboarding).
 *
 * @example
 * ```tsx
 * const { userProfile, isNewUser, loading, error } = useUser()
 *
 * if (loading) return <LoadingSkeleton />
 * if (error) return <ErrorMessage error={error} />
 * if (isNewUser) router.push('/onboarding')
 * ```
 */
export function useUser(): UseUserReturn {
  const { user: authUser, loading: authLoading } = useAuthContext()

  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [isNewUser, setIsNewUser] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Track mounted state to prevent memory leaks
  const mountedRef = useRef(true)

  // Track if we've already processed the current auth user to prevent double processing
  const processedUidRef = useRef<string | null>(null)

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    if (mountedRef.current) {
      setError(null)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return
    }

    // No auth user - reset state
    if (!authUser) {
      if (mountedRef.current) {
        setUserProfile(null)
        setIsNewUser(false)
        setLoading(false)
        setError(null)
      }
      processedUidRef.current = null
      return
    }

    // Already processed this user - don't re-fetch
    // Use ref check only (not state) to avoid circular dependency
    if (processedUidRef.current === authUser.uid) {
      return
    }

    const fetchOrCreateUser = async () => {
      if (mountedRef.current) {
        setLoading(true)
        setError(null)
      }

      try {
        const { user, isNewUser: newUser } = await getOrCreateUser(authUser)

        if (mountedRef.current) {
          setUserProfile(user)
          setIsNewUser(newUser)
          processedUidRef.current = authUser.uid
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to load user profile'))
          setUserProfile(null)
          setIsNewUser(false)
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false)
        }
      }
    }

    fetchOrCreateUser()
    // Note: Only depend on auth state changes, not userProfile
    // processedUidRef prevents duplicate fetches for the same user
  }, [authUser, authLoading])

  return {
    userProfile,
    isNewUser,
    loading: authLoading || loading,
    error,
    clearError,
  }
}
