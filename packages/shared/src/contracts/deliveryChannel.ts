/**
 * Delivery channel schemas for multi-channel notification delivery.
 *
 * Story 41.6: Notification Delivery Channels - AC4, AC7
 */

import { z } from 'zod'

/**
 * Delivery channel types
 */
export const deliveryChannelTypeSchema = z.enum(['push', 'email', 'sms'])
export type DeliveryChannelType = z.infer<typeof deliveryChannelTypeSchema>

/**
 * Delivery status types
 */
export const deliveryStatusSchema = z.enum(['sent', 'delivered', 'failed', 'fallback'])
export type DeliveryStatus = z.infer<typeof deliveryStatusSchema>

/**
 * Notification types that can have channel preferences
 */
export const notificationTypeSchema = z.enum([
  'criticalFlags',
  'timeLimitWarnings',
  'deviceSyncAlerts',
  'loginAlerts',
  'flagDigest',
  'extensionRequest',
  'agreementChange',
])
export type NotificationType = z.infer<typeof notificationTypeSchema>

/**
 * Security notification types that cannot be disabled
 */
export const securityNotificationTypes = ['loginAlerts'] as const
export type SecurityNotificationType = (typeof securityNotificationTypes)[number]

/**
 * Channel settings for a single notification type
 */
export const channelSettingsSchema = z.object({
  push: z.boolean(),
  email: z.boolean(),
  sms: z.boolean().optional().default(false),
})
export type ChannelSettings = z.infer<typeof channelSettingsSchema>

/**
 * Locked channel settings (for security notifications)
 * push and email are always true, sms is not available
 */
export const lockedChannelSettingsSchema = z.object({
  push: z.literal(true),
  email: z.literal(true),
  sms: z.literal(false).optional(),
})
export type LockedChannelSettings = z.infer<typeof lockedChannelSettingsSchema>

/**
 * Complete notification channel preferences per user
 */
export const notificationChannelPreferencesSchema = z.object({
  criticalFlags: channelSettingsSchema.default({ push: true, email: true, sms: false }),
  timeLimitWarnings: channelSettingsSchema
    .omit({ sms: true })
    .extend({ sms: z.literal(false).optional() })
    .default({ push: true, email: true }),
  deviceSyncAlerts: z
    .object({
      push: z.boolean(),
      email: z.boolean().optional().default(false),
      sms: z.literal(false).optional(),
    })
    .default({ push: true, email: false }),
  loginAlerts: lockedChannelSettingsSchema.default({ push: true, email: true, sms: false }),
  flagDigest: channelSettingsSchema
    .omit({ sms: true })
    .extend({ sms: z.literal(false).optional() })
    .default({ push: true, email: true }),
  extensionRequest: channelSettingsSchema
    .omit({ sms: true })
    .extend({ sms: z.literal(false).optional() })
    .default({ push: true, email: false }),
  agreementChange: channelSettingsSchema
    .omit({ sms: true })
    .extend({ sms: z.literal(false).optional() })
    .default({ push: true, email: true }),
  // User's verified contact info for channels
  verifiedEmail: z.string().email().optional(),
  verifiedPhone: z.string().optional(), // E.164 format
})
export type NotificationChannelPreferences = z.infer<typeof notificationChannelPreferencesSchema>

/**
 * Default channel preferences
 */
export const defaultChannelPreferences: NotificationChannelPreferences = {
  criticalFlags: { push: true, email: true, sms: false },
  timeLimitWarnings: { push: true, email: true, sms: false },
  deviceSyncAlerts: { push: true, email: false, sms: false },
  loginAlerts: { push: true, email: true, sms: false },
  flagDigest: { push: true, email: true, sms: false },
  extensionRequest: { push: true, email: false, sms: false },
  agreementChange: { push: true, email: true, sms: false },
}

/**
 * Delivery log entry for audit trail
 */
export const deliveryLogSchema = z.object({
  id: z.string().min(1),
  notificationId: z.string().min(1),
  userId: z.string().min(1),
  familyId: z.string().min(1),
  notificationType: notificationTypeSchema,
  channel: deliveryChannelTypeSchema,
  status: deliveryStatusSchema,
  failureReason: z.string().optional(),
  fallbackChannel: deliveryChannelTypeSchema.optional(),
  messageId: z.string().optional(), // FCM message ID, email message ID, or SMS SID
  createdAt: z.number(),
})
export type DeliveryLog = z.infer<typeof deliveryLogSchema>

/**
 * Email unsubscribe token payload (JWT)
 */
export const emailUnsubscribeTokenSchema = z.object({
  userId: z.string().min(1),
  notificationType: notificationTypeSchema,
  createdAt: z.number(),
  expiresAt: z.number(),
})
export type EmailUnsubscribeToken = z.infer<typeof emailUnsubscribeTokenSchema>

/**
 * Input schema for updating channel preferences
 */
export const updateChannelPreferencesInputSchema = z.object({
  criticalFlags: channelSettingsSchema.optional(),
  timeLimitWarnings: channelSettingsSchema.omit({ sms: true }).optional(),
  deviceSyncAlerts: z.object({ push: z.boolean(), email: z.boolean().optional() }).optional(),
  // loginAlerts intentionally omitted - cannot be changed
  flagDigest: channelSettingsSchema.omit({ sms: true }).optional(),
  extensionRequest: channelSettingsSchema.omit({ sms: true }).optional(),
  agreementChange: channelSettingsSchema.omit({ sms: true }).optional(),
})
export type UpdateChannelPreferencesInput = z.infer<typeof updateChannelPreferencesInputSchema>

/**
 * Output schema for channel preferences operations
 */
export const channelPreferencesOutputSchema = z.object({
  success: z.boolean(),
  preferences: notificationChannelPreferencesSchema,
})
export type ChannelPreferencesOutput = z.infer<typeof channelPreferencesOutputSchema>

/**
 * Input schema for unsubscribe callable
 */
export const handleUnsubscribeInputSchema = z.object({
  token: z.string().min(1),
})
export type HandleUnsubscribeInput = z.infer<typeof handleUnsubscribeInputSchema>

/**
 * Output schema for unsubscribe callable
 */
export const handleUnsubscribeOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  notificationType: notificationTypeSchema.optional(),
})
export type HandleUnsubscribeOutput = z.infer<typeof handleUnsubscribeOutputSchema>

/**
 * Notification content for delivery (renamed to avoid conflict with graduationConversation)
 */
export const deliveryNotificationContentSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  actionUrl: z.string().url().optional(),
  data: z.record(z.string()).optional(),
})
export type DeliveryNotificationContent = z.infer<typeof deliveryNotificationContentSchema>

/**
 * Priority levels for notifications
 */
export const notificationPrioritySchema = z.enum(['critical', 'high', 'normal'])
export type NotificationPriority = z.infer<typeof notificationPrioritySchema>

/**
 * Delivery request parameters
 */
export const deliverNotificationInputSchema = z.object({
  userId: z.string().min(1),
  familyId: z.string().min(1),
  notificationType: notificationTypeSchema,
  content: deliveryNotificationContentSchema,
  priority: notificationPrioritySchema.default('normal'),
})
export type DeliverNotificationInput = z.infer<typeof deliverNotificationInputSchema>

/**
 * Delivery result for a single channel
 */
export const channelDeliveryResultSchema = z.object({
  channel: deliveryChannelTypeSchema,
  success: z.boolean(),
  messageId: z.string().optional(),
  failureReason: z.string().optional(),
})
export type ChannelDeliveryResult = z.infer<typeof channelDeliveryResultSchema>

/**
 * Complete delivery result
 */
export const deliveryResultSchema = z.object({
  notificationId: z.string(),
  channels: z.array(channelDeliveryResultSchema),
  primaryChannel: deliveryChannelTypeSchema,
  fallbackUsed: z.boolean(),
  fallbackChannel: deliveryChannelTypeSchema.optional(),
  allDelivered: z.boolean(),
})
export type DeliveryResult = z.infer<typeof deliveryResultSchema>

/**
 * Check if a notification type is a security type (cannot be disabled)
 */
export function isSecurityNotificationType(type: NotificationType): boolean {
  return securityNotificationTypes.includes(type as SecurityNotificationType)
}

/**
 * Get default channels for a notification type
 */
export function getDefaultChannels(type: NotificationType): ChannelSettings {
  const prefs = defaultChannelPreferences[type]
  // Normalize to ensure sms is always a boolean
  return {
    push: prefs?.push ?? true,
    email: prefs?.email ?? false,
    sms: prefs?.sms ?? false,
  }
}
