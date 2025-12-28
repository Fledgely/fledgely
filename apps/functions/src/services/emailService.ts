/**
 * Email service for sending transactional emails.
 *
 * Uses Resend for reliable email delivery with good deliverability.
 * Follows the "Functions Delegate to Services" pattern (Unbreakable Rule #5).
 *
 * This service handles:
 * - Co-parent invitation emails (Story 3.2)
 *
 * Configuration:
 * - RESEND_API_KEY: Environment variable for Resend API authentication
 * - RESEND_FROM_EMAIL: Email sender address (defaults to noreply@fledgely.com)
 */

import { Resend } from 'resend'
import {
  generateInvitationEmailHtml,
  generateInvitationEmailText,
  type InvitationEmailParams,
} from '../templates/invitationEmail'

// Initialize Resend client
// API key is loaded from environment variables
const getResendClient = (): Resend => {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not configured')
  }
  return new Resend(apiKey)
}

// Default sender email address
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'fledgely <noreply@fledgely.com>'

/**
 * Result of sending an invitation email.
 */
export interface SendInvitationEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send a co-parent invitation email.
 *
 * @param params - Email parameters including recipient, inviter name, family name, and join link
 * @returns Result indicating success or failure with optional message ID
 *
 * Implements AC2 (Invitation Email Sending) and AC6 (Error Handling)
 */
export async function sendInvitationEmail(
  to: string,
  params: InvitationEmailParams
): Promise<SendInvitationEmailResult> {
  try {
    const resend = getResendClient()

    // Generate email content
    const htmlContent = generateInvitationEmailHtml(params)
    const textContent = generateInvitationEmailText(params)

    // Send email via Resend
    // Subject format per AC2: "Join [Family Name] on fledgely"
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: to,
      subject: `Join ${params.familyName} on fledgely`,
      html: htmlContent,
      text: textContent,
    })

    if (error) {
      console.error('Resend API error:', error.message)
      return {
        success: false,
        error: 'Failed to send invitation email. Please try again.',
      }
    }

    return {
      success: true,
      messageId: data?.id,
    }
  } catch (err) {
    // Log error for debugging (no PII per project standards)
    console.error('Email service error:', err instanceof Error ? err.message : 'Unknown error')

    // Return user-friendly error (AC6)
    return {
      success: false,
      error: 'Unable to send invitation email. Please try again or use the copy link option.',
    }
  }
}

/**
 * Validate email format.
 *
 * Uses a standard email regex pattern that covers most valid email addresses.
 * This is a basic validation - the actual email delivery will provide
 * definitive validation.
 *
 * @param email - Email address to validate
 * @returns true if email format is valid
 */
export function isValidEmail(email: string): boolean {
  // Standard email regex - covers most valid formats
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
