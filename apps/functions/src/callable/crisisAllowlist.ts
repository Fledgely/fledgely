/**
 * Crisis Allowlist Callable Functions
 *
 * Story 7.4: Emergency Allowlist Push
 *
 * Admin-only callable functions for managing the crisis allowlist.
 * These require authentication and admin role verification.
 *
 * AC2: Emergency Push Trigger
 * AC6: Audit Trail
 */

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https'
import * as logger from 'firebase-functions/logger'
import { getFirestore } from 'firebase-admin/firestore'
import {
  emergencyPushInputSchema,
  EmergencyPushResponse,
  GetAllowlistResponse,
} from '@fledgely/shared'
import {
  getCurrentAllowlist,
  pushEmergencyUpdate,
  removeResource,
  initializeAllowlist,
} from '../services/crisisAllowlistService'

/**
 * Verify that the caller has admin role
 *
 * @param request - Callable request
 * @returns Admin UID
 * @throws HttpsError if not authenticated or not admin
 */
async function verifyAdminRole(request: CallableRequest<unknown>): Promise<string> {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  const uid = request.auth.uid

  // Check for admin custom claim
  const token = request.auth.token as { admin?: boolean } | undefined
  if (token?.admin === true) {
    return uid
  }

  // Check Firestore for admin role
  const db = getFirestore()
  const userDoc = await db.collection('users').doc(uid).get()

  if (!userDoc.exists) {
    throw new HttpsError('permission-denied', 'User not found')
  }

  const userData = userDoc.data()
  if (userData?.role !== 'admin' && userData?.isAdmin !== true) {
    logger.warn('Non-admin attempted crisis allowlist update', { uid })
    throw new HttpsError('permission-denied', 'Admin role required for this operation')
  }

  return uid
}

/**
 * Push an emergency allowlist update
 *
 * Adds a new crisis resource to the allowlist immediately.
 * Admin-only operation.
 *
 * AC2: Emergency Push Trigger
 * AC6: Audit Trail
 */
export const pushEmergencyAllowlistUpdate = onCall<
  { resource: unknown; reason: string },
  Promise<EmergencyPushResponse>
>(
  {
    memory: '256MiB',
    timeoutSeconds: 60,
    region: 'us-central1',
  },
  async (request) => {
    // 1. Verify admin role
    const operatorId = await verifyAdminRole(request)

    // 2. Validate input
    const parseResult = emergencyPushInputSchema.safeParse(request.data)
    if (!parseResult.success) {
      logger.warn('Invalid emergency push input', {
        errors: parseResult.error.flatten(),
        operatorId,
      })
      throw new HttpsError(
        'invalid-argument',
        'Invalid input: ' +
          parseResult.error.errors.map((e: { message: string }) => e.message).join(', ')
      )
    }

    // 3. Push update
    try {
      const result = await pushEmergencyUpdate(parseResult.data, operatorId)
      return result
    } catch (error) {
      logger.error('Failed to push emergency update', { error, operatorId })
      throw new HttpsError('internal', 'Failed to push emergency update')
    }
  }
)

/**
 * Remove a resource from the allowlist
 *
 * Emergency removal of incorrect entries.
 * Admin-only operation.
 */
export const removeAllowlistResource = onCall<
  { resourceId: string; reason: string },
  Promise<EmergencyPushResponse>
>(
  {
    memory: '256MiB',
    timeoutSeconds: 60,
    region: 'us-central1',
  },
  async (request) => {
    // 1. Verify admin role
    const operatorId = await verifyAdminRole(request)

    // 2. Validate input
    const { resourceId, reason } = request.data
    if (!resourceId || typeof resourceId !== 'string') {
      throw new HttpsError('invalid-argument', 'resourceId is required')
    }
    if (!reason || typeof reason !== 'string' || reason.length < 10) {
      throw new HttpsError('invalid-argument', 'reason must be at least 10 characters')
    }

    // 3. Remove resource
    try {
      const result = await removeResource(resourceId, reason, operatorId)
      return result
    } catch (error) {
      logger.error('Failed to remove resource', { error, operatorId, resourceId })
      throw new HttpsError('internal', 'Failed to remove resource')
    }
  }
)

/**
 * Initialize the allowlist in Firestore
 *
 * Seeds the database with bundled defaults.
 * Admin-only operation.
 */
export const initializeCrisisAllowlist = onCall<void, Promise<{ initialized: boolean }>>(
  {
    memory: '256MiB',
    timeoutSeconds: 60,
    region: 'us-central1',
  },
  async (request) => {
    // 1. Verify admin role
    const operatorId = await verifyAdminRole(request)

    // 2. Initialize
    try {
      const initialized = await initializeAllowlist(operatorId)
      return { initialized }
    } catch (error) {
      logger.error('Failed to initialize allowlist', { error, operatorId })
      throw new HttpsError('internal', 'Failed to initialize allowlist')
    }
  }
)

/**
 * Get current allowlist (admin version with metadata)
 *
 * Returns the full allowlist including admin metadata.
 * Admin-only operation.
 */
export const getAdminAllowlist = onCall<void, Promise<GetAllowlistResponse>>(
  {
    memory: '256MiB',
    timeoutSeconds: 30,
    region: 'us-central1',
  },
  async (request) => {
    // 1. Verify admin role
    await verifyAdminRole(request)

    // 2. Get allowlist
    try {
      const allowlist = await getCurrentAllowlist()
      return allowlist
    } catch (error) {
      logger.error('Failed to get admin allowlist', { error })
      throw new HttpsError('internal', 'Failed to get allowlist')
    }
  }
)
