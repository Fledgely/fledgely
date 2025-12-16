'use client'

import { httpsCallable } from 'firebase/functions'
import { functions } from '@/lib/firebase'
import {
  type CoCreationSession,
  type CreateCoCreationSessionInput,
  type SessionContributor,
  type ContributionAction,
  type SessionTermType,
  type SessionTermStatus,
  getSessionErrorMessage,
} from '@fledgely/contracts'

/**
 * Co-Creation Session Service
 *
 * Story 5.1: Co-Creation Session Initiation - Task 5
 *
 * Wraps Firebase callable functions for co-creation session management.
 * Used by useCoCreationSession hook for session state management.
 */

/**
 * Response type for session operations
 */
interface SessionOperationResult {
  success: boolean
  session?: CoCreationSession
  error?: string
  message?: string
}

/**
 * Custom error for session service operations
 */
export class SessionServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message)
    this.name = 'SessionServiceError'
  }
}

/**
 * Handle Firebase callable function errors
 */
function handleCallableError(error: unknown): never {
  if (error instanceof Error) {
    // Extract error code from Firebase error
    const firebaseError = error as { code?: string; message?: string }
    const code = firebaseError.code?.replace('functions/', '') || 'unknown'
    const message = getSessionErrorMessage(code)
    throw new SessionServiceError(code, message)
  }
  throw new SessionServiceError('unknown', getSessionErrorMessage('unknown'))
}

/**
 * Create a new co-creation session
 *
 * @param input - Session creation input (familyId, childId, sourceDraft, initialTerms)
 * @returns Created session with ID
 */
export async function createCoCreationSession(
  input: CreateCoCreationSessionInput
): Promise<{ success: boolean; session?: CoCreationSession; error?: string }> {
  try {
    const callable = httpsCallable<CreateCoCreationSessionInput, SessionOperationResult>(
      functions,
      'createCoCreationSession'
    )
    const result = await callable(input)
    return {
      success: true,
      session: result.data.session,
    }
  } catch (error) {
    console.error('[coCreationSessionService.createSession]', error)
    if (error instanceof SessionServiceError) {
      return { success: false, error: error.message }
    }
    const err = error instanceof Error ? error : new Error('Unknown error')
    return { success: false, error: getSessionErrorMessage('create-failed') }
  }
}

/**
 * Get a co-creation session by ID
 *
 * @param sessionId - Session ID (UUID)
 * @returns Session or null if not found
 */
export async function getCoCreationSession(
  sessionId: string
): Promise<CoCreationSession | null> {
  try {
    const callable = httpsCallable<{ sessionId: string }, SessionOperationResult>(
      functions,
      'getCoCreationSession'
    )
    const result = await callable({ sessionId })
    return result.data.session || null
  } catch (error) {
    console.error('[coCreationSessionService.getSession]', error)
    handleCallableError(error)
  }
}

/**
 * Pause a co-creation session
 *
 * @param sessionId - Session ID to pause
 * @returns Updated session
 */
export async function pauseCoCreationSession(
  sessionId: string
): Promise<{ success: boolean; session?: CoCreationSession; error?: string }> {
  try {
    const callable = httpsCallable<{ sessionId: string }, SessionOperationResult>(
      functions,
      'pauseCoCreationSession'
    )
    const result = await callable({ sessionId })
    return {
      success: result.data.success,
      session: result.data.session,
    }
  } catch (error) {
    console.error('[coCreationSessionService.pauseSession]', error)
    const err = error instanceof Error ? error : new Error('Unknown error')
    return { success: false, error: getSessionErrorMessage('update-failed') }
  }
}

/**
 * Resume a paused co-creation session
 *
 * @param sessionId - Session ID to resume
 * @returns Updated session
 */
export async function resumeCoCreationSession(
  sessionId: string
): Promise<{ success: boolean; session?: CoCreationSession; error?: string }> {
  try {
    const callable = httpsCallable<{ sessionId: string }, SessionOperationResult>(
      functions,
      'resumeCoCreationSession'
    )
    const result = await callable({ sessionId })
    return {
      success: result.data.success,
      session: result.data.session,
    }
  } catch (error) {
    console.error('[coCreationSessionService.resumeSession]', error)
    return { success: false, error: getSessionErrorMessage('update-failed') }
  }
}

/**
 * Input for recording a contribution
 */
interface RecordContributionInput {
  sessionId: string
  contributor: SessionContributor
  action: ContributionAction
  termId?: string
  details?: Record<string, unknown>
}

/**
 * Record a contribution to the session
 *
 * @param input - Contribution details
 * @returns Updated session
 */
export async function recordSessionContribution(
  input: RecordContributionInput
): Promise<{ success: boolean; session?: CoCreationSession; error?: string }> {
  try {
    const callable = httpsCallable<RecordContributionInput, SessionOperationResult>(
      functions,
      'recordSessionContribution'
    )
    const result = await callable(input)
    return {
      success: result.data.success,
      session: result.data.session,
    }
  } catch (error) {
    console.error('[coCreationSessionService.recordContribution]', error)
    return { success: false, error: getSessionErrorMessage('update-failed') }
  }
}

/**
 * Input for adding a term
 */
interface AddTermInput {
  sessionId: string
  contributor: SessionContributor
  type: SessionTermType
  content: Record<string, unknown>
}

/**
 * Add a term to the session
 *
 * @param input - Term details
 * @returns Updated session
 */
export async function addSessionTerm(
  input: AddTermInput
): Promise<{ success: boolean; session?: CoCreationSession; error?: string }> {
  try {
    const callable = httpsCallable<AddTermInput, SessionOperationResult>(
      functions,
      'addSessionTerm'
    )
    const result = await callable(input)
    return {
      success: result.data.success,
      session: result.data.session,
    }
  } catch (error) {
    console.error('[coCreationSessionService.addTerm]', error)
    return { success: false, error: getSessionErrorMessage('update-failed') }
  }
}

/**
 * Input for updating a term
 */
interface UpdateTermInput {
  sessionId: string
  termId: string
  contributor: SessionContributor
  content?: Record<string, unknown>
  status?: SessionTermStatus
}

/**
 * Update a term in the session
 *
 * @param input - Update details
 * @returns Updated session
 */
export async function updateSessionTerm(
  input: UpdateTermInput
): Promise<{ success: boolean; session?: CoCreationSession; error?: string }> {
  try {
    const callable = httpsCallable<UpdateTermInput, SessionOperationResult>(
      functions,
      'updateSessionTerm'
    )
    const result = await callable(input)
    return {
      success: result.data.success,
      session: result.data.session,
    }
  } catch (error) {
    console.error('[coCreationSessionService.updateTerm]', error)
    return { success: false, error: getSessionErrorMessage('update-failed') }
  }
}

/**
 * Complete a co-creation session (mark ready for signing)
 *
 * @param sessionId - Session ID to complete
 * @returns Updated session
 */
export async function completeCoCreationSession(
  sessionId: string
): Promise<{ success: boolean; session?: CoCreationSession; error?: string }> {
  try {
    const callable = httpsCallable<{ sessionId: string }, SessionOperationResult>(
      functions,
      'completeCoCreationSession'
    )
    const result = await callable({ sessionId })
    return {
      success: result.data.success,
      session: result.data.session,
    }
  } catch (error) {
    console.error('[coCreationSessionService.completeSession]', error)
    return { success: false, error: getSessionErrorMessage('update-failed') }
  }
}

/**
 * Update session activity timestamp (for timeout tracking)
 * This is a lightweight operation to record activity
 *
 * @param sessionId - Session ID
 * @returns Success indicator
 */
export async function updateSessionActivity(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use recordContribution with a lightweight action
    // This updates lastActivityAt on the server
    const callable = httpsCallable<RecordContributionInput, SessionOperationResult>(
      functions,
      'recordSessionContribution'
    )
    await callable({
      sessionId,
      contributor: 'parent', // Activity tracking is parent-initiated
      action: 'session_resumed', // Reuse this action type for activity updates
      details: { activityUpdate: true },
    })
    return { success: true }
  } catch (error) {
    console.error('[coCreationSessionService.updateActivity]', error)
    // Don't throw - activity update failures shouldn't break the UI
    return { success: false, error: 'Activity update failed' }
  }
}
