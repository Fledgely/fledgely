/**
 * Safety Team Authentication Helpers.
 *
 * Story 0.5.3: Support Agent Escape Dashboard
 *
 * CRITICAL SECURITY DESIGN:
 * Verifies that users have the safety-team custom claim.
 * Only users with this claim can access safety ticket data.
 *
 * Key features:
 * - Checks Firebase custom claims for safety-team role
 * - Logs unauthorized access attempts
 * - Returns structured error for consistent handling
 */

import { CallableRequest, HttpsError } from 'firebase-functions/v2/https'
import { logUnauthorizedAccess } from './adminAudit'

/**
 * Custom claims structure for safety team members.
 */
export interface SafetyTeamClaims {
  'safety-team'?: boolean
}

/**
 * Verified safety team context returned after authentication.
 */
export interface SafetyTeamContext {
  /** Agent's Firebase UID */
  agentId: string
  /** Agent's email */
  agentEmail: string | null
  /** IP address from request */
  ipAddress: string | null
}

/**
 * Verify that the caller has the safety-team role.
 *
 * @param request - The callable request
 * @param actionDescription - Description of what the user is trying to do (for logging)
 * @returns The verified safety team context
 * @throws HttpsError if user is not authenticated or doesn't have safety-team role
 */
export async function requireSafetyTeamRole(
  request: CallableRequest,
  actionDescription: string
): Promise<SafetyTeamContext> {
  const ipAddress = request.rawRequest?.ip || null

  // Check authentication
  if (!request.auth) {
    // Log unauthorized access attempt (no user ID available)
    await logUnauthorizedAccess('anonymous', null, actionDescription, ipAddress)

    // Return neutral error message (don't reveal that safety dashboard exists)
    throw new HttpsError('unauthenticated', 'Authentication required')
  }

  const userId = request.auth.uid
  const userEmail = request.auth.token?.email || null

  // Check for safety-team custom claim
  const claims = request.auth.token as SafetyTeamClaims
  if (!claims['safety-team']) {
    // Log unauthorized access attempt
    await logUnauthorizedAccess(userId, userEmail, actionDescription, ipAddress)

    // Return neutral error message (don't reveal that safety dashboard exists)
    throw new HttpsError('permission-denied', 'Access denied')
  }

  return {
    agentId: userId,
    agentEmail: userEmail,
    ipAddress,
  }
}

/**
 * Check if a user has the safety-team role (without throwing).
 *
 * @param request - The callable request
 * @returns True if user has safety-team role, false otherwise
 */
export function hasSafetyTeamRole(request: CallableRequest): boolean {
  if (!request.auth) return false

  const claims = request.auth.token as SafetyTeamClaims
  return claims['safety-team'] === true
}
