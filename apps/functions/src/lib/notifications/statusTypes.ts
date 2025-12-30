/**
 * Status notification types and constants
 *
 * Story 19A.4: Status Push Notifications
 */

/**
 * Family/device status levels (matches web useFamilyStatus)
 */
export type FamilyStatus = 'good' | 'attention' | 'action'

/**
 * Status transition types for notifications
 */
export type StatusTransition =
  | 'good_to_attention'
  | 'good_to_action'
  | 'attention_to_action'
  | 'attention_to_good'
  | 'action_to_attention'
  | 'action_to_good'

/**
 * Notification token stored in Firestore
 */
export interface NotificationToken {
  token: string
  platform: 'web' | 'android' | 'ios'
  createdAt: FirebaseFirestore.Timestamp
  updatedAt: FirebaseFirestore.Timestamp
  deviceInfo?: string
}

/**
 * Notification state for throttling
 */
export interface NotificationState {
  lastNotificationSent: FirebaseFirestore.Timestamp
  lastTransition: StatusTransition
}

/**
 * Thresholds for status calculation (matches web THRESHOLDS)
 */
export const THRESHOLDS = {
  /** Hours before a device is considered critically offline */
  OFFLINE_CRITICAL_HOURS: 24,
  /** Minutes before sync delay triggers a warning */
  SYNC_WARNING_MINUTES: 60,
  /** Battery percentage below which to show warning */
  BATTERY_WARNING_PERCENT: 20,
}

/**
 * Throttle duration in milliseconds (1 hour)
 */
export const THROTTLE_DURATION_MS = 60 * 60 * 1000

/**
 * Check if a transition is urgent (ends in action)
 */
export function isUrgentTransition(transition: StatusTransition): boolean {
  return transition.endsWith('_to_action')
}

/**
 * Create a transition string from before/after status
 */
export function createTransition(
  prevStatus: FamilyStatus,
  newStatus: FamilyStatus
): StatusTransition | null {
  if (prevStatus === newStatus) return null
  return `${prevStatus}_to_${newStatus}` as StatusTransition
}
