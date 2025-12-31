/**
 * Notification utilities barrel export
 */

// Story 0.5.7: Stealth notification handling
export { shouldSuppressNotification } from './stealthFilter'
export {
  activateStealthWindow,
  clearStealthWindow,
  getExpiredStealthFamilies,
} from './stealthWindow'
export {
  captureNotification,
  isInStealthWindow,
  getStealthAffectedUsers,
  deleteExpiredEntries,
  deleteAllEntriesForFamily,
} from './stealthQueue'

// Story 19A.4: Status push notifications
export type {
  FamilyStatus,
  StatusTransition,
  NotificationToken,
  NotificationState,
} from './statusTypes'
export {
  THRESHOLDS,
  THROTTLE_DURATION_MS,
  isUrgentTransition,
  createTransition,
} from './statusTypes'
export { buildStatusNotification } from './buildStatusNotification'
export type { NotificationContent } from './buildStatusNotification'
export { shouldSendNotification, updateThrottleTimestamp } from './notificationThrottle'
export { sendStatusNotification } from './sendStatusNotification'
export type { SendStatusNotificationParams, SendNotificationResult } from './sendStatusNotification'

// Story 23.1: Child flag notifications
export { sendChildFlagNotification } from './sendChildFlagNotification'
export type {
  SendChildFlagNotificationParams,
  SendChildNotificationResult,
} from './sendChildFlagNotification'

// Story 23.3: Parent flag notifications
export {
  sendParentFlagNotification,
  getParentNotificationMessage,
} from './sendParentFlagNotification'
export type {
  SendParentFlagNotificationParams,
  SendParentNotificationResult,
} from './sendParentFlagNotification'
