/**
 * NotificationSuppressionService - Story 7.5.7 Task 2
 *
 * Service for suppressing notifications during blackout.
 * AC1: No family notifications during blackout
 * AC2: Family audit trail shows no unusual entries
 *
 * CRITICAL SAFETY:
 * - All notifications suppressed during blackout
 * - Suppression rules stored in isolated collection
 * - Family cannot access suppression data
 */

import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  collection,
} from 'firebase/firestore'

// ============================================
// Constants
// ============================================

/**
 * Firestore collection for notification suppressions.
 * CRITICAL: This collection is at ROOT level, ISOLATED from family data.
 */
export const NOTIFICATION_SUPPRESSIONS_COLLECTION = 'notificationSuppressions'

// ============================================
// Types
// ============================================

/**
 * Suppression type - what to suppress.
 */
export type SuppressionType = 'all' | 'signal_related' | 'audit_entries'

/**
 * Notification suppression rule.
 */
export interface NotificationSuppression {
  /** Unique suppression identifier */
  id: string
  /** Signal ID this suppression is for */
  signalId: string
  /** Child ID (anonymized) */
  childId: string
  /** Type of suppression */
  suppressionType: SuppressionType
  /** When suppression started */
  startedAt: Date
  /** When suppression expires */
  expiresAt: Date
  /** Whether suppression is active */
  active: boolean
}

/**
 * Generic notification type.
 */
export interface Notification {
  type: string
  data: Record<string, unknown>
}

/**
 * Generic audit entry type.
 */
export interface AuditEntry {
  id: string
  childId: string
  type: string
  timestamp: Date
  [key: string]: unknown
}

// ============================================
// ID Generation
// ============================================

/**
 * Generate a unique suppression ID.
 */
function generateSuppressionId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `supp_${timestamp}_${random}`
}

// ============================================
// Firestore Helpers
// ============================================

function getSuppressionDocRef(suppressionId: string) {
  const db = getFirestore()
  return doc(db, NOTIFICATION_SUPPRESSIONS_COLLECTION, suppressionId)
}

function getSuppressionsCollection() {
  const db = getFirestore()
  return collection(db, NOTIFICATION_SUPPRESSIONS_COLLECTION)
}

/**
 * Convert Firestore timestamp to Date if needed.
 */
function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value
  }
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate()
  }
  return new Date()
}

// ============================================
// Suppression Creation
// ============================================

/**
 * Create a suppression rule for a signal.
 *
 * AC1: Suppresses all notifications for the child during blackout.
 *
 * @param signalId - Signal ID to create suppression for
 * @param childId - Child ID (anonymized)
 * @param expiresAt - When suppression expires
 * @returns Created suppression
 */
export async function createSuppression(
  signalId: string,
  childId: string,
  expiresAt: Date
): Promise<NotificationSuppression> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }
  if (!expiresAt) {
    throw new Error('expiresAt is required')
  }

  const suppressionId = generateSuppressionId()
  const now = new Date()

  const suppression: NotificationSuppression = {
    id: suppressionId,
    signalId,
    childId,
    suppressionType: 'all',
    startedAt: now,
    expiresAt,
    active: true,
  }

  const docRef = getSuppressionDocRef(suppressionId)
  await setDoc(docRef, suppression)

  return suppression
}

// ============================================
// Suppression Checks
// ============================================

/**
 * Check if notifications should be suppressed for a child.
 *
 * AC1: Determines if any notification should be blocked.
 *
 * @param childId - Child ID to check
 * @param notificationType - Type of notification
 * @returns True if notification should be suppressed
 */
export async function shouldSuppressNotification(
  childId: string,
  notificationType: string
): Promise<boolean> {
  if (!childId || childId.trim().length === 0) {
    throw new Error('childId is required')
  }
  if (!notificationType || notificationType.trim().length === 0) {
    throw new Error('notificationType is required')
  }

  const suppressionsRef = getSuppressionsCollection()
  const q = query(suppressionsRef, where('childId', '==', childId), where('active', '==', true))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return false
  }

  const now = new Date()

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data()
    const expiresAt = toDate(data.expiresAt)

    // Check if suppression is still valid
    if (data.active && now < expiresAt) {
      // Check suppression type
      if (data.suppressionType === 'all') {
        return true
      }
      // Add more type-specific checks if needed
    }
  }

  return false
}

// ============================================
// Notification Filtering
// ============================================

/**
 * Filter notification recipients based on active suppressions.
 *
 * AC1: Removes family members from recipient list during blackout.
 *
 * @param notification - Notification to filter
 * @param recipientIds - Original recipient IDs
 * @returns Filtered recipient IDs
 */
export async function filterNotificationRecipients(
  notification: Notification,
  recipientIds: string[]
): Promise<string[]> {
  if (recipientIds.length === 0) {
    return []
  }

  const filteredRecipients: string[] = []

  for (const recipientId of recipientIds) {
    // Check if this recipient has an active suppression
    const shouldSuppress = await shouldSuppressNotification(recipientId, notification.type).catch(
      () => false
    )

    if (!shouldSuppress) {
      filteredRecipients.push(recipientId)
    }
  }

  // Also check if any suppression targets a child in this notification context
  // If so, suppress all family members
  const suppressionsRef = getSuppressionsCollection()
  const activeQuery = query(suppressionsRef, where('active', '==', true))
  const snapshot = await getDocs(activeQuery)

  if (!snapshot.empty) {
    const now = new Date()
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data()
      const expiresAt = toDate(data.expiresAt)

      if (data.active && now < expiresAt && data.suppressionType === 'all') {
        // If any active suppression exists, suppress all notifications
        // This is a safety measure to prevent any family notification
        return []
      }
    }
  }

  return filteredRecipients
}

// ============================================
// Audit Entry Suppression
// ============================================

/**
 * Suppress audit entry from family view if needed.
 *
 * AC2: Prevents signal-related entries from appearing in family audit trail.
 *
 * @param auditEntry - Audit entry to check
 * @param familyId - Family ID requesting the audit
 * @returns Audit entry or null if should be suppressed
 */
export async function suppressAuditEntry(
  auditEntry: AuditEntry,
  familyId: string
): Promise<AuditEntry | null> {
  if (!auditEntry) {
    throw new Error('auditEntry is required')
  }
  if (!familyId || familyId.trim().length === 0) {
    throw new Error('familyId is required')
  }

  const childId = auditEntry.childId

  // Check if there's an active suppression for this child
  const suppressionsRef = getSuppressionsCollection()
  const q = query(suppressionsRef, where('childId', '==', childId), where('active', '==', true))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    return auditEntry
  }

  const now = new Date()

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data()
    const expiresAt = toDate(data.expiresAt)

    // Check if suppression is still valid
    if (data.active && now < expiresAt) {
      // Suppress this audit entry
      return null
    }
  }

  return auditEntry
}

// ============================================
// Suppression Extension
// ============================================

/**
 * Extend suppression expiry.
 *
 * Called when blackout is extended.
 *
 * @param signalId - Signal ID to extend suppression for
 * @param newExpiresAt - New expiry date
 */
export async function extendSuppression(signalId: string, newExpiresAt: Date): Promise<void> {
  if (!signalId || signalId.trim().length === 0) {
    throw new Error('signalId is required')
  }
  if (!newExpiresAt) {
    throw new Error('newExpiresAt is required')
  }

  const suppressionsRef = getSuppressionsCollection()
  const q = query(suppressionsRef, where('signalId', '==', signalId))
  const snapshot = await getDocs(q)

  if (snapshot.empty) {
    throw new Error('Suppression not found')
  }

  const docSnap = snapshot.docs[0]
  await updateDoc(docSnap.ref, {
    expiresAt: newExpiresAt,
  })
}
