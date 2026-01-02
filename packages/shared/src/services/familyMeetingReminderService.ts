/**
 * FamilyMeetingReminderService - Story 34.5.4 Task 3
 *
 * Service for scheduling and managing family meeting reminders.
 * AC4: Meeting Reminder (Optional)
 */

import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
} from 'firebase/firestore'
import type { AgeTier } from '../contracts/mediationResources'
import type { FamilyMeetingReminder } from '../contracts/familyMeetingReminder'

// ============================================
// Constants
// ============================================

/**
 * Firestore collection for family meeting reminders.
 */
export const FAMILY_MEETING_REMINDERS_COLLECTION = 'familyMeetingReminders'

// ============================================
// Types
// ============================================

export interface ScheduleReminderInput {
  /** Family this reminder belongs to */
  familyId: string
  /** When the meeting is scheduled */
  scheduledAt: Date
  /** Who created the reminder (childId or parentId) */
  createdBy: string
  /** Which template was viewed when scheduling */
  templateId: string
  /** Age tier for content adaptation */
  ageTier: AgeTier
}

// ============================================
// Firestore Helpers
// ============================================

function getRemindersCollection() {
  const db = getFirestore()
  return collection(db, FAMILY_MEETING_REMINDERS_COLLECTION)
}

function getReminderDocRef(reminderId: string) {
  const db = getFirestore()
  return doc(db, FAMILY_MEETING_REMINDERS_COLLECTION, reminderId)
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

/**
 * Convert Firestore timestamp to Date or null.
 */
function toDateOrNull(value: unknown): Date | null {
  if (value === null || value === undefined) {
    return null
  }
  return toDate(value)
}

// ============================================
// Schedule Reminder
// ============================================

/**
 * Schedule a family meeting reminder.
 *
 * @param input - Reminder details
 * @returns The created reminder
 */
export async function scheduleMeetingReminder(
  input: ScheduleReminderInput
): Promise<FamilyMeetingReminder> {
  const { familyId, scheduledAt, createdBy, templateId, ageTier } = input

  if (!familyId || familyId.trim().length === 0) {
    throw new Error('familyId is required')
  }
  if (!createdBy || createdBy.trim().length === 0) {
    throw new Error('createdBy is required')
  }
  if (!templateId || templateId.trim().length === 0) {
    throw new Error('templateId is required')
  }

  const now = new Date()

  const reminderData = {
    familyId,
    scheduledAt,
    createdAt: now,
    createdBy,
    templateId,
    ageTier,
    status: 'pending' as const,
    notificationSentAt: null,
  }

  const remindersRef = getRemindersCollection()
  const docRef = await addDoc(remindersRef, reminderData)

  return {
    id: docRef.id,
    ...reminderData,
  }
}

// ============================================
// Cancel Reminder
// ============================================

/**
 * Cancel a scheduled meeting reminder.
 *
 * @param reminderId - Reminder ID to cancel
 */
export async function cancelMeetingReminder(reminderId: string): Promise<void> {
  if (!reminderId || reminderId.trim().length === 0) {
    throw new Error('reminderId is required')
  }

  const reminderRef = getReminderDocRef(reminderId)
  const snapshot = await getDoc(reminderRef)

  if (!snapshot.exists()) {
    throw new Error('Reminder not found')
  }

  const data = snapshot.data()

  // Skip if already cancelled
  if (data.status === 'cancelled') {
    return
  }

  await updateDoc(reminderRef, {
    status: 'cancelled',
  })
}

// ============================================
// Get Pending Reminders
// ============================================

/**
 * Get all pending reminders for a family.
 *
 * @param familyId - Family's unique identifier
 * @returns Array of pending reminders
 */
export async function getPendingReminders(familyId: string): Promise<FamilyMeetingReminder[]> {
  if (!familyId || familyId.trim().length === 0) {
    throw new Error('familyId is required')
  }

  const remindersRef = getRemindersCollection()
  const q = query(
    remindersRef,
    where('familyId', '==', familyId),
    where('status', '==', 'pending'),
    orderBy('scheduledAt', 'asc')
  )

  const snapshot = await getDocs(q)

  return snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      familyId: data.familyId,
      scheduledAt: toDate(data.scheduledAt),
      createdAt: toDate(data.createdAt),
      createdBy: data.createdBy,
      templateId: data.templateId,
      ageTier: data.ageTier,
      status: data.status,
      notificationSentAt: toDateOrNull(data.notificationSentAt),
    }
  })
}

// ============================================
// Acknowledge Reminder
// ============================================

/**
 * Mark a reminder as acknowledged.
 *
 * @param reminderId - Reminder ID to acknowledge
 */
export async function acknowledgeReminder(reminderId: string): Promise<void> {
  if (!reminderId || reminderId.trim().length === 0) {
    throw new Error('reminderId is required')
  }

  const reminderRef = getReminderDocRef(reminderId)
  const snapshot = await getDoc(reminderRef)

  if (!snapshot.exists()) {
    throw new Error('Reminder not found')
  }

  const data = snapshot.data()

  // Skip if already acknowledged
  if (data.status === 'acknowledged') {
    return
  }

  await updateDoc(reminderRef, {
    status: 'acknowledged',
    acknowledgedAt: new Date(),
  })
}
