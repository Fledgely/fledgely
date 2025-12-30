/**
 * Stealth Window Activation.
 *
 * Story 0.5.7: 72-Hour Notification Stealth
 *
 * Manages the 72-hour stealth window that suppresses notifications
 * to protect victims during escape actions.
 *
 * CRITICAL SAFETY REQUIREMENTS:
 * - Stealth activation is logged to admin audit ONLY
 * - NO family audit log entry
 * - NO notification about stealth activation
 * - Idempotent: multiple activations extend, not reset, the window
 */

import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { logAdminAction } from '../../utils/adminAudit'
import { STEALTH_DURATION_MS, STEALTH_DURATION_HOURS } from '@fledgely/shared'

const db = getFirestore()

/**
 * Options for activating a stealth window.
 */
export interface ActivateStealthWindowOptions {
  familyId: string
  ticketId: string
  affectedUserIds: string[]
  agentId: string
  agentEmail: string | null
  ipAddress: string | null
}

/**
 * Result of stealth window activation.
 */
export interface ActivateStealthWindowResult {
  success: boolean
  extended: boolean
  stealthWindowEnd: Date
  affectedUserIds: string[]
}

/**
 * Activate or extend a stealth window for a family.
 *
 * Story 0.5.7: AC6, AC7
 * - Sets stealth window start and end times
 * - Merges affected user IDs if already active
 * - Extends window if already in stealth (idempotent)
 * - Logs to admin audit ONLY
 *
 * @param options - The stealth window activation options
 * @returns Result of the activation
 */
export async function activateStealthWindow(
  options: ActivateStealthWindowOptions
): Promise<ActivateStealthWindowResult> {
  const { familyId, ticketId, affectedUserIds, agentId, agentEmail, ipAddress } = options

  const familyRef = db.collection('families').doc(familyId)
  const familySnap = await familyRef.get()

  if (!familySnap.exists) {
    // Silently succeed if family doesn't exist (defensive)
    return {
      success: true,
      extended: false,
      stealthWindowEnd: new Date(Date.now() + STEALTH_DURATION_MS),
      affectedUserIds,
    }
  }

  const familyData = familySnap.data()
  const now = Timestamp.now()
  const baseEndTime = Timestamp.fromMillis(now.toMillis() + STEALTH_DURATION_MS)

  // Check if already in active stealth window
  const existingEnd = familyData?.stealthWindowEnd as Timestamp | undefined
  const isCurrentlyActive =
    familyData?.stealthActive && existingEnd && existingEnd.toMillis() > now.toMillis()

  // If already in stealth, extend the window from current end time
  const effectiveEnd = isCurrentlyActive
    ? Timestamp.fromMillis(existingEnd!.toMillis() + STEALTH_DURATION_MS)
    : baseEndTime

  // Merge affected user IDs
  const existingAffected: string[] = familyData?.stealthAffectedUserIds || []
  const mergedAffected = [...new Set([...existingAffected, ...affectedUserIds])]

  // Update family document
  await familyRef.update({
    stealthActive: true,
    stealthWindowStart: isCurrentlyActive ? familyData?.stealthWindowStart : now,
    stealthWindowEnd: effectiveEnd,
    stealthTicketId: ticketId,
    stealthAffectedUserIds: mergedAffected,
  })

  // Log to admin audit ONLY (CRITICAL: NO family audit)
  await logAdminAction({
    agentId,
    agentEmail,
    action: 'activate_stealth_window',
    resourceType: 'stealth_window',
    resourceId: familyId,
    metadata: {
      ticketId,
      affectedUserIds: mergedAffected,
      stealthDurationHours: STEALTH_DURATION_HOURS,
      extended: isCurrentlyActive,
      previousAffectedCount: existingAffected.length,
      newAffectedCount: mergedAffected.length,
    },
    ipAddress,
  })

  return {
    success: true,
    extended: isCurrentlyActive || false,
    stealthWindowEnd: effectiveEnd.toDate(),
    affectedUserIds: mergedAffected,
  }
}

/**
 * Clear stealth window for a family.
 *
 * Story 0.5.7: AC2 - Used during cleanup after 72 hours
 *
 * @param familyId - The family ID
 */
export async function clearStealthWindow(familyId: string): Promise<void> {
  const familyRef = db.collection('families').doc(familyId)

  await familyRef.update({
    stealthActive: false,
    stealthWindowStart: null,
    stealthWindowEnd: null,
    stealthTicketId: null,
    stealthAffectedUserIds: [],
  })
}

/**
 * Get families with expired stealth windows.
 *
 * Story 0.5.7: AC2 - Used by cleanup scheduled function
 *
 * @returns Array of family IDs with expired stealth windows
 */
export async function getExpiredStealthFamilies(): Promise<string[]> {
  const now = Timestamp.now()

  const query = db
    .collection('families')
    .where('stealthActive', '==', true)
    .where('stealthWindowEnd', '<=', now)

  const snapshot = await query.get()

  return snapshot.docs.map((doc) => doc.id)
}
