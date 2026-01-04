/**
 * Data Deletion Requested email template.
 *
 * Story 51.2: Data Deletion Request - AC4
 *
 * Sent when a deletion request is created, confirming:
 * - Request received
 * - Cooling off period
 * - How to cancel
 *
 * Features:
 * - Clean, responsive HTML email
 * - Fledgely branding (purple #7c3aed)
 * - Clear cancellation instructions
 * - Countdown to deletion
 * - Plain text fallback
 */

import * as logger from 'firebase-functions/logger'
import { Resend } from 'resend'
import { DATA_DELETION_CONFIG } from '@fledgely/shared'

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

/**
 * Parameters for sending a data deletion requested email
 */
export interface DataDeletionRequestedEmailParams {
  to: string
  deletionId: string
  coolingOffEndsAt: number
}

/**
 * Format date for display.
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Calculate days until cooling off ends.
 */
function getDaysUntilDeletion(coolingOffEndsAt: number): number {
  const now = Date.now()
  const diff = coolingOffEndsAt - now
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Build the data deletion requested email HTML content.
 */
function buildDeletionRequestedEmailHtml(params: DataDeletionRequestedEmailParams): string {
  const formattedDate = formatDate(params.coolingOffEndsAt)
  const daysRemaining = getDaysUntilDeletion(params.coolingOffEndsAt)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fledgely Data Deletion Request Received</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header with logo -->
          <tr>
            <td style="padding: 30px 40px 20px 40px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              <span style="font-size: 24px; font-weight: 700; color: #7c3aed;">fledgely</span>
            </td>
          </tr>

          <!-- Title -->
          <tr>
            <td style="padding: 30px 40px 10px 40px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #1f2937; line-height: 1.3;">
                Data Deletion Request Received
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                We've received your request to delete all data associated with your Fledgely family account. As required by GDPR Article 17, your request has been logged and will be processed after a ${DATA_DELETION_CONFIG.COOLING_OFF_DAYS}-day cooling off period.
              </p>
            </td>
          </tr>

          <!-- Countdown info -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 20px; background-color: #fef3c7; border-radius: 8px; border: 1px solid #fcd34d; text-align: center;">
                <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #92400e;">
                  Time remaining to cancel
                </p>
                <p style="margin: 0; font-size: 32px; font-weight: 700; color: #b45309;">
                  ${daysRemaining} days
                </p>
                <p style="margin: 8px 0 0 0; font-size: 13px; color: #92400e;">
                  Deletion scheduled for: ${formattedDate}
                </p>
              </div>
            </td>
          </tr>

          <!-- Reference ID -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <p style="margin: 0; font-size: 14px; color: #6b7280;">
                  <strong>Reference ID:</strong> ${params.deletionId}
                </p>
              </div>
            </td>
          </tr>

          <!-- Cancel instructions -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #1f2937;">
                Changed your mind?
              </p>
              <p style="margin: 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
                You can cancel this deletion request at any time during the cooling off period by going to:
              </p>
              <p style="margin: 12px 0 0 0; font-size: 14px; color: #4b5563;">
                <strong>Settings → Data & Privacy → Cancel Deletion</strong>
              </p>
            </td>
          </tr>

          <!-- Warning -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 12px 16px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
                <p style="margin: 0; font-size: 14px; color: #991b1b;">
                  <strong>Important:</strong> After the cooling off period ends, all your data will be permanently and irreversibly deleted. This includes all family profiles, agreements, screenshots, flags, and activity logs.
                </p>
              </div>
            </td>
          </tr>

          <!-- Security note -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                <strong>Didn't request this?</strong> If you did not request data deletion, please sign into your Fledgely account immediately and cancel this request. Contact support if you believe your account has been compromised.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                This notification was sent in response to your data deletion request. You will receive a confirmation email once deletion is complete.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}

/**
 * Build the data deletion requested email plain text content.
 */
function buildDeletionRequestedEmailText(params: DataDeletionRequestedEmailParams): string {
  const formattedDate = formatDate(params.coolingOffEndsAt)
  const daysRemaining = getDaysUntilDeletion(params.coolingOffEndsAt)

  const lines: string[] = []

  lines.push('FLEDGELY DATA DELETION REQUEST RECEIVED')
  lines.push('')
  lines.push(
    `We've received your request to delete all data associated with your Fledgely family account. As required by GDPR Article 17, your request has been logged and will be processed after a ${DATA_DELETION_CONFIG.COOLING_OFF_DAYS}-day cooling off period.`
  )
  lines.push('')
  lines.push(`TIME REMAINING TO CANCEL: ${daysRemaining} days`)
  lines.push(`Deletion scheduled for: ${formattedDate}`)
  lines.push('')
  lines.push(`Reference ID: ${params.deletionId}`)
  lines.push('')
  lines.push('CHANGED YOUR MIND?')
  lines.push(
    'You can cancel this deletion request at any time during the cooling off period by going to:'
  )
  lines.push('Settings → Data & Privacy → Cancel Deletion')
  lines.push('')
  lines.push(
    'IMPORTANT: After the cooling off period ends, all your data will be permanently and irreversibly deleted. This includes all family profiles, agreements, screenshots, flags, and activity logs.'
  )
  lines.push('')
  lines.push(
    "DIDN'T REQUEST THIS? If you did not request data deletion, please sign into your Fledgely account immediately and cancel this request. Contact support if you believe your account has been compromised."
  )
  lines.push('')
  lines.push('---')
  lines.push(
    'This notification was sent in response to your data deletion request. You will receive a confirmation email once deletion is complete.'
  )

  return lines.join('\n')
}

/**
 * Send a data deletion requested email.
 *
 * @param params - Email parameters
 */
export async function sendDeletionRequestedEmail(
  params: DataDeletionRequestedEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to } = params

  const htmlContent = buildDeletionRequestedEmailHtml(params)
  const textContent = buildDeletionRequestedEmailText(params)
  const subject = 'Your Fledgely data deletion request has been received'

  // Get Resend client
  const client = getResendClient()

  // Console fallback for development/testing
  // SECURITY: Do not log email addresses (PII)
  if (!client) {
    logger.info('[DEV] Data deletion requested email would be sent', {
      subject,
      deletionId: params.deletionId,
      coolingOffEndsAt: params.coolingOffEndsAt,
    })

    // Simulate success in dev
    return {
      success: true,
      messageId: `dev-${Date.now()}`,
    }
  }

  try {
    const { data, error } = await client.emails.send({
      from: getFromEmail(),
      to,
      subject,
      html: htmlContent,
      text: textContent,
    })

    if (error) {
      // SECURITY: Do not log email addresses (PII)
      logger.error('Resend API error for deletion requested email', { error: error.message })
      return {
        success: false,
        error: error.message,
      }
    }

    // SECURITY: Do not log email addresses (PII)
    logger.info('Data deletion requested email sent successfully', {
      messageId: data?.id,
    })

    return {
      success: true,
      messageId: data?.id,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    // SECURITY: Do not log email addresses (PII)
    logger.error('Email service error for deletion requested', { error: errorMessage })

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Reset client for testing
 */
export function _resetClientForTesting(): void {
  resendClient = null
}
