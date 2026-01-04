/**
 * Login Notification schemas.
 *
 * Story 41.5: New Login Notifications - AC1, AC3
 *
 * Notification content for new login alerts:
 * - "New login from [Device/Location]" messages
 * - Location omitted during fleeing mode (FR160)
 * - "Wasn't you?" action for session review
 */

import { z } from 'zod'
import type { DeviceType } from './loginSession'

// ============================================
// Notification Action Types
// ============================================

/** Actions available from login notification */
export const loginNotificationActionSchema = z.enum([
  'review_sessions', // View active sessions
  'dismiss', // Dismiss notification
])
export type LoginNotificationAction = z.infer<typeof loginNotificationActionSchema>

// ============================================
// Login Notification Event Schema
// ============================================

/**
 * Login notification event.
 * Generated when new device login is detected.
 *
 * Stored at: families/{familyId}/loginNotifications/{id}
 */
export const loginNotificationEventSchema = z.object({
  /** Unique notification ID */
  id: z.string().min(1),
  /** Notification type */
  type: z.literal('new_login'),
  /** User ID who logged in */
  userId: z.string().min(1),
  /** User's display name or email */
  userDisplayName: z.string(),
  /** Family ID for routing */
  familyId: z.string().min(1),
  /** Login session ID */
  sessionId: z.string().min(1),
  /** Device type */
  deviceType: z.string(),
  /** Browser name */
  browser: z.string(),
  /** Approximate location (null if unavailable or fleeing mode) */
  approximateLocation: z.string().nullable(),
  /** Whether fleeing mode is active (controls location display) */
  isFleeingMode: z.boolean(),
  /** When notification was created */
  createdAt: z.number(),
})
export type LoginNotificationEvent = z.infer<typeof loginNotificationEventSchema>

// ============================================
// Login Notification Content Schema
// ============================================

/**
 * FCM notification content for login alerts.
 */
export const loginNotificationContentSchema = z.object({
  /** Notification title */
  title: z.string(),
  /** Notification body */
  body: z.string(),
  /** Data payload for deep linking */
  data: z.object({
    /** Notification type */
    type: z.literal('new_login'),
    /** Session ID for review */
    sessionId: z.string(),
    /** Family ID */
    familyId: z.string(),
    /** User ID who logged in */
    userId: z.string(),
    /** Suggested action */
    action: loginNotificationActionSchema,
  }),
})
export type LoginNotificationContent = z.infer<typeof loginNotificationContentSchema>

// ============================================
// Content Builder Functions
// ============================================

/** Parameters for building login notification content */
export interface LoginNotificationParams {
  /** Session ID */
  sessionId: string
  /** Family ID */
  familyId: string
  /** User ID who logged in */
  userId: string
  /** User's display name or email for personalization */
  userDisplayName: string
  /** Device type */
  deviceType: DeviceType | string
  /** Browser name */
  browser: string
  /** Approximate location (omitted if null or fleeing mode) */
  approximateLocation?: string | null
  /** Whether fleeing mode is active (suppresses location) */
  isFleeingMode?: boolean
}

/**
 * Build notification content for new login alert.
 *
 * AC1: Includes device type, browser, approximate location
 * AC3: Location omitted during fleeing mode (FR160)
 */
export function buildLoginNotificationContent(
  params: LoginNotificationParams
): LoginNotificationContent {
  const {
    sessionId,
    familyId,
    userId,
    userDisplayName,
    deviceType,
    browser,
    approximateLocation,
    isFleeingMode = false,
  } = params

  // Build device description
  let deviceDesc = ''
  switch (deviceType) {
    case 'mobile':
      deviceDesc = 'phone'
      break
    case 'tablet':
      deviceDesc = 'tablet'
      break
    case 'desktop':
      deviceDesc = 'computer'
      break
    default:
      deviceDesc = 'device'
  }

  // Build body text
  let body = `New login from ${browser} on ${deviceDesc}`

  // Add location only if available AND not in fleeing mode (FR160)
  if (approximateLocation && !isFleeingMode) {
    body += ` near ${approximateLocation}`
  }

  // Add account identifier
  body += ` for ${userDisplayName}`

  return {
    title: 'New Login Detected',
    body,
    data: {
      type: 'new_login',
      sessionId,
      familyId,
      userId,
      action: 'review_sessions',
    },
  }
}

/**
 * Build notification content with "Wasn't you?" emphasis.
 * Used for potentially suspicious logins (new location, etc.)
 */
export function buildSuspiciousLoginContent(
  params: LoginNotificationParams
): LoginNotificationContent {
  const baseContent = buildLoginNotificationContent(params)

  return {
    ...baseContent,
    title: '🔔 New Login Detected',
    body: `${baseContent.body}. Wasn't you? Tap to review.`,
  }
}

// ============================================
// Notification Status Schema
// ============================================

/**
 * Tracks login notification status for a user.
 * Used to prevent duplicate notifications.
 *
 * Stored at: users/{userId}/loginNotificationStatus/current
 */
export const loginNotificationStatusSchema = z.object({
  /** User ID */
  userId: z.string().min(1),
  /** Last notification sent timestamp */
  lastNotificationSentAt: z.number().nullable(),
  /** Last session that triggered notification */
  lastNotifiedSessionId: z.string().nullable(),
  /** Last notified fingerprint */
  lastNotifiedFingerprintId: z.string().nullable(),
  /** Updated timestamp */
  updatedAt: z.number(),
})
export type LoginNotificationStatus = z.infer<typeof loginNotificationStatusSchema>

// ============================================
// Default Values
// ============================================

/** Default login notification status */
export const DEFAULT_LOGIN_NOTIFICATION_STATUS: LoginNotificationStatus = {
  userId: '',
  lastNotificationSentAt: null,
  lastNotifiedSessionId: null,
  lastNotifiedFingerprintId: null,
  updatedAt: Date.now(),
}
