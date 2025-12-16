/**
 * Callable Cloud Function: getCoCreationSession
 *
 * Story 5.1: Co-Creation Session Initiation
 *
 * Retrieves a co-creation session by ID with permission checks.
 *
 * Security invariants:
 * 1. Caller MUST be authenticated
 * 2. Caller MUST be a guardian of the child
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { z } from 'zod'
import { getSession, getActiveSessionsForChild } from '../services/coCreationService'

// Input schema for getting a single session
const getSessionInputSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  familyId: z.string().min(1, 'Family ID is required'),
})

// Input schema for getting active sessions for a child
const getActiveSessionsInputSchema = z.object({
  childId: z.string().min(1, 'Child ID is required'),
  familyId: z.string().min(1, 'Family ID is required'),
})

// Combined input schema (allows either operation)
const inputSchema = z.union([
  getSessionInputSchema.extend({ operation: z.literal('get') }),
  getActiveSessionsInputSchema.extend({ operation: z.literal('getActiveForChild') }),
])

export const getCoCreationSession = onCall(
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
    const parseResult = inputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', parseResult.error.flatten())
    }

    const input = parseResult.data

    if (input.operation === 'get') {
      // Get single session
      const result = await getSession(input.sessionId, input.familyId, callerUid)

      if (!result.success) {
        const errorCode = result.error?.code as
          | 'permission-denied'
          | 'not-found'
          | 'internal'

        throw new HttpsError(
          errorCode || 'internal',
          result.error?.message || 'Failed to get session',
          result.error?.details
        )
      }

      return {
        success: true,
        session: result.data,
      }
    } else {
      // Get active sessions for child
      const result = await getActiveSessionsForChild(input.childId, input.familyId, callerUid)

      if (!result.success) {
        const errorCode = result.error?.code as
          | 'permission-denied'
          | 'internal'

        throw new HttpsError(
          errorCode || 'internal',
          result.error?.message || 'Failed to get sessions',
          result.error?.details
        )
      }

      return {
        success: true,
        sessions: result.data,
      }
    }
  }
)
