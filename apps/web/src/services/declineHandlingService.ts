/**
 * declineHandlingService - Story 34.5
 *
 * Service for decline handling, notifications, and messaging.
 * AC3: Decline notification with supportive language
 * AC5, AC6: Positive messaging after decline
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { getFirestoreDb } from '../lib/firebase'
import { DECLINE_REASONS, AFTER_DECLINE_MESSAGES, type DeclineReasonId } from '@fledgely/shared'

export interface SendDeclineNotificationParams {
  familyId: string
  proposerId: string
  responderName: string
  declineReason: string
}

export interface SendDeclineNotificationResult {
  success: boolean
  notificationId?: string
  error?: string
}

/**
 * Send a supportive decline notification to the proposer.
 * AC3: Decline notification sent to proposer
 */
export async function sendDeclineNotification(
  params: SendDeclineNotificationParams
): Promise<SendDeclineNotificationResult> {
  const { familyId, proposerId, responderName, declineReason } = params

  try {
    const db = getFirestoreDb()
    const notificationsRef = collection(db, 'families', familyId, 'notifications')

    const notification = {
      recipientId: proposerId,
      type: 'proposal_declined',
      title: AFTER_DECLINE_MESSAGES.notification.title,
      body: AFTER_DECLINE_MESSAGES.notification.body(responderName),
      reason: declineReason,
      supportive: AFTER_DECLINE_MESSAGES.notification.supportive,
      read: false,
      createdAt: serverTimestamp(),
    }

    const docRef = await addDoc(notificationsRef, notification)
    return { success: true, notificationId: docRef.id }
  } catch (error) {
    console.error('Failed to send decline notification:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get suggestions for next steps after a decline.
 * AC5: Proposer can try again later
 * AC6: Suggestions for alternative approaches
 */
export function getSuggestionsAfterDecline(): string[] {
  return [...AFTER_DECLINE_MESSAGES.proposer.suggestions]
}

/**
 * Format a cooldown message with the number of days remaining.
 * AC4: 7-day cooldown display
 */
export function formatCooldownMessage(daysRemaining: number): string {
  const dayWord = daysRemaining === 1 ? 'day' : 'days'
  return `You can propose this change again in ${daysRemaining} ${dayWord}.`
}

/**
 * Get the label for a decline reason ID.
 * AC1: Predefined respectful reasons
 */
export function getDeclineReasonLabel(reasonId: DeclineReasonId, customReason?: string): string {
  if (reasonId === 'custom' && customReason) {
    return customReason
  }

  const reason = DECLINE_REASONS.find((r) => r.id === reasonId)
  return reason?.label || 'Declined without specific reason'
}
