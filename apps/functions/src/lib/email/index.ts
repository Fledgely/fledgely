/**
 * Email service barrel export.
 *
 * Story 41.6: Notification Delivery Channels
 */

export {
  sendNotificationEmail,
  generateUnsubscribeUrl,
  validateUnsubscribeToken,
  isEmailConfigured,
} from './emailService'
export type { SendNotificationEmailParams, SendEmailResult } from './emailService'

export {
  buildNotificationEmailHtml,
  buildNotificationEmailText,
  getNotificationEmailSubject,
} from './templates'
export type { NotificationEmailParams } from './templates'
