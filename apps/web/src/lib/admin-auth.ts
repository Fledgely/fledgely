'use client'

import { useEffect, useState, useCallback } from 'react'
import { User, onAuthStateChanged, getIdTokenResult } from 'firebase/auth'
import { auth } from './firebase'

/**
 * Admin claims from Firebase custom claims
 */
export interface AdminClaims {
  isAdmin: boolean
  isSafetyTeam: boolean
  isLegal: boolean
  isCompliance: boolean
}

/**
 * Admin auth state
 */
export interface AdminAuthState {
  user: User | null
  claims: AdminClaims | null
  loading: boolean
  error: Error | null
  /** Check if user has any admin role */
  hasAdminAccess: boolean
  /** Check if user can access safety requests */
  hasSafetyAccess: boolean
  /** Refresh the auth state and claims */
  refresh: () => Promise<void>
}

/**
 * Hook for admin authentication and authorization
 *
 * CRITICAL: This hook verifies admin claims for safety-team access.
 * Claims are verified server-side in Cloud Functions.
 */
export function useAdminAuth(): AdminAuthState {
  const [user, setUser] = useState<User | null>(null)
  const [claims, setClaims] = useState<AdminClaims | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refreshClaims = useCallback(async () => {
    if (!auth.currentUser) {
      setClaims(null)
      return
    }

    try {
      // Force refresh to get latest claims
      const tokenResult = await getIdTokenResult(auth.currentUser, true)
      const customClaims = tokenResult.claims

      setClaims({
        isAdmin: !!customClaims.isAdmin,
        isSafetyTeam: !!customClaims.isSafetyTeam,
        isLegal: !!customClaims.isLegal,
        isCompliance: !!customClaims.isCompliance,
      })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get claims'))
      setClaims(null)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)

      if (firebaseUser) {
        await refreshClaims()
      } else {
        setClaims(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [refreshClaims])

  const hasAdminAccess = !!claims?.isAdmin
  const hasSafetyAccess = !!claims?.isSafetyTeam || !!claims?.isAdmin

  return {
    user,
    claims,
    loading,
    error,
    hasAdminAccess,
    hasSafetyAccess,
    refresh: refreshClaims,
  }
}
