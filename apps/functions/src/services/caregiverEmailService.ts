/**
 * Email service for sending caregiver invitation emails.
 *
 * Uses Resend for reliable email delivery with good deliverability.
 * Follows the "Functions Delegate to Services" pattern (Unbreakable Rule #5).
 *
 * This service handles:
 * - Caregiver invitation emails (Story 19D.1)
 *
 * Configuration:
 * - RESEND_API_KEY: Environment variable for Resend API authentication
 * - RESEND_FROM_EMAIL: Email sender address (defaults to noreply@fledgely.com)
 */

import { Resend } from 'resend'
import {
  generateCaregiverInvitationEmailHtml,
  generateCaregiverInvitationEmailText,
  type CaregiverInvitationEmailParams,
} from '../templates/caregiverInvitationEmail'

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
 * Result of sending a caregiver invitation email.
 */
export interface SendCaregiverInvitationEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send a caregiver invitation email.
 *
 * @param to - Recipient email address
 * @param params - Email parameters including inviter name, family name, and join link
 * @returns Result indicating success or failure with optional message ID
 *
 * Story 19D.1 - Caregiver Invitation & Onboarding
 */
export async function sendCaregiverInvitationEmail(
  to: string,
  params: CaregiverInvitationEmailParams
): Promise<SendCaregiverInvitationEmailResult> {
  try {
    const resend = getResendClient()

    // Generate email content
    const htmlContent = generateCaregiverInvitationEmailHtml(params)
    const textContent = generateCaregiverInvitationEmailText(params)

    // Send email via Resend
    // Subject format: "View [Family Name]'s status on fledgely"
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: to,
      subject: `View ${params.familyName}'s status on fledgely`,
      html: htmlContent,
      text: textContent,
    })

    if (error) {
      console.error('Resend API error:', error.message)
      return {
        success: false,
        error: 'Failed to send caregiver invitation email. Please try again.',
      }
    }

    return {
      success: true,
      messageId: data?.id,
    }
  } catch (err) {
    // Log error for debugging (no PII per project standards)
    console.error(
      'Caregiver email service error:',
      err instanceof Error ? err.message : 'Unknown error'
    )

    // Return user-friendly error
    return {
      success: false,
      error:
        'Unable to send caregiver invitation email. Please try again or share the link manually.',
    }
  }
}
