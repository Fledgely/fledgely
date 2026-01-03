/**
 * Flag Notification Orchestrator
 *
 * Story 41.2: Flag Notifications - AC1, AC2, AC3, AC4, AC5
 *
 * Central orchestrator that routes flag notifications based on:
 * - Flag severity (critical, medium, low)
 * - Parent notification preferences
 * - Crisis zero-data-path protection
 * - Co-parent independence
 */

import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  type FlagDocument,
  type ParentNotificationPreferences,
  type ConcernSeverity,
  createDefaultNotificationPreferences,
} from '@fledgely/shared'

// Lazy Firestore initialization for testing
let db: FirebaseFirestore.Firestore | null = null
function getDb(): FirebaseFirestore.Firestore {
  if (!db) {
    db = getFirestore()
  }
  return db
}

/** Reset Firestore instance for testing */
export function _resetDbForTesting(): void {
  db = null
}

/**
 * Result of processing a flag notification
 */
export interface FlagNotificationResult {
  /** Whether any notification was generated */
  notificationGenerated: boolean
  /** Route taken for each parent */
  parentRoutes: {
    userId: string
    route: 'immediate' | 'hourly_digest' | 'daily_digest' | 'skipped'
    reason?: string
  }[]
  /** Whether this was blocked by crisis protection */
  crisisBlocked: boolean
}

/**
 * Notification route decision
 */
export type NotificationRoute = 'immediate' | 'hourly_digest' | 'daily_digest' | 'skipped'

/**
 * Check if flag is crisis-related (zero-data-path protection)
 *
 * Story 41.2 - AC5: Crisis flags NEVER generate notifications
 */
export function isCrisisRelatedFlag(flag: FlagDocument): boolean {
  // Check for suppression reasons that indicate crisis content
  if (flag.suppressionReason) {
    return ['self_harm_detected', 'crisis_url_visited', 'distress_signals'].includes(
      flag.suppressionReason
    )
  }

  // Check for sensitive_hold status
  if (flag.status === 'sensitive_hold') {
    return true
  }

  return false
}

/**
 * Determine notification route based on severity and preferences
 *
 * Story 41.2 - AC1, AC2, AC3: Routing based on severity and preferences
 */
export function determineNotificationRoute(
  severity: ConcernSeverity,
  prefs: ParentNotificationPreferences
): { route: NotificationRoute; reason: string } {
  switch (severity) {
    case 'critical':
      // Critical flags always get immediate notification if enabled
      if (prefs.criticalFlagsEnabled) {
        return { route: 'immediate', reason: 'critical_enabled' }
      }
      return { route: 'skipped', reason: 'critical_disabled' }

    case 'medium':
      // Medium flags depend on mediumFlagsMode preference
      if (prefs.mediumFlagsMode === 'immediate') {
        return { route: 'immediate', reason: 'medium_immediate_mode' }
      }
      if (prefs.mediumFlagsMode === 'digest') {
        return { route: 'hourly_digest', reason: 'medium_digest_mode' }
      }
      // 'off' mode
      return { route: 'skipped', reason: 'medium_disabled' }

    case 'low':
      // Low flags go to daily digest if enabled
      if (prefs.lowFlagsEnabled) {
        return { route: 'daily_digest', reason: 'low_enabled' }
      }
      return { route: 'skipped', reason: 'low_disabled' }

    default:
      logger.warn('Unknown severity level', { severity })
      return { route: 'skipped', reason: 'unknown_severity' }
  }
}

/**
 * Get notification preferences for a user
 *
 * Story 41.2 - AC4: Each parent has independent preferences
 */
async function getPreferencesForUser(
  userId: string,
  familyId: string,
  childId: string
): Promise<ParentNotificationPreferences> {
  // Try child-specific preferences first
  const childPrefsRef = getDb()
    .collection('users')
    .doc(userId)
    .collection('notificationPreferences')
    .doc(childId)

  const childPrefsDoc = await childPrefsRef.get()
  if (childPrefsDoc.exists) {
    const data = childPrefsDoc.data()
    return {
      ...data,
      updatedAt: data?.updatedAt?.toDate?.() || new Date(),
      createdAt: data?.createdAt?.toDate?.() || new Date(),
    } as ParentNotificationPreferences
  }

  // Try family-wide preferences
  const defaultPrefsRef = getDb()
    .collection('users')
    .doc(userId)
    .collection('notificationPreferences')
    .doc('default')

  const defaultPrefsDoc = await defaultPrefsRef.get()
  if (defaultPrefsDoc.exists) {
    const data = defaultPrefsDoc.data()
    return {
      ...data,
      updatedAt: data?.updatedAt?.toDate?.() || new Date(),
      createdAt: data?.createdAt?.toDate?.() || new Date(),
    } as ParentNotificationPreferences
  }

  // Return defaults if no preferences stored
  return createDefaultNotificationPreferences(userId, familyId, childId)
}

/**
 * Get parent IDs for a family
 */
async function getParentIdsForFamily(familyId: string): Promise<string[]> {
  const familyRef = getDb().collection('families').doc(familyId)
  const familyDoc = await familyRef.get()

  if (!familyDoc.exists) {
    logger.warn('Family not found', { familyId })
    return []
  }

  const familyData = familyDoc.data()

  // Check both parentIds and guardians arrays
  const parentIds = familyData?.parentIds as string[] | undefined
  if (parentIds && parentIds.length > 0) {
    return parentIds
  }

  // Fallback to guardians array
  const guardians = familyData?.guardians as Array<{ uid: string }> | undefined
  if (guardians && guardians.length > 0) {
    return guardians.map((g) => g.uid)
  }

  return []
}

/**
 * Get child name for notification content
 */
async function getChildName(childId: string): Promise<string> {
  const childRef = getDb().collection('children').doc(childId)
  const childDoc = await childRef.get()

  if (!childDoc.exists) {
    return 'Your child'
  }

  const childData = childDoc.data()
  return childData?.displayName || childData?.name || 'Your child'
}

/**
 * Process flag notification - main entry point
 *
 * Story 41.2: Flag Notifications - AC1-AC7
 *
 * @param flag - The flag document that was created
 * @param familyId - The family ID (can be extracted from flag.familyId)
 * @param callbacks - Optional callbacks for immediate and digest notifications
 */
export async function processFlagNotification(
  flag: FlagDocument,
  familyId: string,
  callbacks?: {
    onImmediateNotification?: (
      userId: string,
      flag: FlagDocument,
      childName: string
    ) => Promise<void>
    onDigestQueue?: (
      userId: string,
      flag: FlagDocument,
      childName: string,
      digestType: 'hourly' | 'daily'
    ) => Promise<void>
  }
): Promise<FlagNotificationResult> {
  const { childId, severity } = flag

  logger.info('Processing flag notification', {
    flagId: flag.id,
    childId,
    familyId,
    severity,
    status: flag.status,
  })

  // AC5: Crisis zero-data-path protection - NO notification for crisis content
  if (isCrisisRelatedFlag(flag)) {
    logger.info('Flag is crisis-related, blocking notification (zero-data-path)', {
      flagId: flag.id,
      suppressionReason: flag.suppressionReason,
      status: flag.status,
    })

    return {
      notificationGenerated: false,
      parentRoutes: [],
      crisisBlocked: true,
    }
  }

  // Get parent IDs for the family
  const parentIds = await getParentIdsForFamily(familyId)
  if (parentIds.length === 0) {
    logger.warn('No parents found for family', { familyId, flagId: flag.id })
    return {
      notificationGenerated: false,
      parentRoutes: [],
      crisisBlocked: false,
    }
  }

  // Get child name for notification content
  const childName = await getChildName(childId)

  // Process each parent independently (AC4)
  const parentRoutes: FlagNotificationResult['parentRoutes'] = []
  let anyNotificationGenerated = false

  for (const userId of parentIds) {
    // Get preferences for this specific parent
    const prefs = await getPreferencesForUser(userId, familyId, childId)

    // Determine route based on severity and preferences
    const { route, reason } = determineNotificationRoute(severity, prefs)

    parentRoutes.push({ userId, route, reason })

    if (route === 'skipped') {
      logger.info('Notification skipped for parent', {
        userId,
        flagId: flag.id,
        reason,
      })
      continue
    }

    anyNotificationGenerated = true

    // Execute the appropriate notification path
    try {
      if (route === 'immediate') {
        if (callbacks?.onImmediateNotification) {
          await callbacks.onImmediateNotification(userId, flag, childName)
        }
        logger.info('Immediate notification queued', {
          userId,
          flagId: flag.id,
        })
      } else if (route === 'hourly_digest' || route === 'daily_digest') {
        const digestType = route === 'hourly_digest' ? 'hourly' : 'daily'
        if (callbacks?.onDigestQueue) {
          await callbacks.onDigestQueue(userId, flag, childName, digestType)
        }
        logger.info('Digest notification queued', {
          userId,
          flagId: flag.id,
          digestType,
        })
      }
    } catch (error) {
      logger.error('Failed to process notification for parent', {
        userId,
        flagId: flag.id,
        route,
        error,
      })
      // Continue processing other parents even if one fails
    }
  }

  return {
    notificationGenerated: anyNotificationGenerated,
    parentRoutes,
    crisisBlocked: false,
  }
}
