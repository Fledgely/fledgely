'use client'

/**
 * Authentication context for managing user auth state and profile.
 *
 * Provides auth state, user profile, and auth methods throughout the app.
 * Automatically creates/loads user profile on authentication.
 */

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth'
import { getFirebaseAuth, getGoogleProvider } from '../lib/firebase'
import { ensureUserProfile } from '../services/userService'
import type { User } from '@fledgely/shared/contracts'

interface AuthContextType {
  /** Firebase Auth user object */
  firebaseUser: FirebaseUser | null
  /** Firestore user profile */
  userProfile: User | null
  /** Whether initial auth check is in progress */
  loading: boolean
  /** Whether user is signing in (for loading states) */
  signingIn: boolean
  /** Whether this is a new user (first sign-in) */
  isNewUser: boolean
  /** Error from profile operations */
  profileError: Error | null
  /** Sign in with Google */
  signInWithGoogle: () => Promise<void>
  /** Sign out */
  signOut: () => Promise<void>
  /** Clear new user flag after onboarding */
  clearNewUserFlag: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [signingIn, setSigningIn] = useState(false)
  const [isNewUser, setIsNewUser] = useState(false)
  const [profileError, setProfileError] = useState<Error | null>(null)

  useEffect(() => {
    // Get auth instance (lazily initialized)
    const authInstance = getFirebaseAuth()

    // Set persistence to LOCAL (survives browser restart)
    setPersistence(authInstance, browserLocalPersistence).catch(console.error)

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      setFirebaseUser(user)

      if (user) {
        try {
          // Ensure user profile exists (creates if new, updates lastLogin if existing)
          const { user: profile, isNewUser: newUser } = await ensureUserProfile(user)
          setUserProfile(profile)
          setIsNewUser(newUser)
          setProfileError(null)
        } catch (error) {
          console.error('Failed to load/create user profile:', error)
          setProfileError(error instanceof Error ? error : new Error('Profile error'))
          setUserProfile(null)
        }
      } else {
        setUserProfile(null)
        setIsNewUser(false)
        setProfileError(null)
      }

      setLoading(false)
      setSigningIn(false)
    })

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = useCallback(async () => {
    setSigningIn(true)
    setProfileError(null)
    try {
      await signInWithPopup(getFirebaseAuth(), getGoogleProvider())
      // Note: profile creation happens in onAuthStateChanged handler
    } catch (error) {
      setSigningIn(false)
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth())
    setUserProfile(null)
    setIsNewUser(false)
  }, [])

  const clearNewUserFlag = useCallback(() => {
    setIsNewUser(false)
  }, [])

  const value: AuthContextType = {
    firebaseUser,
    userProfile,
    loading,
    signingIn,
    isNewUser,
    profileError,
    signInWithGoogle,
    signOut,
    clearNewUserFlag,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
