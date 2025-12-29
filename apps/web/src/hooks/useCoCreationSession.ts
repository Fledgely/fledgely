/**
 * Co-Creation Session Hook.
 *
 * Story 5.1: Co-Creation Session Initiation - AC2, AC3, AC4
 *
 * Manages the lifecycle of a co-creation session including:
 * - Creating new sessions
 * - Pausing and resuming sessions
 * - Adding contributions with party attribution
 * - Tracking session status
 */

import { useState, useCallback } from 'react'
import type {
  CoCreationSession,
  Contribution,
  ContributionParty,
  ContributionType,
} from '@fledgely/shared/contracts'

interface UseCoCreationSessionOptions {
  onSessionCreated?: (session: CoCreationSession) => void
  onSessionPaused?: (session: CoCreationSession) => void
  onSessionResumed?: (session: CoCreationSession) => void
  onContributionAdded?: (contribution: Contribution) => void
}

interface CreateSessionParams {
  familyId: string
  childId: string
  createdByUid: string
  agreementDraftId?: string
  templateId?: string
}

interface AddContributionParams {
  party: ContributionParty
  type: ContributionType
  content: unknown
  targetTermId?: string
}

export function useCoCreationSession(options: UseCoCreationSessionOptions = {}) {
  const [session, setSession] = useState<CoCreationSession | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Generate a unique ID for session/contribution.
   */
  const generateId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }, [])

  /**
   * Create a new co-creation session.
   */
  const createSession = useCallback(
    async (params: CreateSessionParams): Promise<CoCreationSession | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const now = new Date()
        const newSession: CoCreationSession = {
          id: generateId(),
          familyId: params.familyId,
          childId: params.childId,
          agreementDraftId: params.agreementDraftId ?? null,
          templateId: params.templateId ?? null,
          status: 'active',
          contributions: [],
          createdAt: now,
          updatedAt: now,
          pausedAt: null,
          completedAt: null,
          lastActivityAt: now,
          createdByUid: params.createdByUid,
        }

        // In a real implementation, this would save to Firestore
        // For now, we manage state locally
        setSession(newSession)
        options.onSessionCreated?.(newSession)

        return newSession
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create session'
        setError(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [generateId, options]
  )

  /**
   * Pause the current session.
   */
  const pauseSession = useCallback(async (): Promise<boolean> => {
    if (!session || session.status !== 'active') {
      setError('No active session to pause')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const now = new Date()
      const updatedSession: CoCreationSession = {
        ...session,
        status: 'paused',
        pausedAt: now,
        updatedAt: now,
      }

      setSession(updatedSession)
      options.onSessionPaused?.(updatedSession)

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to pause session'
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [session, options])

  /**
   * Resume a paused session.
   */
  const resumeSession = useCallback(async (): Promise<boolean> => {
    if (!session || session.status !== 'paused') {
      setError('No paused session to resume')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const now = new Date()
      const updatedSession: CoCreationSession = {
        ...session,
        status: 'active',
        pausedAt: null,
        updatedAt: now,
        lastActivityAt: now,
      }

      setSession(updatedSession)
      options.onSessionResumed?.(updatedSession)

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to resume session'
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [session, options])

  /**
   * Add a contribution to the session.
   */
  const addContribution = useCallback(
    async (params: AddContributionParams): Promise<Contribution | null> => {
      if (!session || session.status !== 'active') {
        setError('No active session to add contribution')
        return null
      }

      try {
        const now = new Date()
        const contribution: Contribution = {
          id: generateId(),
          party: params.party,
          type: params.type,
          content: params.content,
          targetTermId: params.targetTermId ?? null,
          timestamp: now,
        }

        const updatedSession: CoCreationSession = {
          ...session,
          contributions: [...session.contributions, contribution],
          updatedAt: now,
          lastActivityAt: now,
        }

        setSession(updatedSession)
        options.onContributionAdded?.(contribution)

        return contribution
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add contribution'
        setError(message)
        return null
      }
    },
    [session, generateId, options]
  )

  /**
   * Update the last activity timestamp (for timeout tracking).
   */
  const updateActivity = useCallback(() => {
    if (!session || session.status !== 'active') {
      return
    }

    const now = new Date()
    setSession({
      ...session,
      lastActivityAt: now,
      updatedAt: now,
    })
  }, [session])

  /**
   * Complete the session.
   */
  const completeSession = useCallback(async (): Promise<boolean> => {
    if (!session || session.status !== 'active') {
      setError('No active session to complete')
      return false
    }

    setIsLoading(true)
    setError(null)

    try {
      const now = new Date()
      const updatedSession: CoCreationSession = {
        ...session,
        status: 'completed',
        completedAt: now,
        updatedAt: now,
      }

      setSession(updatedSession)

      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete session'
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [session])

  /**
   * Load an existing session (for resume functionality).
   */
  const loadSession = useCallback((existingSession: CoCreationSession) => {
    setSession(existingSession)
    setError(null)
  }, [])

  /**
   * Clear the current session.
   */
  const clearSession = useCallback(() => {
    setSession(null)
    setError(null)
  }, [])

  /**
   * Get session status helpers.
   */
  const isActive = session?.status === 'active'
  const isPaused = session?.status === 'paused'
  const isCompleted = session?.status === 'completed'

  return {
    session,
    isLoading,
    error,
    isActive,
    isPaused,
    isCompleted,
    createSession,
    pauseSession,
    resumeSession,
    addContribution,
    updateActivity,
    completeSession,
    loadSession,
    clearSession,
  }
}
