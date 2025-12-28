'use client'

/**
 * Authentication context for managing user auth state.
 *
 * Provides auth state and methods throughout the app.
 */

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth'
import { getFirebaseAuth, getGoogleProvider } from '../lib/firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get auth instance (lazily initialized)
    const authInstance = getFirebaseAuth()

    // Set persistence to LOCAL (survives browser restart)
    setPersistence(authInstance, browserLocalPersistence).catch(console.error)

    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(authInstance, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(getFirebaseAuth(), getGoogleProvider())
  }, [])

  const signOut = useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth())
  }, [])

  const value: AuthContextType = {
    user,
    loading,
    signInWithGoogle,
    signOut,
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
