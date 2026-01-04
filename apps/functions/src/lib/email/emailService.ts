/**
 * Email service for notification delivery.
 *
 * Story 41.6: Notification Delivery Channels - AC2, AC5, AC6
 *
 * Features:
 * - Send notification emails via Resend
 * - Generate unsubscribe tokens (JWT)
 * - Console fallback for development/testing
 * - List-Unsubscribe header for compliance
 */

import { Resend } from 'resend'
import * as jwt from 'jsonwebtoken'
import * as logger from 'firebase-functions/logger'
import type { NotificationType } from '@fledgely/shared'
import {
  buildNotificationEmailHtml,
  buildNotificationEmailText,
  getNotificationEmailSubject,
} from './templates'

// JWT secret for unsubscribe tokens
const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET || process.env.UNSUBSCRIBE_SECRET
  if (!secret) {
    // Development fallback - NEVER use in production
    logger.warn('JWT_SECRET not configured, using development fallback')
    return 'dev-secret-not-for-production'
  }
  return secret
}

// Resend client singleton
let resendClient: Resend | null = null

const getResendClient = (): Resend | null => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return null
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

// Default sender email (read at runtime)
const getFromEmail = (): string =>
  process.env.RESEND_FROM_EMAIL || 'fledgely <notifications@fledgely.com>'

// App URL for links (read at runtime)
const getAppUrl = (): string => process.env.APP_URL || 'https://app.fledgely.com'

/**
 * Parameters for sending a notification email
 */
export interface SendNotificationEmailParams {
  to: string
  notificationType: NotificationType
  content: {
    title: string
    body: string
    actionUrl?: string
  }
  includeUnsubscribe: boolean
  userId: string
  fallbackMessage?: string
}

/**
 * Result of sending an email
 */
export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Unsubscribe token payload (JWT)
 */
interface UnsubscribeTokenPayload {
  userId: string
  notificationType: NotificationType
  iat: number
  exp: number
}

/**
 * Generate an unsubscribe URL with JWT token.
 *
 * @param userId - User ID
 * @param notificationType - Type of notification to unsubscribe from
 * @returns Unsubscribe URL with token
 */
export function generateUnsubscribeUrl(userId: string, notificationType: NotificationType): string {
  const expiresIn = 24 * 60 * 60 // 24 hours

  const payload: Omit<UnsubscribeTokenPayload, 'iat' | 'exp'> = {
    userId,
    notificationType,
  }

  const token = jwt.sign(payload, getJwtSecret(), {
    expiresIn,
  })

  return `${getAppUrl()}/unsubscribe?token=${encodeURIComponent(token)}`
}

/**
 * Validate an unsubscribe token.
 *
 * @param token - JWT token
 * @returns Decoded payload or null if invalid
 */
export function validateUnsubscribeToken(token: string): UnsubscribeTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as UnsubscribeTokenPayload
    return decoded
  } catch {
    return null
  }
}

/**
 * Send a notification email.
 *
 * @param params - Email parameters
 * @returns Delivery result
 */
export async function sendNotificationEmail(
  params: SendNotificationEmailParams
): Promise<SendEmailResult> {
  const { to, notificationType, content, includeUnsubscribe, userId, fallbackMessage } = params

  // Generate unsubscribe URL if needed
  const unsubscribeUrl = includeUnsubscribe
    ? generateUnsubscribeUrl(userId, notificationType)
    : undefined

  // Build email content
  const htmlContent = buildNotificationEmailHtml({
    title: content.title,
    body: content.body,
    actionUrl: content.actionUrl,
    unsubscribeUrl,
    fallbackMessage,
  })

  const textContent = buildNotificationEmailText({
    title: content.title,
    body: content.body,
    actionUrl: content.actionUrl,
    unsubscribeUrl,
    fallbackMessage,
  })

  const subject = getNotificationEmailSubject(notificationType, content.title)

  // Get Resend client
  const client = getResendClient()

  // Console fallback for development/testing
  if (!client) {
    logger.info('[DEV] Email would be sent', {
      to,
      subject,
      notificationType,
      unsubscribeUrl: includeUnsubscribe ? 'included' : 'not included',
    })

    // Simulate success in dev
    return {
      success: true,
      messageId: `dev-${Date.now()}`,
    }
  }

  try {
    // Build headers
    const headers: Record<string, string> = {}

    // Add List-Unsubscribe header for email compliance
    if (unsubscribeUrl) {
      headers['List-Unsubscribe'] = `<${unsubscribeUrl}>`
      headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click'
    }

    const { data, error } = await client.emails.send({
      from: getFromEmail(),
      to,
      subject,
      html: htmlContent,
      text: textContent,
      headers,
    })

    if (error) {
      logger.error('Resend API error', { error: error.message, to, notificationType })
      return {
        success: false,
        error: error.message,
      }
    }

    logger.info('Email sent successfully', {
      messageId: data?.id,
      notificationType,
    })

    return {
      success: true,
      messageId: data?.id,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('Email service error', { error: errorMessage, to, notificationType })

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Check if email service is configured.
 *
 * @returns true if Resend is configured
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

/**
 * Reset client for testing
 */
export function _resetClientForTesting(): void {
  resendClient = null
}
