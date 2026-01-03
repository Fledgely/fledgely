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

// Story 41.2: Flag notification orchestration
export {
  processFlagNotification,
  isCrisisRelatedFlag,
  determineNotificationRoute,
} from './flagNotificationOrchestrator'
export type { FlagNotificationResult, NotificationRoute } from './flagNotificationOrchestrator'

// Story 41.2: Immediate flag notifications
export { sendImmediateFlagNotification } from './sendImmediateFlagNotification'
export type {
  SendImmediateFlagNotificationParams,
  SendImmediateFlagNotificationResult,
} from './sendImmediateFlagNotification'

// Story 41.2: Flag digest service
export {
  queueFlagForDigest,
  processUserDigest,
  processHourlyDigest,
  processDailyDigest,
  getUsersWithPendingDigest,
} from './flagDigestService'
export type { DigestType, FlagDigestQueueItem, ProcessDigestResult } from './flagDigestService'

// Story 41.3: Time limit notifications - Parent service
export {
  sendTimeLimitWarningNotification,
  sendLimitReachedNotification,
} from './timeLimitNotificationService'
export type { TimeLimitNotificationResult } from './timeLimitNotificationService'

// Story 41.3: Extension request notifications
export {
  sendExtensionRequestNotification,
  sendExtensionResponseNotification,
} from './extensionRequestNotification'
export type { ExtensionRequestNotificationResult } from './extensionRequestNotification'

// Story 41.3: Child time limit notifications
export {
  sendChildTimeLimitWarning,
  sendChildLimitReachedNotification,
} from './childTimeLimitNotification'
export type { ChildTimeLimitNotificationResult } from './childTimeLimitNotification'

// Story 41.3: Time limit check integration
export { checkTimeLimitsAndNotify } from './timeLimitCheck'
export type { TimeLimitCheckResult } from './timeLimitCheck'

// Story 41.4: Device sync notifications
export {
  sendDeviceSyncTimeoutNotification,
  sendPermissionRevokedNotification,
  sendSyncRestoredNotification,
  hasAlreadyNotifiedForThreshold,
  hasRecentlyNotifiedPermissionRevoked,
  markDeviceOffline,
  clearDeviceNotificationStatus,
} from './deviceSyncNotification'
export type { DeviceSyncNotificationResult } from './deviceSyncNotification'
