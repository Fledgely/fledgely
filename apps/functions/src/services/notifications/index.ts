/**
 * Notifications Services Index
 *
 * Story 27.6: Real-Time Access Notifications
 *
 * Exports notification-related services.
 */

export {
  getNotificationPreferences,
  updateNotificationPreferences,
  isQuietHours,
  generateNotificationMessage,
  getNotificationRecipients,
  processAuditEventForNotifications,
  getPendingDigestNotifications,
  generateDigestMessage,
  markDigestNotificationsSent,
  _resetDbForTesting,
} from './accessNotificationService'
