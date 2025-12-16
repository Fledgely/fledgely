'use client'

import { useState, useCallback } from 'react'
import { GoogleAuthProvider, reauthenticateWithPopup, getIdToken } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { getChildRemovalErrorMessage } from '@fledgely/contracts'

/**
 * useReauthentication Hook - Manages re-authentication for sensitive operations
 *
 * Provides:
 * - reauthenticate function that triggers Google Sign-In popup
 * - Loading and error states
 * - Error clearing
 * - Fresh ID token for service verification
 *
 * Story 2.6: Remove Child from Family - Re-authentication required
 *
 * Re-authentication is required for destructive operations to ensure:
 * 1. The user is who they claim to be (not a session hijack)
 * 2. The user is actively present (not an automated attack)
 * 3. The operation is intentional (user must interact with popup)
 */

/** Maximum age of re-authentication in milliseconds (5 minutes) */
const REAUTH_MAX_AGE_MS = 5 * 60 * 1000

interface UseReauthenticationReturn {
  /** Trigger re-authentication and return fresh ID token */
  reauthenticate: () => Promise<string>
  /** Whether re-authentication is in progress */
  loading: boolean
  /** Error from the last operation */
  error: Error | null
  /** Clear the current error */
  clearError: () => void
  /** Timestamp of last successful re-authentication */
  lastReauthAt: number | null
  /** Check if re-authentication is still valid (within 5 minutes) */
  isReauthValid: () => boolean
}

/**
 * Hook for re-authenticating users before sensitive operations
 *
 * Usage:
 * ```tsx
 * const { reauthenticate, loading, error, isReauthValid } = useReauthentication()
 *
 * const handleSensitiveOperation = async () => {
 *   try {
 *     const token = await reauthenticate()
 *     // Use token for sensitive operation
 *     await removeChild(childId, familyId, name, token)
 *   } catch (err) {
 *     // Handle re-auth failure
 *   }
 * }
 * ```
 */
export function useReauthentication(): UseReauthenticationReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastReauthAt, setLastReauthAt] = useState<number | null>(null)

  const reauthenticate = useCallback(async (): Promise<string> => {
    const user = auth.currentUser

    if (!user) {
      const err = new Error(getChildRemovalErrorMessage('reauth-required'))
      setError(err)
      throw err
    }

    setLoading(true)
    setError(null)

    try {
      // Trigger Google Sign-In popup for re-authentication
      const provider = new GoogleAuthProvider()

      // Add prompt=consent to force account selection even if already signed in
      provider.setCustomParameters({
        prompt: 'select_account',
      })

      await reauthenticateWithPopup(user, provider)

      // Get fresh ID token after successful re-authentication
      const token = await getIdToken(user, true) // Force refresh

      // Record timestamp of successful re-authentication
      setLastReauthAt(Date.now())

      return token
    } catch (err) {
      let errorCode = 'default'

      // Map Firebase error codes to our error codes
      const firebaseError = err as { code?: string }
      if (firebaseError.code === 'auth/popup-closed-by-user') {
        errorCode = 'reauth-cancelled'
      } else if (firebaseError.code === 'auth/popup-blocked') {
        errorCode = 'reauth-cancelled'
      } else if (firebaseError.code === 'auth/requires-recent-login') {
        errorCode = 'reauth-expired'
      } else if (firebaseError.code === 'auth/user-mismatch') {
        errorCode = 'reauth-required'
      } else if (firebaseError.code === 'auth/network-request-failed') {
        errorCode = 'network-error'
      }

      const error = new Error(getChildRemovalErrorMessage(errorCode))
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const isReauthValid = useCallback((): boolean => {
    if (lastReauthAt === null) {
      return false
    }

    const now = Date.now()
    return now - lastReauthAt < REAUTH_MAX_AGE_MS
  }, [lastReauthAt])

  return {
    reauthenticate,
    loading,
    error,
    clearError,
    lastReauthAt,
    isReauthValid,
  }
}
