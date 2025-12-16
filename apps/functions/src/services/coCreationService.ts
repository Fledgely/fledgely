/**
 * Co-Creation Session Service
 *
 * Story 5.1: Co-Creation Session Initiation
 *
 * Provides core business logic for managing co-creation sessions
 * where families collaboratively build their digital agreements.
 *
 * Security invariants:
 * 1. Only guardians of a child can create/access sessions
 * 2. Sessions are stored under family paths for isolation
 * 3. All contributions are tracked with contributor info
 * 4. Status transitions are validated
 */

import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { v4 as uuidv4 } from 'uuid'
import {
  type CoCreationSession,
  type SessionStatus,
  type SessionContribution,
  type SessionTerm,
  type SessionContributor,
  type ContributionAction,
  type SourceDraft,
  type CreateSessionInput,
  type PauseSessionInput,
  type ResumeSessionInput,
  type RecordContributionInput,
  isValidStatusTransition,
  canPauseSession,
  canResumeSession,
  SESSION_ARRAY_LIMITS,
} from '@fledgely/contracts'

/**
 * Service response type for consistent error handling
 */
export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

/**
 * Create a new co-creation session
 *
 * @param input - Session creation parameters
 * @param callerUid - The UID of the authenticated caller
 * @returns The created session
 */
export async function createSession(
  input: CreateSessionInput,
  callerUid: string
): Promise<ServiceResult<CoCreationSession>> {
  const db = getFirestore()
  const { familyId, childId, sourceDraft, initialTerms } = input

  try {
    // Verify caller is a guardian of the child
    const guardianCheck = await verifyGuardianship(db, childId, callerUid)
    if (!guardianCheck.isGuardian) {
      return {
        success: false,
        error: {
          code: 'permission-denied',
          message: 'You must be a guardian to create a co-creation session for this child',
        },
      }
    }

    // Check for existing active or paused sessions for this child
    const existingSessionSnapshot = await db
      .collection('families')
      .doc(familyId)
      .collection('co-creation-sessions')
      .where('childId', '==', childId)
      .where('status', 'in', ['initializing', 'active', 'paused'])
      .limit(1)
      .get()

    if (!existingSessionSnapshot.empty) {
      const existingSession = existingSessionSnapshot.docs[0].data()
      return {
        success: false,
        error: {
          code: 'already-exists',
          message: 'An active or paused session already exists for this child',
          details: {
            existingSessionId: existingSessionSnapshot.docs[0].id,
            existingStatus: existingSession.status,
          },
        },
      }
    }

    // Generate session ID
    const sessionId = uuidv4()
    const now = new Date().toISOString()

    // Create initial session contribution
    const startContribution: SessionContribution = {
      id: uuidv4(),
      contributor: 'parent',
      action: 'session_started',
      details: {
        startedBy: callerUid,
        sourceDraftType: sourceDraft.type,
      },
      createdAt: now,
    }

    // Transform initial terms if provided
    const terms: SessionTerm[] = (initialTerms || []).map((term) => ({
      id: uuidv4(),
      type: term.type,
      content: term.content,
      addedBy: 'parent' as SessionContributor,
      status: 'accepted' as const,
    }))

    // Create the session document
    const session: CoCreationSession = {
      id: sessionId,
      familyId,
      childId,
      initiatedBy: callerUid,
      status: 'initializing',
      sourceDraft: sourceDraft as SourceDraft,
      terms,
      contributions: [startContribution],
      createdAt: now,
      updatedAt: now,
      lastActivityAt: now,
    }

    // Store in Firestore
    await db
      .collection('families')
      .doc(familyId)
      .collection('co-creation-sessions')
      .doc(sessionId)
      .set({
        ...session,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        lastActivityAt: FieldValue.serverTimestamp(),
      })

    return {
      success: true,
      data: session,
    }
  } catch (error) {
    console.error('Failed to create co-creation session:', {
      familyId,
      childId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })

    return {
      success: false,
      error: {
        code: 'internal',
        message: 'Failed to create session',
      },
    }
  }
}

/**
 * Pause an active co-creation session
 *
 * @param input - Pause parameters
 * @param callerUid - The UID of the authenticated caller
 * @returns The updated session
 */
export async function pauseSession(
  input: PauseSessionInput,
  callerUid: string
): Promise<ServiceResult<CoCreationSession>> {
  const db = getFirestore()
  const { sessionId, familyId, pauseReason } = input

  try {
    // Get the session
    const sessionRef = db
      .collection('families')
      .doc(familyId)
      .collection('co-creation-sessions')
      .doc(sessionId)

    const sessionDoc = await sessionRef.get()

    if (!sessionDoc.exists) {
      return {
        success: false,
        error: {
          code: 'not-found',
          message: 'Session not found',
        },
      }
    }

    const sessionData = sessionDoc.data() as CoCreationSession

    // Verify caller is a guardian of the child
    const guardianCheck = await verifyGuardianship(db, sessionData.childId, callerUid)
    if (!guardianCheck.isGuardian) {
      return {
        success: false,
        error: {
          code: 'permission-denied',
          message: 'You must be a guardian to pause this session',
        },
      }
    }

    // Validate status transition
    if (!canPauseSession(sessionData.status)) {
      return {
        success: false,
        error: {
          code: 'failed-precondition',
          message: `Cannot pause session with status: ${sessionData.status}`,
          details: {
            currentStatus: sessionData.status,
            allowedStatuses: ['initializing', 'active'],
          },
        },
      }
    }

    const now = new Date().toISOString()

    // Create pause contribution
    const pauseContribution: SessionContribution = {
      id: uuidv4(),
      contributor: 'parent',
      action: 'session_paused',
      details: {
        pausedBy: callerUid,
        pauseReason: pauseReason || 'Taking a break',
      },
      createdAt: now,
    }

    // Update session
    await sessionRef.update({
      status: 'paused',
      pausedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastActivityAt: FieldValue.serverTimestamp(),
      contributions: FieldValue.arrayUnion(pauseContribution),
    })

    // Return updated session
    const updatedSession: CoCreationSession = {
      ...sessionData,
      status: 'paused',
      pausedAt: now,
      updatedAt: now,
      lastActivityAt: now,
      contributions: [...sessionData.contributions, pauseContribution],
    }

    return {
      success: true,
      data: updatedSession,
    }
  } catch (error) {
    console.error('Failed to pause co-creation session:', {
      sessionId,
      familyId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })

    return {
      success: false,
      error: {
        code: 'internal',
        message: 'Failed to pause session',
      },
    }
  }
}

/**
 * Resume a paused co-creation session
 *
 * @param input - Resume parameters
 * @param callerUid - The UID of the authenticated caller
 * @returns The updated session
 */
export async function resumeSession(
  input: ResumeSessionInput,
  callerUid: string
): Promise<ServiceResult<CoCreationSession>> {
  const db = getFirestore()
  const { sessionId, familyId } = input

  try {
    // Get the session
    const sessionRef = db
      .collection('families')
      .doc(familyId)
      .collection('co-creation-sessions')
      .doc(sessionId)

    const sessionDoc = await sessionRef.get()

    if (!sessionDoc.exists) {
      return {
        success: false,
        error: {
          code: 'not-found',
          message: 'Session not found',
        },
      }
    }

    const sessionData = sessionDoc.data() as CoCreationSession

    // Verify caller is a guardian of the child
    const guardianCheck = await verifyGuardianship(db, sessionData.childId, callerUid)
    if (!guardianCheck.isGuardian) {
      return {
        success: false,
        error: {
          code: 'permission-denied',
          message: 'You must be a guardian to resume this session',
        },
      }
    }

    // Validate status transition
    if (!canResumeSession(sessionData.status)) {
      return {
        success: false,
        error: {
          code: 'failed-precondition',
          message: `Cannot resume session with status: ${sessionData.status}`,
          details: {
            currentStatus: sessionData.status,
            allowedStatuses: ['paused'],
          },
        },
      }
    }

    const now = new Date().toISOString()

    // Create resume contribution
    const resumeContribution: SessionContribution = {
      id: uuidv4(),
      contributor: 'parent',
      action: 'session_resumed',
      details: {
        resumedBy: callerUid,
        pauseDuration: sessionData.pausedAt
          ? calculateDuration(sessionData.pausedAt, now)
          : null,
      },
      createdAt: now,
    }

    // Update session
    await sessionRef.update({
      status: 'active',
      updatedAt: FieldValue.serverTimestamp(),
      lastActivityAt: FieldValue.serverTimestamp(),
      contributions: FieldValue.arrayUnion(resumeContribution),
    })

    // Return updated session
    const updatedSession: CoCreationSession = {
      ...sessionData,
      status: 'active',
      updatedAt: now,
      lastActivityAt: now,
      contributions: [...sessionData.contributions, resumeContribution],
    }

    return {
      success: true,
      data: updatedSession,
    }
  } catch (error) {
    console.error('Failed to resume co-creation session:', {
      sessionId,
      familyId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })

    return {
      success: false,
      error: {
        code: 'internal',
        message: 'Failed to resume session',
      },
    }
  }
}

/**
 * Record a contribution to a co-creation session
 *
 * @param input - Contribution parameters
 * @param callerUid - The UID of the authenticated caller
 * @returns The updated session
 */
export async function recordContribution(
  input: RecordContributionInput,
  callerUid: string
): Promise<ServiceResult<CoCreationSession>> {
  const db = getFirestore()
  const { sessionId, familyId, contributor, action, termId, details, term } = input

  try {
    // Get the session
    const sessionRef = db
      .collection('families')
      .doc(familyId)
      .collection('co-creation-sessions')
      .doc(sessionId)

    const sessionDoc = await sessionRef.get()

    if (!sessionDoc.exists) {
      return {
        success: false,
        error: {
          code: 'not-found',
          message: 'Session not found',
        },
      }
    }

    const sessionData = sessionDoc.data() as CoCreationSession

    // Verify caller is a guardian of the child
    const guardianCheck = await verifyGuardianship(db, sessionData.childId, callerUid)
    if (!guardianCheck.isGuardian) {
      return {
        success: false,
        error: {
          code: 'permission-denied',
          message: 'You must be a guardian to contribute to this session',
        },
      }
    }

    // Validate session is in a state that allows contributions
    if (!['initializing', 'active'].includes(sessionData.status)) {
      return {
        success: false,
        error: {
          code: 'failed-precondition',
          message: `Cannot add contributions to session with status: ${sessionData.status}`,
          details: {
            currentStatus: sessionData.status,
            allowedStatuses: ['initializing', 'active'],
          },
        },
      }
    }

    // Check contribution limit
    if (sessionData.contributions.length >= SESSION_ARRAY_LIMITS.maxContributions) {
      return {
        success: false,
        error: {
          code: 'resource-exhausted',
          message: `Maximum contributions (${SESSION_ARRAY_LIMITS.maxContributions}) reached`,
        },
      }
    }

    const now = new Date().toISOString()

    // Create the contribution
    const contribution: SessionContribution = {
      id: uuidv4(),
      contributor,
      action,
      termId,
      details: {
        ...details,
        recordedBy: callerUid,
      },
      createdAt: now,
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      status: sessionData.status === 'initializing' ? 'active' : sessionData.status,
      updatedAt: FieldValue.serverTimestamp(),
      lastActivityAt: FieldValue.serverTimestamp(),
      contributions: FieldValue.arrayUnion(contribution),
    }

    // Handle term-related actions
    let updatedTerms = [...sessionData.terms]

    if (action === 'added_term' && term) {
      // Check term limit
      if (sessionData.terms.length >= SESSION_ARRAY_LIMITS.maxTerms) {
        return {
          success: false,
          error: {
            code: 'resource-exhausted',
            message: `Maximum terms (${SESSION_ARRAY_LIMITS.maxTerms}) reached`,
          },
        }
      }

      const newTerm: SessionTerm = {
        id: uuidv4(),
        type: term.type,
        content: term.content,
        addedBy: contributor,
        status: 'accepted',
      }
      updatedTerms.push(newTerm)
      updateData.terms = updatedTerms
      contribution.termId = newTerm.id
    } else if (action === 'removed_term' && termId) {
      updatedTerms = updatedTerms.map((t) =>
        t.id === termId ? { ...t, status: 'removed' as const } : t
      )
      updateData.terms = updatedTerms
    } else if (action === 'modified_term' && termId && term) {
      updatedTerms = updatedTerms.map((t) =>
        t.id === termId ? { ...t, content: term.content } : t
      )
      updateData.terms = updatedTerms
    } else if (action === 'marked_for_discussion' && termId) {
      updatedTerms = updatedTerms.map((t) =>
        t.id === termId ? { ...t, status: 'discussion' as const } : t
      )
      updateData.terms = updatedTerms
    } else if (action === 'resolved_discussion' && termId) {
      updatedTerms = updatedTerms.map((t) =>
        t.id === termId ? { ...t, status: 'accepted' as const } : t
      )
      updateData.terms = updatedTerms
    }

    // Update session
    await sessionRef.update(updateData)

    // Return updated session
    const updatedSession: CoCreationSession = {
      ...sessionData,
      status: updateData.status as SessionStatus,
      terms: updatedTerms,
      updatedAt: now,
      lastActivityAt: now,
      contributions: [...sessionData.contributions, contribution],
    }

    return {
      success: true,
      data: updatedSession,
    }
  } catch (error) {
    console.error('Failed to record contribution:', {
      sessionId,
      familyId,
      action,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })

    return {
      success: false,
      error: {
        code: 'internal',
        message: 'Failed to record contribution',
      },
    }
  }
}

/**
 * Get a co-creation session by ID
 *
 * @param sessionId - The session ID
 * @param familyId - The family ID
 * @param callerUid - The UID of the authenticated caller
 * @returns The session if found and caller has permission
 */
export async function getSession(
  sessionId: string,
  familyId: string,
  callerUid: string
): Promise<ServiceResult<CoCreationSession>> {
  const db = getFirestore()

  try {
    // Get the session
    const sessionDoc = await db
      .collection('families')
      .doc(familyId)
      .collection('co-creation-sessions')
      .doc(sessionId)
      .get()

    if (!sessionDoc.exists) {
      return {
        success: false,
        error: {
          code: 'not-found',
          message: 'Session not found',
        },
      }
    }

    const sessionData = sessionDoc.data() as CoCreationSession

    // Verify caller is a guardian of the child
    const guardianCheck = await verifyGuardianship(db, sessionData.childId, callerUid)
    if (!guardianCheck.isGuardian) {
      return {
        success: false,
        error: {
          code: 'permission-denied',
          message: 'You must be a guardian to view this session',
        },
      }
    }

    // Convert Firestore timestamps to ISO strings
    const session: CoCreationSession = {
      ...sessionData,
      createdAt: convertTimestamp(sessionData.createdAt),
      updatedAt: convertTimestamp(sessionData.updatedAt),
      lastActivityAt: convertTimestamp(sessionData.lastActivityAt),
      pausedAt: sessionData.pausedAt ? convertTimestamp(sessionData.pausedAt) : undefined,
      completedAt: sessionData.completedAt
        ? convertTimestamp(sessionData.completedAt)
        : undefined,
    }

    return {
      success: true,
      data: session,
    }
  } catch (error) {
    console.error('Failed to get co-creation session:', {
      sessionId,
      familyId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })

    return {
      success: false,
      error: {
        code: 'internal',
        message: 'Failed to get session',
      },
    }
  }
}

/**
 * Get active or paused sessions for a child
 *
 * @param childId - The child ID
 * @param familyId - The family ID
 * @param callerUid - The UID of the authenticated caller
 * @returns List of active/paused sessions
 */
export async function getActiveSessionsForChild(
  childId: string,
  familyId: string,
  callerUid: string
): Promise<ServiceResult<CoCreationSession[]>> {
  const db = getFirestore()

  try {
    // Verify caller is a guardian of the child
    const guardianCheck = await verifyGuardianship(db, childId, callerUid)
    if (!guardianCheck.isGuardian) {
      return {
        success: false,
        error: {
          code: 'permission-denied',
          message: 'You must be a guardian to view sessions for this child',
        },
      }
    }

    // Query for active/paused sessions
    const sessionsSnapshot = await db
      .collection('families')
      .doc(familyId)
      .collection('co-creation-sessions')
      .where('childId', '==', childId)
      .where('status', 'in', ['initializing', 'active', 'paused'])
      .orderBy('lastActivityAt', 'desc')
      .get()

    const sessions: CoCreationSession[] = sessionsSnapshot.docs.map((doc) => {
      const data = doc.data() as CoCreationSession
      return {
        ...data,
        createdAt: convertTimestamp(data.createdAt),
        updatedAt: convertTimestamp(data.updatedAt),
        lastActivityAt: convertTimestamp(data.lastActivityAt),
        pausedAt: data.pausedAt ? convertTimestamp(data.pausedAt) : undefined,
        completedAt: data.completedAt ? convertTimestamp(data.completedAt) : undefined,
      }
    })

    return {
      success: true,
      data: sessions,
    }
  } catch (error) {
    console.error('Failed to get active sessions for child:', {
      childId,
      familyId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })

    return {
      success: false,
      error: {
        code: 'internal',
        message: 'Failed to get sessions',
      },
    }
  }
}

/**
 * Complete a co-creation session
 *
 * @param sessionId - The session ID
 * @param familyId - The family ID
 * @param callerUid - The UID of the authenticated caller
 * @returns The completed session
 */
export async function completeSession(
  sessionId: string,
  familyId: string,
  callerUid: string
): Promise<ServiceResult<CoCreationSession>> {
  const db = getFirestore()

  try {
    // Get the session
    const sessionRef = db
      .collection('families')
      .doc(familyId)
      .collection('co-creation-sessions')
      .doc(sessionId)

    const sessionDoc = await sessionRef.get()

    if (!sessionDoc.exists) {
      return {
        success: false,
        error: {
          code: 'not-found',
          message: 'Session not found',
        },
      }
    }

    const sessionData = sessionDoc.data() as CoCreationSession

    // Verify caller is a guardian of the child
    const guardianCheck = await verifyGuardianship(db, sessionData.childId, callerUid)
    if (!guardianCheck.isGuardian) {
      return {
        success: false,
        error: {
          code: 'permission-denied',
          message: 'You must be a guardian to complete this session',
        },
      }
    }

    // Validate status transition
    if (!isValidStatusTransition(sessionData.status, 'completed')) {
      return {
        success: false,
        error: {
          code: 'failed-precondition',
          message: `Cannot complete session with status: ${sessionData.status}`,
          details: {
            currentStatus: sessionData.status,
            allowedStatuses: ['active'],
          },
        },
      }
    }

    // Validate session has at least one accepted term
    const acceptedTerms = sessionData.terms.filter((t) => t.status === 'accepted')
    if (acceptedTerms.length === 0) {
      return {
        success: false,
        error: {
          code: 'failed-precondition',
          message: 'Session must have at least one accepted term to complete',
        },
      }
    }

    const now = new Date().toISOString()

    // Create completion contribution
    const completionContribution: SessionContribution = {
      id: uuidv4(),
      contributor: 'parent',
      action: 'session_started', // Using closest available action
      details: {
        completedBy: callerUid,
        acceptedTermsCount: acceptedTerms.length,
        completionAction: 'session_completed',
      },
      createdAt: now,
    }

    // Update session
    await sessionRef.update({
      status: 'completed',
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastActivityAt: FieldValue.serverTimestamp(),
      contributions: FieldValue.arrayUnion(completionContribution),
    })

    // Return updated session
    const updatedSession: CoCreationSession = {
      ...sessionData,
      status: 'completed',
      completedAt: now,
      updatedAt: now,
      lastActivityAt: now,
      contributions: [...sessionData.contributions, completionContribution],
    }

    return {
      success: true,
      data: updatedSession,
    }
  } catch (error) {
    console.error('Failed to complete co-creation session:', {
      sessionId,
      familyId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })

    return {
      success: false,
      error: {
        code: 'internal',
        message: 'Failed to complete session',
      },
    }
  }
}

/**
 * Abandon a co-creation session (timeout or manual)
 *
 * @param sessionId - The session ID
 * @param familyId - The family ID
 * @param reason - Reason for abandonment
 * @param callerUid - The UID of the authenticated caller (optional for system timeout)
 * @returns The abandoned session
 */
export async function abandonSession(
  sessionId: string,
  familyId: string,
  reason: string,
  callerUid?: string
): Promise<ServiceResult<CoCreationSession>> {
  const db = getFirestore()

  try {
    // Get the session
    const sessionRef = db
      .collection('families')
      .doc(familyId)
      .collection('co-creation-sessions')
      .doc(sessionId)

    const sessionDoc = await sessionRef.get()

    if (!sessionDoc.exists) {
      return {
        success: false,
        error: {
          code: 'not-found',
          message: 'Session not found',
        },
      }
    }

    const sessionData = sessionDoc.data() as CoCreationSession

    // If caller provided, verify guardianship
    if (callerUid) {
      const guardianCheck = await verifyGuardianship(db, sessionData.childId, callerUid)
      if (!guardianCheck.isGuardian) {
        return {
          success: false,
          error: {
            code: 'permission-denied',
            message: 'You must be a guardian to abandon this session',
          },
        }
      }
    }

    // Validate status transition
    if (!isValidStatusTransition(sessionData.status, 'abandoned')) {
      return {
        success: false,
        error: {
          code: 'failed-precondition',
          message: `Cannot abandon session with status: ${sessionData.status}`,
          details: {
            currentStatus: sessionData.status,
          },
        },
      }
    }

    const now = new Date().toISOString()

    // Create abandonment contribution
    const abandonContribution: SessionContribution = {
      id: uuidv4(),
      contributor: 'parent',
      action: 'session_paused', // Using closest available action
      details: {
        abandonedBy: callerUid || 'system',
        reason,
        abandonAction: 'session_abandoned',
      },
      createdAt: now,
    }

    // Update session
    await sessionRef.update({
      status: 'abandoned',
      updatedAt: FieldValue.serverTimestamp(),
      lastActivityAt: FieldValue.serverTimestamp(),
      contributions: FieldValue.arrayUnion(abandonContribution),
    })

    // Return updated session
    const updatedSession: CoCreationSession = {
      ...sessionData,
      status: 'abandoned',
      updatedAt: now,
      lastActivityAt: now,
      contributions: [...sessionData.contributions, abandonContribution],
    }

    return {
      success: true,
      data: updatedSession,
    }
  } catch (error) {
    console.error('Failed to abandon co-creation session:', {
      sessionId,
      familyId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })

    return {
      success: false,
      error: {
        code: 'internal',
        message: 'Failed to abandon session',
      },
    }
  }
}

/**
 * Update last activity timestamp for a session
 *
 * @param sessionId - The session ID
 * @param familyId - The family ID
 */
export async function updateLastActivity(
  sessionId: string,
  familyId: string
): Promise<ServiceResult<void>> {
  const db = getFirestore()

  try {
    await db
      .collection('families')
      .doc(familyId)
      .collection('co-creation-sessions')
      .doc(sessionId)
      .update({
        lastActivityAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })

    return { success: true }
  } catch (error) {
    console.error('Failed to update last activity:', {
      sessionId,
      familyId,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    })

    return {
      success: false,
      error: {
        code: 'internal',
        message: 'Failed to update last activity',
      },
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Verify that a user is a guardian of a child
 */
async function verifyGuardianship(
  db: FirebaseFirestore.Firestore,
  childId: string,
  callerUid: string
): Promise<{ isGuardian: boolean; guardianData?: Record<string, unknown> }> {
  try {
    const childDoc = await db.collection('children').doc(childId).get()

    if (!childDoc.exists) {
      return { isGuardian: false }
    }

    const childData = childDoc.data()
    if (!childData) {
      return { isGuardian: false }
    }

    const guardians = childData.guardians || []
    const guardianData = guardians.find((g: { uid: string }) => g.uid === callerUid)

    return {
      isGuardian: !!guardianData,
      guardianData,
    }
  } catch {
    return { isGuardian: false }
  }
}

/**
 * Convert Firestore Timestamp to ISO string
 */
function convertTimestamp(timestamp: unknown): string {
  if (!timestamp) {
    return new Date().toISOString()
  }

  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString()
  }

  if (typeof timestamp === 'string') {
    return timestamp
  }

  // Handle Firestore timestamp-like objects
  if (
    typeof timestamp === 'object' &&
    timestamp !== null &&
    'toDate' in timestamp &&
    typeof (timestamp as { toDate: () => Date }).toDate === 'function'
  ) {
    return (timestamp as { toDate: () => Date }).toDate().toISOString()
  }

  return new Date().toISOString()
}

/**
 * Calculate duration between two ISO timestamps in milliseconds
 */
function calculateDuration(start: string, end: string): number {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return endDate.getTime() - startDate.getTime()
}
