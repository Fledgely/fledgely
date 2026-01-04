/**
 * Child Notification Preferences Service
 *
 * Story 41.7: Child Notification Preferences - AC4, AC6
 *
 * Features:
 * - Get child notification preferences
 * - Update child notification preferences
 * - Initialize preferences when child account created
 * - Privacy enforcement - parents CANNOT access child preferences
 *
 * Firestore Path: children/{childId}/settings/notificationPreferences
 */

import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import {
  createDefaultChildNotificationPreferences,
  applyChildPreferencesUpdate,
  type ChildNotificationPreferences,
  type ChildNotificationPreferencesUpdate,
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

/** Set custom Firestore instance for testing */
export function _setDbForTesting(instance: FirebaseFirestore.Firestore): void {
  db = instance
}

/**
 * Get the Firestore document reference for child notification preferences.
 *
 * @param childId - Child ID
 * @returns Document reference
 */
function getPreferencesRef(childId: string) {
  return getDb()
    .collection('children')
    .doc(childId)
    .collection('settings')
    .doc('notificationPreferences')
}

// Note: Family validation is done in the callable layer (getChildNotificationPreferences.ts
// and updateChildNotificationPreferences.ts) before calling these service functions.

/**
 * Get child notification preferences.
 *
 * Creates default preferences if they don't exist.
 *
 * @param childId - Child ID
 * @param familyId - Family ID for validation
 * @param birthDate - Child's birth date (required for defaults if creating)
 * @returns Child notification preferences
 */
export async function getChildNotificationPreferences(
  childId: string,
  familyId: string,
  birthDate?: Date
): Promise<ChildNotificationPreferences> {
  const ref = getPreferencesRef(childId)
  const doc = await ref.get()

  if (doc.exists) {
    const data = doc.data()
    // Convert Firestore timestamps to Date objects
    const prefs: ChildNotificationPreferences = {
      id: data?.id || childId,
      childId: data?.childId || childId,
      familyId: data?.familyId || familyId,
      timeLimitWarningsEnabled: true, // Always true
      agreementChangesEnabled: true, // Always true
      trustScoreChangesEnabled: data?.trustScoreChangesEnabled ?? false,
      weeklySummaryEnabled: data?.weeklySummaryEnabled ?? false,
      quietHoursEnabled: data?.quietHoursEnabled ?? false,
      quietHoursStart: data?.quietHoursStart || '21:00',
      quietHoursEnd: data?.quietHoursEnd || '07:00',
      updatedAt: data?.updatedAt?.toDate?.() || new Date(data?.updatedAt) || new Date(),
      createdAt: data?.createdAt?.toDate?.() || new Date(data?.createdAt) || new Date(),
    }

    logger.info('Retrieved child notification preferences', {
      childId,
      familyId,
    })

    return prefs
  }

  // Create default preferences
  if (!birthDate) {
    // If no birth date provided, use age 12 as default (minimal notifications)
    const defaultBirthDate = new Date()
    defaultBirthDate.setFullYear(defaultBirthDate.getFullYear() - 12)
    birthDate = defaultBirthDate
  }

  const defaults = createDefaultChildNotificationPreferences(childId, familyId, birthDate)
  await ref.set({
    ...defaults,
    updatedAt: defaults.updatedAt,
    createdAt: defaults.createdAt,
  })

  logger.info('Created default child notification preferences', {
    childId,
    familyId,
    trustScoreChangesEnabled: defaults.trustScoreChangesEnabled,
    weeklySummaryEnabled: defaults.weeklySummaryEnabled,
  })

  return defaults
}

/**
 * Update child notification preferences.
 *
 * Only updates allowed optional fields. Required notifications cannot be changed.
 *
 * @param childId - Child ID
 * @param familyId - Family ID for validation
 * @param updates - Partial updates to apply
 * @returns Updated preferences
 */
export async function updateChildNotificationPreferences(
  childId: string,
  familyId: string,
  updates: ChildNotificationPreferencesUpdate
): Promise<ChildNotificationPreferences> {
  // Get existing preferences (or create defaults)
  const existing = await getChildNotificationPreferences(childId, familyId)

  // Apply updates
  const updated = applyChildPreferencesUpdate(existing, updates)

  // Save to Firestore
  const ref = getPreferencesRef(childId)
  await ref.set({
    ...updated,
    updatedAt: updated.updatedAt,
    createdAt: updated.createdAt,
  })

  logger.info('Updated child notification preferences', {
    childId,
    familyId,
    updates,
  })

  return updated
}

/**
 * Initialize child notification preferences.
 *
 * Called when a new child account is created.
 * Uses a transaction to prevent race conditions.
 *
 * @param childId - Child ID
 * @param familyId - Family ID
 * @param birthDate - Child's birth date for age-appropriate defaults
 * @returns Created preferences
 */
export async function initializeChildPreferences(
  childId: string,
  familyId: string,
  birthDate: Date
): Promise<ChildNotificationPreferences> {
  const ref = getPreferencesRef(childId)

  // Use transaction to prevent race condition
  return await getDb().runTransaction(async (transaction) => {
    const existingDoc = await transaction.get(ref)

    if (existingDoc.exists) {
      logger.info('Child preferences already exist, skipping initialization', {
        childId,
        familyId,
      })
      // Return existing preferences from transaction
      const data = existingDoc.data()
      return {
        id: data?.id || childId,
        childId: data?.childId || childId,
        familyId: data?.familyId || familyId,
        timeLimitWarningsEnabled: true,
        agreementChangesEnabled: true,
        trustScoreChangesEnabled: data?.trustScoreChangesEnabled ?? false,
        weeklySummaryEnabled: data?.weeklySummaryEnabled ?? false,
        quietHoursEnabled: data?.quietHoursEnabled ?? false,
        quietHoursStart: data?.quietHoursStart || '21:00',
        quietHoursEnd: data?.quietHoursEnd || '07:00',
        updatedAt: data?.updatedAt?.toDate?.() || new Date(),
        createdAt: data?.createdAt?.toDate?.() || new Date(),
      } as ChildNotificationPreferences
    }

    // Create with age-appropriate defaults
    const prefs = createDefaultChildNotificationPreferences(childId, familyId, birthDate)
    transaction.set(ref, {
      ...prefs,
      updatedAt: prefs.updatedAt,
      createdAt: prefs.createdAt,
    })

    logger.info('Initialized child notification preferences', {
      childId,
      familyId,
      trustScoreChangesEnabled: prefs.trustScoreChangesEnabled,
      weeklySummaryEnabled: prefs.weeklySummaryEnabled,
    })

    return prefs
  })
}

/**
 * Delete child notification preferences.
 *
 * Called when a child account is deleted.
 *
 * @param childId - Child ID
 */
export async function deleteChildPreferences(childId: string): Promise<void> {
  const ref = getPreferencesRef(childId)
  await ref.delete()

  logger.info('Deleted child notification preferences', { childId })
}

/**
 * Check if child notification preferences exist.
 *
 * @param childId - Child ID
 * @returns true if preferences exist
 */
export async function childPreferencesExist(childId: string): Promise<boolean> {
  const ref = getPreferencesRef(childId)
  const doc = await ref.get()
  return doc.exists
}
