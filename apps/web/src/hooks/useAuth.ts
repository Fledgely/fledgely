'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  browserLocalPersistence,
  setPersistence,
  AuthError,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

/**
 * Set session cookie for middleware route protection
 * Uses Secure, HttpOnly-free cookie (accessible by JS but secure transport)
 */
function setSessionCookie(hasSession: boolean): void {
  if (typeof document === 'undefined') return

  if (hasSession) {
    // Set cookie that expires in 30 days (matches Firebase LOCAL persistence)
    const expires = new Date()
    expires.setDate(expires.getDate() + 30)
    document.cookie = `__session=1; path=/; expires=${expires.toUTCString()}; SameSite=Lax${window.location.protocol === 'https:' ? '; Secure' : ''}`
  } else {
    // Clear the cookie
    document.cookie = '__session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax'
  }
}

/**
 * Authentication state interface
 */
export interface AuthState {
  user: User | null
  loading: boolean
  error: Error | null
}

/**
 * Return type for useAuth hook
 */
export interface UseAuthReturn extends AuthState {
  /** Sign in with Google using popup (fallback to redirect if blocked) */
  signInWithGoogle: () => Promise<void>
  /** Sign out the current user */
  signOut: () => Promise<void>
  /** Clear any authentication errors */
  clearError: () => void
}

/**
 * Error messages at 6th-grade reading level (NFR65)
 */
const errorMessages: Record<string, string> = {
  'auth/popup-blocked':
    'Pop-up was blocked. Please allow pop-ups and try again.',
  'auth/popup-closed-by-user':
    'Sign-in was cancelled. Please try again when ready.',
  'auth/network-request-failed':
    'Could not connect. Please check your internet and try again.',
  'auth/account-exists-with-different-credential':
    'This email is already used with a different sign-in method.',
  'auth/cancelled-popup-request': '', // Ignore - multiple popups
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  default: 'Something went wrong. Please try again.',
}

/**
 * Get user-friendly error message from Firebase auth error
 */
function getErrorMessage(error: AuthError): string {
  const code = error.code || 'default'
  return errorMessages[code] || errorMessages.default
}

/**
 * Hook for managing Firebase Authentication state
 *
 * Features:
 * - Google Sign-In with popup (fallback to redirect if blocked)
 * - 30-day session persistence via LOCAL persistence
 * - User-friendly error messages at 6th-grade reading level
 * - Automatic auth state subscription
 *
 * @example
 * ```tsx
 * function LoginPage() {
 *   const { user, loading, error, signInWithGoogle } = useAuth()
 *
 *   if (loading) return <LoadingSpinner />
 *   if (user) return <Redirect to="/dashboard" />
 *
 *   return (
 *     <button onClick={signInWithGoogle}>
 *       Sign in with Google
 *     </button>
 *   )
 * }
 * ```
 */
export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  // Track mounted state to prevent setState after unmount
  const mountedRef = useRef(true)

  // Safe setState that checks mounted state
  const safeSetState = useCallback((updater: AuthState | ((prev: AuthState) => AuthState)) => {
    if (mountedRef.current) {
      setState(updater)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true

    // Set LOCAL persistence for 30-day sessions (NFR11)
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.error('Failed to set persistence:', err)
    })

    // Check for redirect result errors (if popup was blocked and we used redirect)
    // Note: Successful redirect auth will trigger onAuthStateChanged, so we only
    // need to handle errors here to avoid race conditions
    getRedirectResult(auth).catch((error: AuthError) => {
      // Only set error if it's meaningful (not cancelled-popup-request)
      if (error.code !== 'auth/cancelled-popup-request') {
        const message = getErrorMessage(error)
        if (message) {
          safeSetState((prev) => ({
            ...prev,
            error: new Error(message),
            // Don't set loading: false here - let onAuthStateChanged handle that
          }))
        }
      }
    })

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        // Set/clear session cookie for middleware route protection
        setSessionCookie(!!user)
        safeSetState({ user, loading: false, error: null })
      },
      (error) => {
        const message = getErrorMessage(error as AuthError)
        setSessionCookie(false)
        safeSetState({
          user: null,
          loading: false,
          error: new Error(message),
        })
      }
    )

    return () => {
      mountedRef.current = false
      unsubscribe()
    }
  }, [safeSetState])

  const signInWithGoogle = useCallback(async () => {
    safeSetState((prev) => ({ ...prev, loading: true, error: null }))
    const provider = new GoogleAuthProvider()

    // Add scopes for profile and email
    provider.addScope('profile')
    provider.addScope('email')

    try {
      await signInWithPopup(auth, provider)
      // Success - onAuthStateChanged will update the state
    } catch (error) {
      const authError = error as AuthError

      // Handle popup blocked - fallback to redirect
      if (
        authError.code === 'auth/popup-blocked' ||
        authError.code === 'auth/popup-closed-by-user'
      ) {
        // For popup-blocked, try redirect
        if (authError.code === 'auth/popup-blocked') {
          try {
            await signInWithRedirect(auth, provider)
            return // Redirect will happen, page will reload
          } catch (redirectError) {
            const redirectAuthError = redirectError as AuthError
            const message = getErrorMessage(redirectAuthError)
            safeSetState((prev) => ({
              ...prev,
              loading: false,
              error: new Error(message),
            }))
            return
          }
        }

        // For popup-closed-by-user, just show the message
        const message = getErrorMessage(authError)
        safeSetState((prev) => ({
          ...prev,
          loading: false,
          error: message ? new Error(message) : null,
        }))
        return
      }

      // Handle other errors
      const message = getErrorMessage(authError)
      safeSetState((prev) => ({
        ...prev,
        loading: false,
        error: message ? new Error(message) : null,
      }))
    }
  }, [safeSetState])

  const signOut = useCallback(async () => {
    safeSetState((prev) => ({ ...prev, loading: true }))
    try {
      await firebaseSignOut(auth)
      // Success - onAuthStateChanged will update the state
    } catch (error) {
      const authError = error as AuthError
      const message = getErrorMessage(authError)
      safeSetState((prev) => ({
        ...prev,
        loading: false,
        error: new Error(message),
      }))
    }
  }, [safeSetState])

  const clearError = useCallback(() => {
    safeSetState((prev) => ({ ...prev, error: null }))
  }, [safeSetState])

  return {
    ...state,
    signInWithGoogle,
    signOut,
    clearError,
  }
}
