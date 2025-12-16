'use client'

import {
  doc,
  collection,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/**
 * Notification Service
 *
 * Story 6.3: Agreement Activation - Task 4
 *
 * Handles notification creation for agreement lifecycle events.
 * Note: Actual delivery mechanism (email, push) is Epic 41.
 * This service records notification events for future delivery.
 */

// ============================================
// TYPES
// ============================================

/**
 * Parameters for agreement activation notification
 */
export interface NotifyActivationParams {
  /** Family ID */
  familyId: string
  /** Agreement ID */
  agreementId: string
  /** Agreement version */
  agreementVersion: string
  /** User IDs to notify */
  recipientUserIds: string[]
}

/**
 * Notification types
 */
export type NotificationType = 'agreement_activated' | 'agreement_archived'

/**
 * Stored notification structure
 */
export interface StoredNotification {
  /** Notification type */
  type: NotificationType
  /** Related family ID */
  familyId: string
  /** Related agreement ID */
  agreementId: string
  /** Agreement version */
  agreementVersion: string
  /** User-friendly message */
  message: string
  /** When notification was created */
  createdAt: unknown // serverTimestamp()
  /** Whether notification has been read */
  read: boolean
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Notify all family members about agreement activation
 *
 * Task 4.1-4.4: Create notification records for agreement activation
 *
 * Creates a notification in each recipient's notification queue.
 * Actual delivery (email, push) will be handled by Epic 41.
 *
 * @param params - Notification parameters
 */
export async function notifyAgreementActivation(
  params: NotifyActivationParams
): Promise<void> {
  const { familyId, agreementId, agreementVersion, recipientUserIds } = params

  const batch = writeBatch(db)

  for (const userId of recipientUserIds) {
    const notificationRef = doc(
      collection(db, 'users', userId, 'notifications')
    )

    batch.set(notificationRef, {
      type: 'agreement_activated' as NotificationType,
      familyId,
      agreementId,
      agreementVersion,
      message: 'Your family agreement is now active!',
      createdAt: serverTimestamp(),
      read: false,
    } satisfies StoredNotification)
  }

  await batch.commit()
}

/**
 * Notify family members about agreement archival
 *
 * @param params - Notification parameters with archive reason
 */
export async function notifyAgreementArchived(
  params: NotifyActivationParams & { reason: string }
): Promise<void> {
  const { familyId, agreementId, agreementVersion, recipientUserIds, reason } =
    params

  const batch = writeBatch(db)

  for (const userId of recipientUserIds) {
    const notificationRef = doc(
      collection(db, 'users', userId, 'notifications')
    )

    const message =
      reason === 'new_version'
        ? 'A new agreement version has been created.'
        : 'Your family agreement has been archived.'

    batch.set(notificationRef, {
      type: 'agreement_archived' as NotificationType,
      familyId,
      agreementId,
      agreementVersion,
      message,
      createdAt: serverTimestamp(),
      read: false,
    } satisfies StoredNotification)
  }

  await batch.commit()
}

export type { NotificationType, StoredNotification }
