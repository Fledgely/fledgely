/**
 * Data Deletion Complete email template.
 *
 * Story 51.2: Data Deletion Request - AC7
 *
 * Features:
 * - Clean, responsive HTML email
 * - Fledgely branding (purple #7c3aed)
 * - Deletion confirmation message
 * - GDPR Article 17 compliance acknowledgment
 * - Plain text fallback
 */

import * as logger from 'firebase-functions/logger'
import { Resend } from 'resend'

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
 * Parameters for sending a data deletion complete email
 */
export interface DataDeletionCompleteEmailParams {
  to: string
  familyId: string
  deletionId: string
  completedAt: number
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
 * Build the data deletion complete email HTML content.
 */
function buildDeletionCompleteEmailHtml(params: DataDeletionCompleteEmailParams): string {
  const formattedDate = formatDate(params.completedAt)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Fledgely Data Has Been Deleted</title>
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
                Your Data Has Been Permanently Deleted
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0; font-size: 16px; color: #4b5563; line-height: 1.6;">
                In accordance with your request and GDPR Article 17 (Right to Erasure), all data associated with your family account has been permanently deleted from our systems.
              </p>
            </td>
          </tr>

          <!-- Deletion info -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 16px; background-color: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #6b7280;">
                  <strong>Deletion completed:</strong> ${formattedDate}
                </p>
                <p style="margin: 0; font-size: 14px; color: #6b7280;">
                  <strong>Reference ID:</strong> ${params.deletionId}
                </p>
              </div>
            </td>
          </tr>

          <!-- What was deleted -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #1f2937;">
                The following data has been deleted:
              </p>
              <ul style="margin: 0; padding-left: 24px; font-size: 14px; color: #4b5563; line-height: 1.8;">
                <li>Family profile and settings</li>
                <li>All child profiles</li>
                <li>All agreements and consent records</li>
                <li>All screenshots and images</li>
                <li>All flags and annotations</li>
                <li>All activity and audit logs</li>
                <li>All device enrollments</li>
              </ul>
            </td>
          </tr>

          <!-- Important notice -->
          <tr>
            <td style="padding: 0 40px 20px 40px;">
              <div style="padding: 12px 16px; background-color: #fef2f2; border-radius: 8px; border-left: 4px solid #ef4444;">
                <p style="margin: 0; font-size: 14px; color: #991b1b;">
                  <strong>Important:</strong> This action is permanent and cannot be undone. If you wish to use Fledgely again in the future, you will need to create a new account.
                </p>
              </div>
            </td>
          </tr>

          <!-- GDPR statement -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                This deletion has been completed in compliance with the General Data Protection Regulation (GDPR) Article 17, which grants you the right to erasure of your personal data.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 40px 30px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #9ca3af; line-height: 1.5;">
                This is an automated confirmation of your data deletion request. Please retain this email as your confirmation of data erasure.
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
 * Build the data deletion complete email plain text content.
 */
function buildDeletionCompleteEmailText(params: DataDeletionCompleteEmailParams): string {
  const formattedDate = formatDate(params.completedAt)

  const lines: string[] = []

  lines.push('YOUR FLEDGELY DATA HAS BEEN PERMANENTLY DELETED')
  lines.push('')
  lines.push(
    'In accordance with your request and GDPR Article 17 (Right to Erasure), all data associated with your family account has been permanently deleted from our systems.'
  )
  lines.push('')
  lines.push(`Deletion completed: ${formattedDate}`)
  lines.push(`Reference ID: ${params.deletionId}`)
  lines.push('')
  lines.push('THE FOLLOWING DATA HAS BEEN DELETED:')
  lines.push('- Family profile and settings')
  lines.push('- All child profiles')
  lines.push('- All agreements and consent records')
  lines.push('- All screenshots and images')
  lines.push('- All flags and annotations')
  lines.push('- All activity and audit logs')
  lines.push('- All device enrollments')
  lines.push('')
  lines.push(
    'IMPORTANT: This action is permanent and cannot be undone. If you wish to use Fledgely again in the future, you will need to create a new account.'
  )
  lines.push('')
  lines.push(
    'This deletion has been completed in compliance with the General Data Protection Regulation (GDPR) Article 17, which grants you the right to erasure of your personal data.'
  )
  lines.push('')
  lines.push('---')
  lines.push(
    'This is an automated confirmation of your data deletion request. Please retain this email as your confirmation of data erasure.'
  )

  return lines.join('\n')
}

/**
 * Send a data deletion complete email.
 *
 * @param params - Email parameters
 */
export async function sendDeletionCompleteEmail(
  params: DataDeletionCompleteEmailParams
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to } = params

  const htmlContent = buildDeletionCompleteEmailHtml(params)
  const textContent = buildDeletionCompleteEmailText(params)
  const subject = 'Your Fledgely data has been deleted'

  // Get Resend client
  const client = getResendClient()

  // Console fallback for development/testing
  // SECURITY: Do not log email addresses (PII)
  if (!client) {
    logger.info('[DEV] Data deletion complete email would be sent', {
      subject,
      deletionId: params.deletionId,
      completedAt: params.completedAt,
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
      logger.error('Resend API error for deletion complete email', { error: error.message })
      return {
        success: false,
        error: error.message,
      }
    }

    // SECURITY: Do not log email addresses (PII)
    logger.info('Data deletion complete email sent successfully', {
      messageId: data?.id,
    })

    return {
      success: true,
      messageId: data?.id,
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    // SECURITY: Do not log email addresses (PII)
    logger.error('Email service error for deletion complete', { error: errorMessage })

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
