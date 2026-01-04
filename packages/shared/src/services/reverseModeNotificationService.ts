/**
 * Reverse Mode Notification Service - Story 52.2 Task 4
 *
 * Creates notification payloads for reverse mode changes.
 * AC4: Parents notified when teen activates/deactivates reverse mode.
 */

import {
  getParentReverseModeActivatedMessage,
  getParentReverseModeDeactivatedMessage,
  SUPPORTING_INDEPENDENCE_LINK,
} from '../contracts/reverseMode'

/**
 * Notification type for reverse mode changes.
 */
export type ReverseModeNotificationType = 'reverse_mode_activated' | 'reverse_mode_deactivated'

/**
 * Payload for a reverse mode notification.
 */
export interface ReverseModeNotificationPayload {
  type: ReverseModeNotificationType
  title: string
  message: string
  resourceLink: string
  childId: string
  childName: string
  createdAt: Date
}

/**
 * Create a notification payload for reverse mode activation.
 * AC4: Parents notified: "Teen has activated reverse mode"
 *
 * @param childId - ID of the child who activated reverse mode
 * @param childName - Display name of the child
 * @returns Notification payload
 */
export function createReverseModeActivationNotification(
  childId: string,
  childName: string
): ReverseModeNotificationPayload {
  return {
    type: 'reverse_mode_activated',
    title: 'Reverse Mode Update',
    message: getParentReverseModeActivatedMessage(childName),
    resourceLink: SUPPORTING_INDEPENDENCE_LINK,
    childId,
    childName,
    createdAt: new Date(),
  }
}

/**
 * Create a notification payload for reverse mode deactivation.
 *
 * @param childId - ID of the child who deactivated reverse mode
 * @param childName - Display name of the child
 * @returns Notification payload
 */
export function createReverseModeDeactivationNotification(
  childId: string,
  childName: string
): ReverseModeNotificationPayload {
  return {
    type: 'reverse_mode_deactivated',
    title: 'Reverse Mode Update',
    message: getParentReverseModeDeactivatedMessage(childName),
    resourceLink: SUPPORTING_INDEPENDENCE_LINK,
    childId,
    childName,
    createdAt: new Date(),
  }
}

/**
 * Create notification payloads for all parents in a family.
 *
 * @param parentIds - Array of parent user IDs
 * @param childId - ID of the child
 * @param childName - Display name of the child
 * @param isActivation - Whether this is an activation (true) or deactivation (false)
 * @returns Array of notification payloads with recipient IDs
 */
export function createReverseModeNotificationsForParents(
  parentIds: string[],
  childId: string,
  childName: string,
  isActivation: boolean
): Array<{ recipientId: string; payload: ReverseModeNotificationPayload }> {
  const createPayload = isActivation
    ? createReverseModeActivationNotification
    : createReverseModeDeactivationNotification

  return parentIds.map((recipientId) => ({
    recipientId,
    payload: createPayload(childId, childName),
  }))
}

/**
 * Get the notification title for reverse mode changes.
 */
export function getReverseModeNotificationTitle(): string {
  return 'Reverse Mode Update'
}

/**
 * Get the resource link for supporting teen independence.
 */
export function getSupportingIndependenceLink(): string {
  return SUPPORTING_INDEPENDENCE_LINK
}
