'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/components/providers/AuthProvider'
import { getOrCreateUser, isSessionExpired } from '@/services/userService'
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
  const router = useRouter()
  const { user: authUser, loading: authLoading, signOut } = useAuthContext()

  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [isNewUser, setIsNewUser] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Track mounted state to prevent memory leaks
  const mountedRef = useRef(true)

  /**
   * Track if we've already processed the current auth user to prevent double processing.
   *
   * This ref prevents race conditions where:
   * 1. User signs in → fetchOrCreateUser starts
   * 2. Auth state changes (e.g., token refresh) → useEffect re-runs
   * 3. fetchOrCreateUser would run twice for the same user
   *
   * The ref is cleared when:
   * - User signs out (no auth user)
   * - Session expires (explicit clear)
   * - Error occurs during fetch (allow retry)
   */
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
      // Store uid at START of fetch to prevent race conditions
      // if auth state changes during async operations
      const currentUid = authUser.uid

      if (mountedRef.current) {
        setLoading(true)
        setError(null)
      }

      try {
        const { user, isNewUser: newUser, originalLastLoginAt } = await getOrCreateUser(authUser)

        // Check if session has expired (30 days of inactivity)
        // Use ORIGINAL lastLoginAt (before update) to properly detect expired sessions
        if (!newUser && originalLastLoginAt && isSessionExpired(originalLastLoginAt)) {
          try {
            // Session expired - sign out and redirect to login with message
            await signOut()
          } catch (signOutError) {
            // Log error but continue with redirect - user experience is paramount
            console.error('[useUser] Failed to sign out expired session:', signOutError)
          } finally {
            if (mountedRef.current) {
              setUserProfile(null)
              setIsNewUser(false)
              setLoading(false)
              processedUidRef.current = null
            }
            // Always redirect, even if sign-out failed
            router.push('/login?expired=true')
          }
          return
        }

        // Verify uid hasn't changed during async operations
        if (mountedRef.current && authUser.uid === currentUid) {
          setUserProfile(user)
          setIsNewUser(newUser)
          processedUidRef.current = currentUid
        }
      } catch (err) {
        // Only set error if still processing the same user
        if (mountedRef.current && authUser.uid === currentUid) {
          setError(err instanceof Error ? err : new Error('Failed to load user profile'))
          setUserProfile(null)
          setIsNewUser(false)
          // DON'T mark as processed on error - allow retry
        }
      } finally {
        if (mountedRef.current && authUser.uid === currentUid) {
          setLoading(false)
        }
      }
    }

    fetchOrCreateUser()
    // Note: Only depend on auth state changes, not userProfile
    // processedUidRef prevents duplicate fetches for the same user
  }, [authUser, authLoading, signOut, router])

  return {
    userProfile,
    isNewUser,
    loading: authLoading || loading,
    error,
    clearError,
  }
}
