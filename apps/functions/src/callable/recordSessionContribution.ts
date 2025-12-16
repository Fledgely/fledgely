/**
 * Callable Cloud Function: recordSessionContribution
 *
 * Story 5.1: Co-Creation Session Initiation
 *
 * Records a contribution to a co-creation session. This tracks which
 * party (parent or child) made each contribution for transparency.
 *
 * Security invariants:
 * 1. Caller MUST be authenticated
 * 2. Caller MUST be a guardian of the child
 * 3. Session must be in 'initializing' or 'active' status
 * 4. Contribution limits enforced (max 1000 contributions)
 * 5. Term limits enforced (max 100 terms per NFR60)
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { z } from 'zod'
import { recordContribution } from '../services/coCreationService'
import {
  sessionContributorSchema,
  contributionActionSchema,
  sessionTermTypeSchema,
} from '@fledgely/contracts'

// Extended input schema for the callable function
const recordSessionContributionInputSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID'),
  familyId: z.string().min(1, 'Family ID is required'),
  contributor: sessionContributorSchema,
  action: contributionActionSchema,
  termId: z.string().uuid().optional(),
  details: z.record(z.unknown()).optional(),
  term: z
    .object({
      type: sessionTermTypeSchema,
      content: z.record(z.unknown()),
    })
    .optional(),
})

export const recordSessionContribution = onCall(
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
    const parseResult = recordSessionContributionInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'Invalid input', parseResult.error.flatten())
    }

    const input = parseResult.data

    // Call service function
    const result = await recordContribution(input, callerUid)

    if (!result.success) {
      const errorCode = result.error?.code as
        | 'permission-denied'
        | 'not-found'
        | 'failed-precondition'
        | 'resource-exhausted'
        | 'internal'

      throw new HttpsError(
        errorCode || 'internal',
        result.error?.message || 'Failed to record contribution',
        result.error?.details
      )
    }

    return {
      success: true,
      session: result.data,
      message: 'Contribution recorded.',
    }
  }
)
