/**
 * SMS service barrel export.
 *
 * Story 41.6: Notification Delivery Channels
 */

export {
  sendSmsNotification,
  formatPhoneNumber,
  isValidE164,
  buildSmsMessage,
  isSmsConfigured,
} from './smsService'
export type { SendSmsNotificationParams, SendSmsResult } from './smsService'
