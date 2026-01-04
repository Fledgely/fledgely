/**
 * SMS service for notification delivery.
 *
 * Story 41.6: Notification Delivery Channels - AC3
 *
 * Features:
 * - Send SMS via Twilio
 * - Console fallback for development/testing
 * - E.164 phone number formatting
 * - Message length handling
 */

import * as logger from 'firebase-functions/logger'
import type { NotificationType } from '@fledgely/shared'

// Twilio client type
interface TwilioClient {
  messages: {
    create(params: { to: string; from: string; body: string }): Promise<{ sid: string }>
  }
}

// Twilio module and client - allow injection for testing
let twilioModule: ((accountSid: string, authToken: string) => TwilioClient) | null = null
let twilioClient: TwilioClient | null = null

/**
 * Set Twilio module for testing
 */
export function _setTwilioModuleForTesting(
  module: ((accountSid: string, authToken: string) => TwilioClient) | null
): void {
  twilioModule = module
}

function loadTwilio(): ((accountSid: string, authToken: string) => TwilioClient) | null {
  if (!twilioModule) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
      twilioModule = require('twilio') as typeof twilioModule
    } catch {
      logger.warn('Twilio module not available')
      return null
    }
  }
  return twilioModule
}

const getTwilioClient = (): TwilioClient | null => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    return null
  }

  if (!twilioClient) {
    const twilio = loadTwilio()
    if (twilio) {
      twilioClient = twilio(accountSid, authToken)
    }
  }

  return twilioClient
}

// Twilio sender phone number (read at runtime)
const getFromNumber = (): string | undefined => process.env.TWILIO_PHONE_NUMBER

// App URL for links (read at runtime)
const getAppUrl = (): string => process.env.APP_URL || 'https://app.fledgely.com'

// Maximum SMS length for single message (GSM-7 encoding)
const MAX_SMS_LENGTH = 160

/**
 * Parameters for sending an SMS notification
 */
export interface SendSmsNotificationParams {
  to: string // E.164 format (e.g., +1234567890)
  notificationType: NotificationType
  content: {
    title: string
    body: string
  }
  includeAppLink?: boolean
}

/**
 * Result of sending an SMS
 */
export interface SendSmsResult {
  success: boolean
  messageSid?: string
  error?: string
}

/**
 * Format phone number to E.164 format.
 *
 * @param phone - Phone number in various formats
 * @returns E.164 formatted phone number or null if invalid
 */
export function formatPhoneNumber(phone: string): string | null {
  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, '')

  // Already in E.164 format
  if (/^\+\d{10,15}$/.test(cleaned)) {
    return cleaned
  }

  // US number without country code (10 digits)
  if (/^\d{10}$/.test(cleaned)) {
    return `+1${cleaned}`
  }

  // Number with country code but without +
  if (/^1\d{10}$/.test(cleaned)) {
    return `+${cleaned}`
  }

  // Invalid format
  return null
}

/**
 * Validate E.164 phone number format.
 *
 * @param phone - Phone number to validate
 * @returns true if valid E.164 format
 */
export function isValidE164(phone: string): boolean {
  return /^\+\d{10,15}$/.test(phone)
}

/**
 * Build SMS message content.
 *
 * Creates a concise message suitable for SMS constraints.
 *
 * @param notificationType - Type of notification
 * @param content - Notification content
 * @param includeAppLink - Whether to include app link
 * @returns Formatted SMS message
 */
export function buildSmsMessage(
  notificationType: NotificationType,
  content: { title: string; body: string },
  includeAppLink: boolean = true
): string {
  const prefixes: Record<string, string> = {
    criticalFlags: '[Critical]',
    timeLimitWarnings: '[Time Limit]',
    deviceSyncAlerts: '[Device]',
    loginAlerts: '[Security]',
    flagDigest: '[Digest]',
    extensionRequest: '[Request]',
    agreementChange: '[Agreement]',
  }

  const prefix = prefixes[notificationType] || '[fledgely]'
  const appUrl = getAppUrl()

  // Build base message
  let message = `${prefix} ${content.title}`

  // Calculate remaining space for body and link
  const linkText = includeAppLink ? ` View: ${appUrl}` : ''
  const maxBodyLength = MAX_SMS_LENGTH - message.length - linkText.length - 3 // 3 for " - "

  if (maxBodyLength > 20 && content.body.length > 0) {
    const truncatedBody =
      content.body.length > maxBodyLength
        ? content.body.slice(0, maxBodyLength - 3) + '...'
        : content.body
    message += ` - ${truncatedBody}`
  }

  if (includeAppLink) {
    message += linkText
  }

  return message
}

/**
 * Send an SMS notification.
 *
 * @param params - SMS parameters
 * @returns Delivery result
 */
export async function sendSmsNotification(
  params: SendSmsNotificationParams
): Promise<SendSmsResult> {
  const { to, notificationType, content, includeAppLink = true } = params

  // Validate phone number format
  if (!isValidE164(to)) {
    logger.warn('Invalid phone number format', { notificationType })
    return {
      success: false,
      error: 'Invalid phone number format. Must be E.164 format.',
    }
  }

  // Build message
  const message = buildSmsMessage(notificationType, content, includeAppLink)

  // Get Twilio client
  const client = getTwilioClient()
  const fromNumber = getFromNumber()

  // Console fallback for development/testing
  if (!client || !fromNumber) {
    logger.info('[DEV] SMS would be sent', {
      to,
      message,
      notificationType,
    })

    // Simulate success in dev
    return {
      success: true,
      messageSid: `dev-sms-${Date.now()}`,
    }
  }

  try {
    const result = await client.messages.create({
      to,
      from: fromNumber,
      body: message,
    })

    logger.info('SMS sent successfully', {
      messageSid: result.sid,
      notificationType,
    })

    return {
      success: true,
      messageSid: result.sid,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('SMS service error', { error: errorMessage, notificationType })

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Check if SMS service is configured.
 *
 * @returns true if Twilio is configured
 */
export function isSmsConfigured(): boolean {
  return !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  )
}

/**
 * Reset client for testing
 */
export function _resetClientForTesting(): void {
  twilioClient = null
}
