/**
 * Callable Cloud Function: pauseCoCreationSession
 *
 * Story 5.1: Co-Creation Session Initiation
 *
 * Pauses an active co-creation session so the family can take a break
 * and resume later.
 *
 * Security invariants:
 * 1. Caller MUST be authenticated
 * 2. Caller MUST be a guardian of the child
 * 3. Session must be in 'initializing' or 'active' status
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { z } from 'zod'
import { pauseSession } from '../services/coCreationService'

// Extended input schema for the callable function
const pauseCoCreationSessionInputSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  familyId: z.string().min(1, 'Family ID is required'),
  pauseReason: z.string().optional(),
})

export const pauseCoCreationSession = onCall(
  {
    enforceAppCheck: true,
  },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required')
    }

    const callerUid = request.auth.uid

    // Validate input
    const parseResult = pauseCoCreationSessionInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', parseResult.error.flatten())
    }

    const input = parseResult.data

    // Call service function
    const result = await pauseSession(input, callerUid)

    if (!result.success) {
      const errorCode = result.error?.code as
        | 'permission-denied'
        | 'not-found'
        | 'failed-precondition'
        | 'internal'

      throw new HttpsError(
        errorCode || 'internal',
        result.error?.message || 'Failed to pause session',
        result.error?.details
      )
    }

    return {
      success: true,
      session: result.data,
      message: 'Session paused. You can resume anytime.',
    }
  }
)
