/**
 * Callable Cloud Function: createCoCreationSession
 *
 * Story 5.1: Co-Creation Session Initiation
 *
 * Creates a new co-creation session for a family to collaboratively
 * build their digital agreement together.
 *
 * Security invariants:
 * 1. Caller MUST be authenticated
 * 2. Caller MUST be a guardian of the child
 * 3. Only one active/paused session per child at a time
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { createCoCreationSessionInputSchema } from '@fledgely/contracts'
import { createSession } from '../services/coCreationService'

export const createCoCreationSession = onCall(
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
    const parseResult = createCoCreationSessionInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', parseResult.error.flatten())
    }

    const input = parseResult.data

    // Call service function
    const result = await createSession(input, callerUid)

    if (!result.success) {
      const errorCode = result.error?.code as
        | 'permission-denied'
        | 'already-exists'
        | 'not-found'
        | 'internal'

      throw new HttpsError(
        errorCode || 'internal',
        result.error?.message || 'Failed to create session',
        result.error?.details
      )
    }

    return {
      success: true,
      session: result.data,
      message: 'Co-creation session created. Ready to begin family collaboration.',
    }
  }
)
