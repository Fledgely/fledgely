/**
 * Authentication utilities for Cloud Functions.
 *
 * Provides auth verification following the Cloud Functions Template pattern:
 * 1. Auth (FIRST)
 * 2. Validation (SECOND)
 * 3. Permission (THIRD)
 * 4. Business logic (LAST)
 */

import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https'

/**
 * Verified user information from Firebase Auth.
 */
export interface VerifiedUser {
  uid: string
  email: string | undefined
  displayName: string | undefined
}

/**
 * Verify that the request has a valid authenticated user.
 *
 * @param auth - The auth context from the callable request
 * @returns Verified user information
 * @throws HttpsError with 'unauthenticated' code if not authenticated
 */
export function verifyAuth(auth: CallableRequest['auth']): VerifiedUser {
  if (!auth || !auth.uid) {
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  return {
    uid: auth.uid,
    email: auth.token?.email,
    displayName: auth.token?.name,
  }
}
