/**
 * Email templates barrel export.
 *
 * Story 41.6: Notification Delivery Channels
 */

export {
  buildNotificationEmailHtml,
  buildNotificationEmailText,
  getNotificationEmailSubject,
} from './notificationEmail'
export type { NotificationEmailParams } from './notificationEmail'

// Story 51.1: Data Export Request
export { sendDataExportReadyEmail } from './dataExportReadyEmail'
export type { DataExportReadyEmailParams } from './dataExportReadyEmail'
