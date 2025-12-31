'use client'

/**
 * ChildAuthContext - Story 19B.1
 *
 * Provides child authentication state and methods.
 * Uses family code + child name for simplified auth (no Google Sign-In).
 *
 * Acceptance Criteria:
 * - AC1: Child authenticates using family code + their name
 * - AC6: Child can ONLY view their own data
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

/**
 * Child session stored in localStorage
 */
export interface ChildSession {
  childId: string
  childName: string
  familyId: string
  permissions: 'child'
  expiresAt: number
  createdAt: number
}

/**
 * Child auth context type
 */
interface ChildAuthContextType {
  /** Current child session */
  childSession: ChildSession | null
  /** Whether session is loading from storage */
  loading: boolean
  /** Whether child is authenticated */
  isAuthenticated: boolean
  /** Sign in as child with family code and child selection */
  signInAsChild: (familyId: string, childId: string, childName: string) => void
  /** Sign out child */
  signOutChild: () => void
  /** Check if session is expired */
  isSessionExpired: () => boolean
}

const ChildAuthContext = createContext<ChildAuthContextType | undefined>(undefined)

/** Session duration: 24 hours */
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000

/** Storage key for child session */
const CHILD_SESSION_KEY = 'fledgely_child_session'

interface ChildAuthProviderProps {
  children: ReactNode
}

/**
 * ChildAuthProvider - Manages child session state
 *
 * Uses localStorage for session persistence (not Firebase Auth).
 * Session automatically expires after 24 hours.
 */
export function ChildAuthProvider({ children }: ChildAuthProviderProps) {
  const [childSession, setChildSession] = useState<ChildSession | null>(null)
  const [loading, setLoading] = useState(true)

  // Load session from localStorage on mount
  useEffect(() => {
    const loadSession = () => {
      try {
        const stored = localStorage.getItem(CHILD_SESSION_KEY)
        if (stored) {
          const session: ChildSession = JSON.parse(stored)
          // Check if session is expired
          if (session.expiresAt > Date.now()) {
            setChildSession(session)
          } else {
            // Clear expired session
            localStorage.removeItem(CHILD_SESSION_KEY)
          }
        }
      } catch {
        // Invalid session data - clear it
        localStorage.removeItem(CHILD_SESSION_KEY)
      }
      setLoading(false)
    }

    loadSession()
  }, [])

  /**
   * Sign in as child - creates a new child session
   */
  const signInAsChild = useCallback((familyId: string, childId: string, childName: string) => {
    const now = Date.now()
    const session: ChildSession = {
      childId,
      childName,
      familyId,
      permissions: 'child',
      expiresAt: now + SESSION_DURATION_MS,
      createdAt: now,
    }

    // Store in localStorage
    localStorage.setItem(CHILD_SESSION_KEY, JSON.stringify(session))
    setChildSession(session)
  }, [])

  /**
   * Sign out child - clears session
   */
  const signOutChild = useCallback(() => {
    localStorage.removeItem(CHILD_SESSION_KEY)
    setChildSession(null)
  }, [])

  /**
   * Check if current session is expired
   */
  const isSessionExpired = useCallback(() => {
    if (!childSession) return true
    return childSession.expiresAt < Date.now()
  }, [childSession])

  const value: ChildAuthContextType = {
    childSession,
    loading,
    isAuthenticated: childSession !== null && !isSessionExpired(),
    signInAsChild,
    signOutChild,
    isSessionExpired,
  }

  return <ChildAuthContext.Provider value={value}>{children}</ChildAuthContext.Provider>
}

/**
 * useChildAuth - Hook to access child auth context
 */
export function useChildAuth(): ChildAuthContextType {
  const context = useContext(ChildAuthContext)
  if (context === undefined) {
    throw new Error('useChildAuth must be used within a ChildAuthProvider')
  }
  return context
}
